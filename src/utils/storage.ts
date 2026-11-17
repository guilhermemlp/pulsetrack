import { createDefaultCategories, DEFAULT_PREFERENCES } from '../data/defaults';
import {
  BehaviorCategory,
  BehaviorMode,
  CyclePhase,
  EntryType,
  MedicationStatus,
  MoodSwingDirection,
  MoodSwingWindow,
  PulseEntry,
  SafetyConcern,
  SelectedBehavior,
  StateDuration,
  UserPreferences,
} from '../types/pulsetrack';
import { toLocalIsoDate } from './analytics';

const KEYS = {
  ENTRIES: 'pulsetrack_entries_v1',
  CATEGORIES: 'pulsetrack_categories_v1',
  PREFERENCES: 'pulsetrack_preferences_v1',
  DRAFT: 'pulsetrack_form_draft_v1',
} as const;

const LEGACY_STATE_DURATION: Record<string, StateDuration> = {
  dias_curto: StateDuration.DIAS_1_3,
  dias_medio: StateDuration.DIAS_4_6,
  semanas: StateDuration.DIAS_14_MAIS,
};

function normalizeStateDuration(value: unknown): StateDuration | null {
  if (typeof value !== 'string') return null;
  if (value in LEGACY_STATE_DURATION) return LEGACY_STATE_DURATION[value];
  return Object.values(StateDuration).includes(value as StateDuration)
    ? (value as StateDuration)
    : null;
}

/** Aceita apenas valores conhecidos do enum; qualquer outra coisa vira null ("não informado"). */
function pickEnum<T extends string>(value: unknown, allowed: Record<string, string>): T | null {
  if (typeof value !== 'string') return null;
  return Object.values(allowed).includes(value) ? (value as T) : null;
}

function normalizeBehaviors(raw: unknown): SelectedBehavior[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((b) => b && typeof b.itemId === 'string')
    .map((b) => ({
      categoryId: String(b.categoryId ?? ''),
      categoryName: String(b.categoryName ?? ''),
      itemId: String(b.itemId),
      itemLabel: String(b.itemLabel ?? b.itemId),
      // Dados antigos não distinguiam ação de impulso: assume-se ação registrada.
      mode: pickEnum<BehaviorMode>(b.mode, BehaviorMode) ?? BehaviorMode.FEITO,
      harm: typeof b.harm === 'boolean' ? b.harm : false,
    }));
}

/**
 * Normaliza registros do localStorage sem inventar dado: campo não respondido vira `null`
 * e o relatório mostra "não informado". Apenas valores ausentes por versão antiga são migrados.
 */
export function normalizeEntry(raw: Partial<PulseEntry>): PulseEntry {
  const behaviors = normalizeBehaviors(raw.behaviors);
  const hasBehaviors = behaviors.length > 0;
  const moodIntensity: Record<string, number> = {};
  if (raw.moodIntensity && typeof raw.moodIntensity === 'object') {
    for (const [key, value] of Object.entries(raw.moodIntensity)) {
      if (typeof value === 'number') moodIntensity[key] = value;
    }
  }

  return {
    id: raw.id ?? `entry_${Date.now()}`,
    entryType:
      raw.entryType ??
      (hasBehaviors || (raw.behaviorOtherText && raw.behaviorOtherText.trim().length > 0)
        ? EntryType.EPISODE
        : EntryType.DAILY_CHECKIN),
    date: raw.date ?? toLocalIsoDate(),
    time: raw.time ?? '12:00',
    createdAt: raw.createdAt ?? new Date().toISOString(),
    moods: Array.isArray(raw.moods) ? raw.moods : [],
    moodIntensity,
    moodOtherText: raw.moodOtherText ?? '',
    valence: typeof raw.valence === 'number' ? raw.valence : null,
    hadMoodSwing: Boolean(raw.hadMoodSwing),
    moodSwingDirection: pickEnum<MoodSwingDirection>(
      raw.moodSwingDirection,
      MoodSwingDirection
    ),
    moodSwingWindow: pickEnum<MoodSwingWindow>(raw.moodSwingWindow, MoodSwingWindow),
    moodSwingDescription: raw.moodSwingDescription ?? '',
    energyLevel: typeof raw.energyLevel === 'number' ? raw.energyLevel : null,
    sleep: {
      hours: typeof raw.sleep?.hours === 'number' ? raw.sleep.hours : null,
      quality: raw.sleep?.quality ?? null,
      reducedNeed: raw.sleep?.reducedNeed ?? null,
      bedTime: raw.sleep?.bedTime ?? null,
      wakeTime: raw.sleep?.wakeTime ?? null,
      latencyMinutes:
        typeof raw.sleep?.latencyMinutes === 'number' ? raw.sleep.latencyMinutes : null,
      awakenings: typeof raw.sleep?.awakenings === 'number' ? raw.sleep.awakenings : null,
      noFatigueAfterShortSleep:
        typeof raw.sleep?.noFatigueAfterShortSleep === 'boolean'
          ? raw.sleep.noFatigueAfterShortSleep
          : null,
    },
    stateDuration: normalizeStateDuration(raw.stateDuration),
    activationSignals: Array.isArray(raw.activationSignals) ? raw.activationSignals : [],
    triggerContext: raw.triggerContext ?? '',
    behaviors,
    behaviorOtherText: raw.behaviorOtherText ?? '',
    awareness: raw.awareness ?? null,
    resisted: raw.resisted ?? null,
    urgeIntensity: typeof raw.urgeIntensity === 'number' ? raw.urgeIntensity : null,
    feelingDuring: raw.feelingDuring ?? '',
    feelingAfter: raw.feelingAfter ?? '',
    functionalImpact: {
      work: raw.functionalImpact?.work ?? null,
      relationships: raw.functionalImpact?.relationships ?? null,
      routine: raw.functionalImpact?.routine ?? null,
      note: raw.functionalImpact?.note ?? '',
    },
    medication: {
      status: pickEnum<MedicationStatus>(raw.medication?.status, MedicationStatus),
      effects: raw.medication?.effects ?? '',
    },
    cyclePhase: pickEnum<CyclePhase>(raw.cyclePhase, CyclePhase),
    safetyConcern: pickEnum<SafetyConcern>(raw.safetyConcern, SafetyConcern),
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

export interface FormDraft {
  savedAt: string;
  payload: Record<string, unknown>;
}

/**
 * Rascunho automático do formulário: fechar a aba sem salvar não pode custar o registro
 * inteiro (barreira de adesão relevante em TDAH).
 */
export function saveFormDraft(payload: Record<string, unknown>): void {
  try {
    localStorage.setItem(KEYS.DRAFT, JSON.stringify({ savedAt: new Date().toISOString(), payload }));
  } catch {
    // Ignorar falha de quota
  }
}

export function loadFormDraft(): FormDraft | null {
  try {
    const raw = localStorage.getItem(KEYS.DRAFT);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && parsed.payload && typeof parsed.payload === 'object') {
      return parsed as FormDraft;
    }
    return null;
  } catch {
    return null;
  }
}

export function clearFormDraft(): void {
  try {
    localStorage.removeItem(KEYS.DRAFT);
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
