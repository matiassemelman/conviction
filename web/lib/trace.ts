import type { Relation } from './assessment.ts';
export type Usage = { input_tokens: number; output_tokens: number };
export type TraceStatus = 'completed' | 'failed' | 'skipped';
export type ProviderRequest = {
  model: string;
  state: { pairs: { claim: string; source: string }[] };
  questions: Record<
    string,
    { type: string; instructions: string; criteria: Record<string, string> }
  >;
};
export type TraceAnswer = {
  assumptionId: string;
  relation: Relation;
  confidence: number;
  probabilities: Record<Relation, number>;
};
export type RequestAttempt = {
  number: number;
  startMs: number;
  durationMs: number;
  httpStatus?: number;
  outcome: 'completed' | 'retry' | 'failed';
};
export type SourceTrace = {
  sourceId: string;
  title: string;
  status: TraceStatus;
  startMs: number | null;
  durationMs: number;
  request?: ProviderRequest;
  attempts: RequestAttempt[];
  response?: { model: string; usage: Usage; answers: TraceAnswer[] };
  reportedUsage?: Usage;
  errorCode?:
    | 'not_configured'
    | 'http_error'
    | 'network_or_timeout'
    | 'invalid_response';
};
export type RunTrace = {
  id: string;
  startedAt: string;
  status: 'completed' | 'failed';
  durationMs: number;
  sourceCount: number;
  assumptionCount: number;
  steps: {
    name: string;
    kind: 'code' | 'model';
    status: TraceStatus;
    startMs: number;
    durationMs: number;
  }[];
  sources: SourceTrace[];
  usage: Usage & { complete: boolean };
};
export type TraceContext = {
  originMs: number;
  record: (source: SourceTrace) => void;
};
export const measuredMs = (start: number) =>
  Math.max(0, Math.round((performance.now() - start) * 10) / 10);
export class AssessmentFailure extends Error {
  readonly trace: RunTrace;
  constructor(trace: RunTrace) {
    super('Analysis failed.');
    this.name = 'AssessmentFailure';
    this.trace = trace;
  }
}
