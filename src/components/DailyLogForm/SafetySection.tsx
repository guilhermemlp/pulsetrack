import React from 'react';
import { HeartHandshake } from 'lucide-react';
import { SAFETY_CONCERN_OPTIONS } from '../../data/defaults';
import { SafetyConcern } from '../../types/pulsetrack';

interface SafetySectionProps {
  concern: SafetyConcern | null;
  onChange: (value: SafetyConcern | null) => void;
}

/**
 * Item de segurança — sempre visível, inclusive no check-in rápido.
 * Não é um instrumento de rastreio: serve para não deixar sofrimento grave fora do registro
 * e para oferecer um caminho de ajuda imediata quando houver ideação.
 */
export const SafetySection: React.FC<SafetySectionProps> = React.memo(({ concern, onChange }) => {
  const needsHelp =
    concern === SafetyConcern.PENSAMENTOS_MORTE || concern === SafetyConcern.AUTOLESAO;

  return (
    <section
      aria-labelledby="sec-safety"
      className="rounded-2xl border p-5"
      style={{
        backgroundColor: 'var(--bg-surface)',
        borderColor: needsHelp ? 'var(--color-accent)' : 'var(--border-hairline)',
      }}
    >
      <div className="flex items-start gap-3">
        <HeartHandshake
          className="w-5 h-5 shrink-0 mt-0.5"
          style={{ color: 'var(--color-primary-strong)' }}
          aria-hidden="true"
        />
        <div className="space-y-3 min-w-0 w-full">
          <div>
            <h2
              id="sec-safety"
              className="text-base font-semibold"
              style={{ color: 'var(--text-primary)' }}
            >
              Como você está em relação a se machucar? (opcional)
            </h2>
            <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
              Você pode pular esta pergunta. Responder não aciona nenhum serviço — os dados ficam só
              neste dispositivo.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {SAFETY_CONCERN_OPTIONS.map((opt) => {
              const active = concern === opt.id;
              const isRisk =
                opt.id === SafetyConcern.PENSAMENTOS_MORTE ||
                opt.id === SafetyConcern.AUTOLESAO;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => onChange(active ? null : opt.id)}
                  aria-pressed={active}
                  className="min-h-[48px] px-3.5 py-2.5 rounded-xl border text-left text-sm font-medium cursor-pointer"
                  style={{
                    backgroundColor: active
                      ? isRisk
                        ? 'var(--color-accent-soft)'
                        : 'var(--color-primary-soft)'
                      : 'var(--bg-elevated)',
                    borderColor: active
                      ? isRisk
                        ? 'var(--color-accent)'
                        : 'var(--color-primary-strong)'
                      : 'var(--border-hairline)',
                    borderWidth: active ? '2px' : '1px',
                    color: 'var(--text-primary)',
                  }}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>

          {needsHelp && (
            <div
              role="alert"
              className="rounded-xl border p-3.5 text-sm space-y-1"
              style={{
                backgroundColor: 'var(--color-accent-soft)',
                borderColor: 'var(--color-accent)',
                color: 'var(--text-primary)',
              }}
            >
              <p className="font-semibold">Você não precisa passar por isso sozinho agora.</p>
              <p>
                <strong>CVV — 188</strong> (ligação gratuita, 24h) · chat em{' '}
                <strong>cvv.org.br</strong>. Em risco imediato, ligue <strong>192 (SAMU)</strong> ou vá
                ao pronto-socorro mais próximo.
              </p>
              <p style={{ color: 'var(--text-secondary)' }}>
                Este registro aparecerá no relatório para o seu profissional de saúde. O PulseTrack não é
                um serviço de emergência.
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
});

SafetySection.displayName = 'SafetySection';
