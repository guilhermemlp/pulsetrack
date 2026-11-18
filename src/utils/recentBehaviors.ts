import {
  BehaviorCategory,
  BehaviorMode,
  BehaviorSubItem,
  PulseEntry,
} from '../types/pulsetrack';
import { toLocalIsoDate } from './analytics';

export interface RecentBehavior {
  categoryId: string;
  categoryName: string;
  itemId: string;
  itemLabel: string;
  mode: BehaviorMode;
}

export const RECENT_BEHAVIORS_DAYS = 14;
export const RECENT_BEHAVIORS_LIMIT = 4;
/** Acima disso o catálogo já exige busca em vez de rolagem. */
export const SEARCH_THRESHOLD = 12;

/** Remove acentos e caixa para busca tolerante a digitação (ex.: "compulsao" acha "Compulsão"). */
export function normalizeSearch(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('pt-BR')
    .trim();
}

/**
 * Últimos itens registrados nos últimos `days` dias, um por item, do mais recente
 * para o mais antigo. Inclui itens usados apenas como impulso — eles são dados clínicos
 * tão relevantes quanto os efetivados.
 *
 * Itens que não existem mais ou foram desativados ficam de fora: os chips só oferecem
 * o que ainda pode ser selecionado no catálogo atual.
 */
export function getRecentBehaviors(
  entries: PulseEntry[],
  categories: BehaviorCategory[],
  options: { days?: number; limit?: number; today?: Date } = {}
): RecentBehavior[] {
  const { days = RECENT_BEHAVIORS_DAYS, limit = RECENT_BEHAVIORS_LIMIT } = options;
  const today = options.today ?? new Date();
  const cutoffDate = new Date(today);
  cutoffDate.setHours(0, 0, 0, 0);
  cutoffDate.setDate(cutoffDate.getDate() - (days - 1));
  const cutoff = toLocalIsoDate(cutoffDate);

  const activeItems = new Map<string, { category: BehaviorCategory; item: BehaviorSubItem }>();
  for (const category of categories) {
    if (!category.active) continue;
    for (const item of category.items) {
      if (!item.active) continue;
      activeItems.set(item.id, { category, item });
    }
  }

  const recentEntries = entries
    .filter((entry) => entry.date >= cutoff)
    .sort((a, b) =>
      `${b.date}T${b.time}|${b.createdAt}`.localeCompare(`${a.date}T${a.time}|${a.createdAt}`)
    );

  const seen = new Set<string>();
  const result: RecentBehavior[] = [];

  for (const entry of recentEntries) {
    for (const behavior of entry.behaviors) {
      // Um chip exige um modo atual: dados legados sem classificação não podem
      // reaparecer como "fiz" nem como "impulso" por suposição.
      if (behavior.mode === BehaviorMode.DESCONHECIDO) continue;
      if (seen.has(behavior.itemId)) continue;
      const match = activeItems.get(behavior.itemId);
      if (!match) continue;
      seen.add(behavior.itemId);
      result.push({
        categoryId: match.category.id,
        categoryName: match.category.name,
        itemId: match.item.id,
        itemLabel: match.item.label,
        mode: behavior.mode,
      });
      if (result.length >= limit) return result;
    }
  }

  return result;
}

/** Filtra itens ativos pelo texto buscado; categoria cujo nome casa mantém todos os itens. */
export function filterCategoriesBySearch(
  categories: BehaviorCategory[],
  query: string
): BehaviorCategory[] {
  const normalized = normalizeSearch(query);
  if (!normalized) return categories;

  const matches = (value: string) => normalizeSearch(value).includes(normalized);

  return categories
    .map((category) => {
      if (matches(category.name)) return category;
      return {
        ...category,
        items: category.items.filter((item) => item.active && matches(item.label)),
      };
    })
    .filter((category) => category.items.length > 0);
}

export function countActiveItems(categories: BehaviorCategory[]): number {
  return categories.reduce(
    (total, category) =>
      total + (category.active ? category.items.filter((item) => item.active).length : 0),
    0
  );
}

export function describeBehaviorMode(mode: BehaviorMode): string {
  if (mode === BehaviorMode.IMPULSO) return 'impulso';
  if (mode === BehaviorMode.FEITO) return 'fiz';
  return 'modo não informado';
}
