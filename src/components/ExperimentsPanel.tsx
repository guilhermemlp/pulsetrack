import React, { useRef, useState } from 'react';
import { Experiment, ExperimentResult, PulseEntry } from '../types/pulsetrack';
import { Dialog } from './Dialog';
import {
  analyzeExperiment,
  EXPERIMENT_RESULT_LABELS,
  formatExperimentDate,
  getExperimentMetric,
} from '../utils/experiments';

interface ExperimentsPanelProps {
  experiments: Experiment[];
  entries: PulseEntry[];
  onCloseExperiment: (id: string, result: ExperimentResult, note: string) => void;
}

const RESULT_OPTIONS: Array<{ id: ExperimentResult; hint: string }> = [
  {
    id: 'difference',
    hint: 'Os números das duas janelas apontaram em uma direção diferente.',
  },
  {
    id: 'no_difference',
    hint: 'Os números ficaram próximos entre as duas janelas.',
  },
  {
    id: 'insufficient_data',
    hint: 'Faltaram registros para comparar com segurança.',
  },
];

function formatValue(experiment: Experiment, value: number | null): string {
  if (value === null) return 'não informado';
  const metric = getExperimentMetric(experiment.metric);
  const rounded = Number.isInteger(value) ? String(value) : value.toFixed(1);
  return `${rounded}${metric.unit}`;
}

/**
 * Observações do usuário no Painel. Sem pontuação, sem streak, sem veredito:
 * mostra os números das duas janelas e deixa a conclusão com quem registrou.
 */
export const ExperimentsPanel: React.FC<ExperimentsPanelProps> = ({
  experiments,
  entries,
  onCloseExperiment,
}) => {
  const [closingId, setClosingId] = useState<string | null>(null);
  const [result, setResult] = useState<ExperimentResult | null>(null);
  const [note, setNote] = useState('');
  const firstResultRef = useRef<HTMLInputElement>(null);

  if (experiments.length === 0) return null;

  const active = experiments.filter((experiment) => experiment.status === 'active');
  const finished = experiments
    .filter((experiment) => experiment.status === 'finished')
    .slice(0, 3);
  const closing = experiments.find((experiment) => experiment.id === closingId) ?? null;

  const openClose = (id: string) => {
    setClosingId(id);
    setResult(null);
    setNote('');
  };

  const submitClose = () => {
    if (!closing || !result) return;
    onCloseExperiment(closing.id, result, note);
    setClosingId(null);
    setResult(null);
    setNote('');
  };

  const renderCard = (experiment: Experiment, isActive: boolean) => {
    const analysis = analyzeExperiment(experiment, entries);
    const metric = getExperimentMetric(experiment.metric);

    return (
      <article
        key={experiment.id}
        className="rounded-2xl border p-5 space-y-3"
        style={{
          backgroundColor: 'var(--bg-surface)',
          borderColor: 'var(--border-hairline)',
        }}
      >
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="space-y-1">
            <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
              {experiment.hypothesis}
            </p>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              {metric.label} · {formatExperimentDate(experiment.startDate)} a{' '}
              {formatExperimentDate(experiment.endDate)} ({analysis.windowDays} dia(s))
              {experiment.tag ? ` · ${experiment.tag}` : ''}
            </p>
          </div>
          <span
            className="text-xs px-2.5 py-1 rounded-full border shrink-0"
            style={{
              color: 'var(--text-secondary)',
              borderColor: 'var(--border-hairline)',
              backgroundColor: 'var(--bg-elevated)',
            }}
          >
            {isActive
              ? analysis.windowClosed
                ? 'Janela terminada'
                : 'Em andamento'
              : EXPERIMENT_RESULT_LABELS[experiment.result ?? 'insufficient_data']}
          </span>
        </div>

        {analysis.empty ? (
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            Nenhum registro nas duas janelas — não há números para comparar.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                Durante a janela
              </p>
              <p className="text-base font-mono tabular-nums" style={{ color: 'var(--text-primary)' }}>
                {formatValue(experiment, analysis.during.value)}
              </p>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                informado em {analysis.during.answered} de {analysis.during.base} registro(s)
              </p>
            </div>
            <div>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                Janela anterior
              </p>
              <p className="text-base font-mono tabular-nums" style={{ color: 'var(--text-primary)' }}>
                {formatValue(experiment, analysis.before.value)}
              </p>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                informado em {analysis.before.answered} de {analysis.before.base} registro(s)
              </p>
            </div>
          </div>
        )}

        {experiment.status === 'finished' && experiment.resultNote.trim() && (
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            Sua observação: {experiment.resultNote.trim()}
          </p>
        )}

        {isActive && (
          <button
            type="button"
            onClick={() => openClose(experiment.id)}
            className="min-h-[48px] px-4 rounded-xl border text-sm font-medium cursor-pointer"
            style={{
              backgroundColor: 'var(--bg-elevated)',
              borderColor: 'var(--border-strong)',
              color: 'var(--text-primary)',
            }}
          >
            Encerrar e registrar conclusão
          </button>
        )}
      </article>
    );
  };

  return (
    <section className="space-y-3" aria-labelledby="experiments-heading">
      <div>
        <h2 id="experiments-heading" className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
          Observações em andamento
        </h2>
        <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
          Hipóteses que você escolheu acompanhar. O PulseTrack só descreve os números — a
          conclusão é sempre sua.
        </p>
      </div>

      {active.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {active.map((experiment) => renderCard(experiment, true))}
        </div>
      ) : (
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
          Nenhuma observação aberta. Em Insights, use “Investigar isso” em um padrão que queira
          acompanhar.
        </p>
      )}

      {finished.length > 0 && (
        <details className="pt-2">
          <summary
            className="text-sm font-medium cursor-pointer"
            style={{ color: 'var(--text-secondary)' }}
          >
            Conclusões registradas recentemente
          </summary>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pt-3">
            {finished.map((experiment) => renderCard(experiment, false))}
          </div>
        </details>
      )}

      {closing && (
        <Dialog
          labelledBy="experiment-close-title"
          describedBy="experiment-close-description"
          onClose={() => setClosingId(null)}
          // Com uma leitura ou nota já escolhida, Escape não descarta a seleção.
          closeOnEscape={!result && note.trim().length === 0}
          initialFocusRef={firstResultRef}
        >
          <div
            className="w-full max-w-xl rounded-2xl border p-5 sm:p-6 space-y-4 max-h-[90vh] overflow-y-auto"
            style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-hairline)' }}
          >
            <div className="space-y-1">
              <h3 id="experiment-close-title" className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
                Como você lê esta observação?
              </h3>
              <p
                id="experiment-close-description"
                className="text-sm"
                style={{ color: 'var(--text-secondary)' }}
              >
                {closing.hypothesis}
              </p>
            </div>

            <fieldset className="space-y-2">
              <legend className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                Conclusão
              </legend>
              {RESULT_OPTIONS.map((option, index) => (
                <label
                  key={option.id}
                  className="flex items-start gap-3 p-3 rounded-xl border cursor-pointer"
                  style={{
                    borderColor:
                      result === option.id ? 'var(--color-primary-strong)' : 'var(--border-hairline)',
                    backgroundColor:
                      result === option.id ? 'var(--color-primary-soft)' : 'var(--bg-elevated)',
                  }}
                >
                  <input
                    ref={index === 0 ? firstResultRef : undefined}
                    type="radio"
                    name="experiment-result"
                    value={option.id}
                    checked={result === option.id}
                    onChange={() => setResult(option.id)}
                    className="mt-0.5"
                  />
                  <span className="space-y-0.5">
                    <span className="block text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                      {EXPERIMENT_RESULT_LABELS[option.id]}
                    </span>
                    <span className="block text-xs" style={{ color: 'var(--text-secondary)' }}>
                      {option.hint}
                    </span>
                  </span>
                </label>
              ))}
            </fieldset>

            <div>
              <label htmlFor="experiment-note" className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>
                Observação (opcional)
              </label>
              <textarea
                id="experiment-note"
                value={note}
                onChange={(event) => setNote(event.target.value)}
                rows={2}
                placeholder="O que mais você notou nesse período?"
                className="w-full px-3 py-2.5 rounded-xl border text-sm"
                style={{
                  backgroundColor: 'var(--bg-elevated)',
                  borderColor: 'var(--border-strong)',
                  color: 'var(--text-primary)',
                }}
              />
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={submitClose}
                disabled={!result}
                className="min-h-[48px] px-5 rounded-xl text-sm font-semibold disabled:opacity-50 cursor-pointer"
                style={{ backgroundColor: 'var(--color-primary-strong)', color: 'var(--color-primary-ink)' }}
              >
                Registrar conclusão
              </button>
              <button
                type="button"
                onClick={() => setClosingId(null)}
                className="min-h-[48px] px-5 rounded-xl border text-sm font-medium cursor-pointer"
                style={{
                  backgroundColor: 'var(--bg-elevated)',
                  borderColor: 'var(--border-hairline)',
                  color: 'var(--text-primary)',
                }}
              >
                Voltar
              </button>
            </div>
          </div>
        </Dialog>
      )}
    </section>
  );
};
