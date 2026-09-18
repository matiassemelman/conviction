import type { Assessment, CaseResult, Relation } from './assessment.ts';
import { assumptions } from './case.ts';
import type { Source } from './case.ts';

export const relationLabels: Record<Relation, string> = {
  supports: 'Supports this claim',
  contradicts: 'Contradicts this claim',
  mixed: 'Contains conflicting evidence',
  insufficient: 'Does not establish this claim',
};

// Authored explanations of the existing judgments; no generated prose or new inference.
const headlines: Record<string, Record<Relation, string>> = {
  payments: {
    supports:
      'The sources support the payment claim. Payments are not independently verified.',
    contradicts:
      'The sources challenge the claim that three customers have paid.',
    mixed:
      'The documents disagree about payments. The claim remains unresolved.',
    insufficient:
      'The documents do not establish whether three customers have paid.',
  },
  retention: {
    supports:
      'The sources report weekly usage. The underlying activity still needs verification.',
    contradicts:
      'The sources challenge the claim that all three teams used the product every week.',
    mixed:
      'The sources disagree about weekly usage. The claim remains unresolved.',
    insufficient:
      'The documents do not establish weekly usage by all three teams.',
  },
  acquisition: {
    supports:
      'The sources report a channel beyond founder introductions. Repeatability still needs verification.',
    contradicts:
      'The sources challenge the claim of a repeatable channel beyond the founder.',
    mixed:
      'The sources disagree about acquisition. The claim remains unresolved.',
    insufficient:
      'The documents do not establish a repeatable channel beyond the founder.',
  },
};

export function describeReview(assessment: Assessment, sources: Source[]) {
  return {
    headline: headlines[assessment.assumptionId][assessment.status],
    explanation: assessment.evidence
      .map((evidence) => {
        const source = sources.find((item) => item.id === evidence.sourceId);
        return `${source?.title ?? evidence.sourceId} ${relationLabels[evidence.relation].toLowerCase()}.`;
      })
      .join(' '),
  };
}

export function describeChanges(previous: CaseResult, current: CaseResult) {
  return current.assessments.map((assessment) => {
    const before = previous.assessments.find(
      (item) => item.assumptionId === assessment.assumptionId,
    );
    return {
      assumptionId: assessment.assumptionId,
      title: assumptions.find((item) => item.id === assessment.assumptionId)!
        .title,
      before: before?.status,
      after: assessment.status,
      addedEvidence: assessment.evidence
        .filter(
          (evidence) =>
            !before?.evidence.some(
              (item) => item.sourceId === evidence.sourceId,
            ),
        )
        .map((evidence) => ({
          title: current.sources.find(
            (source) => source.id === evidence.sourceId,
          )!.title,
          relation: evidence.relation,
        })),
    };
  });
}
