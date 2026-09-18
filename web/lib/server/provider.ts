import { addUsage, measuredMs } from '../trace.ts';
import type { SourceTrace, TraceContext, Usage } from '../trace.ts';
import type { Evaluation, Pair } from '../assessment.ts';
type Provider = {
  name: string;
  url: string;
  retryStatuses: number[];
  buildRequest: (pairs: Pair[]) => Record<string, unknown>;
  decode: (raw: unknown, pairs: Pair[]) => Evaluation;
  reportedUsage: (raw: unknown) => Usage | undefined;
};
async function evaluateBatch(
  provider: Provider,
  pairs: Pair[],
  apiKey: string,
  request: typeof fetch,
  signal: AbortSignal,
  trace: TraceContext,
): Promise<Evaluation> {
  const started = performance.now();
  const payload = provider.buildRequest(pairs);
  const span: SourceTrace = {
    sourceId: pairs[0].source.id,
    title: pairs[0].source.title,
    status: 'failed',
    startMs: measuredMs(trace.originMs),
    durationMs: 0,
    request: payload,
    attempts: [],
  };
  try {
    if (!apiKey) {
      span.errorCode = 'not_configured';
      throw new Error(`${provider.name} is not configured.`);
    }
    for (let attempt = 0; attempt < 2; attempt++) {
      const attemptStarted = performance.now();
      const record: SourceTrace['attempts'][number] = {
        number: attempt + 1,
        startMs: measuredMs(trace.originMs),
        durationMs: 0,
        outcome: 'failed',
      };
      span.attempts.push(record);
      try {
        span.errorCode = 'network_or_timeout';
        const response = await request(provider.url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify(payload),
          signal: AbortSignal.any([signal, AbortSignal.timeout(20000)]),
        });
        record.httpStatus = response.status;
        if (provider.retryStatuses.includes(response.status) && attempt === 0) {
          record.outcome = 'retry';
          record.durationMs = measuredMs(attemptStarted);
          await response.body?.cancel();
        } else {
          if (!response.ok) {
            span.errorCode = 'http_error';
            throw new Error(
              `${provider.name} request failed (${response.status}).`,
            );
          }
          let raw: unknown;
          try {
            raw = await response.json();
          } catch (error) {
            span.errorCode =
              error instanceof SyntaxError
                ? 'invalid_response'
                : 'network_or_timeout';
            throw error;
          }
          span.errorCode = 'invalid_response';
          span.reportedUsage = provider.reportedUsage(raw);
          const result = provider.decode(raw, pairs);
          span.response = {
            model: result.model,
            usage: result.usage,
            answers: result.judgments.map((j) => ({
              assumptionId: j.assumption.id,
              relation: j.relation,
              confidence: j.confidence,
              probabilities: j.probabilities,
            })),
          };
          span.status = 'completed';
          delete span.errorCode;
          record.outcome = 'completed';
          return result;
        }
      } finally {
        if (record.outcome !== 'retry')
          record.durationMs = measuredMs(attemptStarted);
      }
      await new Promise((resolve) => setTimeout(resolve, 800));
    }
    throw new Error(`${provider.name} temporarily unavailable.`);
  } finally {
    span.durationMs = measuredMs(started);
    trace.record(span);
  }
}

// Independent assumptions share a request only when they share the exact source.
// Restricting context prevents judgments from borrowing evidence from other sources.
export async function evaluateProvider(
  provider: Provider,
  pairs: Pair[],
  apiKey: string,
  request: typeof fetch = fetch,
  trace?: TraceContext,
): Promise<Evaluation> {
  const observer = trace ?? { originMs: performance.now(), record: () => {} };
  const groups = new Map<string, Pair[]>();
  for (const pair of pairs) {
    const key = JSON.stringify([pair.source.id, pair.source.text]);
    const group = groups.get(key) ?? [];
    group.push(pair);
    groups.set(key, group);
  }
  const grouped = [...groups.values()];
  const signal = AbortSignal.timeout(40000);
  const judgments = new Map<Pair, Evaluation['judgments'][number]>();
  let model = '';
  const usage: Usage = { input_tokens: 0, output_tokens: 0 };
  for (let i = 0; i < grouped.length; i += 3) {
    signal.throwIfAborted();
    const batch = grouped.slice(i, i + 3);
    const results = await Promise.allSettled(
      batch.map((group) =>
        evaluateBatch(provider, group, apiKey, request, signal, observer),
      ),
    );
    for (const [index, result] of results.entries()) {
      if (result.status === 'rejected') throw result.reason;
      if (model && model !== result.value.model)
        throw new Error('Provider model changed during analysis. Retry.');
      model = result.value.model;
      addUsage(usage, result.value.usage);
      result.value.judgments.forEach((judgment, j) =>
        judgments.set(batch[index][j], judgment),
      );
    }
  }
  return { model, usage, judgments: pairs.map((pair) => judgments.get(pair)!) };
}
