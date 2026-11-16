import React from 'react';
import { Check, Minus, Plus } from 'lucide-react';
import {
  ACTIVATION_SIGNAL_OPTIONS,
  REDUCED_SLEEP_NEED_OPTIONS,
  SLEEP_QUALITY_OPTIONS,
  STATE_DURATION_OPTIONS,
} from '../../data/defaults';
import {
  ActivationSignal,
  ReducedSleepNeed,
  SleepQuality,
  StateDuration,
} from '../../types/pulsetrack';

interface ActivationSectionProps {
  energyLevel: number;
  sleepHours: number;
  sleepQuality: SleepQuality;
  reducedSleepNeed: ReducedSleepNeed;
  stateDuration: StateDuration;
  activationSignals: ActivationSignal[];
  onChangeEnergyLevel: (value: number) => void;
  onChangeSleepHours: (value: number) => void;
  onChangeSleepQuality: (value: SleepQuality) => void;
  onChangeReducedSleepNeed: (value: ReducedSleepNeed) => void;
  onChangeStateDuration: (value: StateDuration) => void;
  onToggleActivationSignal: (signal: ActivationSignal) => void;
}

function describeEnergy(val: number): string {
  if (val <= 2) return 'Muito baixa / exaustão';
  if (val <= 4) return 'Baixa';
  if (val <= 6) return 'Moderada';
  if (val <= 8) return 'Alta / ativada';
  return 'Muito alta / acelerada';
}

/**
 * Pilar 2 — Estado de ativação e sono: energia, sono, duração do estado e sinais associados.
 */
export const ActivationSection: React.FC<ActivationSectionProps> = React.memo(
  ({
    energyLevel,
    sleepHours,
    sleepQuality,
    reducedSleepNeed,
    stateDuration,
    activationSignals,
    onChangeEnergyLevel,
    onChangeSleepHours,
    onChangeSleepQuality,
    onChangeReducedSleepNeed,
    onChangeStateDuration,
    onToggleActivationSignal,
  }) => {
    return (
      <section
        aria-labelledby="sec-activation"
        className="rounded-2xl border p-5 sm:p-7 space-y-7"
        style={{
          backgroundColor: 'var(--bg-surface)',
          borderColor: 'var(--border-hairline)',
          boxShadow: 'var(--shadow-soft)',
        }}
      >
        <div>
          <p className="text-xs font-medium" style={{ color: 'var(--color-primary-strong)' }}>
            Pilar 2 · Estado de ativação e sono
          </p>
          <h2
            id="sec-activation"
            className="text-xl font-semibold mt-0.5"
            style={{ color: 'var(--text-primary)' }}
          >
            Como estavam sua energia, sono e ritmo mental?
          </h2>
        </div>

        {/* Nível de energia 0-10 */}
        <div>
          <div className="flex flex-wrap items-baseline justify-between gap-2 mb-2">
            <label
              htmlFor="energy-slider"
              className="text-base font-medium"
              style={{ color: 'var(--text-primary)' }}
            >
              Nível de energia física e mental (0 a 10)
            </label>
            <span
              className="text-sm font-medium font-mono tabular-nums"
              style={{ color: 'var(--color-primary-strong)' }}
            >
              {energyLevel}/10 · {describeEnergy(energyLevel)}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => onChangeEnergyLevel(Math.max(0, energyLevel - 1))}
              aria-label="Diminuir nível de energia"
              className="min-h-[48px] min-w-[48px] rounded-xl border flex items-center justify-center shrink-0 cursor-pointer"
              style={{
                backgroundColor: 'var(--bg-elevated)',
                borderColor: 'var(--border-strong)',
                color: 'var(--text-primary)',
              }}
            >
              <Minus className="w-5 h-5" />
            </button>
            <input
              id="energy-slider"
              type="range"
              min={0}
              max={10}
              step={1}
              value={energyLevel}
              onChange={(e) => onChangeEnergyLevel(Number(e.target.value))}
              className="pt-slider w-full"
            />
            <button
              type="button"
              onClick={() => onChangeEnergyLevel(Math.min(10, energyLevel + 1))}
              aria-label="Aumentar nível de energia"
              className="min-h-[48px] min-w-[48px] rounded-xl border flex items-center justify-center shrink-0 cursor-pointer"
              style={{
                backgroundColor: 'var(--bg-elevated)',
                borderColor: 'var(--border-strong)',
                color: 'var(--text-primary)',
              }}
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Monitoramento do Sono */}
        <div className="pt-4 border-t space-y-5" style={{ borderColor: 'var(--border-hairline)' }}>
          <h3 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
            Sono da última noite
          </h3>

          {/* Horas dormidas */}
          <div>
            <div className="flex flex-wrap items-baseline justify-between gap-2 mb-2">
              <label
                htmlFor="sleep-hours"
                className="text-sm sm:text-base font-medium"
                style={{ color: 'var(--text-primary)' }}
              >
                Horas dormidas (aproximadamente)
              </label>
              <span
                className="text-base font-semibold font-mono tabular-nums"
                style={{ color: 'var(--color-primary-strong)' }}
              >
                {sleepHours.toFixed(1).replace('.0', '')}h
              </span>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() =>
                  onChangeSleepHours(Math.max(0, Number((sleepHours - 0.5).toFixed(1))))
                }
                aria-label="Diminuir horas de sono"
                className="min-h-[48px] min-w-[48px] rounded-xl border flex items-center justify-center shrink-0 cursor-pointer"
                style={{
                  backgroundColor: 'var(--bg-elevated)',
                  borderColor: 'var(--border-strong)',
                  color: 'var(--text-primary)',
                }}
              >
                <Minus className="w-5 h-5" />
              </button>
              <input
                id="sleep-hours"
                type="range"
                min={0}
                max={14}
                step={0.5}
                value={sleepHours}
                onChange={(e) => onChangeSleepHours(Number(e.target.value))}
                className="pt-slider w-full"
              />
              <button
                type="button"
                onClick={() =>
                  onChangeSleepHours(Math.min(14, Number((sleepHours + 0.5).toFixed(1))))
                }
                aria-label="Aumentar horas de sono"
                className="min-h-[48px] min-w-[48px] rounded-xl border flex items-center justify-center shrink-0 cursor-pointer"
                style={{
                  backgroundColor: 'var(--bg-elevated)',
                  borderColor: 'var(--border-strong)',
                  color: 'var(--text-primary)',
                }}
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Qualidade do sono */}
          <div>
            <p className="text-sm sm:text-base font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
              Qualidade do sono
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {SLEEP_QUALITY_OPTIONS.map((opt) => {
                const active = sleepQuality === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => onChangeSleepQuality(opt.id)}
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

          {/* Redução da necessidade de sono */}
          <div>
            <p className="text-sm sm:text-base font-medium mb-1" style={{ color: 'var(--text-primary)' }}>
              Notou redução da necessidade de sono?
            </p>
            <p className="text-xs sm:text-sm mb-2.5" style={{ color: 'var(--text-secondary)' }}>
              Ex.: dormir poucas horas e mesmo assim sentir-se acelerado ou sem cansaço.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {REDUCED_SLEEP_NEED_OPTIONS.map((opt) => {
                const active = reducedSleepNeed === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => onChangeReducedSleepNeed(opt.id)}
                    aria-pressed={active}
                    className="min-h-[54px] p-3 rounded-xl border text-left cursor-pointer"
                    style={{
                      backgroundColor: active
                        ? opt.id === ReducedSleepNeed.MARCANTE
                          ? 'var(--color-accent-soft)'
                          : 'var(--color-primary-soft)'
                        : 'var(--bg-elevated)',
                      borderColor: active
                        ? opt.id === ReducedSleepNeed.MARCANTE
                          ? 'var(--color-accent)'
                          : 'var(--color-primary-strong)'
                        : 'var(--border-hairline)',
                      borderWidth: active ? '2px' : '1px',
                    }}
                  >
                    <span className="block text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                      {opt.label}
                    </span>
                    <span className="block text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                      {opt.hint}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Duração dos estados */}
        <div className="pt-4 border-t" style={{ borderColor: 'var(--border-hairline)' }}>
          <p className="text-base font-medium mb-1" style={{ color: 'var(--text-primary)' }}>
            Há quanto tempo esse estado de humor/energia está durando?
          </p>
          <p className="text-sm mb-3" style={{ color: 'var(--text-secondary)' }}>
            Ajuda a distinguir oscilações breves de períodos mantidos por vários dias ou semanas.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-2">
            {STATE_DURATION_OPTIONS.map((opt) => {
              const active = stateDuration === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => onChangeStateDuration(opt.id)}
                  aria-pressed={active}
                  className="min-h-[48px] px-3 py-2 rounded-xl border text-sm font-medium text-center cursor-pointer"
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

        {/* Sinais associados de ativação */}
        <div className="pt-4 border-t" style={{ borderColor: 'var(--border-hairline)' }}>
          <p className="text-base font-medium mb-1" style={{ color: 'var(--text-primary)' }}>
            Sinais associados de ativação (se houver)
          </p>
          <p className="text-sm mb-3" style={{ color: 'var(--text-secondary)' }}>
            Marque apenas o que estiver presente hoje.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {ACTIVATION_SIGNAL_OPTIONS.map((sig) => {
              const selected = activationSignals.includes(sig.id);
              return (
                <button
                  key={sig.id}
                  type="button"
                  onClick={() => onToggleActivationSignal(sig.id)}
                  aria-pressed={selected}
                  className="min-h-[56px] p-3.5 rounded-xl border text-left flex items-start justify-between gap-3 cursor-pointer"
                  style={{
                    backgroundColor: selected ? 'var(--color-accent-soft)' : 'var(--bg-elevated)',
                    borderColor: selected ? 'var(--color-accent)' : 'var(--border-hairline)',
                    borderWidth: selected ? '2px' : '1px',
                  }}
                >
                  <div>
                    <span
                      className="block text-sm sm:text-base font-medium"
                      style={{ color: 'var(--text-primary)' }}
                    >
                      {sig.label}
                    </span>
                    <span className="block text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                      {sig.description}
                    </span>
                  </div>
                  {selected && (
                    <Check
                      className="w-5 h-5 shrink-0 mt-0.5"
                      style={{ color: 'var(--color-accent)' }}
                      aria-hidden="true"
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </section>
    );
  }
);

ActivationSection.displayName = 'ActivationSection';
