import { beforeEach, describe, expect, it } from 'vitest';
import { EntryType, MoodStateId, PulseEntry, ThemeMode } from '../types/pulsetrack';
import {
  buildBackupJson,
  loadCategories,
  loadEntries,
  loadPreferences,
  normalizeEntry,
  parseBackupJson,
  saveCategories,
  saveEntries,
  savePreferences,
} from './storage';

const ENTRY_KEY = 'pulsetrack_entries_v1';

beforeEach(() => {
  localStorage.clear();
});

describe('normalizeEntry', () => {
  it('deixa campos não respondidos como null em vez de inventar padrões', () => {
    const entry = normalizeEntry({});

    expect(entry.entryType).toBe(EntryType.DAILY_CHECKIN);
    expect(entry.moods).toEqual([]);
    expect(entry.behaviors).toEqual([]);
    expect(entry.energyLevel).toBeNull();
    expect(entry.sleep).toEqual({
      hours: null,
      quality: null,
      reducedNeed: null,
      bedTime: null,
      wakeTime: null,
      latencyMinutes: null,
      awakenings: null,
      noFatigueAfterShortSleep: null,
    });
    expect(entry.stateDuration).toBeNull();
    expect(entry.awareness).toBeNull();
    expect(entry.resisted).toBeNull();
    expect(entry.urgeIntensity).toBeNull();
    expect(entry.valence).toBeNull();
    expect(entry.safetyConcern).toBeNull();
    expect(entry.medication).toEqual({ status: null, effects: '' });
    expect(entry.functionalImpact).toEqual({
      work: null,
      relationships: null,
      routine: null,
      note: '',
    });
    expect(entry.dayEvents).toEqual([]);
  });

  it('infere "episódio" para registros antigos que já tinham comportamentos', () => {
    const entry = normalizeEntry({
      behaviorOtherText: 'Comportamento descrito livremente',
    });

    expect(entry.entryType).toBe(EntryType.EPISODE);
  });

  it('preserva os dados existentes', () => {
    const entry = normalizeEntry({
      id: 'abc',
      date: '2026-02-10',
      time: '23:15',
      energyLevel: 9,
      moods: [MoodStateId.EUFORICO_AGITADO],
      urgeIntensity: 8,
    });

    expect(entry.id).toBe('abc');
    expect(entry.date).toBe('2026-02-10');
    expect(entry.time).toBe('23:15');
    expect(entry.energyLevel).toBe(9);
    expect(entry.moods).toEqual([MoodStateId.EUFORICO_AGITADO]);
    expect(entry.urgeIntensity).toBe(8);
  });
});

describe('persistência em localStorage', () => {
  it('faz round-trip dos registros normalizando o que vem do storage', () => {
    const entry = normalizeEntry({ id: 'persistido', date: '2026-03-01', time: '08:00' });

    saveEntries([entry]);

    expect(loadEntries()).toEqual([entry]);
  });

  it('devolve lista vazia quando o conteúdo salvo está corrompido', () => {
    localStorage.setItem(ENTRY_KEY, '{nao-e-json');

    expect(loadEntries()).toEqual([]);
  });

  it('cai nas categorias padrão quando não há nada salvo', () => {
    const categorias = loadCategories();

    expect(categorias.length).toBeGreaterThan(0);
    expect(categorias[0].items.length).toBeGreaterThan(0);
  });

  it('persiste categorias editadas', () => {
    const categorias = loadCategories().map((c) => ({ ...c, name: `${c.name} (editada)` }));

    saveCategories(categorias);

    expect(loadCategories()[0].name).toContain('(editada)');
  });

  it('mescla preferências salvas com os padrões', () => {
    savePreferences({
      theme: ThemeMode.DARK,
      reduceMotion: true,
      focusModeDefault: false,
      showSexualCategory: false,
      trackCycle: false,
      reportLabel: '',
    });

    const prefs = loadPreferences();

    expect(prefs.theme).toBe(ThemeMode.DARK);
    expect(prefs.reduceMotion).toBe(true);
    expect(prefs.focusModeDefault).toBe(false);
  });
});

describe('backup', () => {
  const entry = normalizeEntry({
    id: 'backup-1',
    date: '2026-04-02',
    time: '10:30',
    entryType: EntryType.EPISODE,
    moods: [MoodStateId.ANSIOSO],
    urgeIntensity: 7,
  }) as PulseEntry;

  it('serializa um payload identificável com versão', () => {
    const payload = JSON.parse(
      buildBackupJson([entry], loadCategories(), loadPreferences())
    );

    expect(payload.app).toBe('PulseTrack');
    expect(payload.version).toBe(2);
    expect(payload.entries).toHaveLength(1);
    expect(payload.entries[0].id).toBe('backup-1');
  });

  it('restaura um backup válido normalizando as entradas', () => {
    const restaurado = parseBackupJson(buildBackupJson([entry], loadCategories(), loadPreferences()));

    expect(restaurado?.entries).toHaveLength(1);
    expect(restaurado?.entries[0]).toEqual(entry);
  });

  it('recusa JSON inválido e payload de outro app', () => {
    expect(parseBackupJson('nao-e-json')).toBeNull();
    expect(parseBackupJson(JSON.stringify({ app: 'OutroApp', entries: [], categories: [] }))).toBeNull();
  });

  it('recusa backup sem as listas obrigatórias', () => {
    expect(parseBackupJson(JSON.stringify({ app: 'PulseTrack', entries: [] }))).toBeNull();
  });
});
