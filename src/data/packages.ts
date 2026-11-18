import {
  BehaviorCategory,
  BehaviorSubItem,
  PackageId,
} from '../types/pulsetrack';

export interface PackageCategoryRef {
  categoryId: string;
  itemIds: string[];
}

export interface CategoryPackage {
  id: PackageId;
  name: string;
  /** Uma linha sobre o que o pacote deixa visível — sem prometer diagnóstico. */
  description: string;
  categories: PackageCategoryRef[];
}

/**
 * Pacotes do onboarding. Nenhum item novo é inventado: todos os ids já existem em
 * `createDefaultCategories`, então aplicar um pacote nunca duplica categoria nem
 * renomeia histórico. O pacote apenas torna o recorte visível/ativo.
 */
export const CATEGORY_PACKAGES: CategoryPackage[] = [
  {
    id: 'pkg_tdah',
    name: 'TDAH / atenção e impulsividade',
    description: 'Distração digital, compras por impulso e alimentação automática.',
    categories: [
      { categoryId: 'cat_digital', itemIds: ['dig_abas', 'dig_scroll', 'dig_transe', 'dig_notif'] },
      { categoryId: 'cat_financeira', itemIds: ['fin_compras', 'fin_navegar'] },
      { categoryId: 'cat_alimentar', itemIds: ['al_automatica'] },
    ],
  },
  {
    id: 'pkg_bipolar',
    name: 'Humor oscilante / bipolaridade',
    description: 'Gastos e intensidade em períodos de energia alta, além de risco.',
    categories: [
      { categoryId: 'cat_financeira', itemIds: ['fin_compras', 'fin_desnec'] },
      { categoryId: 'cat_afetiva', itemIds: ['af_encontro', 'af_likes'] },
      { categoryId: 'cat_sexual', itemIds: ['sex_intensidade', 'sex_pornografia'] },
      { categoryId: 'cat_outros', itemIds: ['out_risco'] },
    ],
  },
  {
    id: 'pkg_compulsoes',
    name: 'Compulsões',
    description: 'Alimentação, gastos, sexualidade e busca por validação.',
    categories: [
      {
        categoryId: 'cat_alimentar',
        itemIds: ['al_noturna', 'al_acabar', 'al_automatica', 'al_saciedade'],
      },
      {
        categoryId: 'cat_financeira',
        itemIds: ['fin_compras', 'fin_desnec', 'fin_navegar'],
      },
      {
        categoryId: 'cat_sexual',
        itemIds: ['sex_compulsiva', 'sex_pornografia', 'sex_intensidade'],
      },
      { categoryId: 'cat_afetiva', itemIds: ['af_apps', 'af_likes'] },
      { categoryId: 'cat_digital', itemIds: ['dig_scroll'] },
    ],
  },
  {
    id: 'pkg_autismo_sensorial',
    name: 'Autismo / sobrecarga sensorial',
    description: 'Transe digital, repetição e alimentação automática.',
    categories: [
      { categoryId: 'cat_digital', itemIds: ['dig_transe', 'dig_scroll', 'dig_notif'] },
      { categoryId: 'cat_outros', itemIds: ['out_obsessivos'] },
      { categoryId: 'cat_alimentar', itemIds: ['al_automatica'] },
    ],
  },
  {
    id: 'pkg_geral',
    name: 'Visão geral',
    description: 'Um item representativo de cada área, para começar sem excesso.',
    categories: [
      { categoryId: 'cat_afetiva', itemIds: ['af_validacao'] },
      { categoryId: 'cat_financeira', itemIds: ['fin_compras'] },
      { categoryId: 'cat_alimentar', itemIds: ['al_noturna'] },
      { categoryId: 'cat_digital', itemIds: ['dig_scroll'] },
      { categoryId: 'cat_outros', itemIds: ['out_obsessivos'] },
    ],
  },
];

export function getPackage(id: PackageId): CategoryPackage | undefined {
  return CATEGORY_PACKAGES.find((p) => p.id === id);
}

/**
 * Aplica os pacotes escolhidos preservando tudo o que já existe:
 * - categorias e itens são reativados, nunca recriados;
 * - itens de pacote recebem `source: 'package'`;
 * - ids desconhecidos são ignorados (o pacote não inventa item sem rótulo).
 */
export function applyPackages(
  categories: BehaviorCategory[],
  packageIds: PackageId[]
): BehaviorCategory[] {
  if (packageIds.length === 0) return categories;

  const wanted = new Map<string, Set<string>>();
  const categoryPackage = new Map<string, PackageId>();
  for (const id of packageIds) {
    const pkg = getPackage(id);
    if (!pkg) continue;
    for (const ref of pkg.categories) {
      const set = wanted.get(ref.categoryId) ?? new Set<string>();
      ref.itemIds.forEach((itemId) => set.add(itemId));
      wanted.set(ref.categoryId, set);
      if (!categoryPackage.has(ref.categoryId)) categoryPackage.set(ref.categoryId, id);
    }
  }

  const now = new Date().toISOString();
  return categories.map((category) => {
    const itemIds = wanted.get(category.id);
    if (!itemIds) return category;
    return {
      ...category,
      active: true,
      version: 2,
      updatedAt: now,
      packageId: category.packageId ?? categoryPackage.get(category.id),
      items: category.items.map((item): BehaviorSubItem =>
        itemIds.has(item.id) ? { ...item, active: true, source: 'package' } : item
      ),
    };
  });
}
