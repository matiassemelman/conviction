import { handleAssessment } from '@/lib/server/http';
import { evaluatePairs } from '@/lib/server/jev';
let active = false;
export async function POST(request: Request) {
  if (active)
    return Response.json(
      { error: 'An analysis is already running. Try again shortly.' },
      {
        status: 429,
        headers: { 'Cache-Control': 'no-store', 'Retry-After': '3' },
      },
    );
  active = true;
  try {
    return await handleAssessment(request, (pairs) =>
      evaluatePairs(pairs, process.env.TYPESAFE_API_KEY ?? ''),
    );
  } finally {
    active = false;
  }
}
