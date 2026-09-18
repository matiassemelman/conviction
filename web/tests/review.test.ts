import test from 'node:test';
import assert from 'node:assert/strict';
import { assessCase } from '../lib/assessment.ts';
import { describeReview } from '../lib/review.ts';

void test('the readable finding follows actual source judgments, not the expected demo answer', async () => {
  const result = await assessCase([], async (pairs) => ({
    model: 'test-double',
    judgments: pairs.map((pair) => ({
      ...pair,
      relation: pair.source.id === 'finance' ? 'supports' : 'insufficient',
    })),
    usage: { input_tokens: 0, output_tokens: 0 },
  }));
  const review = describeReview(
    result.assessments[0],
    [...result.sources].reverse(),
  );
  assert.equal(
    review.headline,
    'The sources support the payment claim. Payments are not independently verified.',
  );
  assert.match(review.explanation, /Finance note supports this claim/);
  assert.match(
    review.explanation,
    /Founder update does not establish this claim/,
  );
  assert.doesNotMatch(review.explanation, /Founder update supports/);
});

import { describeChanges } from '../lib/review.ts';
import type { Evaluate } from '../lib/assessment.ts';
import { sampleNote } from '../lib/case.ts';

void test('adding usage evidence highlights that change while retaining the payment conflict and every source', async () => {
  const evaluate: Evaluate = async (pairs) => ({
    model: 'test-double',
    judgments: pairs.map((pair) => ({
      ...pair,
      relation:
        pair.assumption.id === 'payments'
          ? pair.source.id === 'founder'
            ? 'supports'
            : pair.source.id === 'finance'
              ? 'contradicts'
              : 'insufficient'
          : pair.assumption.id === 'retention' && pair.source.id === 'note-1'
            ? 'supports'
            : 'insufficient',
    })),
    usage: { input_tokens: 0, output_tokens: 0 },
  });
  const before = await assessCase([], evaluate);
  const after = await assessCase([sampleNote], evaluate);
  const changes = describeChanges(before, after);
  assert.deepEqual(
    changes.map(({ assumptionId, before, after }) => ({
      assumptionId,
      before,
      after,
    })),
    [
      { assumptionId: 'payments', before: 'mixed', after: 'mixed' },
      { assumptionId: 'retention', before: 'insufficient', after: 'supports' },
      {
        assumptionId: 'acquisition',
        before: 'insufficient',
        after: 'insufficient',
      },
    ],
  );
  assert.deepEqual(changes[1].addedEvidence, [
    { title: 'Analyst note 1', relation: 'supports' },
  ]);
  assert.deepEqual(changes[0].addedEvidence, [
    { title: 'Analyst note 1', relation: 'insufficient' },
  ]);
  assert.match(
    describeReview(after.assessments[0], after.sources).headline,
    /evidence about payments is conflicting/,
  );
  assert.deepEqual(after.sources.slice(0, 3), before.sources);
});

void test('an internally conflicting source is not described as disagreement between documents', async () => {
  const result = await assessCase([], async (pairs) => ({
    model: 'test-double',
    judgments: pairs.map((pair) => ({
      ...pair,
      relation: pair.source.id === 'founder' ? 'mixed' : 'insufficient',
    })),
    usage: { input_tokens: 0, output_tokens: 0 },
  }));
  for (const assessment of result.assessments) {
    const review = describeReview(assessment, result.sources);
    assert.match(review.headline, /evidence.*conflicting/);
    assert.doesNotMatch(review.headline, /sources disagree|documents disagree/);
    assert.match(
      review.explanation,
      /Founder update contains conflicting evidence/,
    );
  }
});
