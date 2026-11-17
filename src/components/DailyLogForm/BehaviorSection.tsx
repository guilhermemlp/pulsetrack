import React from 'react';
import { Check, Minus, Plus } from 'lucide-react';
import {
  AwarenessType,
  BehaviorCategory,
  BehaviorMode,
  EntryType,
  ResistanceResult,
  SelectedBehavior,
} from '../../types/pulsetrack';

interface BehaviorSectionProps {
  entryType: EntryType;
  categories: BehaviorCategory[];
  triggerContext: string;
  behaviors: SelectedBehavior[];
  behaviorOtherText: string;
  awareness: AwarenessType | null;
  resisted: ResistanceResult | null;
  urgeIntensity: number | null;
  feelingDuring: string;
  feelingAfter: string;
  showSexualCategory: boolean;
  showOptionalFields: boolean;
  onSwitchToEpisode: () => void;
  onChangeTriggerContext: (value: string) => void;
  onToggleBehavior: (
    cat: BehaviorCategory,
    itemId: string,
    itemLabel: string,
    mode?: BehaviorMode
  ) => void;
  onChangeBehaviorHarm: (itemId: string, harm: boolean) => void;
  onChangeBehaviorOtherText: (value: string) => void;
  onChangeUrgeIntensity: (value: number | null) => void;
  onChangeAwareness: (value: AwarenessType | null) => void;
  onChangeResisted: (value: ResistanceResult | null) => void;
  onChangeFeelingDuring: (value: string) => void;
  onChangeFeelingAfter: (value: string) => void;
}

function describeUrge(val: number): string {
  if (val <= 2) return 'Leve';
  if (val <= 5) return 'Moderada';
  if (val <= 7) return 'Forte';
  return 'Muito intensa / urgente';
}

const smallButtonBase =
  'min-h-[40px] px-3 rounded-lg border text-xs font-medium cursor-pointer whitespace-nowrap';

/**
 * Pilar 3 — Comportamento.
 * A pergunta central foi separada em duas: o que a pessoa FEZ e o que ficou apenas
 * no IMPULSO. Essa distinção é o dado que diferencia impulsividade de compulsão e
 * evita contar como "ocorrência" algo que não aconteceu.
 */
export const BehaviorSection: React.FC<BehaviorSectionProps> = React.memo(
  ({
    entryType,
    categories,
    triggerContext,
    behaviors,
    behaviorOtherText,
    awareness,
    resisted,
    urgeIntensity,
    feelingDuring,
    feelingAfter,
    showSexualCategory,
    showOptionalFields,
    onSwitchToEpisode,
    onChangeTriggerContext,
    onToggleBehavior,
    onChangeBehaviorHarm,
    onChangeBehaviorOtherText,
    onChangeUrgeIntensity,
    onChangeAwareness,
    onChangeResisted,
    onChangeFeelingDuring,
    onChangeFeelingAfter,
  }) => {
    if (entryType !== EntryType.EPISODE) {
      return (
        <div
          className="rounded-2xl border p-5 space-y-4"
          style={{
            backgroundColor: 'var(--bg-elevated)',
            borderColor: 'var(--border-hairline)',
          }}
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                Pilar 3 · Comportamento: sem episódio compulsivo neste registro
              </p>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                Ótimo — registrar dias tranquilos é essencial para comparar sono e humor ao longo do tempo.
              </p>
            </div>
            <button
              type="button"
              onClick={onSwitchToEpisode}
              className="min-h-[48px] px-4 rounded-xl border text-sm font-medium whitespace-nowrap shrink-0 cursor-pointer"
              style={{
                backgroundColor: 'var(--bg-surface)',
                borderColor: 'var(--border-strong)',
                color: 'var(--color-primary-strong)',
              }}
            >
              Adicionar comportamento
            </button>
          </div>

          {/* Impulso resistido também é dado clínico: não pode ser descartado no check-in. */}
          <div className="pt-3 border-t" style={{ borderColor: 'var(--border-hairline)' }}>
            <div className="flex flex-wrap items-baseline justify-between gap-2 mb-2">
              <label
                htmlFor="checkin-urge"
                className="text-sm font-medium"
                style={{ color: 'var(--text-primary)' }}
              >
                Teve algum impulso hoje, mesmo sem ter agido? (0 a 10)
              </label>
              <span
                className="text-sm font-mono tabular-nums"
                style={{ color: 'var(--color-accent)' }}
              >
                {urgeIntensity !== null
                  ? `${urgeIntensity}/10 · ${describeUrge(urgeIntensity)}`
                  : 'não informado'}
              </span>
            </div>
            <p className="text-xs mb-2" style={{ color: 'var(--text-secondary)' }}>
              Registrar a vontade que você conseguiu segurar é tão importante quanto registrar a ação.
            </p>
            <input
              id="checkin-urge"
              type="range"
              min={0}
              max={10}
              step={1}
              value={urgeIntensity ?? 0}
              onChange={(e) => onChangeUrgeIntensity(Number(e.target.value))}
              className="pt-slider w-full"
            />
            {urgeIntensity !== null && (
              <button
                type="button"
                onClick={() => onChangeUrgeIntensity(null)}
                className="mt-1.5 text-xs underline cursor-pointer"
                style={{ color: 'var(--text-muted)' }}
              >
                Limpar
              </button>
            )}
          </div>
        </div>
      );
    }

    const activeCategories = categories
      .filter((c) => c.active && c.items.some((i) => i.active))
      // Conteúdo sensível: só aparece se a pessoa ativar nas preferências.
      .filter((c) => showSexualCategory || c.id !== 'cat_sexual');
    const hasFreeBehaviorSelected = behaviors.some((b) => b.itemId === 'out_livre');

    return (
      <section
        aria-labelledby="sec-behavior-pillar"
        className="rounded-2xl border p-5 sm:p-7 space-y-6"
        style={{
          backgroundColor: 'var(--bg-surface)',
          borderColor: 'var(--border-hairline)',
          boxShadow: 'var(--shadow-soft)',
        }}
      >
        <div>
          <p className="text-xs font-medium" style={{ color: 'var(--color-primary-strong)' }}>
            Pilar 3 · Comportamento
          </p>
          <h2
            id="sec-behavior-pillar"
            className="text-xl font-semibold mt-0.5"
            style={{ color: 'var(--text-primary)' }}
          >
            O que você fez e o que ficou só no impulso?
          </h2>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
            Marque os itens e, em cada um, diga se <strong>aconteceu</strong> ou se foi apenas{' '}
            <strong>vontade</strong>. Vontade segurada não é a mesma coisa que ação.
          </p>
        </div>

        {/* Gatilho */}
        <div>
          <label
            htmlFor="trigger-context"
            className="block text-base font-medium mb-1.5"
            style={{ color: 'var(--text-primary)' }}
          >
            Gatilho ou contexto
          </label>
          <input
            id="trigger-context"
            type="text"
            value={triggerContext}
            onChange={(e) => onChangeTriggerContext(e.target.value)}
            placeholder="O que aconteceu antes? (ex.: sobrecarga sensorial, tédio, crítica, excesso de tarefas...)"
            className="w-full min-h-[48px] px-4 rounded-xl border text-base"
            style={{
              backgroundColor: 'var(--bg-elevated)',
              borderColor: 'var(--border-strong)',
              color: 'var(--text-primary)',
            }}
          />
        </div>

        {/* Categorias e subitens */}
        <div className="space-y-6">
          {activeCategories.map((cat) => {
            const activeItems = cat.items.filter((i) => i.active);
            return (
              <div
                key={cat.id}
                className="pt-4 border-t first:pt-0 first:border-t-0"
                style={{ borderColor: 'var(--border-hairline)' }}
              >
                <h3 className="text-base font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>
                  {cat.name}
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {activeItems.map((item) => {
                    const selected = behaviors.find((b) => b.itemId === item.id);
                    const checked = Boolean(selected);
                    return (
                      <div key={item.id} className="space-y-1.5">
                        <button
                          type="button"
                          onClick={() => onToggleBehavior(cat, item.id, item.label)}
                          aria-pressed={checked}
                          className="w-full min-h-[50px] px-4 py-2.5 rounded-xl border text-left flex items-center justify-between gap-3 transition-colors cursor-pointer"
                          style={{
                            backgroundColor: checked
                              ? 'var(--color-primary-soft)'
                              : 'var(--bg-elevated)',
                            borderColor: checked
                              ? 'var(--color-primary-strong)'
                              : 'var(--border-hairline)',
                            borderWidth: checked ? '2px' : '1px',
                            color: 'var(--text-primary)',
                          }}
                        >
                          <span className="text-sm sm:text-base leading-snug">{item.label}</span>
                          {checked && (
                            <Check
                              className="w-5 h-5 shrink-0"
                              style={{ color: 'var(--color-primary-strong)' }}
                              aria-hidden="true"
                            />
                          )}
                        </button>

                        {selected && (
                          <div className="flex flex-wrap items-center gap-1.5 pl-1">
                            {[
                              { mode: BehaviorMode.FEITO, label: 'Fiz' },
                              { mode: BehaviorMode.IMPULSO, label: 'Só o impulso' },
                            ].map((opt) => {
                              const active = selected.mode === opt.mode;
                              return (
                                <button
                                  key={opt.mode}
                                  type="button"
                                  onClick={() => onToggleBehavior(cat, item.id, item.label, opt.mode)}
                                  aria-pressed={active}
                                  aria-label={`${item.label}: ${opt.label}`}
                                  className={smallButtonBase}
                                  style={{
                                    backgroundColor: active
                                      ? opt.mode === BehaviorMode.IMPULSO
                                        ? 'var(--color-secondary-soft)'
                                        : 'var(--color-primary-soft)'
                                      : 'var(--bg-surface)',
                                    borderColor: active
                                      ? opt.mode === BehaviorMode.IMPULSO
                                        ? 'var(--color-secondary)'
                                        : 'var(--color-primary-strong)'
                                      : 'var(--border-hairline)',
                                    color: 'var(--text-primary)',
                                  }}
                                >
                                  {opt.label}
                                </button>
                              );
                            })}
                            <button
                              type="button"
                              onClick={() => onChangeBehaviorHarm(item.id, !selected.harm)}
                              aria-pressed={selected.harm}
                              aria-label={`${item.label}: gerou prejuízo ou sofrimento`}
                              className={smallButtonBase}
                              style={{
                                backgroundColor: selected.harm
                                  ? 'var(--color-accent-soft)'
                                  : 'var(--bg-surface)',
                                borderColor: selected.harm
                                  ? 'var(--color-accent)'
                                  : 'var(--border-hairline)',
                                color: 'var(--text-primary)',
                              }}
                            >
                              {selected.harm ? '✓ gerou prejuízo' : 'sem prejuízo'}
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {(hasFreeBehaviorSelected || behaviorOtherText.trim().length > 0) && (
          <div>
            <label
              htmlFor="behavior-other"
              className="block text-sm font-medium mb-1.5"
              style={{ color: 'var(--text-primary)' }}
            >
              Outro comportamento (campo livre)
            </label>
            <input
              id="behavior-other"
              type="text"
              value={behaviorOtherText}
              onChange={(e) => onChangeBehaviorOtherText(e.target.value)}
              placeholder="Descreva com suas palavras"
              className="w-full min-h-[48px] px-4 rounded-xl border text-base"
              style={{
                backgroundColor: 'var(--bg-elevated)',
                borderColor: 'var(--border-strong)',
                color: 'var(--text-primary)',
              }}
            />
          </div>
        )}

        {/* Intensidade da vontade */}
        <div className="pt-4 border-t" style={{ borderColor: 'var(--border-hairline)' }}>
          <div className="flex flex-wrap items-baseline justify-between gap-2 mb-2">
            <label
              htmlFor="urge-slider"
              className="text-base font-medium"
              style={{ color: 'var(--text-primary)' }}
            >
              Intensidade da vontade / impulso (0 a 10)
            </label>
            <span
              className="text-sm font-medium font-mono tabular-nums"
              style={{ color: 'var(--color-accent)' }}
            >
              {urgeIntensity !== null
                ? `${urgeIntensity}/10 · ${describeUrge(urgeIntensity)}`
                : 'não informado'}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => onChangeUrgeIntensity(Math.max(0, (urgeIntensity ?? 5) - 1))}
              aria-label="Diminuir intensidade da vontade"
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
              id="urge-slider"
              type="range"
              min={0}
              max={10}
              step={1}
              value={urgeIntensity ?? 5}
              onChange={(e) => onChangeUrgeIntensity(Number(e.target.value))}
              className="pt-slider w-full"
            />
            <button
              type="button"
              onClick={() => onChangeUrgeIntensity(Math.min(10, (urgeIntensity ?? 5) + 1))}
              aria-label="Aumentar intensidade da vontade"
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
          {urgeIntensity !== null && (
            <button
              type="button"
              onClick={() => onChangeUrgeIntensity(null)}
              className="mt-1.5 text-xs underline cursor-pointer"
              style={{ color: 'var(--text-muted)' }}
            >
              Não sei / prefiro não responder
            </button>
          )}
        </div>

        {/* Consciência e interrupção */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <p className="text-base font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
              O comportamento foi:
            </p>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: AwarenessType.CONSCIENTE, label: 'Consciente' },
                { id: AwarenessType.AUTOMATICO, label: 'Automático' },
                { id: AwarenessType.MISTURA, label: 'Mistura' },
              ].map((opt) => {
                const active = awareness === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => onChangeAwareness(active ? null : opt.id)}
                    aria-pressed={active}
                    className="min-h-[48px] px-2.5 rounded-xl border text-sm font-medium cursor-pointer"
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
            <p className="text-base font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
              Conseguiu interromper ou resistir?
            </p>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: ResistanceResult.SIM, label: 'Sim' },
                { id: ResistanceResult.PARCIALMENTE, label: 'Parcial' },
                { id: ResistanceResult.NAO, label: 'Não' },
              ].map((opt) => {
                const active = resisted === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => onChangeResisted(active ? null : opt.id)}
                    aria-pressed={active}
                    className="min-h-[48px] px-2.5 rounded-xl border text-sm font-medium cursor-pointer"
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
        </div>

        {showOptionalFields && (
          <div
            className="pt-4 border-t grid grid-cols-1 md:grid-cols-2 gap-5"
            style={{ borderColor: 'var(--border-hairline)' }}
          >
            <div>
              <label
                htmlFor="feeling-during"
                className="block text-sm font-medium mb-1.5"
                style={{ color: 'var(--text-primary)' }}
              >
                Sensação durante (opcional)
              </label>
              <textarea
                id="feeling-during"
                rows={2}
                value={feelingDuring}
                onChange={(e) => onChangeFeelingDuring(e.target.value)}
                placeholder="Ex.: euforia na expectativa, piloto automático, alívio..."
                className="w-full p-3.5 rounded-xl border text-base"
                style={{
                  backgroundColor: 'var(--bg-elevated)',
                  borderColor: 'var(--border-strong)',
                  color: 'var(--text-primary)',
                }}
              />
            </div>

            <div>
              <label
                htmlFor="feeling-after"
                className="block text-sm font-medium mb-1.5"
                style={{ color: 'var(--text-primary)' }}
              >
                Sensação / consequência depois (opcional)
              </label>
              <textarea
                id="feeling-after"
                rows={2}
                value={feelingAfter}
                onChange={(e) => onChangeFeelingAfter(e.target.value)}
                placeholder="Ex.: queda brusca de interesse, cansaço, calma..."
                className="w-full p-3.5 rounded-xl border text-base"
                style={{
                  backgroundColor: 'var(--bg-elevated)',
                  borderColor: 'var(--border-strong)',
                  color: 'var(--text-primary)',
                }}
              />
            </div>
          </div>
        )}
      </section>
    );
  }
);

BehaviorSection.displayName = 'BehaviorSection';
