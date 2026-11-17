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
  energyLevel: number | null;
  sleepHours: number | null;
  sleepQuality: SleepQuality | null;
  reducedSleepNeed: ReducedSleepNeed | null;
  noFatigueAfterShortSleep: boolean | null;
  bedTime: string;
  wakeTime: string;
  latencyMinutes: number | null;
  awakenings: number | null;
  stateDuration: StateDuration | null;
  activationSignals: ActivationSignal[];
  compact: boolean;
  onChangeEnergyLevel: (value: number | null) => void;
  onChangeSleepHours: (value: number | null) => void;
  onChangeSleepQuality: (value: SleepQuality | null) => void;
  onChangeReducedSleepNeed: (value: ReducedSleepNeed | null) => void;
  onChangeNoFatigueAfterShortSleep: (value: boolean | null) => void;
  onChangeBedTime: (value: string) => void;
  onChangeWakeTime: (value: string) => void;
  onChangeLatencyMinutes: (value: number | null) => void;
  onChangeAwakenings: (value: number | null) => void;
  onChangeStateDuration: (value: StateDuration | null) => void;
  onToggleActivationSignal: (signal: ActivationSignal) => void;
}

function describeEnergy(val: number): string {
  if (val <= 2) return 'Muito baixa / exaustão';
  if (val <= 4) return 'Baixa';
  if (val <= 6) return 'Moderada';
  if (val <= 8) return 'Alta / ativada';
  return 'Muito alta / acelerada';
}

const fieldStyle = {
  backgroundColor: 'var(--bg-elevated)',
  borderColor: 'var(--border-strong)',
  color: 'var(--text-primary)',
} as const;

/**
 * Pilar 2 — Estado de ativação e sono.
 * Nenhum valor é pré-selecionado: "não informado" é um estado válido e aparece como tal
 * no relatório, em vez de virar uma média inventada.
 */
export const ActivationSection: React.FC<ActivationSectionProps> = React.memo(
  ({
    energyLevel,
    sleepHours,
    sleepQuality,
    reducedSleepNeed,
    noFatigueAfterShortSleep,
    bedTime,
    wakeTime,
    latencyMinutes,
    awakenings,
    stateDuration,
    activationSignals,
    compact,
    onChangeEnergyLevel,
    onChangeSleepHours,
    onChangeSleepQuality,
    onChangeReducedSleepNeed,
    onChangeNoFatigueAfterShortSleep,
    onChangeBedTime,
    onChangeWakeTime,
    onChangeLatencyMinutes,
    onChangeAwakenings,
    onChangeStateDuration,
    onToggleActivationSignal,
  }) => {
    const activationSignalsList = ACTIVATION_SIGNAL_OPTIONS.filter((s) => s.group === 'ativacao');
    const neurodivergentSignals = ACTIVATION_SIGNAL_OPTIONS.filter(
      (s) => s.group === 'neurodivergente'
    );

    const renderSignalGroup = (
      title: string,
      hint: string,
      options: typeof ACTIVATION_SIGNAL_OPTIONS
    ) => (
      <div>
        <p className="text-sm font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>
          {title}
        </p>
        <p className="text-xs sm:text-sm mb-2.5" style={{ color: 'var(--text-secondary)' }}>
          {hint}
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {options.map((sig) => {
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
    );

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
              {energyLevel !== null ? `${energyLevel}/10 · ${describeEnergy(energyLevel)}` : 'não informado'}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => onChangeEnergyLevel(Math.max(0, (energyLevel ?? 5) - 1))}
              aria-label="Diminuir nível de energia"
              className="min-h-[48px] min-w-[48px] rounded-xl border flex items-center justify-center shrink-0 cursor-pointer"
              style={fieldStyle}
            >
              <Minus className="w-5 h-5" />
            </button>
            <input
              id="energy-slider"
              type="range"
              min={0}
              max={10}
              step={1}
              value={energyLevel ?? 5}
              onChange={(e) => onChangeEnergyLevel(Number(e.target.value))}
              className="pt-slider w-full"
            />
            <button
              type="button"
              onClick={() => onChangeEnergyLevel(Math.min(10, (energyLevel ?? 5) + 1))}
              aria-label="Aumentar nível de energia"
              className="min-h-[48px] min-w-[48px] rounded-xl border flex items-center justify-center shrink-0 cursor-pointer"
              style={fieldStyle}
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>
          {energyLevel !== null ? (
            <button
              type="button"
              onClick={() => onChangeEnergyLevel(null)}
              className="mt-1.5 text-xs underline cursor-pointer"
              style={{ color: 'var(--text-muted)' }}
            >
              Não sei / prefiro não responder
            </button>
          ) : (
            <p className="mt-1.5 text-xs" style={{ color: 'var(--text-muted)' }}>
              Arraste ou use os botões para informar. Sem resposta, o relatório mostra “não informado”.
            </p>
          )}
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
                {sleepHours !== null ? `${sleepHours.toFixed(1).replace('.0', '')}h` : 'não informado'}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() =>
                  onChangeSleepHours(Math.max(0, Number(((sleepHours ?? 7) - 0.5).toFixed(1))))
                }
                aria-label="Diminuir horas de sono"
                className="min-h-[48px] min-w-[48px] rounded-xl border flex items-center justify-center shrink-0 cursor-pointer"
                style={fieldStyle}
              >
                <Minus className="w-5 h-5" />
              </button>
              <input
                id="sleep-hours"
                type="range"
                min={0}
                max={14}
                step={0.5}
                value={sleepHours ?? 7}
                onChange={(e) => onChangeSleepHours(Number(e.target.value))}
                className="pt-slider w-full"
              />
              <button
                type="button"
                onClick={() =>
                  onChangeSleepHours(Math.min(14, Number(((sleepHours ?? 7) + 0.5).toFixed(1))))
                }
                aria-label="Aumentar horas de sono"
                className="min-h-[48px] min-w-[48px] rounded-xl border flex items-center justify-center shrink-0 cursor-pointer"
                style={fieldStyle}
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>
            {sleepHours !== null && (
              <button
                type="button"
                onClick={() => onChangeSleepHours(null)}
                className="mt-1.5 text-xs underline cursor-pointer"
                style={{ color: 'var(--text-muted)' }}
              >
                Limpar
              </button>
            )}
          </div>

          {/* Qualidade do sono */}
          {!compact && (
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
                      onClick={() => onChangeSleepQuality(active ? null : opt.id)}
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
          )}

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
                    onClick={() => onChangeReducedSleepNeed(active ? null : opt.id)}
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

          {/* Marcador mais específico: dormiu pouco e não sentiu fadiga */}
          <div>
            <p className="text-sm sm:text-base font-medium mb-1" style={{ color: 'var(--text-primary)' }}>
              Mesmo dormindo pouco, você passou o dia sem sono nem fadiga?
            </p>
            <p className="text-xs sm:text-sm mb-2.5" style={{ color: 'var(--text-secondary)' }}>
              Este é o sinal que diferencia privação comum de sono de uma ativação de humor.
            </p>
            <div className="grid grid-cols-3 gap-2 max-w-md">
              {[
                { value: true, label: 'Sim' },
                { value: false, label: 'Não' },
                { value: null, label: 'Não sei' },
              ].map((opt) => {
                const active = noFatigueAfterShortSleep === opt.value;
                return (
                  <button
                    key={String(opt.value)}
                    type="button"
                    onClick={() => onChangeNoFatigueAfterShortSleep(opt.value)}
                    aria-pressed={active}
                    className="min-h-[48px] px-3 rounded-xl border text-sm font-medium cursor-pointer"
                    style={{
                      backgroundColor: active ? 'var(--color-accent-soft)' : 'var(--bg-elevated)',
                      borderColor: active ? 'var(--color-accent)' : 'var(--border-hairline)',
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

          {/* Detalhes opcionais do sono */}
          {!compact && (
            <details className="pt-1">
              <summary
                className="text-sm font-medium cursor-pointer select-none"
                style={{ color: 'var(--text-secondary)' }}
              >
                Detalhes do sono (horários, latência, despertares) — opcional
              </summary>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3">
                <div>
                  <label
                    htmlFor="sleep-bedtime"
                    className="block text-sm font-medium mb-1.5"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    Horário de deitar
                  </label>
                  <input
                    id="sleep-bedtime"
                    type="time"
                    value={bedTime}
                    onChange={(e) => onChangeBedTime(e.target.value)}
                    className="w-full min-h-[48px] px-4 rounded-xl border text-base font-mono tabular-nums"
                    style={fieldStyle}
                  />
                </div>
                <div>
                  <label
                    htmlFor="sleep-waketime"
                    className="block text-sm font-medium mb-1.5"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    Horário de levantar
                  </label>
                  <input
                    id="sleep-waketime"
                    type="time"
                    value={wakeTime}
                    onChange={(e) => onChangeWakeTime(e.target.value)}
                    className="w-full min-h-[48px] px-4 rounded-xl border text-base font-mono tabular-nums"
                    style={fieldStyle}
                  />
                </div>
                <div>
                  <label
                    htmlFor="sleep-latency"
                    className="block text-sm font-medium mb-1.5"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    Tempo para adormecer (minutos)
                  </label>
                  <input
                    id="sleep-latency"
                    type="number"
                    min={0}
                    max={480}
                    value={latencyMinutes ?? ''}
                    onChange={(e) =>
                      onChangeLatencyMinutes(e.target.value === '' ? null : Number(e.target.value))
                    }
                    placeholder="não informado"
                    className="w-full min-h-[48px] px-4 rounded-xl border text-base font-mono tabular-nums"
                    style={fieldStyle}
                  />
                </div>
                <div>
                  <label
                    htmlFor="sleep-awakenings"
                    className="block text-sm font-medium mb-1.5"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    Despertares durante a noite
                  </label>
                  <input
                    id="sleep-awakenings"
                    type="number"
                    min={0}
                    max={30}
                    value={awakenings ?? ''}
                    onChange={(e) =>
                      onChangeAwakenings(e.target.value === '' ? null : Number(e.target.value))
                    }
                    placeholder="não informado"
                    className="w-full min-h-[48px] px-4 rounded-xl border text-base font-mono tabular-nums"
                    style={fieldStyle}
                  />
                </div>
              </div>
            </details>
          )}
        </div>

        {/* Duração dos estados */}
        {!compact && (
          <div className="pt-4 border-t" style={{ borderColor: 'var(--border-hairline)' }}>
            <p className="text-base font-medium mb-1" style={{ color: 'var(--text-primary)' }}>
              Há quanto tempo esse estado de humor/energia está durando?
            </p>
            <p className="text-sm mb-3" style={{ color: 'var(--text-secondary)' }}>
              As faixas seguem os limiares clínicos: 4 dias ou mais e 14 dias ou mais mudam a leitura do quadro.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-6 gap-2">
              {STATE_DURATION_OPTIONS.map((opt) => {
                const active = stateDuration === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => onChangeStateDuration(active ? null : opt.id)}
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
        )}

        {/* Sinais e experiências */}
        {!compact && (
          <div className="pt-4 border-t space-y-5" style={{ borderColor: 'var(--border-hairline)' }}>
            {renderSignalGroup(
              'Sinais de ativação',
              'Marque apenas o que estiver presente neste registro.',
              activationSignalsList
            )}
            {renderSignalGroup(
              'Experiências neurodivergentes',
              'Não são sintomas de mania — servem para separar ativação de humor de sobrecarga, mascaramento e disfunção executiva.',
              neurodivergentSignals
            )}
          </div>
        )}
      </section>
    );
  }
);

ActivationSection.displayName = 'ActivationSection';
