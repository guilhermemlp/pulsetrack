import { beforeEach, describe, expect, it } from 'vitest';
import { createDefaultCategories } from '../data/defaults';
import { BehaviorMode, EntryType, PulseEntry } from '../types/pulsetrack';
import {
  deleteCategory,
  deleteItem,
  labelKey,
  migrateCategories,
  renameItem,
  restoreCategory,
  restoreItem,
} from './categories';
import { loadCategories, saveCategories } from './storage';

const EMPTY_ENTRY_FIELDS = {
  depth: null,
  time: '12:00',
  createdAt: '2026-11-01T12:00:00.000Z',
  moods: [],
  moodIntensity: {},
  moodOtherText: '',
  valence: null,
  hadMoodSwing: false,
  moodSwingDirection: null,
  moodSwingWindow: null,
  moodSwingDescription: '',
  energyLevel: null,
  sleep: {
    hours: null,
    quality: null,
    reducedNeed: null,
    bedTime: null,
    wakeTime: null,
    latencyMinutes: null,
    awakenings: null,
    noFatigueAfterShortSleep: null,
  },
  stateDuration: null,
  activationSignals: [],
  triggerContext: '',
  behaviors: [],
  behaviorOtherText: '',
  awareness: null,
  resisted: null,
  urgeIntensity: null,
  feelingDuring: '',
  feelingAfter: '',
  functionalImpact: { work: null, relationships: null, routine: null, note: '' },
  medication: { status: null, effects: '' },
  cyclePhase: null,
  safetyConcern: null,
  notes: '',
  dayEvents: [],
  dayEventsNote: '',
} as const;

function episodeWith(itemId: string, itemLabel: string, categoryId = 'cat_financeira'): PulseEntry {
  return {
    ...EMPTY_ENTRY_FIELDS,
    id: `e_${itemId}_${itemLabel}`,
    entryType: EntryType.EPISODE,
    date: '2026-11-01',
    behaviors: [
      {
        categoryId,
        categoryName: 'Financeira',
        itemId,
        itemLabel,
        mode: BehaviorMode.FEITO,
        harm: false,
      },
    ],
  } as unknown as PulseEntry;
}

beforeEach(() => {
  localStorage.clear();
});

describe('migração v1 → v2', () => {
  const v1 = [
    {
      id: 'cat_financeira',
      name: 'Financeira',
      color: '#B8893A',
      active: true,
      items: [
        { id: 'fin_compras', label: 'Compras impulsivas', active: true },
        { id: 'fin_off', label: 'Item desativado', active: false, source: 'default' },
      ],
    },
  ];

  it('acrescenta campos estruturais sem reescrever conteúdo', () => {
    const store = migrateCategories(v1);

    expect(store.schemaVersion).toBe(2);
    const category = store.categories[0];
    expect(category.version).toBe(2);
    expect(category.updatedAt).toBeNull();
    expect(category.name).toBe('Financeira');
    expect(category.color).toBe('#B8893A');
    expect(category.items.map((item) => [item.id, item.label, item.active])).toEqual([
      ['fin_compras', 'Compras impulsivas', true],
      ['fin_off', 'Item desativado', false],
    ]);
    // Datas desconhecidas não são inventadas.
    expect(category.items[0].createdAt).toBeNull();
    expect(category.items[1].source).toBe('default');
    expect(category.archived).toBeUndefined();
  });

  it('é idempotente: migrar o resultado não muda nada', () => {
    const once = migrateCategories(v1);
    const twice = migrateCategories(once);
    expect(twice).toEqual(once);
  });

  it('gera id técnico determinístico para item sem id', () => {
    const store = migrateCategories([
      { id: 'cat_x', name: 'X', items: [{ label: 'Item sem id', active: true }] },
    ]);

    expect(store.categories[0].items[0].id).toMatch(/^legacy_item_sem_id_0$/);
    expect(store.categories[0].items[0].label).toBe('Item sem id');
  });

  it('loadCategories migra o formato v1 do localStorage e regrava como v2', () => {
    localStorage.setItem('pulsetrack_categories_v1', JSON.stringify(v1));

    const migrated = loadCategories();

    expect(migrated[0].version).toBe(2);
    expect(migrated[0].items[0].createdAt).toBeNull();
    const persisted = JSON.parse(localStorage.getItem('pulsetrack_categories_v1') ?? '{}');
    expect(persisted.schemaVersion).toBe(2);
    expect(persisted.categories[0].items[0].label).toBe('Compras impulsivas');
  });

  it('saveCategories grava o envelope v2 e loadCategories o lê sem alterar', () => {
    const defaults = createDefaultCategories();
    saveCategories(defaults);

    expect(loadCategories()).toEqual(defaults);
  });
});

describe('identidade do item', () => {
  it('renomear mantém o id e guarda o rótulo anterior como alias', () => {
    const categories = createDefaultCategories();
    const renamed = renameItem(categories, 'cat_financeira', 'fin_compras', 'Compras por impulso');

    const item = renamed
      .find((c) => c.id === 'cat_financeira')!
      .items.find((i) => i.id === 'fin_compras')!;

    expect(item.label).toBe('Compras por impulso');
    expect(item.aliases).toContain('Compras impulsivas');
    expect(renamed.find((c) => c.id === 'cat_financeira')!.updatedAt).not.toBeNull();
  });

  it('apagar item usado arquiva em vez de excluir', () => {
    const entries = [episodeWith('fin_compras', 'Compras impulsivas')];
    const result = deleteItem(createDefaultCategories(), 'cat_financeira', 'fin_compras', entries);

    expect(result.archived).toBe(true);
    const item = result.categories
      .find((c) => c.id === 'cat_financeira')!
      .items.find((i) => i.id === 'fin_compras')!;
    expect(item.archived).toBe(true);
    expect(item.active).toBe(false);
    expect(item.label).toBe('Compras impulsivas');
  });

  it('apagar item sem uso remove fisicamente', () => {
    const result = deleteItem(createDefaultCategories(), 'cat_financeira', 'fin_compras', []);
    expect(result.archived).toBe(false);
    expect(
      result.categories
        .find((c) => c.id === 'cat_financeira')!
        .items.some((i) => i.id === 'fin_compras')
    ).toBe(false);
  });

  it('reconhece uso por rótulo antigo (registro legado sem id)', () => {
    const entries = [episodeWith('', 'Compras impulsivas')];
    const result = deleteItem(createDefaultCategories(), 'cat_financeira', 'fin_compras', entries);
    expect(result.archived).toBe(true);
  });

  it('categoria com histórico é arquivada e pode ser restaurada', () => {
    const entries = [episodeWith('fin_compras', 'Compras impulsivas')];
    const result = deleteCategory(createDefaultCategories(), 'cat_financeira', entries);

    expect(result.archived).toBe(true);
    const archived = result.categories.find((c) => c.id === 'cat_financeira')!;
    expect(archived.archived).toBe(true);
    expect(archived.items).toHaveLength(3);

    const restored = restoreCategory(result.categories, 'cat_financeira');
    expect(restored.find((c) => c.id === 'cat_financeira')!.archived).toBe(false);
  });

  it('restaurar item o devolve ativo ao formulário', () => {
    const entries = [episodeWith('fin_compras', 'Compras impulsivas')];
    const deleted = deleteItem(createDefaultCategories(), 'cat_financeira', 'fin_compras', entries);
    const restored = restoreItem(deleted.categories, 'cat_financeira', 'fin_compras');
    const item = restored
      .find((c) => c.id === 'cat_financeira')!
      .items.find((i) => i.id === 'fin_compras')!;
    expect(item.archived).toBe(false);
    expect(item.active).toBe(true);
  });

  it('labelKey ignora acento, caixa e espaços repetidos', () => {
    expect(labelKey('  Compulsão   Alimentar ')).toBe(labelKey('compulsao alimentar'));
  });
});
