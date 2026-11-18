import { cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DashboardView } from './DashboardView';
import { createDefaultCategories } from '../data/defaults';
import { BehaviorMode, EntryType, PulseEntry, ThemeMode } from '../types/pulsetrack';
import { computeAnalytics, toLocalIsoDate } from '../utils/analytics';
import { normalizeEntry } from '../utils/storage';

function dateOffset(daysAgo: number): string {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return toLocalIsoDate(date);
}

afterEach(cleanup);

describe('DashboardView — ação, impulso e prejuízo', () => {
  it('mostra as três contagens separadamente', () => {
    const entries: PulseEntry[] = [
      normalizeEntry({
        id: 'acao-com-prejuizo',
        date: dateOffset(1),
        entryType: EntryType.EPISODE,
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
      }),
      normalizeEntry({
        id: 'impulso',
        date: dateOffset(2),
        entryType: EntryType.EPISODE,
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
    ];
    const analytics = computeAnalytics(entries, createDefaultCategories(), '30');

    render(
      <DashboardView
        analytics={analytics}
        totalAllEntries={entries.length}
        period="30"
        onChangePeriod={vi.fn()}
        onNavigate={vi.fn()}
        onLoadSampleData={vi.fn()}
        theme={ThemeMode.LIGHT}
        draft={null}
        onContinueDraft={vi.fn()}
        onMoveDraftToToday={vi.fn()}
        onDiscardDraft={vi.fn()}
        experiments={[]}
        entries={entries}
        onCloseExperiment={vi.fn()}
      />
    );

    const outcomes = screen.getByRole('region', { name: 'Ação, impulso e prejuízo' });
    expect(within(outcomes).getByText('Comportamentos realizados')).toBeTruthy();
    expect(within(outcomes).getByText('1 registro(s) com ação')).toBeTruthy();
    expect(within(outcomes).getByText('1 registro(s) só com impulso')).toBeTruthy();
    expect(within(outcomes).getByText('1 registro(s) com relato explícito')).toBeTruthy();
    expect(
      within(outcomes).getByText(/Impulso não vira episódio automaticamente/)
    ).toBeTruthy();
  });
});
