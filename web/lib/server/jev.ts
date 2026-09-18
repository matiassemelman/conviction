import type { TraceContext, Usage } from '../trace.ts';
import type { Evaluation, Pair, Relation } from '../assessment.ts';
import { evaluateProvider } from './provider.ts';
import { relationCriteria, relationInstructions } from './rubric.ts';
export { relationCriteria } from './rubric.ts';
export function buildRequest(pairs: Pair[]) {
  return {
    model: 'jev-latest',
    state: {
      pairs: pairs.map((p) => ({
        claim: p.assumption.claim,
        source: p.source.text,
      })),
    },
    questions: Object.fromEntries(
      pairs.map((_, i) => [
        `relation_${i}`,
        {
          type: 'choice',
          instructions: relationInstructions(i),
          criteria: relationCriteria,
        },
      ]),
    ),
  };
}
const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);
const isProbability = (v: unknown): v is number =>
  typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= 1;
function decode(value: unknown, pairs: Pair[]): Evaluation {
  if (
    !isObject(value) ||
    typeof value.model !== 'string' ||
    !isObject(value.answers) ||
    !isObject(value.usage)
  )
    throw new Error('Invalid provider response.');
  const answers = value.answers;
  const judgments = pairs.map((pair, index) => {
    const answer = answers[`relation_${index}`];
    if (
      !isObject(answer) ||
      answer.type !== 'choice' ||
      typeof answer.choice !== 'string' ||
      !Object.hasOwn(relationCriteria, answer.choice) ||
      !isProbability(answer.confidence) ||
      !isObject(answer.probabilities)
    )
      throw new Error('Invalid provider judgment.');
    const probs = Object.keys(relationCriteria).map(
      (key) => (answer.probabilities as Record<string, unknown>)[key],
    );
    if (
      !probs.every(isProbability) ||
      Math.abs(probs.reduce((a, b) => a + b, 0) - 1) > 0.02
    )
      throw new Error('Invalid provider distribution.');
    return {
      ...pair,
      relation: answer.choice as Relation,
      confidence: answer.confidence,
      probabilities: Object.fromEntries(
        Object.keys(relationCriteria).map((key) => [
          key,
          (answer.probabilities as Record<string, number>)[key],
        ]),
      ) as Record<Relation, number>,
    };
  });
  const { input_tokens, output_tokens } = value.usage;
  if (
    typeof input_tokens !== 'number' ||
    typeof output_tokens !== 'number' ||
    !Number.isSafeInteger(input_tokens) ||
    !Number.isSafeInteger(output_tokens) ||
    input_tokens < 0 ||
    output_tokens < 0
  )
    throw new Error('Invalid provider usage.');
  return {
    model: value.model,
    judgments,
    usage: { input_tokens, output_tokens },
  };
}
function reportedUsage(value: unknown): Usage | undefined {
  if (!isObject(value) || !isObject(value.usage)) return;
  const { input_tokens, output_tokens } = value.usage;
  if (
    typeof input_tokens === 'number' &&
    typeof output_tokens === 'number' &&
    Number.isSafeInteger(input_tokens) &&
    Number.isSafeInteger(output_tokens) &&
    input_tokens >= 0 &&
    output_tokens >= 0
  )
    return { input_tokens, output_tokens };
}
export function evaluatePairs(
  pairs: Pair[],
  apiKey: string,
  request: typeof fetch = fetch,
  trace?: TraceContext,
): Promise<Evaluation> {
  return evaluateProvider(
    {
      name: 'TypeSafe',
      url: 'https://api.typesafe.ai/v1/systemone',
      retryStatuses: [429, 529],
      buildRequest,
      decode,
      reportedUsage,
    },
    pairs,
    apiKey,
    request,
    trace,
  );
}
