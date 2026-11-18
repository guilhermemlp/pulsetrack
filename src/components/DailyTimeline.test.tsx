import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DailyTimeline } from './DailyTimeline';
import { BehaviorMode, MoodStateId, PulseEntry } from '../types/pulsetrack';
import { normalizeEntry } from '../utils/storage';
import { toLocalIsoDate } from '../utils/analytics';

afterEach(cleanup);

function renderTimeline(entries: PulseEntry[]) {
  const onEditEntry = vi.fn();
  const onDeleteEntry = vi.fn();
  const onNavigate = vi.fn();

  render(
    <DailyTimeline
      entries={entries}
      onEditEntry={onEditEntry}
      onDeleteEntry={onDeleteEntry}
      onNavigate={onNavigate}
    />
  );

  return { onEditEntry, onDeleteEntry, onNavigate };
}

function entryOn(date: string, id: string, time: string, extra: Partial<PulseEntry> = {}) {
  return normalizeEntry({ id, date, time, ...extra });
}

describe('DailyTimeline — visão diária consolidada', () => {
  it('mostra todos os registros do dia em ordem cronológica e distingue ação de impulso', () => {
    const today = toLocalIsoDate();
    renderTimeline([
      entryOn(today, 'checkin', '09:10', { moods: [MoodStateId.ANSIOSO] }),
      entryOn(today, 'acao', '08:00', {
        behaviors: [
          {
            categoryId: 'cat_financeira',
            categoryName: 'Financeira',
            itemId: 'fin_compras',
            itemLabel: 'Compras impulsivas',
            mode: BehaviorMode.FEITO,
            harm: false,
          },
        ],
      }),
      entryOn(today, 'impulso', '07:30', {
        behaviors: [
          {
            categoryId: 'cat_digital',
            categoryName: 'Digital',
            itemId: 'dig_scroll',
            itemLabel: 'Scroll infinito',
            mode: BehaviorMode.IMPULSO,
            harm: false,
          },
        ],
      }),
    ]);

    const times = Array.from(document.querySelectorAll('time')).map(
      (item) => item.textContent
    );
    expect(times).toEqual(['07:30', '08:00', '09:10']);
    expect(screen.getByText('Impulso')).toBeTruthy();
    expect(screen.getByText('Ação realizada')).toBeTruthy();
    expect(screen.getByText('Check-in diário')).toBeTruthy();
    expect(screen.getByText(/Compras impulsivas \[fiz\]/)).toBeTruthy();
    expect(screen.getByText(/Scroll infinito \[impulso\]/)).toBeTruthy();
  });

  it('separa o dia local no entorno da meia-noite', () => {
    const today = toLocalIsoDate();
    const now = new Date(`${today}T12:00:00`);
    now.setDate(now.getDate() - 1);
    const yesterday = toLocalIsoDate(now);

    renderTimeline([
      entryOn(yesterday, 'ontem-tarde', '23:55'),
      entryOn(today, 'hoje-madrugada', '00:05'),
    ]);

    expect(screen.getByText('00:05')).toBeTruthy();
    expect(screen.queryByText('23:55')).toBeNull();

    fireEvent.change(screen.getByLabelText('Dia'), { target: { value: yesterday } });

    expect(screen.getByText('23:55')).toBeTruthy();
    expect(screen.queryByText('00:05')).toBeNull();
  });

  it('expande detalhes, edita e só exclui após confirmação', () => {
    const today = toLocalIsoDate();
    const { onEditEntry, onDeleteEntry } = renderTimeline([
      entryOn(today, 'com-detalhes', '08:00', {
        behaviors: [
          {
            categoryId: 'cat_financeira',
            categoryName: 'Financeira',
            itemId: 'fin_compras',
            itemLabel: 'Compras impulsivas',
            mode: BehaviorMode.FEITO,
            harm: true,
          },
        ],
        triggerContext: 'Depois de uma noite ruim',
        notes: 'Registro de teste',
      }),
    ]);

    fireEvent.click(screen.getByRole('button', { name: /Ver detalhes de 08:00/ }));

    expect(screen.getByText(/Depois de uma noite ruim/)).toBeTruthy();
    expect(screen.getByText(/Registro de teste/)).toBeTruthy();
    expect(screen.getAllByText(/Prejuízo relatado/).length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole('button', { name: 'Editar' }));
    expect(onEditEntry).toHaveBeenCalledWith(expect.objectContaining({ id: 'com-detalhes' }));

    const deleteButton = screen.getByRole('button', { name: 'Excluir registro de 08:00' });
    fireEvent.click(deleteButton);
    expect(onDeleteEntry).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Cancelar' })).toBe(document.activeElement);

    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(screen.getByRole('button', { name: 'Excluir registro de 08:00' })).toBe(
      document.activeElement
    );

    fireEvent.click(screen.getByRole('button', { name: 'Excluir registro de 08:00' }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar exclusão' }));
    expect(onDeleteEntry).toHaveBeenCalledWith('com-detalhes');
  });

  it('usa um estado vazio neutro e oferece o dia mais recente', () => {
    const today = toLocalIsoDate();
    const older = new Date(`${today}T12:00:00`);
    older.setDate(older.getDate() - 5);
    const olderDate = toLocalIsoDate(older);
    const { onNavigate } = renderTimeline([
      entryOn(olderDate, 'antigo', '10:00', { notes: 'Registro antigo' }),
    ]);

    expect(screen.getByText(/Nenhum registro em/)).toBeTruthy();
    expect(screen.queryByText(/Registro antigo/)).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Registrar agora' }));
    expect(onNavigate).toHaveBeenCalledWith('registrar');

    fireEvent.click(screen.getByRole('button', { name: 'Ir para o dia mais recente' }));
    expect(screen.getByText('10:00')).toBeTruthy();
  });

  it('não limita a quantidade de registros do mesmo dia', () => {
    const today = toLocalIsoDate();
    const entries = Array.from({ length: 8 }, (_, index) =>
      entryOn(today, `muitos-${index}`, `${String(8 + index).padStart(2, '0')}:00`)
    );

    renderTimeline(entries);

    expect(document.querySelectorAll('time')).toHaveLength(8);
  });
});
