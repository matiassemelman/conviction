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
export type Judgment = Pair & { relation: Relation; confidence: number };
export type Evaluation = {
  model: string;
  judgments: Judgment[];
  usage: { input_tokens: number; output_tokens: number };
};
export type Evaluate = (pairs: Pair[]) => Promise<Evaluation>;
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
  const started = Date.now();
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
  const result = await evaluate(pairs);
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
  return {
    assessments,
    sources,
    model: result.model,
    usage: result.usage,
    elapsedMs: Date.now() - started,
  };
}
