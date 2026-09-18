// Run only against an isolated disposable Redis Unix socket (no provider calls).
// REDIS_TEST_SOCKET=/path/socket REDIS_CLI=/path/redis-cli node --experimental-strip-types scripts/check-demo-limits.ts
import assert from 'node:assert/strict';
import { randomInt } from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { reserveDemoRun } from '../lib/server/demo-limits.ts';
import { handleAnalysisRequest } from '../lib/server/http.ts';
const socket = process.env.REDIS_TEST_SOCKET;
const cli = process.env.REDIS_CLI ?? 'redis-cli';
if (!socket) throw new Error('Provide an isolated REDIS_TEST_SOCKET.');
const execute = promisify(execFile);
const request: typeof fetch = async (_url, options) => {
  assert.equal(typeof options?.body, 'string');
  const command = JSON.parse(options!.body as string) as (string | number)[];
  const { stdout } = await execute(cli, [
    '-s',
    socket,
    '--json',
    ...command.map(String),
  ]);
  return Response.json({ result: JSON.parse(stdout) as unknown });
};
const env = {
  VERCEL: '1',
  VERCEL_ENV: 'production',
  KV_REST_API_URL: 'https://fixture.upstash.io',
  KV_REST_API_TOKEN: 'fixture-local-only',
  DEMO_DAILY_LIMIT: '3',
};
// Distinct future day per invocation avoids deleting or reusing existing counters.
const timestamp = Date.UTC(2100, 0, 1) + randomInt(1000000) * 86400000;
const incoming = (ip: string, path = 'compare') =>
  new Request(`https://demo.example/api/${path}`, {
    method: 'POST',
    headers: {
      origin: 'https://demo.example',
      'content-type': 'application/json',
      'x-vercel-forwarded-for': ip,
    },
    body: '{"notes":[]}',
  });
let paidCalls = 0;
const responses = await Promise.all(
  Array.from({ length: 12 }, (_, i) =>
    handleAnalysisRequest(
      incoming(`203.0.113.${i + 1}`, i % 2 ? 'assess' : 'compare'),
      async () => {
        paidCalls++;
        return { ok: true };
      },
      (r) => reserveDemoRun(r, { env, request, now: () => timestamp }),
    ),
  ),
);
assert.equal(responses.filter((r) => r.status === 200).length, 3);
assert.equal(responses.filter((r) => r.status === 429).length, 9);
assert.equal(paidCalls, 3);
const restarted = await reserveDemoRun(incoming('203.0.113.99'), {
  env: { ...env },
  request,
  now: () => timestamp,
});
assert.equal((await restarted!.json()).code, 'demo_daily_limit');
const tomorrow = await reserveDemoRun(incoming('203.0.113.99'), {
  env,
  request,
  now: () => timestamp + 86400000,
});
assert.equal(tomorrow, null);

const nextDay = timestamp + 2 * 86400000;
const visitorEnv = { ...env, DEMO_DAILY_LIMIT: '20' };
const visitorRuns = await Promise.all(
  Array.from({ length: 12 }, () =>
    reserveDemoRun(incoming('203.0.113.55'), {
      env: visitorEnv,
      request,
      now: () => nextDay,
    }),
  ),
);
assert.equal(visitorRuns.filter((r) => r === null).length, 5);
assert.equal(visitorRuns.filter((r) => r?.status === 429).length, 7);
for (const result of visitorRuns.filter((r) => r !== null))
  assert.equal((await result.json()).code, 'demo_visitor_limit');
assert.equal(
  await reserveDemoRun(incoming('203.0.113.55'), {
    env: visitorEnv,
    request,
    now: () => nextDay + 600000,
  }),
  null,
);
console.log(
  'Real Redis checks passed: 12 concurrent callers admitted exactly 3; shared across both routes and fresh handlers; next UTC day resets; one IP admits 5/12 and resets in its next 10-minute window. Zero external model calls.',
);
