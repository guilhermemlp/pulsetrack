import React, { useMemo, useState } from 'react';
import { Pencil, Search, Trash2 } from 'lucide-react';
import {
  ACTIVATION_SIGNAL_OPTIONS,
  FUNCTIONAL_IMPACT_OPTIONS,
  MOOD_DEFINITIONS,
  REDUCED_SLEEP_NEED_OPTIONS,
  SLEEP_QUALITY_OPTIONS,
  STATE_DURATION_OPTIONS,
} from '../data/defaults';
import {
  AppTab,
  AwarenessType,
  BehaviorCategory,
  EntryType,
  FunctionalImpactLevel,
  PulseEntry,
  ReducedSleepNeed,
  ResistanceResult,
} from '../types/pulsetrack';
import { formatLongDate } from '../utils/analytics';

interface HistoryViewProps {
  entries: PulseEntry[];
  categories: BehaviorCategory[];
  onEditEntry: (entry: PulseEntry) => void;
  onDeleteEntry: (id: string) => void;
  onNavigate: (tab: AppTab) => void;
}

type TypeFilter = 'all' | 'episodes' | 'checkins';

export const HistoryView: React.FC<HistoryViewProps> = ({
  entries,
  categories,
  onEditEntry,
  onDeleteEntry,
  onNavigate,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const sortedAndFiltered = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    return [...entries]
      .sort((a, b) => `${b.date}T${b.time}`.localeCompare(`${a.date}T${a.time}`))
      .filter((entry) => {
        const isEpisode = entry.entryType === EntryType.EPISODE || entry.behaviors.length > 0;
        if (typeFilter === 'episodes' && !isEpisode) return false;
        if (typeFilter === 'checkins' && isEpisode) return false;

        if (selectedCategoryFilter !== 'all') {
          const hasCat = entry.behaviors.some((b) => b.categoryId === selectedCategoryFilter);
          if (!hasCat) return false;
        }
        if (!query) return true;
        const searchable = [
          entry.triggerContext,
          entry.feelingDuring,
          entry.feelingAfter,
          entry.notes,
          entry.moodSwingDescription,
          entry.moodOtherText,
          entry.behaviorOtherText,
          entry.functionalImpact.note,
          ...entry.behaviors.map((b) => `${b.categoryName} ${b.itemLabel}`),
          ...entry.dayEvents,
        ]
          .join(' ')
          .toLowerCase();
        return searchable.includes(query);
      });
  }, [entries, searchTerm, selectedCategoryFilter, typeFilter]);

  const getMoodText = (entry: PulseEntry): string => {
    const names = entry.moods.map((id) => MOOD_DEFINITIONS.find((m) => m.id === id)?.label ?? id);
    if (entry.moodOtherText.trim()) names.push(entry.moodOtherText.trim());
    return names.join(', ');
  };

  const getAwarenessText = (a: AwarenessType) =>
    a === AwarenessType.CONSCIENTE ? 'Consciente' : a === AwarenessType.AUTOMATICO ? 'Automático' : 'Mistura';

  const getResistanceText = (r: ResistanceResult) =>
    r === ResistanceResult.SIM ? 'Resistiu' : r === ResistanceResult.PARCIALMENTE ? 'Parcialmente' : 'Não interrompeu';

  const getSleepQualityText = (q: PulseEntry['sleep']['quality']) =>
    SLEEP_QUALITY_OPTIONS.find((o) => o.id === q)?.label ?? q;

  const getReducedSleepText = (r: ReducedSleepNeed) =>
    REDUCED_SLEEP_NEED_OPTIONS.find((o) => o.id === r)?.label ?? r;

  const getDurationText = (d: PulseEntry['stateDuration']) =>
    STATE_DURATION_OPTIONS.find((o) => o.id === d)?.label ?? d;

  const getImpactText = (lvl: FunctionalImpactLevel) =>
    FUNCTIONAL_IMPACT_OPTIONS.find((o) => o.id === lvl)?.label ?? lvl;

  if (entries.length === 0) {
    return (
      <section
        className="rounded-2xl border p-8 text-center max-w-2xl mx-auto space-y-4"
        style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-hairline)' }}
      >
        <h1 className="text-2xl font-semibold" style={{ color: 'var(--text-primary)' }}>
          Histórico longitudinal
        </h1>
        <p className="text-base" style={{ color: 'var(--text-secondary)' }}>
          Seus check-ins diários e episódios aparecerão aqui em ordem cronológica, com sono, ativação e impacto funcional.
        </p>
        <button
          type="button"
          onClick={() => onNavigate('registrar')}
          className="min-h-[48px] px-6 py-3 rounded-xl text-base font-semibold cursor-pointer"
          style={{ backgroundColor: 'var(--color-primary-strong)', color: 'var(--color-primary-ink)' }}
        >
          Criar primeiro registro
        </button>
      </section>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight" style={{ color: 'var(--text-primary)' }}>
          Histórico longitudinal
        </h1>
        <p className="text-base mt-1" style={{ color: 'var(--text-secondary)' }}>
          {entries.length} registro(s) salvos localmente neste dispositivo.
        </p>
      </div>

      {/* Filtros de tipo, busca e categoria */}
      <div className="space-y-3">
        <div
          role="group"
          aria-label="Filtrar por tipo de registro"
          className="inline-flex flex-wrap gap-1.5 p-1 rounded-xl border"
          style={{ backgroundColor: 'var(--bg-subtle)', borderColor: 'var(--border-hairline)' }}
        >
          {[
            { id: 'all' as TypeFilter, label: 'Todos' },
            { id: 'checkins' as TypeFilter, label: 'Check-ins sem episódio' },
            { id: 'episodes' as TypeFilter, label: 'Episódios comportamentais' },
          ].map((t) => {
            const active = typeFilter === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setTypeFilter(t.id)}
                aria-pressed={active}
                className="min-h-[44px] px-3.5 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap cursor-pointer"
                style={{
                  backgroundColor: active ? 'var(--bg-surface)' : 'transparent',
                  color: active ? 'var(--color-primary-strong)' : 'var(--text-secondary)',
                }}
              >
                {t.label}
              </button>
            );
          })}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="md:col-span-2 relative">
            <label htmlFor="history-search" className="sr-only">
              Buscar por gatilho, comportamento ou anotação
            </label>
            <Search
              className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
              style={{ color: 'var(--text-muted)' }}
              aria-hidden="true"
            />
            <input
              id="history-search"
              type="search"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por gatilho, sensação, comportamento, impacto ou anotação..."
              className="w-full min-h-[48px] pl-11 pr-4 rounded-xl border text-base"
              style={{
                backgroundColor: 'var(--bg-surface)',
                borderColor: 'var(--border-strong)',
                color: 'var(--text-primary)',
              }}
            />
          </div>

          <div>
            <label htmlFor="history-category" className="sr-only">
              Filtrar por categoria
            </label>
            <select
              id="history-category"
              value={selectedCategoryFilter}
              onChange={(e) => setSelectedCategoryFilter(e.target.value)}
              className="w-full min-h-[48px] px-4 rounded-xl border text-base"
              style={{
                backgroundColor: 'var(--bg-surface)',
                borderColor: 'var(--border-strong)',
                color: 'var(--text-primary)',
              }}
            >
              <option value="all">Todas as categorias</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {sortedAndFiltered.length === 0 ? (
        <div
          className="rounded-2xl border p-8 text-center"
          style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-hairline)' }}
        >
          <p className="text-base" style={{ color: 'var(--text-secondary)' }}>
            Nenhum registro corresponde aos filtros aplicados.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {sortedAndFiltered.map((entry) => {
            const isEpisode = entry.entryType === EntryType.EPISODE || entry.behaviors.length > 0;
            const activationLabels = entry.activationSignals
              .map((id) => ACTIVATION_SIGNAL_OPTIONS.find((o) => o.id === id)?.label ?? id)
              .join(' · ');
            const hasImpact =
              entry.functionalImpact.work !== FunctionalImpactLevel.NENHUM ||
              entry.functionalImpact.relationships !== FunctionalImpactLevel.NENHUM ||
              entry.functionalImpact.routine !== FunctionalImpactLevel.NENHUM ||
              entry.functionalImpact.note.trim().length > 0;

            return (
              <article
                key={entry.id}
                className="rounded-2xl border p-5 sm:p-6 space-y-4"
                style={{
                  backgroundColor: 'var(--bg-surface)',
                  borderColor: 'var(--border-hairline)',
                  boxShadow: 'var(--shadow-soft)',
                }}
              >
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                  <div className="space-y-1.5">
                    <div
                      className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-sm font-mono tabular-nums"
                      style={{ color: 'var(--text-secondary)' }}
                    >
                      <span
                        className="font-semibold"
                        style={{ color: isEpisode ? 'var(--color-accent)' : 'var(--color-secondary-ink)' }}
                      >
                        {isEpisode ? 'Episódio' : 'Check-in diário'}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                        {formatLongDate(entry.date)} às {entry.time}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>Energia {entry.energyLevel}/10</span>
                      <span aria-hidden="true">·</span>
                      <span>
                        Sono {entry.sleep.hours}h ({getSleepQualityText(entry.sleep.quality)})
                      </span>
                      {entry.sleep.reducedNeed !== ReducedSleepNeed.NAO && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span style={{ color: 'var(--color-accent)' }}>
                            Redução sono: {getReducedSleepText(entry.sleep.reducedNeed)}
                          </span>
                        </>
                      )}
                    </div>

                    <p className="text-base font-medium" style={{ color: 'var(--color-primary-strong)' }}>
                      Estado emocional: {getMoodText(entry)}
                      {entry.hadMoodSwing ? ' · Com oscilação prévia de humor' : ''}
                    </p>

                    <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                      Duração: {getDurationText(entry.stateDuration)}
                      {activationLabels ? ` · Sinais de ativação: ${activationLabels}` : ''}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => onEditEntry(entry)}
                      className="min-h-[44px] px-3.5 py-2 rounded-xl border text-sm font-medium inline-flex items-center gap-1.5 cursor-pointer"
                      style={{
                        backgroundColor: 'var(--bg-elevated)',
                        borderColor: 'var(--border-hairline)',
                        color: 'var(--text-primary)',
                      }}
                    >
                      <Pencil className="w-4 h-4" aria-hidden="true" />
                      <span>Editar</span>
                    </button>

                    {confirmDeleteId === entry.id ? (
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            onDeleteEntry(entry.id);
                            setConfirmDeleteId(null);
                          }}
                          className="min-h-[44px] px-3.5 py-2 rounded-xl text-sm font-semibold cursor-pointer"
                          style={{
                            backgroundColor: 'var(--color-accent)',
                            color: 'var(--color-accent-ink)',
                          }}
                        >
                          Confirmar
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(null)}
                          className="min-h-[44px] px-3 py-2 rounded-xl border text-sm cursor-pointer"
                          style={{
                            backgroundColor: 'var(--bg-elevated)',
                            borderColor: 'var(--border-hairline)',
                            color: 'var(--text-secondary)',
                          }}
                        >
                          Cancelar
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(entry.id)}
                        aria-label={`Excluir registro de ${formatLongDate(entry.date)}`}
                        className="min-h-[44px] min-w-[44px] px-3 py-2 rounded-xl border text-sm inline-flex items-center justify-center cursor-pointer"
                        style={{
                          backgroundColor: 'var(--bg-elevated)',
                          borderColor: 'var(--border-hairline)',
                          color: 'var(--text-secondary)',
                        }}
                      >
                        <Trash2 className="w-4 h-4" aria-hidden="true" />
                      </button>
                    )}
                  </div>
                </div>

                {isEpisode && (
                  <div className="text-sm sm:text-base space-y-1" style={{ color: 'var(--text-primary)' }}>
                    <p>
                      <span className="font-semibold">Comportamentos: </span>
                      <span>
                        {[...entry.behaviors.map((b) => b.itemLabel), entry.behaviorOtherText]
                          .filter(Boolean)
                          .join(' · ')}
                      </span>
                    </p>
                    <p className="text-sm font-mono tabular-nums" style={{ color: 'var(--text-secondary)' }}>
                      Vontade {entry.urgeIntensity}/10 · {getAwarenessText(entry.awareness)} ·{' '}
                      {getResistanceText(entry.resisted)}
                    </p>
                  </div>
                )}

                {(entry.triggerContext ||
                  entry.moodSwingDescription ||
                  entry.feelingDuring ||
                  entry.feelingAfter ||
                  hasImpact ||
                  entry.notes ||
                  entry.dayEvents.length > 0) && (
                  <div
                    className="pt-3 border-t grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2 text-sm"
                    style={{ borderColor: 'var(--border-hairline)', color: 'var(--text-secondary)' }}
                  >
                    {entry.triggerContext && (
                      <p>
                        <strong style={{ color: 'var(--text-primary)' }}>Gatilho:</strong> {entry.triggerContext}
                      </p>
                    )}
                    {entry.hadMoodSwing && entry.moodSwingDescription && (
                      <p>
                        <strong style={{ color: 'var(--text-primary)' }}>Oscilação:</strong>{' '}
                        {entry.moodSwingDescription}
                      </p>
                    )}
                    {entry.feelingDuring && (
                      <p>
                        <strong style={{ color: 'var(--text-primary)' }}>Durante:</strong> {entry.feelingDuring}
                      </p>
                    )}
                    {entry.feelingAfter && (
                      <p>
                        <strong style={{ color: 'var(--text-primary)' }}>Depois:</strong> {entry.feelingAfter}
                      </p>
                    )}
                    {hasImpact && (
                      <p>
                        <strong style={{ color: 'var(--text-primary)' }}>Impacto funcional:</strong>{' '}
                        Trabalho ({getImpactText(entry.functionalImpact.work)}) · Relac. (
                        {getImpactText(entry.functionalImpact.relationships)}) · Rotina (
                        {getImpactText(entry.functionalImpact.routine)})
                        {entry.functionalImpact.note ? ` — ${entry.functionalImpact.note}` : ''}
                      </p>
                    )}
                    {(entry.dayEvents.length > 0 || entry.dayEventsNote) && (
                      <p>
                        <strong style={{ color: 'var(--text-primary)' }}>Eventos do dia:</strong>{' '}
                        {[...entry.dayEvents, entry.dayEventsNote].filter(Boolean).join(' · ')}
                      </p>
                    )}
                    {entry.notes && (
                      <p>
                        <strong style={{ color: 'var(--text-primary)' }}>Observações:</strong> {entry.notes}
                      </p>
                    )}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
};
