import { AssessmentFailure, measuredMs } from './trace.ts';
import type { RunTrace, TraceContext } from './trace.ts';
export type Relation = 'supports' | 'contradicts' | 'mixed' | 'insufficient';
export function aggregate(relations: Relation[]): Relation {
  if (
    relations.includes('mixed') ||
    (relations.includes('supports') && relations.includes('contradicts'))
  )
    return 'mixed';
  if (relations.includes('supports')) return 'supports';
  if (relations.includes('contradicts')) return 'contradicts';
  return 'insufficient';
}

import { assumptions, baseSources } from './case.ts';
import type { Source, Assumption } from './case.ts';
export type Pair = { assumption: Assumption; source: Source };
export type Judgment = Pair & {
  relation: Relation;
  confidence: number;
  probabilities?: Record<Relation, number>;
};
export type Evaluation = {
  model: string;
  judgments: Judgment[];
  usage: { input_tokens: number; output_tokens: number };
};
export type Evaluate = (
  pairs: Pair[],
  trace?: TraceContext,
) => Promise<Evaluation>;
export type Assessment = {
  assumptionId: string;
  status: Relation;
  question: string;
  evidence: { sourceId: string; relation: Relation; confidence: number }[];
};
export type CaseResult = {
  assessments: Assessment[];
  sources: Source[];
  model: string;
  usage: Evaluation['usage'];
  elapsedMs: number;
  trace: RunTrace;
};
export const statusLabels: Record<Relation, string> = {
  supports: 'Supported by sources',
  contradicts: 'Challenged by sources',
  mixed: 'Conflicting evidence',
  insufficient: 'Evidence gap',
};
export async function assessCase(
  notes: string[],
  evaluate: Evaluate,
): Promise<CaseResult> {
  const started = performance.now();
  const startedAt = new Date().toISOString();
  const sources = [
    ...baseSources,
    ...notes.map((text, index) => ({
      id: `note-${index + 1}`,
      title: `Analyst note ${index + 1}`,
      text,
      attribution: 'User-added note · Unverified source statement',
    })),
  ];
  const pairs = assumptions.flatMap((assumption) =>
    sources.map((source) => ({ assumption, source })),
  );
  const preparedMs = measuredMs(started);
  const trace: RunTrace = {
    id: crypto.randomUUID(),
    startedAt,
    status: 'failed',
    durationMs: 0,
    sourceCount: sources.length,
    assumptionCount: assumptions.length,
    steps: [
      {
        name: 'Prepare inputs',
        kind: 'code',
        status: 'completed',
        startMs: 0,
        durationMs: preparedMs,
      },
    ],
    sources: sources.map((source) => ({
      sourceId: source.id,
      title: source.title,
      status: 'skipped',
      startMs: null,
      durationMs: 0,
      attempts: [],
    })),
    usage: { input_tokens: 0, output_tokens: 0, complete: false },
  };
  const evaluationStart = performance.now();
  let result: Evaluation;
  try {
    result = await evaluate(pairs, {
      originMs: started,
      record: (span) => {
        const index = trace.sources.findIndex(
          (source) => source.sourceId === span.sourceId,
        );
        if (index >= 0) trace.sources[index] = span;
      },
    });
  } catch {
    trace.steps.push({
      name: 'Jev judgments',
      kind: 'model',
      status: 'failed',
      startMs: preparedMs,
      durationMs: measuredMs(evaluationStart),
    });
    trace.steps.push({
      name: 'Apply rules',
      kind: 'code',
      status: 'skipped',
      startMs: measuredMs(started),
      durationMs: 0,
    });
    trace.durationMs = measuredMs(started);
    for (const source of trace.sources) {
      const usage = source.response?.usage ?? source.reportedUsage;
      if (usage) {
        trace.usage.input_tokens += usage.input_tokens;
        trace.usage.output_tokens += usage.output_tokens;
      }
    }
    throw new AssessmentFailure(trace);
  }
  trace.steps.push({
    name: 'Jev judgments',
    kind: 'model',
    status: 'completed',
    startMs: preparedMs,
    durationMs: measuredMs(evaluationStart),
  });
  const aggregationStart = performance.now();
  const aggregationOffset = measuredMs(started);
  const assessments = assumptions.map((assumption) => {
    const evidence = result.judgments
      .filter((j) => j.assumption.id === assumption.id)
      .map((j) => ({
        sourceId: j.source.id,
        relation: j.relation,
        confidence: j.confidence,
      }));
    const status = aggregate(evidence.map((e) => e.relation));
    return {
      assumptionId: assumption.id,
      status,
      question: assumption.questions[status],
      evidence,
    };
  });
  trace.steps.push({
    name: 'Apply rules',
    kind: 'code',
    status: 'completed',
    startMs: aggregationOffset,
    durationMs: measuredMs(aggregationStart),
  });
  trace.status = 'completed';
  trace.durationMs = measuredMs(started);
  trace.usage = {
    ...result.usage,
    complete: trace.sources.every(
      (source) => source.status === 'completed' && source.attempts.length === 1,
    ),
  };
  return {
    assessments,
    sources,
    model: result.model,
    usage: result.usage,
    elapsedMs: trace.durationMs,
    trace,
  };
}
