import { describe, expect, it } from 'vitest';
import { createDefaultCategories } from '../data/defaults';
import { BehaviorMode, EntryType, MoodStateId, PulseEntry } from '../types/pulsetrack';
import { toLocalIsoDate } from './analytics';
import { normalizeEntry } from './storage';
import {
  filterCategoriesBySearch,
  getRecentBehaviors,
  SEARCH_THRESHOLD,
  countActiveItems,
} from './recentBehaviors';

function dateOffset(daysAgo: number): string {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() - daysAgo);
  return toLocalIsoDate(d);
}

function entryWith(
  id: string,
  daysAgo: number,
  itemId: string,
  itemLabel: string,
  mode: BehaviorMode,
  categoryId = 'cat_financeira',
  categoryName = 'Financeira'
): PulseEntry {
  return normalizeEntry({
    id,
    date: dateOffset(daysAgo),
    time: '10:00',
    entryType: EntryType.EPISODE,
    moods: [MoodStateId.ANSIOSO],
    behaviors: [{ categoryId, categoryName, itemId, itemLabel, mode, harm: false }],
  } as Partial<PulseEntry>);
}

describe('getRecentBehaviors', () => {
  const categories = createDefaultCategories();

  it('inclui itens usados apenas como impulso e guarda o modo da última vez', () => {
    const entries = [
      entryWith('e1', 1, 'fin_compras', 'Compras impulsivas', BehaviorMode.IMPULSO),
      entryWith('e2', 2, 'dig_scroll', 'Scroll infinito / feeds', BehaviorMode.FEITO, 'cat_digital', 'Digital / Hiperestimulação'),
    ];

    const recents = getRecentBehaviors(entries, categories);

    expect(recents.map((r) => r.itemId)).toEqual(['fin_compras', 'dig_scroll']);
    expect(recents[0].mode).toBe(BehaviorMode.IMPULSO);
    expect(recents[0].itemLabel).toBe('Compras impulsivas');
  });

  it('usa só os últimos 14 dias, um chip por item, do mais recente para o mais antigo', () => {
    const entries = [
      entryWith('antigo', 20, 'fin_compras', 'Compras impulsivas', BehaviorMode.FEITO),
      entryWith('meio', 10, 'fin_compras', 'Compras impulsivas', BehaviorMode.IMPULSO),
      entryWith('recente', 1, 'fin_compras', 'Compras impulsivas', BehaviorMode.FEITO),
    ];

    const recents = getRecentBehaviors(entries, categories);

    expect(recents).toHaveLength(1);
    expect(recents[0].mode).toBe(BehaviorMode.FEITO);
  });

  it('ignora item desativado e respeita o limite de 4 chips', () => {
    const custom = createDefaultCategories().map((c) =>
      c.id === 'cat_financeira'
        ? { ...c, items: c.items.map((i) => (i.id === 'fin_compras' ? { ...i, active: false } : i)) }
        : c
    );
    const entries = [
      entryWith('desativado', 1, 'fin_compras', 'Compras impulsivas', BehaviorMode.FEITO),
      entryWith('a', 1, 'dig_scroll', 'Scroll infinito / feeds', BehaviorMode.FEITO, 'cat_digital', 'Digital / Hiperestimulação'),
      entryWith('b', 2, 'al_noturna', 'Compulsão alimentar noturna', BehaviorMode.FEITO, 'cat_alimentar', 'Alimentar'),
      entryWith('c', 3, 'out_obsessivos', 'Pensamentos obsessivos intensos', BehaviorMode.IMPULSO, 'cat_outros', 'Outros'),
      entryWith('d', 4, 'af_apps', 'Uso de apps de relacionamento', BehaviorMode.FEITO, 'cat_afetiva', 'Afetiva / Social / Validação'),
    ];

    const recents = getRecentBehaviors(entries, custom);

    expect(recents).toHaveLength(4);
    expect(recents.some((r) => r.itemId === 'fin_compras')).toBe(false);
  });
});

describe('busca de comportamentos', () => {
  const categories = createDefaultCategories();

  it('encontra por texto sem acento e em qualquer caixa', () => {
    const found = filterCategoriesBySearch(categories, 'compulsao');
    const labels = found.flatMap((c) => c.items.map((i) => i.label));

    expect(labels.some((l) => /compuls/i.test(l))).toBe(true);
  });

  it('mantém a categoria inteira quando o nome dela casa com a busca', () => {
    const found = filterCategoriesBySearch(categories, 'digital');
    const digital = found.find((c) => c.id === 'cat_digital');

    expect(digital?.items.length).toBe(
      categories.find((c) => c.id === 'cat_digital')?.items.filter((i) => i.active).length
    );
  });

  it('só pede busca acima de 12 itens ativos no catálogo padrão', () => {
    expect(countActiveItems(categories)).toBeGreaterThan(SEARCH_THRESHOLD);
  });
});
