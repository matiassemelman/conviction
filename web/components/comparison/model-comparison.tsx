'use client';
import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { ExecutionTrace } from '@/components/trace/execution-trace';
import { assumptions } from '@/lib/case';
import { statusLabels } from '@/lib/assessment';
import { models, pricingDate } from '@/lib/comparison';
import type { Comparison, ModelId } from '@/lib/comparison';
import type { BenchmarkReport } from '@/lib/benchmark';
import recorded from '@/evaluation/results.json';
import cases from '@/evaluation/holdout.json';
const benchmark = recorded as BenchmarkReport;
const money = (value: number | null) =>
  value === null ? 'Not reported' : `$${value.toFixed(6)}`;
const seconds = (value: number | null) =>
  value === null ? '—' : `${(value / 1000).toFixed(2)} s`;
export function ModelComparison({
  notes,
  disabled,
  onBusyChange,
}: {
  notes: string[];
  disabled: boolean;
  onBusyChange: (busy: boolean) => void;
}) {
  const [comparison, setComparison] = useState<Comparison | null>(null);
  const [selected, setSelected] = useState<ModelId>('jev');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const inFlight = useRef(false);
  const selectedRun = comparison?.runs.find((r) => r.id === selected);
  async function compare() {
    if (inFlight.current || disabled) return;
    inFlight.current = true;
    setBusy(true);
    onBusyChange(true);
    setError('');
    try {
      const response = await fetch('/api/compare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes }),
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
      })) as Comparison & {
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
            'Live runs are temporarily unavailable. Your case and comparison are unchanged. The recorded benchmark is still available.',
        );
        return;
      }
      if (!response.ok || !Array.isArray(data.runs) || data.runs.length !== 3)
        throw new Error(
          'Comparison could not finish. Your case and any previous comparison are preserved. Try again.',
        );
      setComparison(data);
    } catch {
      setError(
        'Comparison could not finish. Your case and any previous comparison are preserved. Try again.',
      );
    } finally {
      inFlight.current = false;
      setBusy(false);
      onBusyChange(false);
    }
  }
  return (
    <section className="comparison-panel" aria-label="Model comparison">
      <div className="comparison-heading">
        <div>
          <span className="tag">Same evidence. Three models.</span>
          <h2>Compare models</h2>
          <p className="muted">
            Jev, Luna and Terra judge the same {3 + notes.length} sources.
            OpenAI reasoning is off.
          </p>
        </div>
        <Button
          className="primary h-auto"
          disabled={disabled || busy}
          onClick={compare}
        >
          {busy ? 'Comparing models…' : 'Compare current case'}
        </Button>
      </div>
      {error && (
        <p className="notice error" role="alert">
          {error}
        </p>
      )}
      <div aria-live="polite">
        {busy && (
          <p className="notice">
            Running live calls. Any results below belong to the previous
            comparison.
          </p>
        )}
        {comparison && (
          <>
            <p className="source-meta">
              Live comparison ·{' '}
              {new Date(comparison.startedAt).toLocaleTimeString()} · USD
              estimates from reported usage · rates checked {pricingDate}
            </p>
            <div className="comparison-cards">
              {comparison.runs.map((run) => (
                <article className="comparison-card" key={run.id}>
                  <h3>{models[run.id].label}</h3>
                  <span className={`trace-run-status ${run.status}`}>
                    {run.status === 'completed' ? 'Complete' : 'Failed'}
                  </span>
                  <dl>
                    <div>
                      <dt>Elapsed</dt>
                      <dd>{seconds(run.trace?.durationMs ?? null)}</dd>
                    </div>
                    <div>
                      <dt>Estimated cost</dt>
                      <dd>{money(run.cost.usd)}</dd>
                    </div>
                  </dl>
                  {!run.cost.complete && (
                    <p className="source-meta">
                      Partial usage; unreported attempts may add cost.
                    </p>
                  )}
                  {run.error ? (
                    <p className="comparison-error">{run.error}</p>
                  ) : (
                    <ul className="comparison-outcomes">
                      {run.result?.assessments.map((a) => (
                        <li key={a.assumptionId}>
                          <span>
                            {
                              assumptions.find(
                                (item) => item.id === a.assumptionId,
                              )?.title
                            }
                          </span>
                          <strong className={`status ${a.status}`}>
                            {statusLabels[a.status]}
                          </strong>
                        </li>
                      ))}
                    </ul>
                  )}
                  <Button
                    variant="outline"
                    className="secondary h-auto"
                    aria-pressed={selected === run.id}
                    onClick={() => setSelected(run.id)}
                  >
                    Inspect {models[run.id].label}
                  </Button>
                </article>
              ))}
            </div>
            <p className="source-meta">
              Agreement is not accuracy. Free-form notes have no reviewed answer
              key. This comparison does not replace the case assessment.
            </p>
            {selectedRun && (
              <ExecutionTrace
                trace={selectedRun.trace ?? null}
                result={selectedRun.result ?? null}
                previous={null}
                busy={busy}
                unavailable={Boolean(error)}
                providerLabel={models[selectedRun.id].label}
              />
            )}
          </>
        )}
      </div>
      <details className="benchmark-panel" open={!comparison}>
        <summary>
          Measured benchmark · {benchmark.distinctCases} labeled cases ×{' '}
          {benchmark.repetitions} runs
        </summary>
        <p className="muted">
          Recorded {benchmark.recordedAt.slice(0, 10)}. These new synthetic
          cases were labeled before the first run and were not used to tune the
          prompts. Repeats measure consistency; they are not additional
          independent cases.
        </p>
        <div className="comparison-table-wrap">
          <table className="comparison-table">
            <caption>
              Recorded evaluation · latency per successful source request
            </caption>
            <thead>
              <tr>
                <th scope="col">Model</th>
                <th scope="col">Correct / attempted</th>
                <th scope="col">Median</th>
                <th scope="col">p95</th>
                <th scope="col">API failures</th>
                <th scope="col">Not measured / unavailable</th>
                <th scope="col">Estimated total</th>
              </tr>
            </thead>
            <tbody>
              {benchmark.models.map((model) => (
                <tr key={model.id}>
                  <th scope="row">{models[model.id].label}</th>
                  <td>
                    {model.summary.correct}/{model.summary.attempted} (
                    {Math.round(
                      (model.summary.correct / (model.summary.attempted || 1)) *
                        100,
                    )}
                    %)
                  </td>
                  <td>{seconds(model.summary.medianMs)}</td>
                  <td>{seconds(model.summary.p95Ms)}</td>
                  <td>{model.summary.failed}</td>
                  <td>
                    {model.summary.unmeasured} / {model.summary.unavailable}
                  </td>
                  <td>
                    {money(model.costUsd)}
                    {!model.costComplete && ' · partial'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="source-meta">
          p95: 95% of successful calls finished within this time. Small local
          sample, including network time; not a general accuracy or
          production-speed guarantee. Costs cover reported usage only.
          Never-sent cases are excluded from API attempts and failures.
        </p>
        <details className="benchmark-method">
          <summary>Method, labels and individual results</summary>
          <p>{benchmark.settings}</p>
          <p className="source-meta">
            Dataset fingerprint: <code>{benchmark.datasetSha256}</code>
          </p>
          <div className="comparison-table-wrap">
            <table className="comparison-table">
              <caption>
                Expected labels and observed answers across the three
                repetitions
              </caption>
              <thead>
                <tr>
                  <th scope="col">Claim / source</th>
                  <th scope="col">Expected</th>
                  {benchmark.models.map((m) => (
                    <th scope="col" key={m.id}>
                      {models[m.id].label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {cases.map((c) => (
                  <tr key={c.id}>
                    <th scope="row" aria-label={c.claim}>
                      <details>
                        <summary>{c.claim}</summary>
                        <p>{c.source}</p>
                        <p className="source-meta">
                          Label rationale: {c.rationale}
                        </p>
                      </details>
                    </th>
                    <td>{c.expected}</td>
                    {benchmark.models.map((m) => (
                      <td key={m.id}>
                        {m.samples
                          .filter((s) => s.id === c.id)
                          .map((s, i) => (
                            <span
                              className={`benchmark-answer ${s.actual === s.expected ? '' : 'mismatch'}`}
                              key={i}
                            >
                              {s.actual ?? s.status}
                            </span>
                          ))}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="source-meta">
            Models: {benchmark.models.flatMap((m) => m.actualModels).join(', ')}
            .
          </p>
          <p className="source-meta">
            Price sources ({pricingDate}):{' '}
            {Object.entries(models).map(([id, model]) => (
              <a
                key={id}
                href={model.pricingUrl}
                target="_blank"
                rel="noreferrer"
              >
                {model.label}{' '}
              </a>
            ))}
          </p>
        </details>
      </details>
    </section>
  );
}
