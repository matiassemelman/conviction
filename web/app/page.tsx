'use client';
import { useRef, useState } from 'react';
import { ModelComparison } from '@/components/comparison/model-comparison';
import { ExecutionTrace } from '@/components/trace/execution-trace';
import type { RunTrace } from '@/lib/trace';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { assumptions, baseSources, sampleNote } from '@/lib/case';
import { statusLabels } from '@/lib/assessment';
import type { CaseResult, Relation } from '@/lib/assessment';
const relationLabels: Record<Relation, string> = {
  supports: 'Supports this claim',
  contradicts: 'Contradicts this claim',
  mixed: 'Mixed signals',
  insufficient: 'Does not establish this claim',
};
export default function Home() {
  const [selected, setSelected] = useState('payments');
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
  const prior = previous?.assessments.find((a) => a.assumptionId === selected);
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
    setSelected('payments');
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
      <main className="workspace">
        <div className="case-header">
          <div>
            <span className="tag">Fictional case</span>
            <h1>Northstar</h1>
            <p className="muted">
              Workflow software for independent logistics teams
            </p>
          </div>
          <div className="actions">
            <Button
              variant="outline"
              className="secondary h-auto"
              onClick={reset}
              disabled={locked}
            >
              Reset case
            </Button>
            <Button
              className="primary h-auto"
              onClick={() => analyze()}
              disabled={locked}
            >
              {busy
                ? 'Analyzing sources…'
                : result
                  ? 'Reanalyze case'
                  : 'Analyze with Jev'}
            </Button>
          </div>
        </div>
        <p className="source-meta">
          Public demo · Live runs share a daily allowance and have a per-network
          limit. The recorded benchmark is always available without a live run.
        </p>
        {error && (
          <div className="notice error" role="alert">
            {error}
          </div>
        )}
        <div aria-live="polite" aria-atomic="true">
          {busy ? (
            <div className="notice">
              Jev is comparing each source with the three assumptions. Previous
              results remain visible until this run finishes.
            </div>
          ) : result ? (
            <div className="notice">
              <strong>Live analysis complete.</strong> {sources.length} sources
              assessed in {(result.elapsedMs / 1000).toFixed(1)}s.
              {previous ? ' The latest assessment is shown below.' : ''}{' '}
              <span className="muted">
                Source support is not independent verification.
              </span>
            </div>
          ) : (
            <div className="notice">
              Read the sources, then run a live analysis. Add a note to see what
              changes. Nothing here is a verified business fact.
            </div>
          )}
        </div>
        <ModelComparison
          key={`${resetVersion}:${JSON.stringify(notes)}`}
          notes={notes}
          disabled={busy}
          onBusyChange={setComparisonBusy}
        />
        <ExecutionTrace
          trace={trace}
          result={result}
          previous={previous}
          busy={busy}
          unavailable={traceUnavailable}
        />
        <div className="board">
          <div>
            <section className="panel" aria-label="Investment assumptions">
              <div className="panel-heading">
                <h2>Investment assumptions</h2>
                <span className="muted">3</span>
              </div>
              {assumptions.map((a) => {
                const current = result?.assessments.find(
                  (s) => s.assumptionId === a.id,
                );
                return (
                  <button
                    key={a.id}
                    className={`assumption ${selected === a.id ? 'selected' : ''}`}
                    aria-pressed={selected === a.id}
                    onClick={() => setSelected(a.id)}
                  >
                    <span className={`status ${current?.status ?? ''}`}>
                      {current ? statusLabels[current.status] : 'Not analyzed'}
                    </span>
                    <h3>{a.title}</h3>
                    <small>
                      {current
                        ? `${current.evidence.filter((e) => e.relation !== 'insufficient').length} of ${sources.length} sources provide directional evidence`
                        : 'Select to inspect the claim and sources'}
                    </small>
                  </button>
                );
              })}
            </section>
            <section className="panel note-panel">
              <h2>Add to the case</h2>
              <p className="muted">
                A new note is another source, not a replacement for the existing
                ones.
              </p>
              <label htmlFor="note">Analyst note</label>
              <Textarea
                id="note"
                className="min-h-32 bg-white text-base"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                maxLength={2000}
                disabled={locked || notes.length >= 4}
                placeholder="Add a fictional interview excerpt, observation or evidence summary…"
                aria-describedby="note-limit note-privacy"
              />
              <div className="note-footer">
                <Button
                  variant="link"
                  className="link-button h-auto px-0"
                  onClick={() => setDraft(sampleNote)}
                  disabled={locked || notes.length >= 4}
                >
                  Use a fictional activity note
                </Button>
                <span id="note-limit" className="source-meta">
                  {draft.length}/2000
                </span>
              </div>
              <Button
                className="primary h-auto"
                disabled={
                  locked || draft.trim().length < 2 || notes.length >= 4
                }
                onClick={() => analyze(true)}
              >
                Add note & analyze
              </Button>
              <p id="note-privacy" className="source-meta">
                {notes.length}/4 notes added. Use fictional, non-sensitive text
                only. Notes are sent to TypeSafe for analysis, and to TypeSafe
                and OpenAI for comparison. This demo does not save notes after a
                refresh.
              </p>
            </section>
          </div>
          <section className="panel" aria-label="Selected assumption evidence">
            <div className="panel-heading">
              <h2>Source review</h2>
              <span className="source-meta">{sources.length} sources</span>
            </div>
            <div className="detail">
              <span className={`status ${assessment?.status ?? ''}`}>
                {assessment
                  ? statusLabels[assessment.status]
                  : 'Awaiting analysis'}
              </span>
              <h2 className="detail-title">{assumption.title}</h2>
              <p className="muted">{assumption.claim}</p>
              {prior && assessment && (
                <p className="change">
                  {prior.status !== assessment.status
                    ? `Changed: ${statusLabels[prior.status]} → ${statusLabels[assessment.status]}.`
                    : 'Assessment unchanged.'}{' '}
                  {assessment.evidence.length > prior.evidence.length
                    ? 'New note included; earlier sources retained.'
                    : ''}
                </p>
              )}
              <div className="next-question">
                <h3>Next useful question</h3>
                <p>
                  {assessment?.question ??
                    'What do the original sources actually establish?'}
                </p>
              </div>
              <h3>Evidence trail</h3>
              <div className="sources">
                {sources.map((source) => {
                  const judgment = assessment?.evidence.find(
                    (e) => e.sourceId === source.id,
                  );
                  return (
                    <article className="source" key={source.id}>
                      <div className="source-head">
                        <h3>{source.title}</h3>
                        {judgment && (
                          <span className={`status ${judgment.relation}`}>
                            {relationLabels[judgment.relation]}
                          </span>
                        )}
                      </div>
                      <blockquote>{source.text}</blockquote>
                      <p className="source-meta">{source.attribution}</p>
                      {judgment?.confidence !== undefined && (
                        <details className="source-meta">
                          <summary>Judgment detail</summary>
                          <p>
                            Model distribution concentration:{' '}
                            {Math.round(judgment.confidence * 100)}%. This is
                            not a probability that the claim is true or the
                            judgment is correct.
                          </p>
                        </details>
                      )}
                    </article>
                  );
                })}
              </div>
            </div>
          </section>
        </div>
        <footer className="footer">
          Fictional portfolio demonstration. For human review, not an investment
          recommendation.{' '}
          {result &&
            `Live model: ${result.model}. No recorded results substituted.`}
        </footer>
      </main>
    </>
  );
}
