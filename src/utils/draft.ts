import { toLocalIsoDate } from './analytics';
import { FormDraft } from './storage';

/** HH:mm local a partir do ISO do rascunho. */
export function formatDraftTime(isoTimestamp: string): string {
  const date = new Date(isoTimestamp);
  if (Number.isNaN(date.getTime())) return '--:--';
  const hh = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}

/** dd/mm local a partir do ISO do rascunho. */
export function formatDraftDate(isoTimestamp: string): string {
  const date = new Date(isoTimestamp);
  if (Number.isNaN(date.getTime())) return '--/--';
  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  return `${dd}/${mm}`;
}

/** O rascunho foi salvo em um dia anterior ao de hoje (fuso local). */
export function isDraftFromPreviousDay(
  draft: FormDraft | null,
  today: Date = new Date()
): boolean {
  if (!draft) return false;
  const savedAt = new Date(draft.savedAt);
  if (Number.isNaN(savedAt.getTime())) return false;
  return toLocalIsoDate(savedAt) < toLocalIsoDate(today);
}
