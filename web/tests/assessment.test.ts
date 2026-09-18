import test from 'node:test';
import assert from 'node:assert/strict';
import { aggregate } from '../lib/assessment.ts';
void test('keeps supporting and contradicting source statements visible as a conflict', () => {
  assert.equal(aggregate(['supports', 'contradicts', 'insufficient']), 'mixed');
  assert.equal(aggregate(['insufficient']), 'insufficient');
});
import { assessCase } from '../lib/assessment.ts';
import { assumptions, baseSources } from '../lib/case.ts';
void test('assessment preserves every source and chooses the conflict follow-up', async () => {
  const result = await assessCase([], async (pairs) => ({
    model: 'test-double',
    judgments: pairs.map((pair) => ({
      ...pair,
      relation: pair.source.id === 'founder' ? 'supports' : 'contradicts',
      confidence: 0.9,
    })),
    usage: { input_tokens: 0, output_tokens: 0 },
  }));
  assert.equal(result.assessments[0].status, 'mixed');
  assert.equal(result.assessments[0].evidence.length, baseSources.length);
  assert.equal(result.assessments[0].question, assumptions[0].questions.mixed);
  assert.equal(result.sources[0].text, baseSources[0].text);
});
void test('mixed source stays mixed even without a separate contradicting source', () => {
  assert.equal(aggregate(['mixed', 'supports']), 'mixed');
  assert.equal(aggregate(['contradicts', 'insufficient']), 'contradicts');
});
void test('a new note supports an unknown assumption without removing older sources', async () => {
  const evaluate = async (pairs: import('../lib/assessment.ts').Pair[]) => ({
    model: 'test-double',
    judgments: pairs.map((pair) => ({
      ...pair,
      relation: (pair.source.id === 'note-1'
        ? 'supports'
        : 'insufficient') as import('../lib/assessment.ts').Relation,
      confidence: 0.6,
    })),
    usage: { input_tokens: 0, output_tokens: 0 },
  });
  const result = await assessCase(['New attributed statement'], evaluate);
  assert.equal(result.assessments[1].status, 'supports');
  assert.equal(result.sources.length, 4);
  assert.equal(result.sources[3].text, 'New attributed statement');
  assert.equal(result.assessments[1].evidence[3].confidence, 0.6);
});
void test('provider failure cannot be presented as a successful empty assessment', async () => {
  await assert.rejects(
    () =>
      assessCase([], async () => {
        throw new Error('offline');
      }),
    /offline/,
  );
});
