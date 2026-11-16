import { createDefaultCategories, DEFAULT_PREFERENCES } from '../data/defaults';
import {
  BehaviorCategory,
  EntryType,
  FunctionalImpactLevel,
  PulseEntry,
  ReducedSleepNeed,
  SleepQuality,
  StateDuration,
  UserPreferences,
} from '../types/pulsetrack';

const KEYS = {
  ENTRIES: 'pulsetrack_entries_v1',
  CATEGORIES: 'pulsetrack_categories_v1',
  PREFERENCES: 'pulsetrack_preferences_v1',
} as const;

/**
 * Garante compatibilidade retroativa caso existam registros da versão anterior no localStorage.
 */
export function normalizeEntry(raw: Partial<PulseEntry>): PulseEntry {
  const hasBehaviors = Array.isArray(raw.behaviors) && raw.behaviors.length > 0;
  return {
    id: raw.id ?? `entry_${Date.now()}`,
    entryType:
      raw.entryType ??
      (hasBehaviors || (raw.behaviorOtherText && raw.behaviorOtherText.trim().length > 0)
        ? EntryType.EPISODE
        : EntryType.DAILY_CHECKIN),
    date: raw.date ?? new Date().toISOString().slice(0, 10),
    time: raw.time ?? '12:00',
    createdAt: raw.createdAt ?? new Date().toISOString(),
    moods: Array.isArray(raw.moods) ? raw.moods : [],
    moodOtherText: raw.moodOtherText ?? '',
    hadMoodSwing: Boolean(raw.hadMoodSwing),
    moodSwingDescription: raw.moodSwingDescription ?? '',
    energyLevel: typeof raw.energyLevel === 'number' ? raw.energyLevel : 5,
    sleep: {
      hours: typeof raw.sleep?.hours === 'number' ? raw.sleep.hours : 7,
      quality: raw.sleep?.quality ?? SleepQuality.REGULAR,
      reducedNeed: raw.sleep?.reducedNeed ?? ReducedSleepNeed.NAO,
    },
    stateDuration: raw.stateDuration ?? StateDuration.HORAS,
    activationSignals: Array.isArray(raw.activationSignals) ? raw.activationSignals : [],
    triggerContext: raw.triggerContext ?? '',
    behaviors: Array.isArray(raw.behaviors) ? raw.behaviors : [],
    behaviorOtherText: raw.behaviorOtherText ?? '',
    awareness: raw.awareness ?? ('mistura' as PulseEntry['awareness']),
    resisted: raw.resisted ?? ('nao' as PulseEntry['resisted']),
    urgeIntensity: typeof raw.urgeIntensity === 'number' ? raw.urgeIntensity : 0,
    feelingDuring: raw.feelingDuring ?? '',
    feelingAfter: raw.feelingAfter ?? '',
    functionalImpact: {
      work: raw.functionalImpact?.work ?? FunctionalImpactLevel.NENHUM,
      relationships: raw.functionalImpact?.relationships ?? FunctionalImpactLevel.NENHUM,
      routine: raw.functionalImpact?.routine ?? FunctionalImpactLevel.NENHUM,
      note: raw.functionalImpact?.note ?? '',
    },
    notes: raw.notes ?? '',
    dayEvents: Array.isArray(raw.dayEvents) ? raw.dayEvents : [],
    dayEventsNote: raw.dayEventsNote ?? '',
  };
}

export function loadEntries(): PulseEntry[] {
  try {
    const raw = localStorage.getItem(KEYS.ENTRIES);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map(normalizeEntry) : [];
  } catch {
    return [];
  }
}

export function saveEntries(entries: PulseEntry[]): void {
  try {
    localStorage.setItem(KEYS.ENTRIES, JSON.stringify(entries));
  } catch {
    // Falha silenciosa se armazenamento local estiver indisponível
  }
}

export function loadCategories(): BehaviorCategory[] {
  try {
    const raw = localStorage.getItem(KEYS.CATEGORIES);
    if (!raw) return createDefaultCategories();
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
    return createDefaultCategories();
  } catch {
    return createDefaultCategories();
  }
}

export function saveCategories(categories: BehaviorCategory[]): void {
  try {
    localStorage.setItem(KEYS.CATEGORIES, JSON.stringify(categories));
  } catch {
    // Ignorar falha de quota
  }
}

export function loadPreferences(): UserPreferences {
  try {
    const raw = localStorage.getItem(KEYS.PREFERENCES);
    if (!raw) return DEFAULT_PREFERENCES;
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_PREFERENCES, ...parsed };
  } catch {
    return DEFAULT_PREFERENCES;
  }
}

export function savePreferences(prefs: UserPreferences): void {
  try {
    localStorage.setItem(KEYS.PREFERENCES, JSON.stringify(prefs));
  } catch {
    // Ignorar falha de quota
  }
}

export interface BackupPayload {
  app: 'PulseTrack';
  version: 2;
  exportedAt: string;
  entries: PulseEntry[];
  categories: BehaviorCategory[];
  preferences: UserPreferences;
}

export function buildBackupJson(
  entries: PulseEntry[],
  categories: BehaviorCategory[],
  preferences: UserPreferences
): string {
  const payload: BackupPayload = {
    app: 'PulseTrack',
    version: 2,
    exportedAt: new Date().toISOString(),
    entries,
    categories,
    preferences,
  };
  return JSON.stringify(payload, null, 2);
}

export function parseBackupJson(rawText: string): BackupPayload | null {
  try {
    const parsed = JSON.parse(rawText);
    if (
      parsed &&
      parsed.app === 'PulseTrack' &&
      Array.isArray(parsed.entries) &&
      Array.isArray(parsed.categories)
    ) {
      return {
        ...parsed,
        entries: parsed.entries.map(normalizeEntry),
      } as BackupPayload;
    }
    return null;
  } catch {
    return null;
  }
}
