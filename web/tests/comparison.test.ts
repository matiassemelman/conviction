import test from 'node:test';
import assert from 'node:assert/strict';
import { estimateCost } from '../lib/comparison.ts';
void test('cost separates cached input and output and marks partial usage', () => {
  const cost = estimateCost('luna', {
    input_tokens: 1000000,
    cached_input_tokens: 250000,
    output_tokens: 100000,
    complete: true,
  });
  assert.equal(cost.usd, 0.275);
  assert.equal(cost.complete, true);
  assert.equal(
    estimateCost('jev', {
      input_tokens: 1000000,
      output_tokens: 90000,
      complete: false,
    }).usd,
    0.042,
  );
  assert.equal(
    estimateCost('terra', {
      input_tokens: 0,
      output_tokens: 0,
      complete: false,
    }).usd,
    null,
  );
});

import { compareCase } from '../lib/server/compare.ts';
void test('a failed model preserves successful peer results without leaking raw errors', async () => {
  const evaluate = async (pairs: import('../lib/assessment.ts').Pair[]) => ({
    model: 'fixture',
    usage: { input_tokens: 100, output_tokens: 10 },
    judgments: pairs.map((pair) => ({
      ...pair,
      relation: 'insufficient' as const,
    })),
  });
  const result = await compareCase([], {
    jev: evaluate,
    luna: async () => {
      throw new Error('secret provider body');
    },
    terra: evaluate,
  });
  assert.deepEqual(
    result.runs.map((r) => r.status),
    ['completed', 'failed', 'completed'],
  );
  assert.equal(result.runs[0].result?.sources.length, 3);
  assert.equal(result.runs[1].trace?.status, 'failed');
  assert.equal(result.runs[1].cost.usd, null);
  assert.ok(!JSON.stringify(result).includes('secret provider body'));
});

import { summarizeBenchmark } from '../lib/benchmark.ts';
void test('benchmark counts failed judgments as failures, not correct answers, and reports measured percentiles', () => {
  const samples = [
    { id: 'one', expected: 'supports', actual: 'supports', durationMs: 100 },
    { id: 'two', expected: 'contradicts', actual: 'supports', durationMs: 200 },
    { id: 'three', expected: 'supports', durationMs: 900 },
  ] as const;
  const result = summarizeBenchmark([...samples]);
  assert.equal(result.correct, 1);
  assert.equal(result.total, 3);
  assert.equal(result.failed, 1);
  assert.equal(result.medianMs, 150);
  assert.equal(result.p95Ms, 200);
  assert.deepEqual(result.byClass.supports, { correct: 1, total: 2 });
});

import { handleAnalysisRequest } from '../lib/server/http.ts';
void test('comparison request validation rejects foreign origins and oversized notes before provider calls', async () => {
  let calls = 0;
  const run = async () => {
    calls++;
    return {};
  };
  const request = (origin: string, notes: string[]) =>
    new Request('http://localhost/api/compare', {
      method: 'POST',
      headers: { origin, 'content-type': 'application/json' },
      body: JSON.stringify({ notes }),
    });
  assert.equal(
    (await handleAnalysisRequest(request('https://foreign.example', []), run))
      .status,
    403,
  );
  assert.equal(
    (
      await handleAnalysisRequest(
        request('http://localhost', ['a'.repeat(2001)]),
        run,
      )
    ).status,
    400,
  );
  assert.equal(calls, 0);
});
