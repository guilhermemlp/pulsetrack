import React, { useEffect, useRef, useState } from 'react';
import { Check, Minus, Plus, PlusCircle, Search } from 'lucide-react';
import {
  AwarenessType,
  BehaviorCategory,
  BehaviorMode,
  EntryType,
  ResistanceResult,
  SelectedBehavior,
} from '../../types/pulsetrack';
import {
  countActiveItems,
  describeBehaviorMode,
  filterCategoriesBySearch,
  RecentBehavior,
  SEARCH_THRESHOLD,
} from '../../utils/recentBehaviors';

export type QuickImpulseAnswer = 'sim' | 'nao' | null;

export interface CreatedBehaviorItem {
  id: string;
  label: string;
}

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
  /** Check-in rápido: o pilar inteiro começa como uma única pergunta. */
  quickCompact: boolean;
  /** Usado quando o formulário já mostra o título do pilar (seção recolhível). */
  embedded?: boolean;
  quickImpulseAnswer: QuickImpulseAnswer;
  onAnswerQuickImpulse: (answer: QuickImpulseAnswer) => void;
  onSwitchToEpisode: () => void;
  onChangeTriggerContext: (value: string) => void;
  /** Só a escolha do modo adiciona o item: nada é assumido como "feito". */
  onSetBehaviorMode: (
    cat: BehaviorCategory,
    itemId: string,
    itemLabel: string,
    mode: BehaviorMode
  ) => void;
  onRemoveBehavior: (itemId: string) => void;
  onChangeBehaviorHarm: (itemId: string, harm: boolean) => void;
  /** Persiste imediatamente na categoria e devolve o item criado. */
  onCreateItem: (categoryId: string, label: string) => CreatedBehaviorItem | null;
  /** Itens dos últimos 14 dias, do mais recente para o mais antigo (inclui impulsos). */
  recentBehaviors: RecentBehavior[];
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
  'min-h-[44px] px-3 rounded-lg border text-xs font-medium cursor-pointer whitespace-nowrap';

const fieldStyle = {
  backgroundColor: 'var(--bg-elevated)',
  borderColor: 'var(--border-strong)',
  color: 'var(--text-primary)',
} as const;

interface InlineItemCreateProps {
  category: BehaviorCategory;
  onCreateItem: (categoryId: string, label: string) => CreatedBehaviorItem | null;
  onCreated: (item: CreatedBehaviorItem) => void;
}

/**
 * Criação de subitem dentro do próprio registro.
 * Sem isso, criar uma tag no meio de um episódio exige trocar de aba e perder o contexto.
 */
const InlineItemCreate: React.FC<InlineItemCreateProps> = ({
  category,
  onCreateItem,
  onCreated,
}) => {
  const [open, setOpen] = useState(false);
  const [label, setLabel] = useState('');
  const [status, setStatus] = useState('');

  const submit = () => {
    const trimmed = label.trim();
    if (!trimmed) return;
    const created = onCreateItem(category.id, trimmed);
    if (!created) {
      setStatus('Esse item já existe nesta categoria.');
      return;
    }
    setLabel('');
    setOpen(false);
    setStatus(`Item “${created.label}” criado e adicionado ao registro.`);
    onCreated(created);
  };

  return (
    <div className="mt-2">
      {!open ? (
        <button
          type="button"
          onClick={() => {
            setOpen(true);
            setStatus('');
          }}
          className="min-h-[44px] px-3 py-1.5 rounded-lg border text-xs font-medium inline-flex items-center gap-1.5 cursor-pointer"
          style={{
            backgroundColor: 'var(--bg-surface)',
            borderColor: 'var(--border-hairline)',
            color: 'var(--text-secondary)',
          }}
          aria-label={`Criar item em ${category.name}`}
        >
          <PlusCircle className="w-4 h-4" aria-hidden="true" />
          Criar item
        </button>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          <label htmlFor={`create-${category.id}`} className="sr-only">
            Novo item em {category.name}
          </label>
          <input
            id={`create-${category.id}`}
            type="text"
            value={label}
            autoFocus
            onChange={(e) => setLabel(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                setOpen(false);
                setLabel('');
              }
              if (e.key === 'Enter') {
                e.preventDefault();
                submit();
              }
            }}
            placeholder={`Novo item em ${category.name}`}
            className="flex-1 min-w-[180px] min-h-[44px] px-3 rounded-lg border text-sm"
            style={fieldStyle}
          />
          <button
            type="button"
            onClick={submit}
            className="min-h-[44px] px-3.5 rounded-lg border text-sm font-semibold cursor-pointer"
            style={{
              backgroundColor: 'var(--color-primary-soft)',
              borderColor: 'var(--color-primary-strong)',
              color: 'var(--color-primary-strong)',
            }}
          >
            Criar e usar
          </button>
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              setLabel('');
            }}
            className="min-h-[44px] px-3 rounded-lg text-xs underline cursor-pointer"
            style={{ color: 'var(--text-muted)' }}
          >
            Cancelar
          </button>
        </div>
      )}
      {status && (
        <p role="status" className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
          {status}
        </p>
      )}
    </div>
  );
};

interface RecentBehaviorsStripProps {
  recentBehaviors: RecentBehavior[];
  categories: BehaviorCategory[];
  onPick: (
    category: BehaviorCategory,
    itemId: string,
    itemLabel: string,
    mode: BehaviorMode
  ) => void;
}

/** Últimos 14 dias, um chip por item; o modo é o da última vez que apareceu. */
const RecentBehaviorsStrip: React.FC<RecentBehaviorsStripProps> = ({
  recentBehaviors,
  categories,
  onPick,
}) => {
  if (recentBehaviors.length === 0) return null;

  return (
    <div
      className="rounded-xl border p-3"
      style={{
        backgroundColor: 'var(--bg-elevated)',
        borderColor: 'var(--border-hairline)',
      }}
    >
      <p
        className="text-xs font-semibold mb-2"
        style={{ color: 'var(--text-secondary)' }}
      >
        Últimos usados (14 dias)
      </p>
      <ul className="flex flex-wrap gap-1.5">
        {recentBehaviors.map((recent) => {
          const category = categories.find((c) => c.id === recent.categoryId);
          if (!category) return null;
          const modeLabel = describeBehaviorMode(recent.mode);
          return (
            <li key={recent.itemId}>
              <button
                type="button"
                onClick={() => onPick(category, recent.itemId, recent.itemLabel, recent.mode)}
                aria-label={`${recent.itemLabel} (${modeLabel}) — usar de novo`}
                className="min-h-[44px] px-3 rounded-lg border text-xs font-medium cursor-pointer"
                style={{
                  backgroundColor:
                    recent.mode === BehaviorMode.IMPULSO
                      ? 'var(--color-secondary-soft)'
                      : 'var(--color-primary-soft)',
                  borderColor:
                    recent.mode === BehaviorMode.IMPULSO
                      ? 'var(--color-secondary)'
                      : 'var(--color-primary-strong)',
                  color: 'var(--text-primary)',
                }}
              >
                {recent.itemLabel} · {modeLabel}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
};

/**
 * Pilar 3 — Comportamento.
 * A pergunta central foi separada em duas: o que a pessoa FEZ e o que ficou apenas
 * no IMPULSO. Essa distinção é o dado que diferencia impulsividade de compulsão e
 * evita contar como "ocorrência" algo que não aconteceu — por isso o modo é escolhido
 * explicitamente, nunca presumido.
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
    quickCompact,
    embedded = false,
    quickImpulseAnswer,
    onAnswerQuickImpulse,
    onSwitchToEpisode,
    onChangeTriggerContext,
    onSetBehaviorMode,
    onRemoveBehavior,
    onChangeBehaviorHarm,
    onCreateItem,
    recentBehaviors,
    onChangeBehaviorOtherText,
    onChangeUrgeIntensity,
    onChangeAwareness,
    onChangeResisted,
    onChangeFeelingDuring,
    onChangeFeelingAfter,
  }) => {
    const [modePickerItemId, setModePickerItemId] = useState<string | null>(null);
    const [justCreatedId, setJustCreatedId] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const searchInputRef = useRef<HTMLInputElement | null>(null);

    const isEpisode = entryType === EntryType.EPISODE;
    // "Não" também é uma resposta dada: sem isso, o portão rápido continuaria
    // aparecendo e o botão pareceria não ter efeito.
    const hasAnyBehaviorSignal =
      behaviors.length > 0 || urgeIntensity !== null || quickImpulseAnswer !== null;
    const showQuickGate = quickCompact && !isEpisode && !hasAnyBehaviorSignal;
    const editorVisible = isEpisode || !quickCompact || Boolean(hasAnyBehaviorSignal);
    const activeCategoryList = categories
      .filter((c) => c.active && !c.archived)
      // Itens arquivados continuam no histórico, mas nunca aparecem para novos registros.
      .map((c) => ({ ...c, items: c.items.filter((item) => !item.archived) }))
      // Conteúdo sensível: só aparece se a pessoa ativar nas preferências.
      .filter((c) => showSexualCategory || c.id !== 'cat_sexual');
    const showSearch = countActiveItems(activeCategoryList) > SEARCH_THRESHOLD;

    // Atalho "/" leva direto à busca, sem exigir Tab por todo o catálogo.
    useEffect(() => {
      if (!editorVisible || !showSearch) return;
      const onKeyDown = (event: KeyboardEvent) => {
        if (event.key !== '/' || event.ctrlKey || event.metaKey || event.altKey) return;
        const target = event.target as HTMLElement | null;
        const tag = target?.tagName?.toLowerCase();
        if (tag === 'input' || tag === 'textarea' || tag === 'select' || target?.isContentEditable) {
          return;
        }
        event.preventDefault();
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
      };
      document.addEventListener('keydown', onKeyDown);
      return () => document.removeEventListener('keydown', onKeyDown);
    }, [editorVisible, showSearch]);

    if (showQuickGate) {
      return (
        <section
          aria-labelledby="sec-behavior-pillar"
          className="rounded-2xl border px-4 py-3.5"
          style={{
            backgroundColor: 'var(--bg-surface)',
            borderColor: 'var(--border-hairline)',
          }}
        >
          <div className="flex flex-wrap items-center gap-2">
            <div className="mr-auto min-w-0">
              <p className="text-xs font-medium" style={{ color: 'var(--color-primary-strong)' }}>
                Pilar 3 · Comportamento
              </p>
              <h2
                id="sec-behavior-pillar"
                className="text-base font-medium"
                style={{ color: 'var(--text-primary)' }}
              >
                Teve algum impulso hoje?
              </h2>
            </div>
            <button
              type="button"
              onClick={() => onAnswerQuickImpulse('nao')}
              className="min-h-[44px] px-4 rounded-lg border text-sm font-medium cursor-pointer"
              style={{
                backgroundColor: 'var(--bg-elevated)',
                borderColor: 'var(--border-hairline)',
                color: 'var(--text-primary)',
              }}
            >
              Não
            </button>
            <button
              type="button"
              onClick={() => onAnswerQuickImpulse('sim')}
              className="min-h-[44px] px-4 rounded-lg border text-sm font-semibold cursor-pointer"
              style={{
                backgroundColor: 'var(--color-primary-soft)',
                borderColor: 'var(--color-primary-strong)',
                color: 'var(--color-primary-strong)',
              }}
            >
              Sim
            </button>
          </div>

          {/* Um toque no chip já registra o item com o modo da última vez. */}
          {recentBehaviors.length > 0 && (
            <div className="mt-3">
              <RecentBehaviorsStrip
                recentBehaviors={recentBehaviors}
                categories={categories}
                onPick={onSetBehaviorMode}
              />
            </div>
          )}
        </section>
      );
    }

    if (quickCompact && !isEpisode && quickImpulseAnswer === 'nao') {
      return (
        <section
          aria-labelledby="sec-behavior-pillar"
          className="rounded-2xl border px-4 py-3.5"
          style={{
            backgroundColor: 'var(--bg-surface)',
            borderColor: 'var(--border-hairline)',
          }}
        >
          <div className="flex flex-wrap items-center gap-2">
            <p
              id="sec-behavior-pillar"
              className="text-sm mr-auto"
              style={{ color: 'var(--text-secondary)' }}
            >
              Sem impulso registrado — dias assim também são dado comparativo.
            </p>
            <button
              type="button"
              onClick={() => onAnswerQuickImpulse('sim')}
              className="min-h-[44px] px-3 rounded-lg border text-xs font-medium cursor-pointer"
              style={{
                backgroundColor: 'var(--bg-surface)',
                borderColor: 'var(--border-hairline)',
                color: 'var(--text-primary)',
              }}
            >
              Na verdade, houve impulso
            </button>
            <button
              type="button"
              onClick={onSwitchToEpisode}
              className="min-h-[44px] px-3 rounded-lg border text-xs font-medium cursor-pointer"
              style={{
                backgroundColor: 'var(--bg-surface)',
                borderColor: 'var(--border-strong)',
                color: 'var(--color-primary-strong)',
              }}
            >
              Registrar comportamento
            </button>
          </div>
        </section>
      );
    }

    if (!isEpisode && !quickCompact) {
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
                Pilar 3 · Comportamento: nenhum comportamento registrado neste check-in
              </p>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                Ótimo — registrar dias tranquilos é essencial para comparar sono e humor ao longo do
                tempo.
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

    const activeCategories = filterCategoriesBySearch(activeCategoryList, searchQuery);
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
          {!embedded && (
            <p className="text-xs font-medium" style={{ color: 'var(--color-primary-strong)' }}>
              Pilar 3 · Comportamento
            </p>
          )}
          <h2
            id="sec-behavior-pillar"
            className="text-xl font-semibold mt-0.5"
            style={{ color: 'var(--text-primary)' }}
          >
            O que você fez e o que ficou só no impulso?
          </h2>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
            Toque no item e escolha <strong>só o impulso</strong> ou <strong>fiz</strong>. Nada é
            marcado como ação sem você dizer.
          </p>
        </div>

        {behaviors.length > 0 && (
          <div
            className="rounded-xl border p-3 space-y-2"
            style={{
              backgroundColor: 'var(--bg-elevated)',
              borderColor: 'var(--border-hairline)',
            }}
          >
            <p className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>
              Neste registro ({behaviors.length})
            </p>
            <ul className="flex flex-wrap gap-1.5">
              {behaviors.map((b) => (
                <li key={b.itemId}>
                  <button
                    type="button"
                    onClick={() => onRemoveBehavior(b.itemId)}
                    className="min-h-[44px] px-2.5 rounded-lg border text-xs font-medium cursor-pointer"
                    style={{
                      backgroundColor:
                        b.mode === BehaviorMode.IMPULSO
                          ? 'var(--color-secondary-soft)'
                          : 'var(--color-primary-soft)',
                      borderColor:
                        b.mode === BehaviorMode.IMPULSO
                          ? 'var(--color-secondary)'
                          : 'var(--color-primary-strong)',
                      color: 'var(--text-primary)',
                    }}
                    aria-label={`Remover ${b.itemLabel} (${describeBehaviorMode(b.mode)})`}
                  >
                    {b.itemLabel} · {describeBehaviorMode(b.mode)}
                    {b.harm ? ' · prejuízo' : ''}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

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
            style={fieldStyle}
          />
        </div>

        <RecentBehaviorsStrip
          recentBehaviors={recentBehaviors}
          categories={categories}
          onPick={onSetBehaviorMode}
        />

        {/* Busca: só aparece quando o catálogo fica grande demais para rolar */}
        {showSearch && (
          <div className="space-y-1.5">
            <label
              htmlFor="behavior-search"
              className="text-sm font-medium"
              style={{ color: 'var(--text-primary)' }}
            >
              Buscar comportamento
            </label>
            <div className="relative">
              <Search
                className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                style={{ color: 'var(--text-muted)' }}
                aria-hidden="true"
              />
              <input
                id="behavior-search"
                ref={searchInputRef}
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') {
                    setSearchQuery('');
                  }
                }}
                placeholder="Buscar comportamento"
                aria-describedby="behavior-search-hint"
                className="w-full min-h-[48px] pl-9 pr-3 rounded-xl border text-base"
                style={fieldStyle}
              />
            </div>
            <p
              id="behavior-search-hint"
              className="text-xs"
              style={{ color: 'var(--text-muted)' }}
            >
              {searchQuery.trim()
                ? `${activeCategories.reduce((sum, c) => sum + c.items.length, 0)} item(ns) encontrado(s). Pressione Esc para limpar.`
                : 'Atalho: pressione / em qualquer ponto do formulário.'}
            </p>
          </div>
        )}

        {/* Categorias, subitens e criação inline */}
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

                {activeItems.length === 0 && (
                  <p className="text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>
                    Nenhum item ativo nesta categoria ainda.
                  </p>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {activeItems.map((item) => {
                    const selected = behaviors.find((b) => b.itemId === item.id);
                    const checked = Boolean(selected);
                    const pickerOpen = modePickerItemId === item.id;
                    const isNew = justCreatedId === item.id;
                    return (
                      <div key={item.id} className="space-y-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            if (checked) {
                              onRemoveBehavior(item.id);
                              if (pickerOpen) setModePickerItemId(null);
                              return;
                            }
                            setModePickerItemId(pickerOpen ? null : item.id);
                            if (isNew) setJustCreatedId(null);
                          }}
                          aria-pressed={checked}
                          aria-expanded={pickerOpen}
                          className="w-full min-h-[50px] px-4 py-2.5 rounded-xl border text-left flex items-center justify-between gap-3 transition-colors cursor-pointer"
                          style={{
                            backgroundColor: checked
                              ? 'var(--color-primary-soft)'
                              : pickerOpen
                              ? 'var(--bg-elevated)'
                              : 'var(--bg-elevated)',
                            borderColor: checked
                              ? 'var(--color-primary-strong)'
                              : pickerOpen
                              ? 'var(--color-primary)'
                              : 'var(--border-hairline)',
                            borderWidth: checked || pickerOpen ? '2px' : '1px',
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

                        {(pickerOpen || selected) && (
                          <div className="flex flex-wrap items-center gap-1.5 pl-1">
                            {[
                              { mode: BehaviorMode.IMPULSO, label: 'Só o impulso' },
                              { mode: BehaviorMode.FEITO, label: 'Fiz' },
                            ].map((opt) => {
                              const active = selected?.mode === opt.mode;
                              return (
                                <button
                                  key={opt.mode}
                                  type="button"
                                  onClick={() => {
                                    onSetBehaviorMode(cat, item.id, item.label, opt.mode);
                                    setModePickerItemId(null);
                                    setJustCreatedId(null);
                                  }}
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

                            {/* Prejuízo só faz sentido para o que aconteceu de fato. */}
                            {selected?.mode === BehaviorMode.FEITO && (
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
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                <InlineItemCreate
                  category={cat}
                  onCreateItem={onCreateItem}
                  onCreated={(created) => {
                    setModePickerItemId(created.id);
                    setJustCreatedId(created.id);
                  }}
                />
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
            <p className="text-xs mb-1.5" style={{ color: 'var(--text-muted)' }}>
              O texto livre não define se foi ação ou impulso. Para entrar nos indicadores,
              escolha um item do catálogo e marque "Só o impulso" ou "Fiz".
            </p>
            <input
              id="behavior-other"
              type="text"
              value={behaviorOtherText}
              onChange={(e) => onChangeBehaviorOtherText(e.target.value)}
              placeholder="Descreva com suas palavras"
              className="w-full min-h-[48px] px-4 rounded-xl border text-base"
              style={fieldStyle}
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
              style={fieldStyle}
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
              style={fieldStyle}
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
                style={fieldStyle}
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
                style={fieldStyle}
              />
            </div>
          </div>
        )}
      </section>
    );
  }
);

BehaviorSection.displayName = 'BehaviorSection';
