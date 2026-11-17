import React from 'react';
import {
  CYCLE_PHASE_OPTIONS,
  DEFAULT_DAY_EVENTS,
  FUNCTIONAL_IMPACT_OPTIONS,
  MEDICATION_STATUS_OPTIONS,
} from '../../data/defaults';
import {
  CyclePhase,
  FunctionalImpactLevel,
  MedicationStatus,
} from '../../types/pulsetrack';

interface ImpactSectionProps {
  impactWork: FunctionalImpactLevel | null;
  impactRelationships: FunctionalImpactLevel | null;
  impactRoutine: FunctionalImpactLevel | null;
  impactNote: string;
  medicationStatus: MedicationStatus | null;
  medicationEffects: string;
  cyclePhase: CyclePhase | null;
  trackCycle: boolean;
  dayEvents: string[];
  dayEventsNote: string;
  notes: string;
  onChangeImpactWork: (value: FunctionalImpactLevel | null) => void;
  onChangeImpactRelationships: (value: FunctionalImpactLevel | null) => void;
  onChangeImpactRoutine: (value: FunctionalImpactLevel | null) => void;
  onChangeImpactNote: (value: string) => void;
  onChangeMedicationStatus: (value: MedicationStatus | null) => void;
  onChangeMedicationEffects: (value: string) => void;
  onChangeCyclePhase: (value: CyclePhase | null) => void;
  onToggleDayEvent: (eventLabel: string) => void;
  onChangeDayEventsNote: (value: string) => void;
  onChangeNotes: (value: string) => void;
}

/**
 * Bloco 4 — Impacto funcional (trabalho, relacionamentos, rotina), medicação,
 * eventos do dia e observações. Todo campo é opcional e começa sem resposta.
 */
export const ImpactSection: React.FC<ImpactSectionProps> = React.memo(
  ({
    impactWork,
    impactRelationships,
    impactRoutine,
    impactNote,
    medicationStatus,
    medicationEffects,
    cyclePhase,
    trackCycle,
    dayEvents,
    dayEventsNote,
    notes,
    onChangeImpactWork,
    onChangeImpactRelationships,
    onChangeImpactRoutine,
    onChangeImpactNote,
    onChangeMedicationStatus,
    onChangeMedicationEffects,
    onChangeCyclePhase,
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
            Como o seu estado emocional, sono ou comportamento afetou sua vida hoje? O que não for
            respondido aparece como “não informado” no relatório.
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
                      onClick={() => domain.setter(active ? null : lvl.id)}
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

        {/* Medicação: adesão estruturada, não apenas um evento do dia */}
        <div className="pt-4 border-t space-y-3" style={{ borderColor: 'var(--border-hairline)' }}>
          <div>
            <p className="text-base font-medium" style={{ color: 'var(--text-primary)' }}>
              Medicação
            </p>
            <p className="text-sm mb-2.5" style={{ color: 'var(--text-secondary)' }}>
              A adesão cruzada com humor e sono costuma ser o primeiro dado que o psiquiatra procura.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
              {MEDICATION_STATUS_OPTIONS.map((opt) => {
                const active = medicationStatus === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => onChangeMedicationStatus(active ? null : opt.id)}
                    aria-pressed={active}
                    className="min-h-[48px] px-3 py-2 rounded-xl border text-sm font-medium cursor-pointer"
                    style={{
                      backgroundColor: active ? 'var(--color-primary-soft)' : 'var(--bg-elevated)',
                      borderColor: active ? 'var(--color-primary-strong)' : 'var(--border-hairline)',
                      borderWidth: active ? '2px' : '1px',
                      color: 'var(--text-primary)',
                    }}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>
          <div>
            <label
              htmlFor="medication-effects"
              className="block text-sm font-medium mb-1.5"
              style={{ color: 'var(--text-primary)' }}
            >
              Efeitos percebidos da medicação (opcional)
            </label>
            <input
              id="medication-effects"
              type="text"
              value={medicationEffects}
              onChange={(e) => onChangeMedicationEffects(e.target.value)}
              placeholder="Ex.: mais estável à tarde, boca seca, ansiedade 2h após tomar..."
              className="w-full min-h-[48px] px-4 rounded-xl border text-base"
              style={{
                backgroundColor: 'var(--bg-elevated)',
                borderColor: 'var(--border-strong)',
                color: 'var(--text-primary)',
              }}
            />
          </div>
        </div>

        {/* Fase do ciclo menstrual (opcional, ativada nas preferências) */}
        {trackCycle && (
          <div className="pt-4 border-t" style={{ borderColor: 'var(--border-hairline)' }}>
            <p className="text-base font-medium mb-1" style={{ color: 'var(--text-primary)' }}>
              Fase do ciclo menstrual
            </p>
            <p className="text-sm mb-2.5" style={{ color: 'var(--text-secondary)' }}>
              Oscilações de humor, energia e sono costumam variar com a fase do ciclo — isso muda a
              leitura dos dados.
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {CYCLE_PHASE_OPTIONS.map((opt) => {
                const active = cyclePhase === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => onChangeCyclePhase(active ? null : opt.id)}
                    aria-pressed={active}
                    className="min-h-[48px] px-3 py-2 rounded-xl border text-sm font-medium cursor-pointer"
                    style={{
                      backgroundColor: active ? 'var(--color-secondary-soft)' : 'var(--bg-elevated)',
                      borderColor: active ? 'var(--color-secondary)' : 'var(--border-hairline)',
                      borderWidth: active ? '2px' : '1px',
                      color: 'var(--text-primary)',
                    }}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>
        )}

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
