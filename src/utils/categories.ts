import {
  BehaviorCategory,
  BehaviorSubItem,
  PackageId,
  PulseEntry,
  SelectedBehavior,
} from '../types/pulsetrack';

/**
 * Schema v2 do catálogo de comportamentos.
 *
 * Princípios:
 * - A migração v1 → v2 só ACRESCENTA campos estruturais. Nenhum rótulo, id ou
 *   `active` é reescrito, e datas desconhecidas ficam `null` (nunca `new Date()`).
 * - `itemId` é a identidade estável: renomear muda o rótulo exibido, não a série.
 * - Apagar um item com histórico vira `archived: true`; excluir de verdade só é
 *   permitido quando nenhum registro o referencia.
 */

export const CATEGORY_SCHEMA_VERSION = 2 as const;

export interface CategoryStore {
  schemaVersion: typeof CATEGORY_SCHEMA_VERSION;
  categories: BehaviorCategory[];
}

/** Normaliza um rótulo para comparação: sem acento, caixa baixa, espaços únicos. */
export function labelKey(label: string): string {
  return label
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

function asIsoOrNull(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value : null;
}

function normalizeAliases(raw: unknown, currentLabel: string): string[] {
  if (!Array.isArray(raw)) return [];
  const current = labelKey(currentLabel);
  const seen = new Set<string>();
  const aliases: string[] = [];
  for (const value of raw) {
    if (typeof value !== 'string') continue;
    const trimmed = value.trim();
    const key = labelKey(trimmed);
    if (!trimmed || key === current || seen.has(key)) continue;
    seen.add(key);
    aliases.push(trimmed);
  }
  return aliases;
}

function slug(value: string): string {
  return labelKey(value).replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
}

function normalizeItem(raw: unknown, index: number): BehaviorSubItem | null {
  if (!raw || typeof raw !== 'object') return null;
  const candidate = raw as Partial<BehaviorSubItem> & { [key: string]: unknown };
  const label = typeof candidate.label === 'string' ? candidate.label : '';
  // Id ausente só existe em dados muito antigos: gera um id técnico determinístico
  // a partir do rótulo. Isso não inventa conteúdo, apenas viabiliza a identidade.
  const id =
    typeof candidate.id === 'string' && candidate.id.trim()
      ? candidate.id
      : `legacy_${slug(label) || 'item'}_${index}`;
  if (!label.trim() && !candidate.isFreeText) return null;

  const item: BehaviorSubItem = {
    id,
    label,
    active: candidate.active !== false,
    createdAt: asIsoOrNull(candidate.createdAt),
  };
  if (candidate.isFreeText === true) item.isFreeText = true;
  if (candidate.source === 'default' || candidate.source === 'package') item.source = candidate.source;
  if (candidate.archived === true) item.archived = true;
  const aliases = normalizeAliases(candidate.aliases, label);
  if (aliases.length > 0) item.aliases = aliases;
  return item;
}

function normalizeCategory(raw: unknown): BehaviorCategory | null {
  if (!raw || typeof raw !== 'object') return null;
  const candidate = raw as Partial<BehaviorCategory> & { [key: string]: unknown };
  if (typeof candidate.id !== 'string' || !candidate.id.trim()) return null;

  const items = Array.isArray(candidate.items)
    ? candidate.items
        .map((item, index) => normalizeItem(item, index))
        .filter((item): item is BehaviorSubItem => item !== null)
    : [];

  const category: BehaviorCategory = {
    id: candidate.id,
    name: typeof candidate.name === 'string' ? candidate.name : '',
    color: typeof candidate.color === 'string' ? candidate.color : '#3B6F8F',
    active: candidate.active !== false,
    items,
    version: CATEGORY_SCHEMA_VERSION,
    updatedAt: asIsoOrNull(candidate.updatedAt),
  };
  if (candidate.archived === true) category.archived = true;
  if (typeof candidate.packageId === 'string') category.packageId = candidate.packageId as PackageId;
  return category;
}

/**
 * Aceita o formato v1 (array puro) e o v2 (envelope com schemaVersion) e sempre
 * devolve o envelope v2. Categorias inválidas são descartadas; o chamador decide
 * se deve cair no catálogo padrão quando o resultado fica vazio.
 */
export function migrateCategories(raw: unknown): CategoryStore {
  const list = Array.isArray(raw)
    ? raw
    : raw && typeof raw === 'object' && Array.isArray((raw as CategoryStore).categories)
      ? (raw as CategoryStore).categories
      : [];

  const categories = list
    .map((category) => normalizeCategory(category))
    .filter((category): category is BehaviorCategory => category !== null);

  return { schemaVersion: CATEGORY_SCHEMA_VERSION, categories };
}

/** `true` quando o valor persistido ainda está no formato v1 e precisa ser regravado. */
export function needsCategoryMigration(raw: unknown): boolean {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return true;
  const store = raw as Partial<CategoryStore>;
  return store.schemaVersion !== CATEGORY_SCHEMA_VERSION || !Array.isArray(store.categories);
}

export interface ItemIdentity {
  categoryId: string;
  itemId: string;
  label: string;
  aliases: string[];
}

export interface ItemLookup {
  byId: Map<string, ItemIdentity>;
  byLabel: Map<string, ItemIdentity>;
}

/** Índice de identidade: id do item + rótulos atuais e antigos. */
export function buildItemLookup(categories: BehaviorCategory[]): ItemLookup {
  const lookup: ItemLookup = { byId: new Map(), byLabel: new Map() };
  for (const category of categories) {
    for (const item of category.items) {
      const identity: ItemIdentity = {
        categoryId: category.id,
        itemId: item.id,
        label: item.label,
        aliases: item.aliases ?? [],
      };
      lookup.byId.set(item.id, identity);
      if (item.label.trim()) lookup.byLabel.set(labelKey(item.label), identity);
      for (const alias of identity.aliases) {
        if (!lookup.byLabel.has(labelKey(alias))) lookup.byLabel.set(labelKey(alias), identity);
      }
    }
  }
  return lookup;
}

/**
 * Encontra a identidade de um comportamento registrado. O `itemId` manda; quando é
 * vazio/desconhecido (registro legado) cai para o rótulo — atual ou um alias.
 */
export function resolveBehaviorItem(
  behavior: SelectedBehavior,
  lookup: ItemLookup
): ItemIdentity | null {
  if (behavior.itemId) {
    const byId = lookup.byId.get(behavior.itemId);
    if (byId) return byId;
  }
  if (!behavior.itemLabel) return null;
  return lookup.byLabel.get(labelKey(behavior.itemLabel)) ?? null;
}

/** Chave de agregação: id estável quando resolvível; rótulo normalizado como legado. */
export function behaviorItemKey(behavior: SelectedBehavior, lookup: ItemLookup): string {
  const identity = resolveBehaviorItem(behavior, lookup);
  if (identity) return `id:${identity.itemId}`;
  return `label:${labelKey(behavior.itemLabel) || behavior.itemId}`;
}

/** Rótulo canônico: o nome atual do item, mesmo que o registro traga o antigo. */
export function canonicalItemLabel(behavior: SelectedBehavior, lookup: ItemLookup): string {
  return resolveBehaviorItem(behavior, lookup)?.label ?? behavior.itemLabel;
}

export function itemHistoryLabels(item: BehaviorSubItem): string[] {
  return [item.label, ...(item.aliases ?? [])].filter((label) => label.trim().length > 0);
}

/**
 * Um item tem histórico quando algum registro o referencia por id OU por qualquer
 * rótulo que ele já teve (registros anteriores a terem id).
 */
export function isItemUsed(item: BehaviorSubItem, entries: PulseEntry[]): boolean {
  const keys = new Set(itemHistoryLabels(item).map(labelKey));
  return entries.some((entry) =>
    entry.behaviors.some(
      (behavior) =>
        behavior.itemId === item.id ||
        (behavior.itemLabel.trim().length > 0 && keys.has(labelKey(behavior.itemLabel)))
    )
  );
}

export function isCategoryUsed(category: BehaviorCategory, entries: PulseEntry[]): boolean {
  return category.items.some((item) => isItemUsed(item, entries));
}

function touch(category: BehaviorCategory, now: string): BehaviorCategory {
  return { ...category, version: CATEGORY_SCHEMA_VERSION, updatedAt: now };
}

export function renameCategory(
  categories: BehaviorCategory[],
  categoryId: string,
  name: string,
  now = new Date().toISOString()
): BehaviorCategory[] {
  const trimmed = name.trim();
  if (!trimmed) return categories;
  return categories.map((category) =>
    category.id === categoryId && category.name !== trimmed
      ? touch({ ...category, name: trimmed }, now)
      : category
  );
}

/**
 * Renomear registra o rótulo antigo como alias e mantém o mesmo `id` — é isso que
 * impede a série histórica de se dividir em dois itens.
 */
export function renameItem(
  categories: BehaviorCategory[],
  categoryId: string,
  itemId: string,
  nextLabel: string,
  now = new Date().toISOString()
): BehaviorCategory[] {
  const trimmed = nextLabel.trim();
  if (!trimmed) return categories;
  return categories.map((category) => {
    if (category.id !== categoryId) return category;
    let changed = false;
    const items = category.items.map((item) => {
      if (item.id !== itemId || item.label === trimmed) return item;
      changed = true;
      const aliases = normalizeAliases([...(item.aliases ?? []), item.label], trimmed);
      return {
        ...item,
        label: trimmed,
        ...(aliases.length > 0 ? { aliases } : {}),
      };
    });
    return changed ? touch({ ...category, items }, now) : category;
  });
}

export interface CategoryMutationResult {
  categories: BehaviorCategory[];
  /** `true` quando o item foi preservado como arquivado em vez de excluído. */
  archived: boolean;
}

/** Apagar item: com histórico vira arquivado; sem histórico sai do catálogo. */
export function deleteItem(
  categories: BehaviorCategory[],
  categoryId: string,
  itemId: string,
  entries: PulseEntry[],
  now = new Date().toISOString()
): CategoryMutationResult {
  const category = categories.find((c) => c.id === categoryId);
  const item = category?.items.find((i) => i.id === itemId);
  if (!category || !item) return { categories, archived: false };

  if (isItemUsed(item, entries)) {
    return {
      archived: true,
      categories: categories.map((c) =>
        c.id !== categoryId
          ? c
          : touch(
              {
                ...c,
                items: c.items.map((i) =>
                  i.id === itemId ? { ...i, archived: true, active: false } : i
                ),
              },
              now
            )
      ),
    };
  }

  return {
    archived: false,
    categories: categories.map((c) =>
      c.id !== categoryId
        ? c
        : touch({ ...c, items: c.items.filter((i) => i.id !== itemId) }, now)
    ),
  };
}

/** Apagar categoria: com qualquer histórico vira arquivada (todos os itens permanecem). */
export function deleteCategory(
  categories: BehaviorCategory[],
  categoryId: string,
  entries: PulseEntry[],
  now = new Date().toISOString()
): CategoryMutationResult {
  const category = categories.find((c) => c.id === categoryId);
  if (!category) return { categories, archived: false };

  if (isCategoryUsed(category, entries)) {
    return {
      archived: true,
      categories: categories.map((c) =>
        c.id === categoryId ? touch({ ...c, archived: true, active: false }, now) : c
      ),
    };
  }

  return { archived: false, categories: categories.filter((c) => c.id !== categoryId) };
}

export function restoreItem(
  categories: BehaviorCategory[],
  categoryId: string,
  itemId: string,
  now = new Date().toISOString()
): BehaviorCategory[] {
  return categories.map((category) =>
    category.id !== categoryId
      ? category
      : touch(
          {
            ...category,
            items: category.items.map((item) =>
              item.id === itemId
                ? { ...item, archived: false, active: true }
                : item
            ),
          },
          now
        )
  );
}

export function restoreCategory(
  categories: BehaviorCategory[],
  categoryId: string,
  now = new Date().toISOString()
): BehaviorCategory[] {
  return categories.map((category) =>
    category.id === categoryId ? touch({ ...category, archived: false, active: true }, now) : category
  );
}

/** Itens disponíveis para novos registros: existem e não estão arquivados. */
export function activeItems(category: BehaviorCategory): BehaviorSubItem[] {
  return category.items.filter((item) => !item.archived);
}

export function activeCategories(categories: BehaviorCategory[]): BehaviorCategory[] {
  return categories.filter((category) => !category.archived);
}
