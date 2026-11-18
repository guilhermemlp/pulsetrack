import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Pencil, Trash2 } from 'lucide-react';
import {
  ACTIVATION_SIGNAL_OPTIONS,
  MOOD_DEFINITIONS,
  SLEEP_QUALITY_OPTIONS,
} from '../data/defaults';
import {
  AwarenessType,
  EntryType,
  PulseEntry,
  ResistanceResult,
} from '../types/pulsetrack';
import {
  formatLongDate,
  hasBehaviorRecord,
  hasImpulse,
  hasRealizedBehavior,
  hasReportedHarm,
  hasUnclassifiedBehavior,
  toLocalIsoDate,
} from '../utils/analytics';
import { describeBehaviorMode } from '../utils/recentBehaviors';

interface DailyTimelineProps {
  entries: PulseEntry[];
  onEditEntry: (entry: PulseEntry) => void;
  onDeleteEntry: (id: string) => void;
  onNavigate: (tab: 'registrar') => void;
}

function shiftLocalDate(isoDate: string, delta: number): string {
  const parts = isoDate.split('-').map(Number);
  if (parts.length !== 3 || parts.some((part) => Number.isNaN(part))) return isoDate;
  // Meio-dia evita que fuso horário ou horário de verão mudem o dia.
  const date = new Date(parts[0], parts[1] - 1, parts[2], 12);
  date.setDate(date.getDate() + delta);
  return toLocalIsoDate(date);
}

function moodSummary(entry: PulseEntry): string | null {
  const labels = entry.moods.map((id) => {
    const label = MOOD_DEFINITIONS.find((mood) => mood.id === id)?.label ?? id;
    const intensity = entry.moodIntensity?.[id];
    return typeof intensity === 'number' ? `${label} (${intensity}/10)` : label;
  });
  if (entry.moodOtherText.trim()) labels.push(entry.moodOtherText.trim());
  return labels.length > 0 ? labels.join(' · ') : null;
}

function behaviorSummary(entry: PulseEntry): string | null {
  const labels = entry.behaviors.map(
    (behavior) => `${behavior.itemLabel} [${describeBehaviorMode(behavior.mode)}]`
  );
  if (entry.behaviorOtherText.trim()) labels.push(entry.behaviorOtherText.trim());
  if (labels.length === 0) return null;
  const visible = labels.slice(0, 3).join(' · ');
  return labels.length > 3 ? `${visible} · +${labels.length - 3}` : visible;
}

function awarenessText(awareness: AwarenessType | null): string {
  if (awareness === AwarenessType.CONSCIENTE) return 'Consciente';
  if (awareness === AwarenessType.AUTOMATICO) return 'Automático';
  if (awareness === AwarenessType.MISTURA) return 'Mistura';
  return 'não informado';
}

function resistanceText(resisted: ResistanceResult | null): string {
  if (resisted === ResistanceResult.SIM) return 'resistiu';
  if (resisted === ResistanceResult.PARCIALMENTE) return 'resistiu parcialmente';
  if (resisted === ResistanceResult.NAO) return 'não interrompeu';
  return 'não informado';
}

function sleepText(entry: PulseEntry): string | null {
  const quality = entry.sleep.quality
    ? SLEEP_QUALITY_OPTIONS.find((option) => option.id === entry.sleep.quality)?.label
    : null;
  if (entry.sleep.hours === null && !quality) return null;
  return [
    entry.sleep.hours !== null ? `${entry.sleep.hours}h` : null,
    quality,
  ]
    .filter(Boolean)
    .join(' · ');
}

const badgeBaseStyle: React.CSSProperties = {
  borderWidth: '1px',
  borderStyle: 'solid',
  borderRadius: '9999px',
  padding: '0.2rem 0.55rem',
  fontSize: '0.72rem',
  fontWeight: 600,
  lineHeight: 1.3,
};

export const DailyTimeline: React.FC<DailyTimelineProps> = ({
  entries,
  onEditEntry,
  onDeleteEntry,
  onNavigate,
}) => {
  const today = toLocalIsoDate();
  const [selectedDate, setSelectedDate] = useState(today);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const returnDeleteFocusId = useRef<string | null>(null);

  useEffect(() => {
    if (confirmDeleteId) {
      document.getElementById(`timeline-cancel-delete-${confirmDeleteId}`)?.focus();
      return;
    }
    if (returnDeleteFocusId.current) {
      document.getElementById(`timeline-delete-${returnDeleteFocusId.current}`)?.focus();
      returnDeleteFocusId.current = null;
    }
  }, [confirmDeleteId]);

  const dayEntries = useMemo(
    () =>
      entries
        .filter((entry) => entry.date === selectedDate)
        .sort(
          (a, b) =>
            a.time.localeCompare(b.time) ||
            (a.createdAt ?? '').localeCompare(b.createdAt ?? '') ||
            a.id.localeCompare(b.id)
        ),
    [entries, selectedDate]
  );

  const latestEntryDate = useMemo(() => {
    if (entries.length === 0) return null;
    return [...entries]
      .map((entry) => entry.date)
      .sort()
      .at(-1) ?? null;
  }, [entries]);

  const changeDay = (delta: number) => {
    setSelectedDate((current) => shiftLocalDate(current, delta));
    setExpandedId(null);
    setConfirmDeleteId(null);
  };

  const selectDate = (date: string) => {
    setSelectedDate(date);
    setExpandedId(null);
    setConfirmDeleteId(null);
  };

  return (
    <section
      aria-labelledby="daily-timeline-title"
      className="rounded-2xl border p-5 sm:p-6 space-y-5"
      style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-hairline)' }}
    >
      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
        <div>
          <h2 id="daily-timeline-title" className="text-xl font-semibold tracking-tight">
            Visão do dia
          </h2>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
            Registros de {formatLongDate(selectedDate)} em ordem cronológica. A lista é
            descritiva: não interpreta a sequência como causa e efeito.
          </p>
        </div>

        <div className="flex flex-wrap items-end gap-2">
          <div>
            <label
              htmlFor="daily-timeline-date"
              className="block text-xs font-medium mb-1"
              style={{ color: 'var(--text-secondary)' }}
            >
              Dia
            </label>
            <input
              id="daily-timeline-date"
              type="date"
              value={selectedDate}
              onChange={(event) => selectDate(event.target.value)}
              className="min-h-[44px] px-3 rounded-xl border text-sm font-mono tabular-nums"
              style={{
                backgroundColor: 'var(--bg-elevated)',
                borderColor: 'var(--border-strong)',
                color: 'var(--text-primary)',
              }}
            />
          </div>
          <button
            type="button"
            onClick={() => changeDay(-1)}
            aria-label="Dia anterior"
            className="min-h-[44px] min-w-[44px] px-3 rounded-xl border inline-flex items-center justify-center cursor-pointer"
            style={{
              backgroundColor: 'var(--bg-elevated)',
              borderColor: 'var(--border-hairline)',
              color: 'var(--text-primary)',
            }}
          >
            <ChevronLeft className="w-4 h-4" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => changeDay(1)}
            aria-label="Próximo dia"
            className="min-h-[44px] min-w-[44px] px-3 rounded-xl border inline-flex items-center justify-center cursor-pointer"
            style={{
              backgroundColor: 'var(--bg-elevated)',
              borderColor: 'var(--border-hairline)',
              color: 'var(--text-primary)',
            }}
          >
            <ChevronRight className="w-4 h-4" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => selectDate(today)}
            disabled={selectedDate === today}
            className="min-h-[44px] px-3.5 rounded-xl border text-sm font-medium cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            style={{
              backgroundColor: 'var(--bg-elevated)',
              borderColor: 'var(--border-hairline)',
              color: 'var(--text-primary)',
            }}
          >
            Hoje
          </button>
        </div>
      </div>

      {dayEntries.length === 0 ? (
        <div
          className="rounded-xl border p-5 text-center space-y-3"
          style={{ borderColor: 'var(--border-hairline)', backgroundColor: 'var(--bg-elevated)' }}
        >
          <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
            Nenhum registro em {formatLongDate(selectedDate)}.
          </p>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            Você pode escolher outro dia ou fazer um registro quando fizer sentido.
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            {latestEntryDate && latestEntryDate !== selectedDate && (
              <button
                type="button"
                onClick={() => selectDate(latestEntryDate)}
                className="min-h-[44px] px-3.5 rounded-xl border text-sm font-medium cursor-pointer"
                style={{
                  backgroundColor: 'var(--bg-surface)',
                  borderColor: 'var(--border-hairline)',
                  color: 'var(--text-primary)',
                }}
              >
                Ir para o dia mais recente
              </button>
            )}
            <button
              type="button"
              onClick={() => onNavigate('registrar')}
              className="min-h-[44px] px-3.5 rounded-xl text-sm font-semibold cursor-pointer"
              style={{
                backgroundColor: 'var(--color-primary-strong)',
                color: 'var(--color-primary-ink)',
              }}
            >
              Registrar agora
            </button>
          </div>
        </div>
      ) : (
        <ol className="space-y-3" aria-label={`Registros de ${formatLongDate(selectedDate)}`}>
          {dayEntries.map((entry) => {
            const expanded = expandedId === entry.id;
            const action = hasRealizedBehavior(entry);
            const impulse = hasImpulse(entry);
            const unclassified = hasUnclassifiedBehavior(entry);
            const harm = hasReportedHarm(entry);
            const behaviorRecord = hasBehaviorRecord(entry);
            const mood = moodSummary(entry);
            const behavior = behaviorSummary(entry);
            const sleep = sleepText(entry);
            const activation = entry.activationSignals
              .map(
                (id) =>
                  ACTIVATION_SIGNAL_OPTIONS.find((option) => option.id === id)?.label ?? id
              )
              .join(' · ');
            const declaredEpisode = entry.entryType === EntryType.EPISODE;

            return (
              <li key={entry.id}>
                <article
                  className="rounded-xl border p-4"
                  style={{
                    backgroundColor: 'var(--bg-elevated)',
                    borderColor: 'var(--border-hairline)',
                  }}
                  aria-label={`Registro de ${entry.time}`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                    <div className="min-w-0 space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <time
                          dateTime={`${entry.date}T${entry.time}`}
                          className="text-base font-semibold font-mono tabular-nums"
                          style={{ color: 'var(--text-primary)' }}
                        >
                          {entry.time}
                        </time>
                        {action && (
                          <span
                            style={{
                              ...badgeBaseStyle,
                              backgroundColor: 'var(--color-accent-soft)',
                              borderColor: 'var(--color-accent)',
                              color: 'var(--text-primary)',
                            }}
                          >
                            Ação realizada
                          </span>
                        )}
                        {impulse && (
                          <span
                            style={{
                              ...badgeBaseStyle,
                              backgroundColor: 'var(--color-secondary-soft)',
                              borderColor: 'var(--color-secondary)',
                              color: 'var(--text-primary)',
                            }}
                          >
                            Impulso
                          </span>
                        )}
                        {unclassified && (
                          <span
                            style={{
                              ...badgeBaseStyle,
                              backgroundColor: 'var(--bg-surface)',
                              borderColor: 'var(--border-strong)',
                              color: 'var(--text-secondary)',
                            }}
                          >
                            Sem classificação de ação
                          </span>
                        )}
                        {!action && !impulse && !unclassified && (
                          <span
                            style={{
                              ...badgeBaseStyle,
                              backgroundColor: 'var(--color-primary-soft)',
                              borderColor: 'var(--color-primary)',
                              color: 'var(--text-primary)',
                            }}
                          >
                            {declaredEpisode ? 'Comportamento sem classificação' : 'Check-in diário'}
                          </span>
                        )}
                        {harm && (
                          <span
                            style={{
                              ...badgeBaseStyle,
                              backgroundColor: 'var(--bg-surface)',
                              borderColor: 'var(--color-accent)',
                              color: 'var(--text-primary)',
                            }}
                          >
                            Prejuízo relatado
                          </span>
                        )}
                      </div>

                      {(mood || entry.energyLevel !== null || sleep) && (
                        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                          {mood && <>Humor: {mood}. </>}
                          {entry.energyLevel !== null && <>Energia {entry.energyLevel}/10. </>}
                          {sleep && <>Sono {sleep}.</>}
                        </p>
                      )}

                      {behavior && (
                        <p className="text-sm" style={{ color: 'var(--text-primary)' }}>
                          {behavior}
                        </p>
                      )}

                      {!behaviorRecord && (
                        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                          Nenhum comportamento foi informado neste registro.
                        </p>
                      )}

                      {entry.urgeIntensity !== null && (
                        <p className="text-xs font-mono tabular-nums" style={{ color: 'var(--text-secondary)' }}>
                          Vontade: {entry.urgeIntensity}/10
                          {entry.urgeIntensity === 0 ? ' (sem impulso relatado)' : ''}
                        </p>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setExpandedId(expanded ? null : entry.id);
                        setConfirmDeleteId(null);
                      }}
                      aria-expanded={expanded}
                      aria-controls={`entry-details-${entry.id}`}
                      aria-label={`${expanded ? 'Ocultar' : 'Ver'} detalhes de ${entry.time}`}
                      className="min-h-[44px] px-3.5 rounded-xl border text-sm font-medium shrink-0 cursor-pointer"
                      style={{
                        backgroundColor: 'var(--bg-surface)',
                        borderColor: 'var(--border-hairline)',
                        color: 'var(--text-primary)',
                      }}
                    >
                      {expanded ? 'Ocultar detalhes' : 'Ver detalhes'}
                    </button>
                  </div>

                  {expanded && (
                    <div
                      id={`entry-details-${entry.id}`}
                      className="mt-4 pt-4 border-t space-y-2 text-sm"
                      style={{
                        borderColor: 'var(--border-hairline)',
                        color: 'var(--text-secondary)',
                      }}
                    >
                      <p>
                        <strong style={{ color: 'var(--text-primary)' }}>Humor:</strong>{' '}
                        {mood ?? 'não informado'}
                      </p>
                      <p>
                        <strong style={{ color: 'var(--text-primary)' }}>Energia:</strong>{' '}
                        {entry.energyLevel !== null ? `${entry.energyLevel}/10` : 'não informada'}
                      </p>
                      <p>
                        <strong style={{ color: 'var(--text-primary)' }}>Sono:</strong>{' '}
                        {sleep ?? 'não informado'}
                      </p>
                      {activation && (
                        <p>
                          <strong style={{ color: 'var(--text-primary)' }}>
                            Sinais de ativação:
                          </strong>{' '}
                          {activation}
                        </p>
                      )}
                      <p>
                        <strong style={{ color: 'var(--text-primary)' }}>Comportamentos:</strong>{' '}
                        {behavior ?? 'não informados'}
                      </p>
                      <p>
                        <strong style={{ color: 'var(--text-primary)' }}>Vontade:</strong>{' '}
                        {entry.urgeIntensity !== null
                          ? `${entry.urgeIntensity}/10`
                          : 'não informada'}{' '}
                        · <strong style={{ color: 'var(--text-primary)' }}>Consciência:</strong>{' '}
                        {awarenessText(entry.awareness)} ·{' '}
                        <strong style={{ color: 'var(--text-primary)' }}>Resistência:</strong>{' '}
                        {resistanceText(entry.resisted)}
                      </p>
                      {entry.triggerContext && (
                        <p>
                          <strong style={{ color: 'var(--text-primary)' }}>Gatilho:</strong>{' '}
                          {entry.triggerContext}
                        </p>
                      )}
                      {entry.feelingDuring && (
                        <p>
                          <strong style={{ color: 'var(--text-primary)' }}>Durante:</strong>{' '}
                          {entry.feelingDuring}
                        </p>
                      )}
                      {entry.feelingAfter && (
                        <p>
                          <strong style={{ color: 'var(--text-primary)' }}>Depois:</strong>{' '}
                          {entry.feelingAfter}
                        </p>
                      )}
                      {entry.notes && (
                        <p>
                          <strong style={{ color: 'var(--text-primary)' }}>Observações:</strong>{' '}
                          {entry.notes}
                        </p>
                      )}

                      <div className="flex flex-wrap gap-2 pt-2">
                        <button
                          type="button"
                          onClick={() => onEditEntry(entry)}
                          className="min-h-[44px] px-3.5 rounded-xl border text-sm font-medium inline-flex items-center gap-1.5 cursor-pointer"
                          style={{
                            backgroundColor: 'var(--bg-surface)',
                            borderColor: 'var(--border-hairline)',
                            color: 'var(--text-primary)',
                          }}
                        >
                          <Pencil className="w-4 h-4" aria-hidden="true" />
                          Editar
                        </button>

                        {confirmDeleteId === entry.id ? (
                          <>
                            <button
                              type="button"
                              onClick={() => {
                                onDeleteEntry(entry.id);
                                setConfirmDeleteId(null);
                                setExpandedId(null);
                              }}
                              className="min-h-[44px] px-3.5 rounded-xl text-sm font-semibold cursor-pointer"
                              style={{
                                backgroundColor: 'var(--color-accent)',
                                color: 'var(--color-accent-ink)',
                              }}
                            >
                              Confirmar exclusão
                            </button>
                            <button
                              id={`timeline-cancel-delete-${entry.id}`}
                              type="button"
                              onClick={() => {
                                returnDeleteFocusId.current = entry.id;
                                setConfirmDeleteId(null);
                              }}
                              className="min-h-[44px] px-3.5 rounded-xl border text-sm cursor-pointer"
                              style={{
                                backgroundColor: 'var(--bg-surface)',
                                borderColor: 'var(--border-hairline)',
                                color: 'var(--text-secondary)',
                              }}
                            >
                              Cancelar
                            </button>
                          </>
                        ) : (
                          <button
                            id={`timeline-delete-${entry.id}`}
                            type="button"
                            onClick={() => setConfirmDeleteId(entry.id)}
                            className="min-h-[44px] min-w-[44px] px-3 rounded-xl border text-sm inline-flex items-center justify-center cursor-pointer"
                            style={{
                              backgroundColor: 'var(--bg-surface)',
                              borderColor: 'var(--border-hairline)',
                              color: 'var(--text-secondary)',
                            }}
                            aria-label={`Excluir registro de ${entry.time}`}
                          >
                            <Trash2 className="w-4 h-4" aria-hidden="true" />
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </article>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
};
