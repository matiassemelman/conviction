import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { evaluatePairs } from '../lib/server/jev.ts';
import { evaluateOpenAI } from '../lib/server/openai.ts';
import { assumptions, baseSources } from '../lib/case.ts';
import { models, modelIds, estimateCost } from '../lib/comparison.ts';
import type { ModelId } from '../lib/comparison.ts';
import { summarizeBenchmark } from '../lib/benchmark.ts';
import type { BenchmarkReport, BenchmarkSample } from '../lib/benchmark.ts';
import type { Evaluate, Relation } from '../lib/assessment.ts';
import { addUsage } from '../lib/trace.ts';
import type { SourceTrace, Usage } from '../lib/trace.ts';
const data = await readFile(
  new URL('../evaluation/holdout.json', import.meta.url),
  'utf8',
);
const hash = createHash('sha256').update(data).digest('hex');
if (hash !== '4680da4a230cc492ff760f2e08791ae17c0fcdd5659c393441a9ca5ea390d23f')
  throw new Error('Frozen evaluation set changed. Review before measuring.');
const cases = JSON.parse(data) as {
  id: string;
  claim: string;
  source: string;
  expected: Relation;
}[];
const providers: Record<ModelId, Evaluate> = {
  jev: (p, t) => evaluatePairs(p, process.env.TYPESAFE_API_KEY ?? '', fetch, t),
  luna: (p, t) =>
    evaluateOpenAI(
      p,
      process.env.OPENAI_API_KEY ?? '',
      'gpt-5.6-luna',
      fetch,
      t,
    ),
  terra: (p, t) =>
    evaluateOpenAI(
      p,
      process.env.OPENAI_API_KEY ?? '',
      'gpt-5.6-terra',
      fetch,
      t,
    ),
};
const samples: Record<ModelId, BenchmarkSample[]> = {
  jev: [],
  luna: [],
  terra: [],
};
const totals: Record<ModelId, Usage & { complete: boolean }> =
  Object.fromEntries(
    modelIds.map((id) => [
      id,
      { input_tokens: 0, output_tokens: 0, complete: true },
    ]),
  ) as Record<ModelId, Usage & { complete: boolean }>;
const actualModels: Record<ModelId, Set<string>> = {
  jev: new Set(),
  luna: new Set(),
  terra: new Set(),
};
const receipts: { id: ModelId; repetition: number; spans: SourceTrace[] }[] =
  [];
for (let repetition = 0; repetition < 3; repetition++) {
  const order = [
    ...modelIds.slice(repetition),
    ...modelIds.slice(0, repetition),
  ];
  for (const id of order) {
    const spans: SourceTrace[] = [];
    try {
      await providers[id](
        cases.map((c) => ({
          assumption: { ...assumptions[0], id: c.id, claim: c.claim },
          source: { ...baseSources[0], id: c.id, title: c.id, text: c.source },
        })),
        { originMs: performance.now(), record: (s) => spans.push(s) },
      );
    } catch {
      totals[id].complete = false;
    }
    for (const c of cases) {
      const span = spans.find((s) => s.sourceId === c.id);
      const answer = span?.response?.answers.find(
        (a) => a.assumptionId === c.id,
      );
      samples[id].push({
        id: c.id,
        expected: c.expected,
        actual: answer?.relation,
        durationMs: span?.durationMs ?? 0,
      });
      if (span?.response) actualModels[id].add(span.response.model);
      const usage = span?.response?.usage ?? span?.reportedUsage;
      if (usage) addUsage(totals[id], usage);
      if (span?.status !== 'completed' || span.attempts.length !== 1)
        totals[id].complete = false;
    }
    receipts.push({ id, repetition: repetition + 1, spans });
    console.log(
      JSON.stringify({
        model: models[id].label,
        repetition: repetition + 1,
        ...summarizeBenchmark(samples[id]),
      }),
    );
  }
}
const report: BenchmarkReport = {
  recordedAt: new Date().toISOString(),
  datasetSha256: hash,
  distinctCases: cases.length,
  repetitions: 3,
  settings:
    'Same rubric; one source and claim per request; up to 3 concurrent requests per model. Models run sequentially in rotating order. OpenAI reasoning none, strict JSON output. Timings include network and validation; median/p95 use successful calls only. Cached tokens use provider-reported rates. Local runner, not a production latency guarantee.',
  models: modelIds.map((id) => ({
    id,
    actualModels: [...actualModels[id]],
    summary: summarizeBenchmark(samples[id]),
    costUsd: estimateCost(id, totals[id]).usd,
    costComplete: totals[id].complete,
    samples: samples[id],
  })),
};
await writeFile(
  new URL('../evaluation/results.json', import.meta.url),
  JSON.stringify(report, null, 2) + '\n',
);
await mkdir(new URL('../../docs/comparison', import.meta.url), {
  recursive: true,
});
await writeFile(
  new URL('../../docs/comparison/receipts.json', import.meta.url),
  JSON.stringify(
    { recordedAt: report.recordedAt, datasetSha256: hash, receipts },
    null,
    2,
  ) + '\n',
);
console.log(
  JSON.stringify({
    done: true,
    models: report.models.map(({ samples: _samples, ...model }) => model),
  }),
);
