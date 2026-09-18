'use client';
import { useEffect, useRef, useState } from 'react';
import { ModelComparison } from '@/components/comparison/model-comparison';
import { ExecutionTrace } from '@/components/trace/execution-trace';
import type { RunTrace } from '@/lib/trace';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { assumptions, baseSources, sampleNote } from '@/lib/case';
import { statusLabels } from '@/lib/assessment';
import type { CaseResult } from '@/lib/assessment';
import { EvidenceReview } from '@/components/review/evidence-review';
import { describeChanges, relationLabels } from '@/lib/review';
export default function Home() {
  const [selected, setSelected] = useState('retention');
  const [result, setResult] = useState<CaseResult | null>(null);
  const [previous, setPrevious] = useState<CaseResult | null>(null);
  const [notes, setNotes] = useState<string[]>([]);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [comparisonBusy, setComparisonBusy] = useState(false);
  const [resetVersion, setResetVersion] = useState(0);
  const locked = busy || comparisonBusy;
  const [error, setError] = useState('');
  const [trace, setTrace] = useState<RunTrace | null>(null);
  const [traceUnavailable, setTraceUnavailable] = useState(false);
  const inFlight = useRef(false);
  const assumption = assumptions.find((a) => a.id === selected)!;
  const assessment = result?.assessments.find(
    (a) => a.assumptionId === selected,
  );
  const payments = result?.assessments.find(
    (a) => a.assumptionId === 'payments',
  );
  const changes = result && previous ? describeChanges(previous, result) : [];
  useEffect(() => {
    if (result)
      document
        .getElementById(previous ? 'review-changes' : 'finding-payments')
        ?.focus();
  }, [result, previous]);
  useEffect(() => {
    if (error) document.getElementById('review-error')?.focus();
  }, [error]);
  const sources = result?.sources ?? baseSources;
  async function analyze(addNote = false) {
    if (inFlight.current || comparisonBusy) return;
    const nextNotes = addNote ? [...notes, draft.trim()] : notes;
    if (
      addNote &&
      (draft.trim().length < 2 ||
        draft.trim().length > 2000 ||
        notes.length >= 4)
    )
      return;
    inFlight.current = true;
    setBusy(true);
    setError('');
    let receivedTrace = false;
    try {
      const response = await fetch('/api/assess', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: nextNotes }),
        signal: AbortSignal.timeout(50000),
      });
      const data = (await response.json().catch(() => {
        if (response.ok)
          throw new Error(
            'The service returned an unreadable response. Please try again.',
          );
        return {
          error:
            response.status === 429
              ? 'Too many live requests. Wait a minute and try again. Your existing results and draft are unchanged.'
              : 'The service could not respond. Your existing results and draft are unchanged.',
        };
      })) as CaseResult & {
        code?: string;
        error?: string;
      };
      if (
        !response.ok &&
        (response.status === 429 ||
          [
            'demo_daily_limit',
            'demo_visitor_limit',
            'demo_unavailable',
          ].includes(data.code ?? ''))
      ) {
        setError(
          data.error ??
            'Live runs are temporarily unavailable. Your draft and results are unchanged. The recorded benchmark is still available.',
        );
        return;
      }
      if (data.trace) {
        receivedTrace = true;
        setTrace(data.trace);
        setTraceUnavailable(false);
      } else {
        setTraceUnavailable(true);
      }
      if (!response.ok)
        throw new Error(
          data.error ?? 'Analysis could not be completed. Try again.',
        );
      setPrevious(result);
      setResult(data);
      setNotes(nextNotes);
      if (addNote) setDraft('');
    } catch (err) {
      if (!receivedTrace) setTraceUnavailable(true);
      setError(
        err instanceof TypeError
          ? 'Could not reach the analysis service. Your draft and previous results are unchanged. Try again.'
          : err instanceof Error && err.name !== 'TimeoutError'
            ? err.message
            : 'Analysis timed out. Your draft and previous results are unchanged. Try again.',
      );
    } finally {
      setBusy(false);
      inFlight.current = false;
    }
  }
  function reset() {
    if (inFlight.current || comparisonBusy) return;
    setResetVersion((value) => value + 1);
    setResult(null);
    setPrevious(null);
    setNotes([]);
    setDraft('');
    setError('');
    setSelected('retention');
    setTrace(null);
    setTraceUnavailable(false);
  }
  return (
    <>
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true">
            c
          </span>
          Conviction
        </div>
        <div className="topbar-links">
          <small>Evidence workspace</small>
          <a
            href="https://github.com/matiassemelman/conviction"
            target="_blank"
            rel="noreferrer"
          >
            View code on GitHub
          </a>
        </div>
      </header>
      <main className="workspace guided-review">
        <div className="case-header">
          <div>
            <span className="tag">Fictional case · September 15, 2026</span>
            <h1>Have three Northstar customers paid?</h1>
            <p className="review-intro">
              Northstar makes workflow software for logistics teams. Its founder
              says three customers have paid for the product. You are reviewing
              that claim using a founder update, a finance note and pilot
              interviews.
            </p>
          </div>
          <Button
            variant="outline"
            className="secondary h-auto"
            onClick={reset}
            disabled={locked}
          >
            Reset case
          </Button>
        </div>
        {previous && result && (
          <section className="review-changes" aria-labelledby="review-changes">
            <h2 id="review-changes" tabIndex={-1}>
              What changed in this review
            </h2>
            <p>
              Compared with the previous successful analysis. All earlier
              sources are retained.
            </p>
            <ul>
              {changes.map((change) => (
                <li key={change.assumptionId}>
                  <strong>{change.title}</strong>
                  <span>
                    {change.before !== change.after
                      ? `${change.before ? statusLabels[change.before] : 'Not analyzed'} → ${statusLabels[change.after]}`
                      : `${statusLabels[change.after]} — unchanged`}
                  </span>
                  {change.addedEvidence.map((source) => (
                    <small key={source.title}>
                      {source.title}:{' '}
                      {relationLabels[source.relation].toLowerCase()}.
                    </small>
                  ))}
                </li>
              ))}
            </ul>
          </section>
        )}
        <EvidenceReview
          assumption={assumptions[0]}
          assessment={payments}
          sources={sources}
        >
          <div className="review-action">
            <p>
              The analysis identifies which sources support the claim,
              contradict it or do not establish it. It does not verify payments
              outside these documents.
            </p>
            <Button
              className="primary h-auto"
              onClick={() => analyze()}
              disabled={locked}
            >
              {busy
                ? 'Reviewing the evidence…'
                : result
                  ? 'Review the evidence again'
                  : 'Review the evidence'}
            </Button>
            <p className="source-meta">
              Public demo. Live runs share a daily allowance and a per-network
              limit.
            </p>
          </div>
        </EvidenceReview>
        <div aria-live="polite" aria-atomic="true">
          {busy && (
            <p className="notice">
              Reviewing the source documents. Any findings shown belong to the
              previous successful review.
            </p>
          )}
          {result && !busy && !error && (
            <p className="source-meta">
              Analysis completed · {sources.length} sources ·{' '}
              {(result.elapsedMs / 1000).toFixed(1)}s. Source support is not
              independent verification.
            </p>
          )}
        </div>
        {error && (
          <div
            id="review-error"
            className="notice error"
            role="alert"
            tabIndex={-1}
          >
            <p>{error}</p>
            {result && (
              <p>
                No new finding was applied. The findings above belong to the
                previous successful review.
              </p>
            )}
          </div>
        )}
        {result && (
          <section className="note-panel" aria-labelledby="add-information">
            <h2 id="add-information">Add information and review again</h2>
            <p>
              A new note becomes another source. It does not replace the
              original documents or automatically resolve a disagreement.
            </p>
            <p className="muted">
              The example below adds information about weekly product usage, a
              separate question. It does not establish whether customers paid.
              After running it, check which finding changes and which stays
              unresolved.
            </p>
            <label htmlFor="note">Your note</label>
            <Textarea
              id="note"
              className="min-h-32 bg-white text-base"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              maxLength={2000}
              disabled={locked || notes.length >= 4}
              placeholder="Write a fictional update or load the example below…"
              aria-describedby="note-limit note-privacy"
            />
            <div className="note-footer">
              <Button
                variant="link"
                className="link-button h-auto px-0"
                onClick={() => setDraft(sampleNote)}
                disabled={locked || notes.length >= 4}
              >
                Load a fictional weekly-usage note
              </Button>
              <span id="note-limit" className="source-meta">
                {draft.length}/2000
              </span>
            </div>
            <Button
              className="primary h-auto"
              disabled={locked || draft.trim().length < 2 || notes.length >= 4}
              onClick={() => analyze(true)}
            >
              {busy
                ? 'Reviewing the updated case…'
                : 'Add note and review again'}
            </Button>
            <p id="note-privacy" className="source-meta">
              {notes.length}/4 notes added. Read or edit the example before
              sending it. Use fictional, non-sensitive text only. Notes are sent
              to TypeSafe for analysis, and to TypeSafe and OpenAI for
              comparison. Refreshing clears this case.
            </p>
          </section>
        )}
        <details
          className="review-disclosure"
          key={`questions-${resetVersion}`}
        >
          <summary>Other questions about Northstar</summary>
          <p className="muted">
            The same analysis also checks weekly usage and customer acquisition.
            Selecting a question does not run another analysis.
          </p>
          <div className="actions question-picker" aria-label="Other questions">
            {assumptions.slice(1).map((item) => (
              <Button
                key={item.id}
                variant="outline"
                className="secondary h-auto"
                aria-pressed={selected === item.id}
                onClick={() => setSelected(item.id)}
              >
                {item.title}
              </Button>
            ))}
          </div>
          <EvidenceReview
            assumption={assumption}
            assessment={assessment}
            sources={sources}
          />
        </details>
        <details className="review-disclosure" key={`trace-${resetVersion}`}>
          <summary>How this result was produced</summary>
          <p className="muted">
            Inspect the actual requests, model responses, timing and application
            rules. These are execution records, not hidden model reasoning.
          </p>
          <ExecutionTrace
            trace={trace}
            result={result}
            previous={previous}
            busy={busy}
            unavailable={traceUnavailable}
          />
        </details>
        <details
          className="review-disclosure"
          key={`comparison-${resetVersion}`}
        >
          <summary>Compare models using these sources</summary>
          <p className="muted">
            Run Jev, Luna and Terra on the same documents, or read the recorded
            benchmark without making a live call. The benchmark remains
            available when the live allowance runs out.
          </p>
          <ModelComparison
            key={`${resetVersion}:${JSON.stringify(notes)}`}
            notes={notes}
            disabled={busy}
            onBusyChange={setComparisonBusy}
          />
        </details>
        <footer className="footer">
          Fictional portfolio demonstration. Findings describe the supplied
          documents; they are not verified business facts or an investment
          recommendation.
          {result &&
            ` Live model: ${result.model}. No recorded results substituted.`}
        </footer>
      </main>
    </>
  );
}
