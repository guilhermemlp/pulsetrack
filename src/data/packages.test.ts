import { describe, expect, it } from 'vitest';
import { createDefaultCategories } from './defaults';
import { applyPackages, CATEGORY_PACKAGES } from './packages';
import { PackageId } from '../types/pulsetrack';

describe('pacotes de categorias', () => {
  it('reutiliza apenas categorias e itens que já existem', () => {
    const categories = createDefaultCategories();
    const ids = new Set(categories.map((c) => c.id));

    for (const pkg of CATEGORY_PACKAGES) {
      for (const ref of pkg.categories) {
        expect(ids.has(ref.categoryId)).toBe(true);
        const category = categories.find((c) => c.id === ref.categoryId)!;
        for (const itemId of ref.itemIds) {
          expect(category.items.some((i) => i.id === itemId)).toBe(true);
        }
      }
    }
  });

  it('marca itens do pacote com source package sem duplicar nada', () => {
    const before = createDefaultCategories();
    const totalItems = before.reduce((sum, c) => sum + c.items.length, 0);

    const after = applyPackages(before, ['pkg_tdah']);

    expect(after.reduce((sum, c) => sum + c.items.length, 0)).toBe(totalItems);
    const digital = after.find((c) => c.id === 'cat_digital')!;
    expect(digital.items.find((i) => i.id === 'dig_scroll')?.source).toBe('package');
    expect(digital.active).toBe(true);
  });

  it('reativa item desativado e preserva itens personalizados', () => {
    const categories = createDefaultCategories().map((c) =>
      c.id === 'cat_digital'
        ? {
            ...c,
            active: false,
            items: [
              ...c.items.map((i) => (i.id === 'dig_scroll' ? { ...i, active: false } : i)),
              { id: 'custom_1', label: 'Meu item', active: true, createdAt: null },
            ],
          }
        : c
    );

    const after = applyPackages(categories, ['pkg_tdah']);
    const digital = after.find((c) => c.id === 'cat_digital')!;

    expect(digital.active).toBe(true);
    expect(digital.items.find((i) => i.id === 'dig_scroll')?.active).toBe(true);
    expect(digital.items.find((i) => i.id === 'custom_1')?.label).toBe('Meu item');
  });

  it('não altera o catálogo quando nenhum pacote é escolhido', () => {
    const categories = createDefaultCategories();
    expect(applyPackages(categories, [])).toBe(categories);
  });

  it('aplica vários pacotes de uma vez', () => {
    const ids: PackageId[] = ['pkg_compulsoes', 'pkg_autismo_sensorial'];
    const after = applyPackages(createDefaultCategories(), ids);
    const packageItems = after.flatMap((c) => c.items.filter((i) => i.source === 'package'));
    expect(packageItems.length).toBeGreaterThan(0);
    expect(after.some((c) => c.id === 'cat_alimentar')).toBe(true);
  });
});
