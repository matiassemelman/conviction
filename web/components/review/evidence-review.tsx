import type { ReactNode } from 'react';
import type { Assessment } from '@/lib/assessment';
import type { Assumption, Source } from '@/lib/case';
import { describeReview, relationLabels } from '@/lib/review';

export function EvidenceReview({
  assumption,
  assessment,
  sources,
  children,
}: {
  assumption: Assumption;
  assessment?: Assessment;
  sources: Source[];
  children?: ReactNode;
}) {
  const review = assessment && describeReview(assessment, sources);
  return (
    <section className="evidence-review" aria-label={assumption.title}>
      <p className="review-claim">
        <strong>Claim under review:</strong> {assumption.claim}
      </p>
      {review && (
        <div className={`review-finding ${assessment.status}`}>
          <h2 id={`finding-${assumption.id}`} tabIndex={-1}>
            {review.headline}
          </h2>
          <p>{review.explanation}</p>
          <div className="review-next">
            <h3>What to ask next</h3>
            <p>{assessment.question}</p>
          </div>
        </div>
      )}
      <h2 className="sources-heading">
        {assessment
          ? 'Check the finding against the sources'
          : 'Read the source documents'}
      </h2>
      <div className="review-sources">
        {sources.map((source) => {
          const judgment = assessment?.evidence.find(
            (item) => item.sourceId === source.id,
          );
          return (
            <article className="source" key={source.id}>
              <h3>{source.title}</h3>
              <p className="source-meta">{source.attribution}</p>
              {judgment && (
                <span className={`status ${judgment.relation}`}>
                  {relationLabels[judgment.relation]}
                </span>
              )}
              <blockquote>{source.text}</blockquote>
              {judgment?.confidence !== undefined && (
                <details className="source-meta">
                  <summary>Judgment detail</summary>
                  <p>
                    Model distribution concentration:{' '}
                    {Math.round(judgment.confidence * 100)}%. This is not a
                    probability that the claim is true or the judgment is
                    correct.
                  </p>
                </details>
              )}
            </article>
          );
        })}
      </div>
      {children}
    </section>
  );
}
