import { AssessmentFailure } from '../trace.ts';
import { assessCase } from '../assessment.ts';
import type { Evaluate } from '../assessment.ts';
import { reserveDemoRun } from './demo-limits.ts';
const response = (body: unknown, status = 200) =>
  Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } });
async function readNotes(request: Request): Promise<string[]> {
  if (
    !request.headers
      .get('content-type')
      ?.toLowerCase()
      .startsWith('application/json')
  )
    throw new Error('Send JSON.');
  const reader = request.body?.getReader();
  if (!reader) throw new Error('Missing body.');
  let size = 0;
  const chunks: Uint8Array[] = [];
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 40000) {
        await reader.cancel();
        throw new Error('Request too large.');
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const data = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    data.set(chunk, offset);
    offset += chunk.byteLength;
  }
  const parsed: unknown = JSON.parse(new TextDecoder().decode(data));
  if (
    !parsed ||
    typeof parsed !== 'object' ||
    !('notes' in parsed) ||
    !Array.isArray(parsed.notes) ||
    parsed.notes.length > 4
  )
    throw new Error('Use at most four notes.');
  return parsed.notes.map((note: unknown) => {
    if (
      typeof note !== 'string' ||
      note.trim().length < 2 ||
      note.trim().length > 2000
    )
      throw new Error('Each note must contain 2–2000 characters.');
    return note.trim();
  });
}
export async function handleAnalysisRequest(
  request: Request,
  analyze: (notes: string[]) => Promise<unknown>,
  admit: (request: Request) => Promise<Response | null> = reserveDemoRun,
): Promise<Response> {
  const origin = request.headers.get('origin');
  if (!origin || origin !== new URL(request.url).origin)
    return response(
      { error: 'This request must come from the same workspace.' },
      403,
    );
  let notes: string[];
  try {
    notes = await readNotes(request);
  } catch {
    return response(
      { error: 'Use up to four notes of 2–2000 characters each.' },
      400,
    );
  }
  const rejected = await admit(request);
  if (rejected) return rejected;
  try {
    return response(await analyze(notes));
  } catch (error) {
    return response(
      {
        ...(error instanceof AssessmentFailure ? { trace: error.trace } : {}),
        error:
          'Live analysis is unavailable. Your previous results and draft are unchanged. Try again shortly.',
      },
      502,
    );
  }
}

export function handleAssessment(
  request: Request,
  evaluate: Evaluate,
  admit?: (request: Request) => Promise<Response | null>,
): Promise<Response> {
  return handleAnalysisRequest(
    request,
    (notes) => assessCase(notes, evaluate),
    admit,
  );
}
