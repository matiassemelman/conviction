'use client';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { assumptions } from '@/lib/case';
import { statusLabels } from '@/lib/assessment';
import type { CaseResult } from '@/lib/assessment';
import type { RunTrace, SourceTrace } from '@/lib/trace';
const duration = (ms: number) =>
  ms < 1
    ? '<1 ms'
    : ms < 1000
      ? `${Math.round(ms)} ms`
      : `${(ms / 1000).toFixed(2)} s`;
const errors = {
  not_configured: 'Provider configuration unavailable',
  http_error: 'Provider rejected the request',
  network_or_timeout: 'Network failure or timeout',
  invalid_response: 'Response failed validation',
};
function SourceSpan({ source, total }: { source: SourceTrace; total: number }) {
  const start = source.startMs ?? 0;
  return (
    <Collapsible className={`trace-source ${source.status}`}>
      <CollapsibleTrigger className="trace-source-trigger">
        <span className="trace-source-name">
          <span className={`trace-dot ${source.status}`} aria-hidden="true" />
          {source.title}
          <span className="trace-chevron" aria-hidden="true">
            ⌄
          </span>
        </span>
        <span className="trace-bar-track" aria-hidden="true">
          {source.startMs !== null && (
            <span
              className={`trace-bar ${source.status}`}
              style={{
                left: `${Math.min(100, (start / Math.max(total, 1)) * 100)}%`,
                width: `${Math.min(100, (source.durationMs / Math.max(total, 1)) * 100)}%`,
              }}
            />
          )}
        </span>
        <span className="trace-source-time">
          {source.status === 'skipped'
            ? 'Not started'
            : duration(source.durationMs)}
          <small>
            {source.status === 'skipped'
              ? 'Earlier batch failed'
              : `${source.attempts.length} attempt${source.attempts.length === 1 ? '' : 's'} · ${source.status}`}
          </small>
        </span>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="trace-source-detail">
          {source.status === 'skipped' ? (
            <p>
              This source was not sent. The run stopped before its batch
              started.
            </p>
          ) : (
            <>
              <p className="muted">
                Started +{duration(start)} from the beginning of the run.{' '}
                {source.response
                  ? `Model: ${source.response.model}.`
                  : 'No validated model response.'}{' '}
                {source.errorCode ? errors[source.errorCode] + '.' : ''}
              </p>
              <div className="trace-attempts">
                {source.attempts.map((attempt) => (
                  <div key={attempt.number}>
                    <strong>Attempt {attempt.number}</strong>
                    <span>
                      {attempt.httpStatus
                        ? `HTTP ${attempt.httpStatus}`
                        : 'No HTTP response'}
                    </span>
                    <span>{duration(attempt.durationMs)}</span>
                    <span>
                      {attempt.outcome === 'retry'
                        ? 'Retry scheduled'
                        : attempt.outcome}
                    </span>
                  </div>
                ))}
              </div>
              {source.response && (
                <div className="trace-answers">
                  {source.response.answers.map((answer) => (
                    <div key={answer.assumptionId}>
                      <span>
                        {assumptions.find((a) => a.id === answer.assumptionId)
                          ?.title ?? answer.assumptionId}
                      </span>
                      <span className={`status ${answer.relation}`}>
                        {answer.relation}
                      </span>
                    </div>
                  ))}
                </div>
              )}
              <div className="trace-payloads">
                <details>
                  <summary>Request body sent to Jev</summary>
                  <pre>{JSON.stringify(source.request, null, 2)}</pre>
                </details>
                <details>
                  <summary>Validated response</summary>
                  {source.response ? (
                    <>
                      <p className="source-meta">
                        Confidence is distribution concentration, not
                        correctness or business truth.
                      </p>
                      <pre>{JSON.stringify(source.response, null, 2)}</pre>
                    </>
                  ) : (
                    <p>
                      No validated response. Raw error bodies are not retained.
                    </p>
                  )}
                </details>
              </div>
            </>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
export function ExecutionTrace({
  trace,
  result,
  previous,
  busy,
  unavailable,
}: {
  trace: RunTrace | null;
  result: CaseResult | null;
  previous: CaseResult | null;
  busy: boolean;
  unavailable: boolean;
}) {
  if (!trace)
    return (
      <section className="trace-placeholder" aria-label="Execution trace">
        <strong>Execution trace</strong>
        <span>
          {busy
            ? 'Recording this run. The measured trace will appear when the request finishes.'
            : 'Every analysis leaves an inspectable trace: requests, answers, timing and applied rules.'}
        </span>
      </section>
    );
  const attempts = trace.sources.reduce((sum, s) => sum + s.attempts.length, 0);
  const retries = trace.sources.reduce(
    (sum, s) => sum + s.attempts.filter((a) => a.outcome === 'retry').length,
    0,
  );
  const outcome =
    trace.id === result?.trace.id && trace.status === 'completed'
      ? result
      : null;
  return (
    <Collapsible key={trace.id} defaultOpen className="trace-panel">
      <CollapsibleTrigger className="trace-heading">
        <span>
          <span className="trace-title">Execution trace</span>
          <span className={`trace-run-status ${trace.status}`}>
            {trace.status === 'completed' ? 'Run complete' : 'Run failed'}
          </span>
        </span>
        <span className="trace-heading-meta">
          {duration(trace.durationMs)}
          <span aria-hidden="true">⌄</span>
        </span>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="trace-content">
          <p className="trace-caption">
            {unavailable
              ? 'The latest attempt returned no server trace. This is the previous recorded run.'
              : busy
                ? 'A new run is in progress. This is the previous recorded run.'
                : 'Captured from the actual execution. Expand a source to inspect what Jev received and returned.'}
          </p>
          <div className="trace-meta">
            <span>
              Run <code>{trace.id}</code>
            </span>
            <span>{new Date(trace.startedAt).toLocaleTimeString()}</span>
          </div>
          <div className="trace-metrics">
            <div>
              <strong>
                {trace.sourceCount} × {trace.assumptionCount}
              </strong>
              <span>sources × assumptions</span>
            </div>
            <div>
              <strong>
                {attempts}
                <small> / {retries}</small>
              </strong>
              <span>HTTP attempts / retries</span>
            </div>
            <div>
              <strong>
                {trace.usage.input_tokens.toLocaleString()}
                <small> / {trace.usage.output_tokens.toLocaleString()}</small>
              </strong>
              <span>reported input / output tokens</span>
            </div>
          </div>
          {!trace.usage.complete && (
            <p className="trace-usage-note">
              Partial usage: failed or retried requests may consume tokens that
              were not reported. These are not complete billing totals.
            </p>
          )}
          <ol className="trace-steps">
            {trace.steps.map((step, index) => (
              <li key={step.name} className={step.status}>
                <span className="trace-step-number">{index + 1}</span>
                <div>
                  <strong>{step.name}</strong>
                  <span>
                    {step.kind === 'model' ? 'Jev' : 'Application code'} ·{' '}
                    {step.status === 'skipped'
                      ? 'Not run'
                      : `${duration(step.durationMs)} · ${step.status}`}
                  </span>
                </div>
              </li>
            ))}
          </ol>
          <div className="trace-waterfall-heading">
            <h3>Source requests</h3>
            <span>Shared timeline · up to 3 concurrent</span>
          </div>
          <div className="trace-waterfall">
            {trace.sources.map((source) => (
              <SourceSpan
                key={source.sourceId}
                source={source}
                total={trace.durationMs}
              />
            ))}
          </div>
          <p className="source-meta">
            Bars share the same time origin. Overlap means requests ran in
            parallel. Durations include transport and response validation; they
            do not expose model-internal processing.
          </p>
          {outcome ? (
            <details className="trace-decisions">
              <summary>How the application used these answers</summary>
              <p className="muted">
                A mixed source, or support plus contradiction, produces a
                conflict. Otherwise: support, contradiction, then evidence gap.
                A fixed rule selects the next question.
              </p>
              {outcome.assessments.map((assessment) => {
                const before = previous?.assessments.find(
                  (a) => a.assumptionId === assessment.assumptionId,
                );
                return (
                  <div className="trace-decision" key={assessment.assumptionId}>
                    <h3>
                      {
                        assumptions.find(
                          (a) => a.id === assessment.assumptionId,
                        )?.title
                      }
                    </h3>
                    <p>
                      {before
                        ? `${statusLabels[before.status]} → `
                        : 'Not analyzed → '}
                      <strong>{statusLabels[assessment.status]}</strong>
                    </p>
                    <p className="source-meta">
                      {assessment.evidence
                        .map(
                          (e) =>
                            `${outcome.sources.find((s) => s.id === e.sourceId)?.title}: ${e.relation}`,
                        )
                        .join('; ')}
                    </p>
                    <p>Next question: {assessment.question}</p>
                  </div>
                );
              })}
            </details>
          ) : (
            <p className="trace-usage-note">
              No new assessment was applied. The last successful case and unsent
              draft are preserved.
            </p>
          )}
          <p className="trace-footnote">
            This is an execution record, not Jev’s hidden reasoning. It stays in
            this browser session; refreshing or resetting clears it.
            Authorization headers and credentials are never recorded.
          </p>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
