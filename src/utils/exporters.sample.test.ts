import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { computeAnalytics } from './analytics';
import { exportEntriesToCsv } from './exporters';
import { createDefaultCategories, createSampleEntries } from '../data/defaults';
import { BehaviorMode, EntryType } from '../types/pulsetrack';
import { normalizeEntry } from './storage';

let blobs: Blob[] = [];

function readBlob(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsText(blob);
  });
}

beforeEach(() => {
  blobs = [];
  Object.defineProperty(URL, 'createObjectURL', {
    configurable: true,
    value: vi.fn((blob: Blob) => {
      blobs.push(blob);
      return `blob:test-${blobs.length}`;
    }),
  });
  Object.defineProperty(URL, 'revokeObjectURL', {
    configurable: true,
    value: vi.fn(),
  });
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('exportEntriesToCsv — origem dos registros', () => {
  it('identifica exemplos e registros reais em uma exportação mista', async () => {
    const entries = [
      createSampleEntries()[0],
      normalizeEntry({ id: 'real_1', date: '2026-11-10', time: '09:00' }),
      normalizeEntry({
        id: 'impulso_1',
        date: '2026-11-09',
        time: '10:00',
        entryType: EntryType.EPISODE,
        behaviors: [
          {
            categoryId: 'cat_financeira',
            categoryName: 'Financeira',
            itemId: 'fin_compras',
            itemLabel: 'Compras impulsivas',
            mode: BehaviorMode.IMPULSO,
            harm: false,
          },
        ],
      }),
    ];
    const analytics = computeAnalytics(entries, createDefaultCategories(), '14');

    exportEntriesToCsv(entries, '14', analytics);

    expect(blobs).toHaveLength(1);
    const csv = await readBlob(blobs[0]);
    expect(csv).toContain('"Origem do Registro"');
    expect(csv).toContain('"Exemplo ilustrativo"');
    expect(csv).toContain('"Registro real"');
    expect(csv).toContain('Aviso: este arquivo inclui 1 registro(s) de exemplo ilustrativo');
    expect(csv).toContain('Compras impulsivas [só impulso, não fiz]');
    expect(csv).toContain('"Impulso contido"');
  });
});
