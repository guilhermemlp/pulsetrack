import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { HistoryView } from './HistoryView';
import { createDefaultCategories } from '../data/defaults';
import {
  BehaviorMode,
  EntryType,
  PulseEntry,
  SelectedBehavior,
} from '../types/pulsetrack';
import { normalizeEntry } from '../utils/storage';
import { toLocalIsoDate } from '../utils/analytics';

function renderHistory(entries: PulseEntry[], mode: 'day' | 'all' = 'all') {
  render(
    <HistoryView
      entries={entries}
      categories={createDefaultCategories()}
      onEditEntry={vi.fn()}
      onDeleteEntry={vi.fn()}
      onNavigate={vi.fn()}
      draft={null}
      onContinueDraft={vi.fn()}
      onMoveDraftToToday={vi.fn()}
      onDiscardDraft={vi.fn()}
    />
  );
  // O modo diário é o padrão; por padrão estes testes cobrem a lista longitudinal.
  if (mode === 'all') {
    fireEvent.click(screen.getByRole('button', { name: 'Todos os registros' }));
  }
}

const actionBehavior: SelectedBehavior = {
  categoryId: 'cat_financeira',
  categoryName: 'Financeira',
  itemId: 'fin_compras',
  itemLabel: 'Compras impulsivas',
  mode: BehaviorMode.FEITO,
  harm: true,
};

const impulseBehavior: SelectedBehavior = {
  categoryId: 'cat_digital',
  categoryName: 'Digital',
  itemId: 'dig_scroll',
  itemLabel: 'Scroll infinito',
  mode: BehaviorMode.IMPULSO,
  harm: false,
};

afterEach(cleanup);

describe('HistoryView — semântica de ação e impulso', () => {
  it('abre na visão diária e permite alternar para a lista completa', () => {
    renderHistory(
      [normalizeEntry({ id: 'hoje', date: toLocalIsoDate(), time: '08:00' })],
      'day'
    );

    expect(screen.getByRole('heading', { name: 'Visão do dia' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Todos os registros' }));
    expect(screen.queryByRole('heading', { name: 'Visão do dia' })).toBeNull();
  });

  it('identifica ação realizada, impulso contido e dado sem classificação', () => {
    const entries = [
      normalizeEntry({
        id: 'acao',
        date: '2026-11-10',
        entryType: EntryType.DAILY_CHECKIN,
        behaviors: [actionBehavior],
      }),
      normalizeEntry({
        id: 'impulso',
        date: '2026-11-09',
        entryType: EntryType.EPISODE,
        behaviors: [impulseBehavior],
      }),
      normalizeEntry({
        id: 'legado',
        date: '2026-11-08',
        behaviors: [
          {
            categoryId: 'cat_outros',
            categoryName: 'Outros',
            itemId: 'item_legado',
            itemLabel: 'Item legado',
          },
        ] as PulseEntry['behaviors'],
      }),
    ];

    renderHistory(entries);

    expect(screen.getByText('Episódio com ação realizada')).toBeTruthy();
    expect(screen.getByText('Impulso contido')).toBeTruthy();
    expect(screen.getByText('Registro sem classificação de ação')).toBeTruthy();
    expect(screen.getAllByText(/Compras impulsivas \[fiz, com prejuízo/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Scroll infinito \[impulso/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/modo não informado/).length).toBeGreaterThan(0);
  });

  it('filtra somente impulsos que não viraram ação', () => {
    const entries = [
      normalizeEntry({
        id: 'acao',
        date: '2026-11-10',
        behaviors: [actionBehavior],
      }),
      normalizeEntry({
        id: 'impulso',
        date: '2026-11-09',
        behaviors: [impulseBehavior],
      }),
    ];

    renderHistory(entries);
    fireEvent.click(screen.getByRole('button', { name: 'Só impulso, sem ação' }));

    expect(screen.getByText('Scroll infinito', { exact: false })).toBeTruthy();
    expect(screen.queryByText('Compras impulsivas', { exact: false })).toBeNull();
  });
});
