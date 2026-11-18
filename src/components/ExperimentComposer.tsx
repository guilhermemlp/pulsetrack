import React, { useRef, useState } from 'react';
import { Experiment, ExperimentMetric } from '../types/pulsetrack';
import { Dialog } from './Dialog';
import { createExperiment, EXPERIMENT_METRICS } from '../utils/experiments';
import { toLocalIsoDate } from '../utils/analytics';

interface ExperimentComposerProps {
  initialHypothesis: string;
  initialMetric: ExperimentMetric;
  sourceInsightId?: string;
  onCancel: () => void;
  onCreate: (experiment: Experiment) => void;
}

function dateOffset(days: number): string {
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  date.setDate(date.getDate() + days);
  return toLocalIsoDate(date);
}

const inputStyle: React.CSSProperties = {
  backgroundColor: 'var(--bg-elevated)',
  borderColor: 'var(--border-strong)',
  color: 'var(--text-primary)',
};

/** Criação de uma observação a partir de um insight. Nada é enviado para fora do aparelho. */
export const ExperimentComposer: React.FC<ExperimentComposerProps> = ({
  initialHypothesis,
  initialMetric,
  sourceInsightId,
  onCancel,
  onCreate,
}) => {
  const [hypothesis, setHypothesis] = useState(initialHypothesis);
  const [metric, setMetric] = useState<ExperimentMetric>(initialMetric);
  const [startDate, setStartDate] = useState(dateOffset(0));
  const [endDate, setEndDate] = useState(dateOffset(14));
  const [tag, setTag] = useState('');
  const [error, setError] = useState('');
  const hypothesisRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const trimmed = hypothesis.trim();
    if (!trimmed) {
      setError('Escreva a hipótese que você quer acompanhar.');
      return;
    }
    if (endDate < startDate) {
      setError('A data final precisa ser igual ou posterior à inicial.');
      return;
    }
    onCreate(
      createExperiment({
        hypothesis: trimmed,
        metric,
        startDate,
        endDate,
        tag,
        sourceInsightId,
      })
    );
  };

  return (
    <Dialog
      labelledBy="experiment-composer-title"
      describedBy="experiment-composer-description"
      onClose={onCancel}
      // Escape não descarta o texto digitado sem confirmação.
      closeOnEscape={false}
      initialFocusRef={hypothesisRef}
    >
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-xl rounded-2xl border p-5 sm:p-6 space-y-4 max-h-[90vh] overflow-y-auto"
        style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-hairline)' }}
      >
        <div className="space-y-1">
          <h2 id="experiment-composer-title" className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
            Investigar isso
          </h2>
          <p
            id="experiment-composer-description"
            className="text-sm"
            style={{ color: 'var(--text-secondary)' }}
          >
            Uma observação pessoal com começo e fim: o app compara a janela com o mesmo número de
            dias imediatamente anterior. Isso não é um teste diagnóstico.
          </p>
        </div>

        <div>
          <label htmlFor="experiment-hypothesis" className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>
            O que você quer observar?
          </label>
          <textarea
            ref={hypothesisRef}
            id="experiment-hypothesis"
            value={hypothesis}
            onChange={(event) => {
              setHypothesis(event.target.value);
              setError('');
            }}
            rows={3}
            className="w-full px-3 py-2.5 rounded-xl border text-sm"
            style={inputStyle}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label htmlFor="experiment-metric" className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>
              Indicador
            </label>
            <select
              id="experiment-metric"
              value={metric}
              onChange={(event) => setMetric(event.target.value as ExperimentMetric)}
              className="w-full min-h-[48px] px-3 rounded-xl border text-sm"
              style={inputStyle}
            >
              {EXPERIMENT_METRICS.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="experiment-tag" className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>
              Marcador (opcional)
            </label>
            <input
              id="experiment-tag"
              type="text"
              value={tag}
              onChange={(event) => setTag(event.target.value)}
              placeholder="Ex.: noite, trabalho"
              className="w-full min-h-[48px] px-3 rounded-xl border text-sm"
              style={inputStyle}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label htmlFor="experiment-start" className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>
              Início
            </label>
            <input
              id="experiment-start"
              type="date"
              value={startDate}
              onChange={(event) => setStartDate(event.target.value)}
              className="w-full min-h-[48px] px-3 rounded-xl border text-sm"
              style={inputStyle}
            />
          </div>
          <div>
            <label htmlFor="experiment-end" className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>
              Fim
            </label>
            <input
              id="experiment-end"
              type="date"
              value={endDate}
              onChange={(event) => setEndDate(event.target.value)}
              className="w-full min-h-[48px] px-3 rounded-xl border text-sm"
              style={inputStyle}
            />
          </div>
        </div>

        {error && (
          <p role="alert" className="text-sm font-medium" style={{ color: 'var(--color-danger, #b4472f)' }}>
            {error}
          </p>
        )}

        <div className="flex flex-wrap gap-2">
          <button
            type="submit"
            className="min-h-[48px] px-5 rounded-xl text-sm font-semibold cursor-pointer"
            style={{ backgroundColor: 'var(--color-primary-strong)', color: 'var(--color-primary-ink)' }}
          >
            Criar observação
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="min-h-[48px] px-5 rounded-xl border text-sm font-medium cursor-pointer"
            style={{
              backgroundColor: 'var(--bg-elevated)',
              borderColor: 'var(--border-hairline)',
              color: 'var(--text-primary)',
            }}
          >
            Cancelar
          </button>
        </div>
      </form>
    </Dialog>
  );
};
