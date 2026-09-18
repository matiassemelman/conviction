import { createHmac } from 'node:crypto';
import { isIP } from 'node:net';

// One atomic reservation covers both routes and all function instances.
// Reservations are never refunded: a failed/aborted response may still incur cost.
const reserveScript = `
local daily = tonumber(redis.call('GET', KEYS[1]) or '0')
local visitor = tonumber(redis.call('GET', KEYS[2]) or '0')
if daily >= tonumber(ARGV[1]) then return {0, tonumber(ARGV[3])} end
if visitor >= tonumber(ARGV[2]) then return {2, tonumber(ARGV[4])} end
redis.call('SET', KEYS[1], daily + 1, 'EX', tonumber(ARGV[3]) + 60)
redis.call('SET', KEYS[2], visitor + 1, 'EX', tonumber(ARGV[4]) + 60)
return {1, 0}
`;
const unavailable = () =>
  Response.json(
    {
      code: 'demo_unavailable',
      error:
        'Live runs are temporarily paused. Your draft and previous results are unchanged. You can still explore the case and recorded benchmark.',
    },
    {
      status: 503,
      headers: { 'Cache-Control': 'no-store', 'Retry-After': '60' },
    },
  );

type Options = {
  env?: Record<string, string | undefined>;
  request?: typeof fetch;
  now?: () => number;
};

export async function reserveDemoRun(
  incoming: Request,
  { env = process.env, request = fetch, now = Date.now }: Options = {},
): Promise<Response | null> {
  try {
    const endpoint = env.KV_REST_API_URL;
    const token = env.KV_REST_API_TOKEN;
    const dailyLimit = Number(env.DEMO_DAILY_LIMIT ?? '20');
    if (
      env.DISABLE_LIVE_ANALYSIS === '1' ||
      !endpoint ||
      !token ||
      !Number.isInteger(dailyLimit) ||
      dailyLimit < 1 ||
      dailyLimit > 100
    )
      return unavailable();
    const url = new URL(endpoint);
    if (url.protocol !== 'https:' || !url.hostname.endsWith('.upstash.io'))
      return unavailable();

    // These headers are overwritten by Vercel. Never accept a browser's custom ID.
    const address =
      env.VERCEL === '1'
        ? (incoming.headers.get('x-vercel-forwarded-for') ??
          incoming.headers.get('x-forwarded-for'))
        : '127.0.0.1';
    if (!address || !isIP(address)) return unavailable();
    const timestamp = now();
    if (!Number.isSafeInteger(timestamp) || timestamp < 0) return unavailable();
    const day = Math.floor(timestamp / 86400000);
    const window = Math.floor(timestamp / 600000);
    const dailyWait = Math.ceil(((day + 1) * 86400000 - timestamp) / 1000);
    const visitorWait = Math.ceil(((window + 1) * 600000 - timestamp) / 1000);
    const visitor = createHmac('sha256', token)
      .update(`${day}:${address}`)
      .digest('hex');
    const scope =
      env.VERCEL_ENV === 'production' ? 'production' : 'development';
    const prefix = `conviction:demo:${scope}`;
    const response = await request(url, {
      method: 'POST',
      redirect: 'error',
      cache: 'no-store',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify([
        'EVAL',
        reserveScript,
        2,
        `${prefix}:day:${day}`,
        `${prefix}:visitor:${window}:${visitor}`,
        dailyLimit,
        5,
        dailyWait,
        visitorWait,
      ]),
      signal: AbortSignal.timeout(3000),
    });
    if (!response.ok) return unavailable();
    const data: unknown = await response.json();
    if (
      !data ||
      typeof data !== 'object' ||
      !('result' in data) ||
      'error' in data
    )
      return unavailable();
    const result = data.result;
    if (
      !Array.isArray(result) ||
      result.length !== 2 ||
      ![0, 1, 2].includes(result[0]) ||
      !Number.isInteger(result[1]) ||
      result[1] < 0 ||
      result[1] > 86400
    )
      return unavailable();
    if (result[0] === 1) return result[1] === 0 ? null : unavailable();
    if (result[1] < 1) return unavailable();
    const daily = result[0] === 0;
    return Response.json(
      {
        code: daily ? 'demo_daily_limit' : 'demo_visitor_limit',
        error: daily
          ? 'The shared daily demo allowance is used up. Live runs reopen at 00:00 UTC. You can still explore the case and recorded benchmark.'
          : 'You have reached the demo limit for this network. Wait up to 10 minutes before another live run. Your draft and previous results are unchanged.',
      },
      {
        status: 429,
        headers: {
          'Cache-Control': 'no-store',
          'Retry-After': String(result[1]),
        },
      },
    );
  } catch {
    return unavailable();
  }
}
