import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluatePairs } from '../lib/server/jev.ts';
import { assumptions, baseSources } from '../lib/case.ts';
const pairs = [{ assumption: assumptions[0], source: baseSources[0] }];
void test('rejects a missing or malformed provider judgment instead of showing evidence gap', async () => {
  await assert.rejects(
    () =>
      evaluatePairs(pairs, 'test', async () =>
        Response.json({
          model: 'jev',
          answers: {},
          usage: { input_tokens: 1, output_tokens: 1 },
        }),
      ),
    /invalid/i,
  );
});
void test('an invalid option and non-finite confidence are rejected', async () => {
  for (const answer of [
    { type: 'choice', choice: 'verified', confidence: 1, probabilities: {} },
    {
      type: 'choice',
      choice: 'supports',
      confidence: 2,
      probabilities: { supports: 1, contradicts: 0, mixed: 0, insufficient: 0 },
    },
  ]) {
    await assert.rejects(
      () =>
        evaluatePairs(pairs, 'test', async () =>
          Response.json({
            model: 'jev',
            answers: { relation_0: answer },
            usage: { input_tokens: 1, output_tokens: 1 },
          }),
        ),
      /invalid/i,
    );
  }
});
void test('request targets the official endpoint, keeps credential in header and attributes outputs', async () => {
  const result = await evaluatePairs(
    pairs,
    'test-credential',
    async (url, init) => {
      assert.equal(url, 'https://api.typesafe.ai/v1/systemone');
      assert.ok(init);
      assert.equal(
        (init.headers as Record<string, string>).Authorization,
        'Bearer test-credential',
      );
      assert.ok(!(init.body as string).includes('test-credential'));
      return Response.json({
        model: 'jev-test',
        answers: {
          relation_0: {
            type: 'choice',
            choice: 'supports',
            confidence: 1,
            probabilities: {
              supports: 1,
              contradicts: 0,
              mixed: 0,
              insufficient: 0,
            },
          },
        },
        usage: { input_tokens: 10, output_tokens: 5 },
      });
    },
  );
  assert.equal(result.judgments[0].source.id, 'founder');
  assert.equal(result.judgments[0].relation, 'supports');
});
void test('authorization failure propagates without logging provider body', async () => {
  await assert.rejects(
    () =>
      evaluatePairs(
        pairs,
        'test',
        async () => new Response('sensitive', { status: 401 }),
      ),
    /401/,
  );
});
void test('one source cannot contaminate the judgment attributed to another source', async () => {
  const independent = [
    pairs[0],
    { assumption: assumptions[0], source: baseSources[1] },
  ];
  await evaluatePairs(independent, 'test', async (_url, init) => {
    const body = JSON.parse(init?.body as string) as {
      state: { pairs: { source: string }[] };
      questions: Record<string, unknown>;
    };
    assert.equal(
      new Set(body.state.pairs.map((p) => p.source)).size,
      1,
      'Each request must contain only one source text',
    );
    return Response.json({
      model: 'jev-test',
      answers: Object.fromEntries(
        Object.keys(body.questions).map((key) => [
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
      usage: { input_tokens: 1, output_tokens: 1 },
    });
  });
});
void test('seven source evaluations allow at most fourteen attempts with one bounded retry', async () => {
  const all = Array.from({ length: 7 }, (_, i) => ({
    assumption: assumptions[0],
    source: { ...baseSources[0], id: `s${i}`, text: `Independent source ${i}` },
  }));
  const counts = new Map<string, number>();
  let total = 0;
  const result = await evaluatePairs(all, 'test', async (_url, init) => {
    const body = init?.body as string;
    const count = (counts.get(body) ?? 0) + 1;
    counts.set(body, count);
    total++;
    if (count === 1) return new Response('', { status: 429 });
    return Response.json({
      model: 'jev-test',
      answers: {
        relation_0: {
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
      },
      usage: { input_tokens: 1, output_tokens: 1 },
    });
  });
  assert.equal(total, 14);
  assert.equal(result.judgments.length, 7);
  assert.ok([...counts.values()].every((count) => count === 2));
});
