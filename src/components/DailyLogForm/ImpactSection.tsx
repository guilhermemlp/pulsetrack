import React from 'react';
import { DEFAULT_DAY_EVENTS, FUNCTIONAL_IMPACT_OPTIONS } from '../../data/defaults';
import { FunctionalImpactLevel } from '../../types/pulsetrack';

interface ImpactSectionProps {
  impactWork: FunctionalImpactLevel;
  impactRelationships: FunctionalImpactLevel;
  impactRoutine: FunctionalImpactLevel;
  impactNote: string;
  dayEvents: string[];
  dayEventsNote: string;
  notes: string;
  onChangeImpactWork: (value: FunctionalImpactLevel) => void;
  onChangeImpactRelationships: (value: FunctionalImpactLevel) => void;
  onChangeImpactRoutine: (value: FunctionalImpactLevel) => void;
  onChangeImpactNote: (value: string) => void;
  onToggleDayEvent: (eventLabel: string) => void;
  onChangeDayEventsNote: (value: string) => void;
  onChangeNotes: (value: string) => void;
}

/**
 * Bloco 4 — Impacto funcional (trabalho, relacionamentos, rotina), eventos do dia e observações.
 */
export const ImpactSection: React.FC<ImpactSectionProps> = React.memo(
  ({
    impactWork,
    impactRelationships,
    impactRoutine,
    impactNote,
    dayEvents,
    dayEventsNote,
    notes,
    onChangeImpactWork,
    onChangeImpactRelationships,
    onChangeImpactRoutine,
    onChangeImpactNote,
    onToggleDayEvent,
    onChangeDayEventsNote,
    onChangeNotes,
  }) => {
    const domains = [
      { label: 'Trabalho / Estudos', value: impactWork, setter: onChangeImpactWork },
      { label: 'Relacionamentos', value: impactRelationships, setter: onChangeImpactRelationships },
      { label: 'Rotina / Autocuidado', value: impactRoutine, setter: onChangeImpactRoutine },
    ];

    return (
      <section
        aria-labelledby="sec-impact-context"
        className="rounded-2xl border p-5 sm:p-7 space-y-6"
        style={{
          backgroundColor: 'var(--bg-surface)',
          borderColor: 'var(--border-hairline)',
          boxShadow: 'var(--shadow-soft)',
        }}
      >
        <div>
          <h2
            id="sec-impact-context"
            className="text-xl font-semibold"
            style={{ color: 'var(--text-primary)' }}
          >
            Impacto funcional e contexto do dia (opcional)
          </h2>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
            Como o seu estado emocional, sono ou comportamento afetou sua vida hoje?
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {domains.map((domain) => (
            <div key={domain.label} className="space-y-2">
              <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                {domain.label}
              </p>
              <div className="grid grid-cols-2 gap-1.5">
                {FUNCTIONAL_IMPACT_OPTIONS.map((lvl) => {
                  const active = domain.value === lvl.id;
                  const isSignificant =
                    lvl.id === FunctionalImpactLevel.MODERADO ||
                    lvl.id === FunctionalImpactLevel.INTENSO;
                  return (
                    <button
                      key={lvl.id}
                      type="button"
                      onClick={() => domain.setter(lvl.id)}
                      aria-pressed={active}
                      className="min-h-[48px] px-2.5 rounded-lg border text-xs sm:text-sm font-medium cursor-pointer"
                      style={{
                        backgroundColor: active
                          ? isSignificant
                            ? 'var(--color-accent-soft)'
                            : 'var(--color-primary-soft)'
                          : 'var(--bg-elevated)',
                        borderColor: active
                          ? isSignificant
                            ? 'var(--color-accent)'
                            : 'var(--color-primary-strong)'
                          : 'var(--border-hairline)',
                        color: 'var(--text-primary)',
                      }}
                    >
                      {lvl.label}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <div>
          <label
            htmlFor="impact-note"
            className="block text-sm font-medium mb-1.5"
            style={{ color: 'var(--text-primary)' }}
          >
            Detalhe do impacto funcional (opcional)
          </label>
          <input
            id="impact-note"
            type="text"
            value={impactNote}
            onChange={(e) => onChangeImpactNote(e.target.value)}
            placeholder="Ex.: atrasei entregas, discuti por impaciência, pulei refeições..."
            className="w-full min-h-[48px] px-4 rounded-xl border text-base"
            style={{
              backgroundColor: 'var(--bg-elevated)',
              borderColor: 'var(--border-strong)',
              color: 'var(--text-primary)',
            }}
          />
        </div>

        {/* Eventos do dia */}
        <div className="pt-4 border-t" style={{ borderColor: 'var(--border-hairline)' }}>
          <p className="text-base font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
            Eventos do dia relacionados
          </p>
          <div className="flex flex-wrap gap-2.5">
            {DEFAULT_DAY_EVENTS.map((ev) => {
              const selected = dayEvents.includes(ev);
              return (
                <button
                  key={ev}
                  type="button"
                  onClick={() => onToggleDayEvent(ev)}
                  aria-pressed={selected}
                  className="min-h-[48px] px-4 py-2 rounded-xl border text-sm font-medium transition-colors cursor-pointer"
                  style={{
                    backgroundColor: selected
                      ? 'var(--color-secondary-soft)'
                      : 'var(--bg-elevated)',
                    borderColor: selected ? 'var(--color-secondary)' : 'var(--border-hairline)',
                    borderWidth: selected ? '2px' : '1px',
                    color: 'var(--text-primary)',
                  }}
                >
                  {ev}
                </button>
              );
            })}
          </div>
          <input
            type="text"
            value={dayEventsNote}
            onChange={(e) => onChangeDayEventsNote(e.target.value)}
            placeholder="Outro evento do dia (ex.: esqueci medicação da manhã, viagem, consulta...)"
            aria-label="Outro evento do dia"
            className="w-full min-h-[48px] px-4 rounded-xl border text-base mt-3"
            style={{
              backgroundColor: 'var(--bg-elevated)',
              borderColor: 'var(--border-strong)',
              color: 'var(--text-primary)',
            }}
          />
        </div>

        <div>
          <label
            htmlFor="extra-notes"
            className="block text-sm font-medium mb-1.5"
            style={{ color: 'var(--text-primary)' }}
          >
            Observações extras
          </label>
          <textarea
            id="extra-notes"
            rows={2}
            value={notes}
            onChange={(e) => onChangeNotes(e.target.value)}
            placeholder="Qualquer detalhe que ajude você ou seu profissional a entender esse dia"
            className="w-full p-3.5 rounded-xl border text-base"
            style={{
              backgroundColor: 'var(--bg-elevated)',
              borderColor: 'var(--border-strong)',
              color: 'var(--text-primary)',
            }}
          />
        </div>
      </section>
    );
  }
);

ImpactSection.displayName = 'ImpactSection';
