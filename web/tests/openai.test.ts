import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluateOpenAI } from '../lib/server/openai.ts';
import { assumptions, baseSources } from '../lib/case.ts';
const pairs = [{ assumption: assumptions[0], source: baseSources[0] }];
const valid = () => ({
  model: 'gpt-5.6-luna',
  status: 'completed',
  output: [
    {
      type: 'message',
      status: 'completed',
      role: 'assistant',
      content: [
        {
          type: 'output_text',
          text: JSON.stringify({ relation_0: 'supports' }),
        },
      ],
    },
  ],
  usage: {
    input_tokens: 100,
    input_tokens_details: { cached_tokens: 20 },
    output_tokens: 10,
  },
});
void test('Responses judges the same isolated source without synthesizing confidence', async () => {
  const result = await evaluateOpenAI(
    pairs,
    'test-secret',
    'gpt-5.6-luna',
    async (url, init) => {
      assert.equal(url, 'https://api.openai.com/v1/responses');
      const body = JSON.parse(init!.body as string);
      assert.equal(body.store, false);
      assert.deepEqual(body.reasoning, { effort: 'none' });
      assert.equal(body.text.format.strict, true);
      assert.ok(body.max_output_tokens > 0 && body.max_output_tokens <= 2048);
      assert.ok(!(init!.body as string).includes('test-secret'));
      return Response.json(valid());
    },
  );
  assert.equal(result.judgments[0].relation, 'supports');
  assert.equal(result.judgments[0].confidence, undefined);
  assert.equal(result.judgments[0].probabilities, undefined);
  assert.deepEqual(result.usage, {
    input_tokens: 100,
    cached_input_tokens: 20,
    output_tokens: 10,
  });
});
void test('rejects incomplete, refused, malformed, extra, wrong-model and invalid-usage responses', async () => {
  const mutations: ((raw: ReturnType<typeof valid>) => void)[] = [
    (raw) => {
      raw.status = 'incomplete';
    },
    (raw) => {
      raw.model = 'gpt-5.6-terra';
    },
    (raw) => {
      raw.output[0].status = 'in_progress';
    },
    (raw) => {
      raw.output[0].content[0].type = 'refusal';
    },
    (raw) => {
      raw.output[0].content[0].text = '{';
    },
    (raw) => {
      raw.output[0].content[0].text = '{}';
    },
    (raw) => {
      raw.output[0].content[0].text = '{"relation_0":"verified"}';
    },
    (raw) => {
      raw.output[0].content[0].text =
        '{"relation_0":"supports","relation_1":"supports"}';
    },
    (raw) => {
      raw.usage.input_tokens = -1;
    },
    (raw) => {
      raw.usage.input_tokens_details.cached_tokens = 101;
    },
    (raw) => {
      raw.usage.input_tokens_details.cached_tokens = 0.1;
    },
  ];
  for (const mutate of mutations) {
    const raw = valid();
    mutate(raw);
    await assert.rejects(
      () =>
        evaluateOpenAI(pairs, 'key', 'gpt-5.6-luna', async () =>
          Response.json(raw),
        ),
      /Invalid provider/,
    );
  }
});
void test('preserves input order and isolates sources with at most three concurrent requests', async () => {
  const inputs = Array.from({ length: 7 }, (_, i) => ({
    assumption: assumptions[0],
    source: { ...baseSources[0], id: `source-${i}`, text: `Text ${i}` },
  }));
  let active = 0,
    peak = 0;
  const result = await evaluateOpenAI(
    inputs,
    'key',
    'gpt-5.6-luna',
    async (_url, init) => {
      const body = JSON.parse(init!.body as string);
      const data = JSON.parse(body.input);
      assert.equal(
        new Set(data.pairs.map((p: { source: string }) => p.source)).size,
        1,
      );
      active++;
      peak = Math.max(active, peak);
      await new Promise((resolve) => setTimeout(resolve, 5));
      active--;
      return Response.json(valid());
    },
  );
  assert.equal(peak, 3);
  assert.deepEqual(
    result.judgments.map((j) => j.source.id),
    inputs.map((p) => p.source.id),
  );
  assert.deepEqual(result.usage, {
    input_tokens: 700,
    output_tokens: 70,
    cached_input_tokens: 140,
  });
});
void test('retries only 429/503 once and retains safe attempts', async () => {
  for (const status of [429, 503, 529, 401]) {
    let calls = 0;
    const spans: import('../lib/trace.ts').SourceTrace[] = [];
    const run = evaluateOpenAI(
      pairs,
      'never-expose',
      'gpt-5.6-luna',
      async () => {
        calls++;
        return calls === 1
          ? new Response('never-expose', { status })
          : Response.json(valid());
      },
      { originMs: performance.now(), record: (span) => spans.push(span) },
    );
    if ([429, 503].includes(status)) await run;
    else await assert.rejects(() => run);
    assert.equal(calls, [429, 503].includes(status) ? 2 : 1);
    assert.equal(spans[0].attempts[0].httpStatus, status);
    assert.ok(!JSON.stringify(spans).includes('never-expose'));
  }
});
void test('rejects unsupported output items even alongside a valid answer', async () => {
  const raw = valid();
  const body = {
    ...raw,
    output: [
      ...raw.output,
      { type: 'function_call', name: 'unexpected', arguments: '{}' },
    ],
  };
  await assert.rejects(
    () =>
      evaluateOpenAI(pairs, 'key', 'gpt-5.6-luna', async () =>
        Response.json(body),
      ),
    /Invalid provider/,
  );
});
void test('Jev and OpenAI receive identical source state and judgment rubric', async () => {
  const { buildRequest } = await import('../lib/server/jev.ts');
  const inputs = assumptions.map((assumption) => ({
    assumption,
    source: baseSources[0],
  }));
  const jev = buildRequest(inputs);
  await evaluateOpenAI(inputs, 'key', 'gpt-5.6-terra', async (_url, init) => {
    const body = JSON.parse(init!.body as string);
    assert.deepEqual(JSON.parse(body.input), jev.state);
    const questions = JSON.parse(body.instructions).questions;
    for (const [key, question] of Object.entries(jev.questions)) {
      assert.deepEqual(questions[key], {
        instructions: question.instructions,
        criteria: question.criteria,
      });
    }
    assert.deepEqual(body.text.format.schema.required, [
      'relation_0',
      'relation_1',
      'relation_2',
    ]);
    const raw = valid();
    raw.model = 'gpt-5.6-terra-2026-09-18';
    raw.output[0].content[0].text =
      '{"relation_0":"supports","relation_1":"mixed","relation_2":"insufficient"}';
    return Response.json(raw);
  });
});
