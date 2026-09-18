import { handleAnalysisRequest } from '@/lib/server/http';
import { compareCase } from '@/lib/server/compare';
import { evaluatePairs } from '@/lib/server/jev';
import { evaluateOpenAI } from '@/lib/server/openai';
export const maxDuration = 60;
let active = false;
export async function POST(request: Request) {
  if (active)
    return Response.json(
      { error: 'A comparison is already running. Try again shortly.' },
      {
        status: 429,
        headers: { 'Cache-Control': 'no-store', 'Retry-After': '3' },
      },
    );
  active = true;
  try {
    return await handleAnalysisRequest(request, (notes) =>
      compareCase(notes, {
        jev: (pairs, trace) =>
          evaluatePairs(
            pairs,
            process.env.TYPESAFE_API_KEY ?? '',
            fetch,
            trace,
          ),
        luna: (pairs, trace) =>
          evaluateOpenAI(
            pairs,
            process.env.OPENAI_API_KEY ?? '',
            'gpt-5.6-luna',
            fetch,
            trace,
          ),
        terra: (pairs, trace) =>
          evaluateOpenAI(
            pairs,
            process.env.OPENAI_API_KEY ?? '',
            'gpt-5.6-terra',
            fetch,
            trace,
          ),
      }),
    );
  } finally {
    active = false;
  }
}
