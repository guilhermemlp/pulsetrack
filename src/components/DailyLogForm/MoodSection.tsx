import React from 'react';
import { Check } from 'lucide-react';
import {
  MOOD_DEFINITIONS,
  MOOD_SWING_DIRECTION_OPTIONS,
  MOOD_SWING_WINDOW_OPTIONS,
} from '../../data/defaults';
import { MoodStateId, MoodSwingDirection, MoodSwingWindow, ThemeMode } from '../../types/pulsetrack';

interface MoodSectionProps {
  moods: MoodStateId[];
  moodIntensity: Record<string, number>;
  moodOtherText: string;
  valence: number | null;
  hadMoodSwing: boolean;
  moodSwingDirection: MoodSwingDirection | null;
  moodSwingWindow: MoodSwingWindow | null;
  moodSwingDescription: string;
  theme: ThemeMode;
  compact: boolean;
  onToggleMood: (id: MoodStateId) => void;
  onChangeMoodIntensity: (id: MoodStateId, value: number) => void;
  onChangeMoodOtherText: (value: string) => void;
  onChangeValence: (value: number | null) => void;
  onChangeHadMoodSwing: (value: boolean) => void;
  onChangeMoodSwingDirection: (value: MoodSwingDirection | null) => void;
  onChangeMoodSwingWindow: (value: MoodSwingWindow | null) => void;
  onChangeMoodSwingDescription: (value: string) => void;
}

function describeValence(value: number): string {
  if (value <= 2) return 'Muito desagradável';
  if (value <= 4) return 'Desagradável';
  if (value <= 6) return 'Neutro / ambivalente';
  if (value <= 8) return 'Agradável';
  return 'Muito agradável';
}

/**
 * Pilar 1 — Estado emocional.
 * A valência (prazer/desprazer) é medida separadamente da energia/ativação do Pilar 2:
 * é essa separação que distingue depressão, euforia e episódio misto.
 */
export const MoodSection: React.FC<MoodSectionProps> = React.memo(
  ({
    moods,
    moodIntensity,
    moodOtherText,
    valence,
    hadMoodSwing,
    moodSwingDirection,
    moodSwingWindow,
    moodSwingDescription,
    theme,
    compact,
    onToggleMood,
    onChangeMoodIntensity,
    onChangeMoodOtherText,
    onChangeValence,
    onChangeHadMoodSwing,
    onChangeMoodSwingDirection,
    onChangeMoodSwingWindow,
    onChangeMoodSwingDescription,
  }) => {
    const selectedMoods = MOOD_DEFINITIONS.filter((mood) => moods.includes(mood.id));

    return (
      <section
        aria-labelledby="sec-emotional"
        className="rounded-2xl border p-5 sm:p-7 space-y-6"
        style={{
          backgroundColor: 'var(--bg-surface)',
          borderColor: 'var(--border-hairline)',
          boxShadow: 'var(--shadow-soft)',
        }}
      >
        <div>
          <p className="text-xs font-medium" style={{ color: 'var(--color-primary-strong)' }}>
            Pilar 1 · Estado emocional
          </p>
          <h2
            id="sec-emotional"
            className="text-xl font-semibold mt-0.5"
            style={{ color: 'var(--text-primary)' }}
          >
            Como você estava se sentindo?
          </h2>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
            Marque quantos estados quiser e diga o quanto cada um pesou. O quanto foi <strong>prazeroso ou
            desagradável</strong> vai abaixo, separado da energia física.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
          {MOOD_DEFINITIONS.map((mood) => {
            const selected = moods.includes(mood.id);
            const dotColor =
              theme === ThemeMode.DARK
                ? mood.colorDark
                : theme === ThemeMode.HIGH_CONTRAST
                ? mood.colorHighContrast
                : mood.colorLight;

            return (
              <button
                key={mood.id}
                type="button"
                onClick={() => onToggleMood(mood.id)}
                aria-pressed={selected}
                title={mood.description}
                className="min-h-[52px] px-3.5 py-2.5 rounded-xl border text-left flex items-center justify-between gap-2 transition-colors cursor-pointer"
                style={{
                  backgroundColor: selected ? 'var(--color-primary-soft)' : 'var(--bg-elevated)',
                  borderColor: selected ? 'var(--color-primary-strong)' : 'var(--border-hairline)',
                  borderWidth: selected ? '2px' : '1px',
                  color: 'var(--text-primary)',
                }}
              >
                <span className="flex items-center gap-2.5 min-w-0">
                  <span
                    className="w-3.5 h-3.5 rounded-sm shrink-0"
                    style={{ backgroundColor: dotColor }}
                    aria-hidden="true"
                  />
                  <span className="text-sm sm:text-base font-medium leading-tight">{mood.label}</span>
                </span>
                {selected && (
                  <Check
                    className="w-4 h-4 shrink-0"
                    style={{ color: 'var(--color-primary-strong)' }}
                    aria-hidden="true"
                  />
                )}
              </button>
            );
          })}
        </div>

        {selectedMoods.length > 0 && (
          <div className="space-y-2.5 pt-1">
            <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
              Intensidade de cada estado marcado (0 a 10)
            </p>
            {selectedMoods.map((mood) => (
              <div key={mood.id} className="flex items-center gap-3">
                <span
                  className="text-sm w-40 shrink-0 leading-tight"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  {mood.label}
                </span>
                <input
                  type="range"
                  min={0}
                  max={10}
                  step={1}
                  value={moodIntensity[mood.id] ?? 5}
                  onChange={(e) => onChangeMoodIntensity(mood.id, Number(e.target.value))}
                  aria-label={`Intensidade de ${mood.label}`}
                  className="pt-slider w-full"
                />
                <span
                  className="text-sm font-mono tabular-nums w-8 text-right shrink-0"
                  style={{ color: 'var(--color-primary-strong)' }}
                >
                  {moodIntensity[mood.id] ?? 5}
                </span>
              </div>
            ))}
          </div>
        )}

        {(moods.includes(MoodStateId.OUTRO) || moodOtherText.trim().length > 0) && (
          <div>
            <label
              htmlFor="mood-other"
              className="block text-sm font-medium mb-1.5"
              style={{ color: 'var(--text-primary)' }}
            >
              Descreva o estado emocional (campo livre)
            </label>
            <input
              id="mood-other"
              type="text"
              value={moodOtherText}
              onChange={(e) => onChangeMoodOtherText(e.target.value)}
              placeholder="Ex.: inquieto por dentro, frustrado, sensível..."
              className="w-full min-h-[48px] px-4 rounded-xl border text-base"
              style={{
                backgroundColor: 'var(--bg-elevated)',
                borderColor: 'var(--border-strong)',
                color: 'var(--text-primary)',
              }}
            />
          </div>
        )}

        {/* Valência do afeto — eixo separado da energia */}
        <div className="pt-4 border-t" style={{ borderColor: 'var(--border-hairline)' }}>
          <div className="flex flex-wrap items-baseline justify-between gap-2 mb-2">
            <label
              htmlFor="valence-slider"
              className="text-base font-medium"
              style={{ color: 'var(--text-primary)' }}
            >
              O quanto isso foi prazeroso ou desagradável? (0 a 10)
            </label>
            <span className="text-sm font-medium font-mono tabular-nums" style={{ color: 'var(--color-primary-strong)' }}>
              {valence !== null ? `${valence}/10 · ${describeValence(valence)}` : 'não informado'}
            </span>
          </div>
          <p className="text-xs sm:text-sm mb-2.5" style={{ color: 'var(--text-secondary)' }}>
            0 = muito desagradável · 10 = muito agradável. Este eixo é diferente da energia: dá para ter energia
            alta e desconforto alto ao mesmo tempo.
          </p>
          <div className="flex items-center gap-3">
            <input
              id="valence-slider"
              type="range"
              min={0}
              max={10}
              step={1}
              value={valence ?? 5}
              onChange={(e) => onChangeValence(Number(e.target.value))}
              className="pt-slider w-full"
            />
            {valence !== null && (
              <button
                type="button"
                onClick={() => onChangeValence(null)}
                className="min-h-[44px] px-3 rounded-lg border text-xs font-medium whitespace-nowrap shrink-0 cursor-pointer"
                style={{
                  backgroundColor: 'var(--bg-elevated)',
                  borderColor: 'var(--border-hairline)',
                  color: 'var(--text-secondary)',
                }}
              >
                limpar
              </button>
            )}
          </div>
        </div>

        {/* Oscilação de humor: direção + janela de tempo */}
        {!compact && (
          <div className="pt-4 border-t" style={{ borderColor: 'var(--border-hairline)' }}>
            <p className="text-base font-medium mb-1" style={{ color: 'var(--text-primary)' }}>
              Houve oscilação de humor significativa?
            </p>
            <p className="text-sm mb-3" style={{ color: 'var(--text-secondary)' }}>
              A direção e o tempo ajudam a distinguir labilidade rápida (minutos/horas) de ciclagem sustentada
              por dias.
            </p>
            <div className="grid grid-cols-2 gap-3 max-w-md">
              <button
                type="button"
                onClick={() => onChangeHadMoodSwing(true)}
                aria-pressed={hadMoodSwing}
                className="min-h-[48px] px-4 rounded-xl border text-base font-medium cursor-pointer"
                style={{
                  backgroundColor: hadMoodSwing ? 'var(--color-accent-soft)' : 'var(--bg-elevated)',
                  borderColor: hadMoodSwing ? 'var(--color-accent)' : 'var(--border-hairline)',
                  borderWidth: hadMoodSwing ? '2px' : '1px',
                  color: 'var(--text-primary)',
                }}
              >
                Sim, houve oscilação
              </button>
              <button
                type="button"
                onClick={() => onChangeHadMoodSwing(false)}
                aria-pressed={!hadMoodSwing}
                className="min-h-[48px] px-4 rounded-xl border text-base font-medium cursor-pointer"
                style={{
                  backgroundColor: !hadMoodSwing ? 'var(--color-secondary-soft)' : 'var(--bg-elevated)',
                  borderColor: !hadMoodSwing ? 'var(--color-secondary)' : 'var(--border-hairline)',
                  borderWidth: !hadMoodSwing ? '2px' : '1px',
                  color: 'var(--text-primary)',
                }}
              >
                Não percebi
              </button>
            </div>

            {hadMoodSwing && (
              <div className="mt-4 space-y-4">
                <div>
                  <p className="text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
                    Para que lado?
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {MOOD_SWING_DIRECTION_OPTIONS.map((opt) => {
                      const active = moodSwingDirection === opt.id;
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() =>
                            onChangeMoodSwingDirection(active ? null : opt.id)
                          }
                          aria-pressed={active}
                          className="min-h-[48px] px-3 py-2 rounded-xl border text-sm font-medium cursor-pointer"
                          style={{
                            backgroundColor: active ? 'var(--color-primary-soft)' : 'var(--bg-elevated)',
                            borderColor: active
                              ? 'var(--color-primary-strong)'
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
                </div>

                <div>
                  <p className="text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
                    Em quanto tempo?
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {MOOD_SWING_WINDOW_OPTIONS.map((opt) => {
                      const active = moodSwingWindow === opt.id;
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => onChangeMoodSwingWindow(active ? null : opt.id)}
                          aria-pressed={active}
                          className="min-h-[54px] p-3 rounded-xl border text-left cursor-pointer"
                          style={{
                            backgroundColor: active ? 'var(--color-primary-soft)' : 'var(--bg-elevated)',
                            borderColor: active
                              ? 'var(--color-primary-strong)'
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

                <div>
                  <label
                    htmlFor="swing-desc"
                    className="block text-sm font-medium mb-1.5"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    Como foi essa oscilação? (opcional)
                  </label>
                  <input
                    id="swing-desc"
                    type="text"
                    value={moodSwingDescription}
                    onChange={(e) => onChangeMoodSwingDescription(e.target.value)}
                    placeholder="Ex.: passei de apatia pela tarde para agitação intensa à noite"
                    className="w-full min-h-[48px] px-4 rounded-xl border text-base"
                    style={{
                      backgroundColor: 'var(--bg-elevated)',
                      borderColor: 'var(--border-strong)',
                      color: 'var(--text-primary)',
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        )}
      </section>
    );
  }
);

MoodSection.displayName = 'MoodSection';
