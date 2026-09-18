import type { Evaluation, Pair, Relation } from '../assessment.ts';
import type { TraceContext, Usage } from '../trace.ts';
import { evaluateProvider } from './provider.ts';
import { relationCriteria, relationInstructions } from './rubric.ts';
export type OpenAIModel = 'gpt-5.6-luna' | 'gpt-5.6-terra';
const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);
const isCount = (v: unknown): v is number =>
  typeof v === 'number' && Number.isSafeInteger(v) && v >= 0;
function reportedUsage(raw: unknown): Usage | undefined {
  if (!isObject(raw) || !isObject(raw.usage)) return;
  const { input_tokens, output_tokens, input_tokens_details } = raw.usage;
  if (!isCount(input_tokens) || !isCount(output_tokens)) return;
  if (
    !isObject(input_tokens_details) ||
    !isCount(input_tokens_details.cached_tokens) ||
    input_tokens_details.cached_tokens > input_tokens
  )
    return;
  return {
    input_tokens,
    output_tokens,
    cached_input_tokens: input_tokens_details.cached_tokens,
  };
}
function buildRequest(pairs: Pair[], model: OpenAIModel) {
  const keys = pairs.map((_, i) => `relation_${i}`);
  return {
    model,
    store: false,
    reasoning: { effort: 'none' },
    max_output_tokens: 2048,
    instructions: JSON.stringify({
      questions: Object.fromEntries(
        keys.map((key, i) => [
          key,
          { instructions: relationInstructions(i), criteria: relationCriteria },
        ]),
      ),
    }),
    input: JSON.stringify({
      pairs: pairs.map((p) => ({
        claim: p.assumption.claim,
        source: p.source.text,
      })),
    }),
    text: {
      format: {
        type: 'json_schema',
        name: 'source_relations',
        strict: true,
        schema: {
          type: 'object',
          properties: Object.fromEntries(
            keys.map((key) => [
              key,
              { type: 'string', enum: Object.keys(relationCriteria) },
            ]),
          ),
          required: keys,
          additionalProperties: false,
        },
      },
    },
  };
}
function decode(raw: unknown, pairs: Pair[], model: OpenAIModel): Evaluation {
  if (
    !isObject(raw) ||
    raw.status !== 'completed' ||
    typeof raw.model !== 'string' ||
    !(
      raw.model === model ||
      (raw.model.startsWith(`${model}-`) &&
        /^\d{4}-\d{2}-\d{2}$/.test(raw.model.slice(model.length + 1)))
    ) ||
    !Array.isArray(raw.output)
  )
    throw new Error('Invalid provider response.');
  if (
    raw.output.some(
      (item) =>
        !isObject(item) ||
        !['message', 'reasoning'].includes(String(item.type)),
    )
  )
    throw new Error('Invalid provider response.');
  const messages = raw.output.filter(
    (item) => isObject(item) && item.type === 'message',
  );
  if (messages.length !== 1) throw new Error('Invalid provider response.');
  const message = messages[0];
  if (
    !isObject(message) ||
    message.status !== 'completed' ||
    message.role !== 'assistant' ||
    !Array.isArray(message.content) ||
    message.content.length !== 1
  )
    throw new Error('Invalid provider response.');
  const content = message.content[0];
  if (
    !isObject(content) ||
    content.type !== 'output_text' ||
    typeof content.text !== 'string'
  )
    throw new Error('Invalid provider response.');
  let answers: unknown;
  try {
    answers = JSON.parse(content.text);
  } catch {
    throw new Error('Invalid provider judgment.');
  }
  if (!isObject(answers) || Object.keys(answers).length !== pairs.length)
    throw new Error('Invalid provider judgment.');
  const judgments = pairs.map((pair, i) => {
    const relation = answers[`relation_${i}`];
    if (
      typeof relation !== 'string' ||
      !Object.hasOwn(relationCriteria, relation)
    )
      throw new Error('Invalid provider judgment.');
    return { ...pair, relation: relation as Relation };
  });
  const usage = reportedUsage(raw);
  if (!usage) throw new Error('Invalid provider usage.');
  return { model: raw.model, judgments, usage };
}
export function evaluateOpenAI(
  pairs: Pair[],
  apiKey: string,
  model: OpenAIModel,
  request: typeof fetch = fetch,
  trace?: TraceContext,
): Promise<Evaluation> {
  return evaluateProvider(
    {
      name: 'OpenAI',
      url: 'https://api.openai.com/v1/responses',
      retryStatuses: [429, 503],
      buildRequest: (pairs) => buildRequest(pairs, model),
      decode: (raw, pairs) => decode(raw, pairs, model),
      reportedUsage,
    },
    pairs,
    apiKey,
    request,
    trace,
  );
}
