import type { CaseResult } from './assessment.ts';
import type { RunTrace, Usage } from './trace.ts';
export const models = {
  jev: {
    label: 'Jev',
    model: 'jev-latest',
    input: 0.042,
    cached: 0.042,
    output: 0,
    pricingUrl:
      'https://typesafe.ai/blog/introducing-system-one-models-and-jev',
  },
  luna: {
    label: 'GPT-5.6 Luna',
    model: 'gpt-5.6-luna',
    input: 0.2,
    cached: 0.02,
    output: 1.2,
    pricingUrl: 'https://developers.openai.com/api/docs/models/gpt-5.6-luna',
  },
  terra: {
    label: 'GPT-5.6 Terra',
    model: 'gpt-5.6-terra',
    input: 2,
    cached: 0.2,
    output: 12,
    pricingUrl: 'https://developers.openai.com/api/docs/models/gpt-5.6-terra',
  },
} as const;
export type ModelId = keyof typeof models;
export const modelIds = Object.keys(models) as ModelId[];
export const pricingDate = '2026-09-18';
export function estimateCost(
  id: ModelId,
  usage: Usage & { complete: boolean },
) {
  const rates = models[id];
  const cached = usage.cached_input_tokens ?? 0;
  return {
    usd:
      !usage.complete && usage.input_tokens === 0 && usage.output_tokens === 0
        ? null
        : ((usage.input_tokens - cached) * rates.input +
            cached * rates.cached +
            usage.output_tokens * rates.output) /
          1_000_000,
    complete: usage.complete,
  };
}
export type ModelComparison = {
  id: ModelId;
  status: 'completed' | 'failed';
  result?: CaseResult;
  trace?: RunTrace;
  cost: ReturnType<typeof estimateCost>;
  error?: string;
};
export type Comparison = {
  id: string;
  startedAt: string;
  runs: ModelComparison[];
};
