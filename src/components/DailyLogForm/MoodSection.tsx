import React from 'react';
import { Check } from 'lucide-react';
import { MOOD_DEFINITIONS } from '../../data/defaults';
import { MoodStateId, ThemeMode } from '../../types/pulsetrack';

interface MoodSectionProps {
  moods: MoodStateId[];
  moodOtherText: string;
  hadMoodSwing: boolean;
  moodSwingDescription: string;
  theme: ThemeMode;
  onToggleMood: (id: MoodStateId) => void;
  onChangeMoodOtherText: (value: string) => void;
  onChangeHadMoodSwing: (value: boolean) => void;
  onChangeMoodSwingDescription: (value: string) => void;
}

/**
 * Pilar 1 — Estado emocional: como o usuário estava se sentindo e oscilações recentes.
 */
export const MoodSection: React.FC<MoodSectionProps> = React.memo(
  ({
    moods,
    moodOtherText,
    hadMoodSwing,
    moodSwingDescription,
    theme,
    onToggleMood,
    onChangeMoodOtherText,
    onChangeHadMoodSwing,
    onChangeMoodSwingDescription,
  }) => {
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
            Diferencie o sentimento emocional da sua energia física ou ação. Pode marcar mais de uma opção.
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

        {/* Oscilação de humor */}
        <div className="pt-4 border-t" style={{ borderColor: 'var(--border-hairline)' }}>
          <p className="text-base font-medium mb-3" style={{ color: 'var(--text-primary)' }}>
            Houve oscilação de humor significativa nas últimas horas?
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
            <div className="mt-3">
              <label
                htmlFor="swing-desc"
                className="block text-sm font-medium mb-1.5"
                style={{ color: 'var(--text-primary)' }}
              >
                Como foi essa oscilação?
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
          )}
        </div>
      </section>
    );
  }
);

MoodSection.displayName = 'MoodSection';
