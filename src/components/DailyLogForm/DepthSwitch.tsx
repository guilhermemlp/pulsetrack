import React from 'react';
import { Gauge, ListChecks, Zap } from 'lucide-react';
import { RecordLevel } from '../../types/pulsetrack';

interface DepthSwitchProps {
  level: RecordLevel;
  onChange: (level: RecordLevel) => void;
  /** Em episódio o nível não pode ficar abaixo de "padrao". */
  minLevel?: RecordLevel;
  reduceMotion: boolean;
  /** No Modo de Foco o cabeçalho global está oculto: não há offset a compensar. */
  focusMode?: boolean;
}

interface LevelOption {
  id: RecordLevel;
  label: string;
  hint: string;
  Icon: typeof Zap;
}

const LEVEL_OPTIONS: LevelOption[] = [
  {
    id: 'rapido',
    label: 'Rápido',
    hint: 'Humor, energia e sono — menos de 1 minuto',
    Icon: Zap,
  },
  {
    id: 'padrao',
    label: 'Padrão',
    hint: 'Inclui sinais, duração, medicação e contexto',
    Icon: Gauge,
  },
  {
    id: 'completo',
    label: 'Completo',
    hint: 'Inclui impacto funcional, eventos do dia e notas',
    Icon: ListChecks,
  },
];

/**
 * Alternador de profundidade do registro.
 *
 * Não é decoração: é o que garante que a pessoa saiba em que nível está e possa
 * aprofundar depois sem perder o que já respondeu (trocar de nível nunca limpa estado).
 */
export const DepthSwitch: React.FC<DepthSwitchProps> = React.memo(
  ({ level, onChange, minLevel = 'rapido', reduceMotion, focusMode = false }) => {
    const activeOption = LEVEL_OPTIONS.find((opt) => opt.id === level) ?? LEVEL_OPTIONS[0];

    return (
      <section
        aria-label="Profundidade do registro"
        className={`sticky z-20 -mx-1 px-1 py-2 rounded-2xl ${focusMode ? 'top-0' : 'top-16'}`}
        style={{
          backgroundColor: 'color-mix(in srgb, var(--bg-canvas) 94%, transparent)',
          backdropFilter: 'blur(6px)',
        }}
      >
        <div
          role="group"
          aria-label="Escolha a profundidade do registro"
          className="grid grid-cols-3 gap-1.5 p-1.5 rounded-xl border"
          style={{
            backgroundColor: 'var(--bg-surface)',
            borderColor: 'var(--border-hairline)',
          }}
        >
          {LEVEL_OPTIONS.map((opt) => {
            const active = level === opt.id;
            const disabled = minLevel === 'padrao' && opt.id === 'rapido';
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => {
                  if (disabled) return;
                  onChange(opt.id);
                }}
                aria-pressed={active}
                aria-disabled={disabled || undefined}
                title={disabled ? 'Registros de comportamento precisam do nível Padrão ou Completo' : opt.hint}
                className={`min-h-[44px] px-2 py-1.5 rounded-lg text-sm font-medium inline-flex items-center justify-center gap-1.5 border transition-colors ${
                  disabled ? 'cursor-not-allowed opacity-45' : 'cursor-pointer'
                }`}
                style={{
                  backgroundColor: active ? 'var(--color-primary-soft)' : 'transparent',
                  borderColor: active ? 'var(--color-primary-strong)' : 'transparent',
                  color: active ? 'var(--color-primary-strong)' : 'var(--text-secondary)',
                }}
              >
                <opt.Icon className="w-4 h-4 shrink-0" aria-hidden="true" />
                <span>{opt.label}</span>
              </button>
            );
          })}
        </div>
        <p
          className="text-xs mt-1.5 px-1"
          style={{
            color: 'var(--text-muted)',
            transition: reduceMotion ? 'none' : 'color 150ms ease',
          }}
        >
          {activeOption.hint}
        </p>
      </section>
    );
  }
);

DepthSwitch.displayName = 'DepthSwitch';
