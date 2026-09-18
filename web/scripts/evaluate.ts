import { readFile, writeFile } from 'node:fs/promises';
import { evaluatePairs, buildRequest } from '../lib/server/jev.ts';
import { assumptions, baseSources, sampleNote } from '../lib/case.ts';
import { assessCase } from '../lib/assessment.ts';
import type { Pair, Relation } from '../lib/assessment.ts';
const cases = JSON.parse(
  await readFile(new URL('../eval/cases.json', import.meta.url), 'utf8'),
) as { id: string; claim: string; text: string; expected: Relation }[];
const pairs: Pair[] = cases.map((c) => ({
  assumption: { ...assumptions[0], id: c.id, claim: c.claim },
  source: { ...baseSources[0], id: c.id, text: c.text },
}));
const key = process.env.TYPESAFE_API_KEY ?? '';
const start = Date.now();
const result = await evaluatePairs(pairs, key);
const comparisons = cases.map((c, i) => ({
  id: c.id,
  expected: c.expected,
  actual: result.judgments[i].relation,
  confidence: result.judgments[i].confidence,
  pass: c.expected === result.judgments[i].relation,
}));
const corpus = {
  stage: 'implementation-and-validation',
  at: new Date().toISOString(),
  model: result.model,
  requests: pairs.map((pair) => buildRequest([pair])),
  comparisons,
  usage: result.usage,
  elapsedMs: Date.now() - start,
  note: 'Small synthetic labeled corpus. Not a general accuracy estimate or security guarantee.',
};
await writeFile(
  '../docs/jev/corpus.json',
  JSON.stringify(corpus, null, 2) + '\n',
);
console.log(
  JSON.stringify({
    model: result.model,
    passed: comparisons.filter((c) => c.pass).length,
    total: cases.length,
    comparisons,
    usage: result.usage,
    elapsedMs: corpus.elapsedMs,
  }),
);
const initial = await assessCase([], (p) => evaluatePairs(p, key));
const updated = await assessCase([sampleNote], (p) => evaluatePairs(p, key));
await writeFile(
  '../docs/jev/case-flow.json',
  JSON.stringify({ stage: 'live-case-flow', initial, updated }, null, 2) + '\n',
);
console.log(
  JSON.stringify({
    before: initial.assessments.map((a) => [a.assumptionId, a.status]),
    after: updated.assessments.map((a) => [a.assumptionId, a.status]),
  }),
);
if (
  comparisons.some((c) => !c.pass) ||
  initial.assessments[0].status !== 'mixed' ||
  initial.assessments[1].status !== 'insufficient' ||
  updated.assessments[1].status !== 'supports'
)
  process.exitCode = 1;
