import { describe, expect, it } from 'vitest';
import { formatDraftDate, formatDraftTime, isDraftFromPreviousDay } from './draft';
import { FormDraft } from './storage';

const draftAt = (iso: string): FormDraft => ({ savedAt: iso, payload: { moods: ['ansioso'] } });

describe('rascunho: data e hora', () => {
  it('formata em HH:mm e dd/mm no fuso local', () => {
    const iso = new Date(2026, 10, 16, 21, 5).toISOString();

    expect(formatDraftTime(iso)).toBe('21:05');
    expect(formatDraftDate(iso)).toBe('16/11');
  });

  it('identifica rascunho salvo em um dia anterior', () => {
    const ontem = new Date();
    ontem.setDate(ontem.getDate() - 1);
    ontem.setHours(22, 0, 0, 0);

    const hoje = new Date();
    hoje.setHours(9, 0, 0, 0);

    expect(isDraftFromPreviousDay(draftAt(ontem.toISOString()))).toBe(true);
    expect(isDraftFromPreviousDay(draftAt(hoje.toISOString()))).toBe(false);
    expect(isDraftFromPreviousDay(null)).toBe(false);
  });

  it('não quebra com data inválida', () => {
    expect(formatDraftTime('não é data')).toBe('--:--');
    expect(isDraftFromPreviousDay(draftAt('não é data'))).toBe(false);
  });
});
