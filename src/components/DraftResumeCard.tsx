import React from 'react';
import { ArrowRight, CalendarClock, Trash2 } from 'lucide-react';
import { FormDraft } from '../utils/storage';
import { formatDraftDate, formatDraftTime, isDraftFromPreviousDay } from '../utils/draft';

interface DraftResumeCardProps {
  draft: FormDraft;
  onContinue: () => void;
  onMoveToToday: () => void;
  onDiscard: () => void;
}

/**
 * Rascunho salvo automaticamente não pode virar um registro invisível.
 * O card mostra quando ele começou e deixa continuar, mover para hoje ou descartar.
 */
export const DraftResumeCard: React.FC<DraftResumeCardProps> = ({
  draft,
  onContinue,
  onMoveToToday,
  onDiscard,
}) => {
  const previousDay = isDraftFromPreviousDay(draft);
  const when = `${formatDraftDate(draft.savedAt)} às ${formatDraftTime(draft.savedAt)}`;

  return (
    <section
      aria-labelledby="draft-resume-title"
      className="rounded-2xl border p-5 space-y-3"
      style={{
        backgroundColor: 'var(--color-secondary-soft)',
        borderColor: 'var(--color-secondary)',
      }}
    >
      <div className="flex items-start gap-3">
        <CalendarClock
          className="w-5 h-5 shrink-0 mt-0.5"
          style={{ color: 'var(--color-secondary-ink)' }}
          aria-hidden="true"
        />
        <div className="space-y-1">
          <h2
            id="draft-resume-title"
            className="text-base font-semibold"
            style={{ color: 'var(--text-primary)' }}
          >
            {previousDay ? 'Rascunho de um dia anterior' : 'Registro em andamento'}
          </h2>
          <p className="text-sm" style={{ color: 'var(--text-primary)' }}>
            Continuar registro iniciado em {when}. Nada foi salvo no histórico ainda — o rascunho
            fica só neste dispositivo.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={onContinue}
          className="min-h-[44px] px-4 rounded-xl border text-sm font-semibold inline-flex items-center gap-1.5 cursor-pointer"
          style={{
            backgroundColor: 'var(--color-primary-strong)',
            borderColor: 'var(--color-primary-strong)',
            color: 'var(--color-primary-ink)',
          }}
        >
          Continuar registro
          <ArrowRight className="w-4 h-4" aria-hidden="true" />
        </button>

        {previousDay && (
          <button
            type="button"
            onClick={onMoveToToday}
            className="min-h-[44px] px-4 rounded-xl border text-sm font-medium cursor-pointer"
            style={{
              backgroundColor: 'var(--bg-surface)',
              borderColor: 'var(--border-strong)',
              color: 'var(--text-primary)',
            }}
          >
            Mover para hoje
          </button>
        )}

        <button
          type="button"
          onClick={onDiscard}
          className="min-h-[44px] px-3 rounded-xl text-sm font-medium inline-flex items-center gap-1.5 cursor-pointer"
          style={{ color: 'var(--text-secondary)' }}
        >
          <Trash2 className="w-4 h-4" aria-hidden="true" />
          Descartar rascunho
        </button>
      </div>
    </section>
  );
};
