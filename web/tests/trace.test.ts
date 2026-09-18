import test from 'node:test';
import assert from 'node:assert/strict';
import { assessCase } from '../lib/assessment.ts';
import { evaluatePairs } from '../lib/server/jev.ts';
import { handleAssessment } from '../lib/server/http.ts';
const successful = (body: string) => {
  const request = JSON.parse(body) as { questions: Record<string, unknown> };
  return Response.json({
    model: 'jev-test',
    answers: Object.fromEntries(
      Object.keys(request.questions).map((key) => [
        key,
        {
          type: 'choice',
          choice: 'insufficient',
          confidence: 1,
          probabilities: {
            supports: 0,
            contradicts: 0,
            mixed: 0,
            insufficient: 1,
          },
        },
      ]),
    ),
    usage: { input_tokens: 100, output_tokens: 10 },
  });
};
void test('success includes measured source spans, payloads, typed responses and deterministic phases without credentials', async () => {
  const result = await assessCase([], (pairs, trace) =>
    evaluatePairs(
      pairs,
      'do-not-expose',
      async (_url, init) => successful(init!.body as string),
      trace,
    ),
  );
  assert.equal(result.trace.status, 'completed');
  assert.equal(result.trace.sources.length, 3);
  assert.equal(result.trace.sources[0].attempts.length, 1);
  assert.equal(result.trace.sources[0].status, 'completed');
  assert.equal(result.trace.sources[0].response?.model, 'jev-test');
  assert.equal(result.trace.sources[0].attempts[0].httpStatus, 200);
  assert.equal(result.trace.steps.at(-1)?.status, 'completed');
  assert.equal(result.trace.usage.input_tokens, 300);
  assert.ok(result.trace.durationMs >= 0);
  assert.ok(!JSON.stringify(result.trace).includes('do-not-expose'));
  assert.ok(!JSON.stringify(result.trace).includes('Authorization'));
});
void test('a failed run retains sibling spans, marks unsent sources skipped, and never serializes raw errors', async () => {
  const request = new Request('http://localhost/api/assess', {
    method: 'POST',
    headers: { origin: 'http://localhost', 'content-type': 'application/json' },
    body: JSON.stringify({
      notes: ['one note', 'second note', 'third note', 'fourth note'],
    }),
  });
  let calls = 0;
  const response = await handleAssessment(
    request,
    (pairs, trace) =>
      evaluatePairs(
        pairs,
        'never-show-key',
        async (_url, init) => {
          calls++;
          const body = init!.body as string;
          const data = JSON.parse(body) as {
            state: { pairs: { source: string }[] };
          };
          if (
            data.state.pairs[0].source.startsWith(
              'As of September 15, 2026, Atlas',
            )
          )
            return new Response('never-show-key provider debug', {
              status: 401,
            });
          return successful(body);
        },
        trace,
      ),
    async () => null,
  );
  assert.equal(response.status, 502);
  const text = await response.text();
  assert.ok(!text.includes('never-show-key'));
  const data = JSON.parse(text) as {
    trace: import('../lib/trace.ts').RunTrace;
  };
  assert.equal(calls, 3);
  assert.equal(data.trace.status, 'failed');
  assert.equal(
    data.trace.sources.filter((s) => s.status === 'completed').length,
    2,
  );
  assert.equal(
    data.trace.sources.filter((s) => s.status === 'skipped').length,
    4,
  );
  assert.equal(
    data.trace.sources.find((s) => s.sourceId === 'finance')?.attempts[0]
      .httpStatus,
    401,
  );
  assert.equal(data.trace.steps.at(-1)?.status, 'skipped');
  assert.equal(data.trace.usage.input_tokens, 200);
  assert.equal(data.trace.usage.complete, false);
});
void test('retry trace shows both HTTP outcomes and counts reported successful usage once', async () => {
  let calls = 0;
  const result = await assessCase([], (pairs, trace) =>
    evaluatePairs(
      pairs,
      'key',
      async (_url, init) => {
        calls++;
        if (calls === 1) return new Response('', { status: 429 });
        return successful(init!.body as string);
      },
      trace,
    ),
  );
  const retried = result.trace.sources.find((s) => s.attempts.length === 2)!;
  assert.deepEqual(
    retried.attempts.map((a) => [a.httpStatus, a.outcome]),
    [
      [429, 'retry'],
      [200, 'completed'],
    ],
  );
  assert.equal(result.trace.usage.input_tokens, 300);
  assert.equal(
    result.trace.usage.complete,
    false,
    'Retry token usage is not reported by the provider',
  );
  assert.ok(
    retried.durationMs >=
      retried.attempts.reduce((sum, a) => sum + a.durationMs, 0),
  );
});
void test('invalid answer preserves safe usage and HTTP status without exposing response content', async () => {
  const request = new Request('http://localhost/api/assess', {
    method: 'POST',
    headers: { origin: 'http://localhost', 'content-type': 'application/json' },
    body: '{"notes":[]}',
  });
  const response = await handleAssessment(
    request,
    (pairs, trace) =>
      evaluatePairs(
        pairs,
        'key',
        async () =>
          Response.json({
            model: 'jev-test',
            answers: {},
            usage: { input_tokens: 7, output_tokens: 2 },
            debug: 'sensitive diagnostic',
          }),
        trace,
      ),
    async () => null,
  );
  const text = await response.text();
  assert.ok(!text.includes('sensitive diagnostic'));
  const data = JSON.parse(text) as {
    trace: import('../lib/trace.ts').RunTrace;
  };
  assert.equal(data.trace.sources[0].errorCode, 'invalid_response');
  assert.equal(data.trace.sources[0].attempts[0].httpStatus, 200);
  assert.equal(data.trace.sources[0].response, undefined);
  assert.equal(data.trace.usage.input_tokens, 21);
});

for (const [label, response, expected] of [
  [
    'interrupted body',
    () =>
      new Response(
        new ReadableStream({
          start(controller) {
            controller.error(new DOMException('interrupted', 'AbortError'));
          },
        }),
      ),
    'network_or_timeout',
  ],
  ['malformed JSON', () => new Response('{broken'), 'invalid_response'],
] as const) {
  void test(`${label} retains HTTP status and correct error category`, async () => {
    const result = await handleAssessment(
      new Request('http://localhost/api/assess', {
        method: 'POST',
        headers: {
          origin: 'http://localhost',
          'content-type': 'application/json',
        },
        body: '{"notes":[]}',
      }),
      (pairs, trace) =>
        evaluatePairs(pairs, 'key', async () => response(), trace),
      async () => null,
    );
    assert.equal(result.status, 502);
    const data = (await result.json()) as {
      trace: import('../lib/trace.ts').RunTrace;
    };
    assert.equal(data.trace.sources[0].errorCode, expected);
    assert.equal(data.trace.sources[0].attempts[0].httpStatus, 200);
  });
}

void test('OpenAI partial failure retains cached usage and names the selected provider', async () => {
  const { evaluateOpenAI } = await import('../lib/server/openai.ts');
  const { AssessmentFailure } = await import('../lib/trace.ts');
  let calls = 0;
  await assert.rejects(
    () =>
      assessCase(
        [],
        (pairs, trace) =>
          evaluateOpenAI(
            pairs,
            'secret',
            'gpt-5.6-terra',
            async () => {
              calls++;
              return Response.json({
                model: 'gpt-5.6-terra',
                status: 'completed',
                output: [
                  {
                    type: 'message',
                    status: 'completed',
                    role: 'assistant',
                    content: [
                      {
                        type: 'output_text',
                        text:
                          calls === 1
                            ? '{}'
                            : JSON.stringify({
                                relation_0: 'supports',
                                relation_1: 'insufficient',
                                relation_2: 'contradicts',
                              }),
                      },
                    ],
                  },
                ],
                usage: {
                  input_tokens: 100,
                  output_tokens: 10,
                  input_tokens_details: { cached_tokens: 20 },
                },
              });
            },
            trace,
          ),
        'GPT-5.6 Terra',
      ),
    (error) => {
      assert.ok(error instanceof AssessmentFailure);
      assert.equal(error.trace.steps[1].name, 'GPT-5.6 Terra judgments');
      assert.equal(error.trace.usage.cached_input_tokens, 60);
      assert.equal(error.trace.usage.input_tokens, 300);
      assert.equal(error.trace.usage.complete, false);
      assert.equal(
        error.trace.sources.filter((s) => s.status === 'completed').length,
        2,
      );
      return true;
    },
  );
});
