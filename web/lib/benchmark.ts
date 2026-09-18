import type { Relation } from './assessment.ts';
import type { ModelId } from './comparison.ts';
import type { SourceTrace } from './trace.ts';
export type BenchmarkSample = {
  id: string;
  expected: Relation;
  status: 'completed' | 'failed' | 'unmeasured' | 'unavailable';
  actual?: Relation;
  durationMs: number;
};
export function benchmarkSample(
  item: { id: string; expected: Relation },
  span?: SourceTrace,
): BenchmarkSample {
  const answer = span?.response?.answers.find((a) => a.assumptionId === item.id);
  return {
    ...item,
    status: answer ? 'completed' : span?.errorCode === 'not_configured'
      ? 'unavailable' : span?.attempts.length ? 'failed' : 'unmeasured',
    actual: answer?.relation,
    durationMs: span?.durationMs ?? 0,
  };
}
export function summarizeBenchmark(samples: BenchmarkSample[]) {
  const completed = samples.filter((s) => s.actual !== undefined);
  const times = completed.map((s) => s.durationMs).sort((a, b) => a - b);
  const middle = Math.floor(times.length / 2);
  const byClass = Object.fromEntries(
    (['supports', 'contradicts', 'mixed', 'insufficient'] as const).map(
      (label) => {
        const group = samples.filter((s) => s.expected === label);
        return [
          label,
          {
            correct: group.filter((s) => s.actual === s.expected).length,
            total: group.length,
          },
        ];
      },
    ),
  );
  return {
    total: samples.length,
    correct: completed.filter((s) => s.actual === s.expected).length,
    attempted: samples.filter((s) => s.status === 'completed' || s.status === 'failed').length,
    failed: samples.filter((s) => s.status === 'failed').length,
    unmeasured: samples.filter((s) => s.status === 'unmeasured').length,
    unavailable: samples.filter((s) => s.status === 'unavailable').length,
    medianMs: times.length
      ? times.length % 2
        ? times[middle]
        : (times[middle - 1] + times[middle]) / 2
      : null,
    p95Ms: times.length ? times[Math.ceil(times.length * 0.95) - 1] : null,
    byClass,
  };
}
export type BenchmarkReport = {
  recordedAt: string;
  datasetSha256: string;
  distinctCases: number;
  repetitions: number;
  settings: string;
  models: {
    id: ModelId;
    actualModels: string[];
    summary: ReturnType<typeof summarizeBenchmark>;
    costUsd: number | null;
    costComplete: boolean;
    samples: BenchmarkSample[];
  }[];
};
