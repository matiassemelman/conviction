import test from 'node:test';
import assert from 'node:assert/strict';
import { handleAnalysisRequest } from '../lib/server/http.ts';

void test('missing quota configuration blocks inference before any provider runs', async () => {
  let paidCalls = 0;
  const request = new Request('https://demo.example/api/compare', {
    method: 'POST',
    headers: {
      origin: 'https://demo.example',
      'content-type': 'application/json',
    },
    body: JSON.stringify({ notes: [] }),
  });
  const response = await handleAnalysisRequest(request, async () => {
    paidCalls++;
    return {};
  });
  assert.equal(response.status, 503);
  assert.equal(paidCalls, 0);
  assert.equal((await response.json()).code, 'demo_unavailable');
});

import { reserveDemoRun } from '../lib/server/demo-limits.ts';
const env = {
  VERCEL: '1',
  VERCEL_ENV: 'production',
  KV_REST_API_URL: 'https://limits.upstash.io',
  KV_REST_API_TOKEN: 'fixture-token',
};
const quotaRequest = () =>
  new Request('https://demo.example/api/compare', {
    method: 'POST',
    headers: {
      origin: 'https://demo.example',
      'content-type': 'application/json',
      'x-vercel-forwarded-for': '203.0.113.19',
    },
    body: '{"notes":[]}',
  });
void test('an accepted central reservation permits inference without sending notes or raw IP to the store', async () => {
  let command = '';
  const admission = (request: Request) =>
    reserveDemoRun(request, {
      env,
      now: () => Date.UTC(2026, 8, 18, 12),
      request: async (_url, options) => {
        assert.equal(typeof options?.body, 'string');
        command = options!.body as string;
        return Response.json({ result: [1, 0] });
      },
    });
  let paidCalls = 0;
  const response = await handleAnalysisRequest(
    quotaRequest(),
    async () => {
      paidCalls++;
      return { ok: true };
    },
    admission,
  );
  assert.equal(response.status, 200);
  assert.equal(paidCalls, 1);
  assert.ok(!command.includes('203.0.113.19'));
  assert.ok(!command.includes('fixture-token'));
  assert.ok(!command.includes('notes'));
});

void test('daily and network rejections include safe explanations and never start inference', async () => {
  for (const [outcome, expectedCode] of [
    [0, 'demo_daily_limit'],
    [2, 'demo_visitor_limit'],
  ] as const) {
    let paidCalls = 0;
    const response = await handleAnalysisRequest(
      quotaRequest(),
      async () => {
        paidCalls++;
        return {};
      },
      (request) =>
        reserveDemoRun(request, {
          env,
          request: async () => Response.json({ result: [outcome, 300] }),
        }),
    );
    assert.equal(response.status, 429);
    assert.equal(response.headers.get('retry-after'), '300');
    assert.equal((await response.json()).code, expectedCode);
    assert.equal(paidCalls, 0);
  }
});

void test('store errors, malformed responses and missing trusted IP all fail closed without exposing diagnostics', async () => {
  for (const request of [
    async () => {
      throw new Error('private diagnostic fixture-token');
    },
    async () =>
      Response.json(
        { error: 'private diagnostic fixture-token' },
        { status: 401 },
      ),
    async () => Response.json({ result: 'OK' }),
    async () => Response.json({ result: [1, 0], error: 'private diagnostic' }),
    async () => Response.json({ result: [1, -1] }),
  ]) {
    const response = await reserveDemoRun(quotaRequest(), { env, request });
    assert.equal(response?.status, 503);
    assert.ok(!(await response!.text()).includes('fixture-token'));
  }
  let storeCalls = 0;
  const response = await reserveDemoRun(new Request('https://demo.example'), {
    env,
    request: async () => {
      storeCalls++;
      return Response.json({ result: [1, 0] });
    },
  });
  assert.equal(response?.status, 503);
  assert.equal(storeCalls, 0);
});

void test('the emergency switch blocks requests without consuming the store or calling a provider', async () => {
  let calls = 0;
  const response = await reserveDemoRun(quotaRequest(), {
    env: { ...env, DISABLE_LIVE_ANALYSIS: '1' },
    request: async () => {
      calls++;
      return Response.json({ result: [1, 0] });
    },
  });
  assert.equal(response?.status, 503);
  assert.equal(calls, 0);
});

void test('invalid input and foreign origin are rejected before consuming allowance', async () => {
  let reservations = 0;
  const gate = async () => {
    reservations++;
    return null;
  };
  for (const [origin, notes, status] of [
    ['https://foreign.example', [], 403],
    ['https://demo.example', ['x'.repeat(2001)], 400],
  ] as const) {
    const request = new Request('https://demo.example/api/compare', {
      method: 'POST',
      headers: { origin, 'content-type': 'application/json' },
      body: JSON.stringify({ notes }),
    });
    assert.equal(
      (
        await handleAnalysisRequest(
          request,
          async () => {
            throw new Error('must not run');
          },
          gate,
        )
      ).status,
      status,
    );
  }
  assert.equal(reservations, 0);
});
