import { assessCase } from '../assessment.ts';
import type { Evaluate } from '../assessment.ts';
import { AssessmentFailure } from '../trace.ts';
import { estimateCost, modelIds, models } from '../comparison.ts';
import type { Comparison, ModelComparison, ModelId } from '../comparison.ts';
export async function compareCase(
  notes: string[],
  providers: Record<ModelId, Evaluate>,
): Promise<Comparison> {
  const id = crypto.randomUUID();
  const startedAt = new Date().toISOString();
  const runs = await Promise.all(
    modelIds.map(async (id): Promise<ModelComparison> => {
      try {
        const result = await assessCase(notes, providers[id], models[id].label);
        return {
          id,
          status: 'completed',
          result,
          trace: result.trace,
          cost: estimateCost(id, result.trace.usage),
        };
      } catch (error) {
        const trace =
          error instanceof AssessmentFailure ? error.trace : undefined;
        return {
          id,
          status: 'failed',
          trace,
          cost: trace
            ? estimateCost(id, trace.usage)
            : { usd: null, complete: false },
          error:
            'This model could not complete the analysis. Inspect its trace and try again.',
        };
      }
    }),
  );
  return { id, startedAt, runs };
}
