import {
  createDefaultCategories,
  DEFAULT_PREFERENCES,
  FOCUS_AREA_OPTIONS,
  PROFILE_HINT_OPTIONS,
} from '../data/defaults';
import { CATEGORY_PACKAGES } from '../data/packages';
import {
  BehaviorCategory,
  BehaviorMode,
  CyclePhase,
  EntryType,
  MedicationStatus,
  MoodSwingDirection,
  OnboardingProgress,
  Experiment,
  MoodSwingWindow,
  PulseEntry,
  RecordLevel,
  SafetyConcern,
  SelectedBehavior,
  StateDuration,
  ThemeMode,
  UserPreferences,
} from '../types/pulsetrack';
import { toLocalIsoDate } from './analytics';
import { migrateCategories, needsCategoryMigration } from './categories';
import { normalizeExperiment } from './experiments';

const KEYS = {
  ENTRIES: 'pulsetrack_entries_v1',
  CATEGORIES: 'pulsetrack_categories_v1',
  PREFERENCES: 'pulsetrack_preferences_v1',
  DRAFT: 'pulsetrack_form_draft_v1',
  ONBOARDING: 'pulsetrack_onboarding_v1',
  EXPERIMENTS: 'pulsetrack_experiments_v1',
} as const;

const LEGACY_STATE_DURATION: Record<string, StateDuration> = {
  dias_curto: StateDuration.DIAS_1_3,
  dias_medio: StateDuration.DIAS_4_6,
  semanas: StateDuration.DIAS_14_MAIS,
};

export function normalizeStateDuration(value: unknown): StateDuration | null {
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

export function normalizeBehaviors(raw: unknown): SelectedBehavior[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter(
      (b) =>
        b &&
        (typeof b.itemId === 'string' || typeof b.itemLabel === 'string')
    )
    .map((b) => ({
      categoryId: String(b.categoryId ?? ''),
      categoryName: String(b.categoryName ?? ''),
      // Registro muito antigo sem id mantém o rótulo; o analytics resolve o item
      // por label/alias em vez de descartar o episódio.
      itemId: typeof b.itemId === 'string' ? b.itemId : '',
      itemLabel: String(b.itemLabel ?? b.itemId ?? ''),
      // Dados antigos não distinguiam ação de impulso: ficam explicitamente sem
      // classificação, em vez de serem contados como ação realizada.
      mode: pickEnum<BehaviorMode>(b.mode, BehaviorMode) ?? BehaviorMode.DESCONHECIDO,
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
    depth: pickEnum<RecordLevel>(raw.depth, RECORD_LEVELS),
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

export function saveEntries(entries: PulseEntry[]): boolean {
  try {
    localStorage.setItem(KEYS.ENTRIES, JSON.stringify(entries));
    return true;
  } catch {
    // O chamador decide como avisar; nunca apagar o rascunho por uma falha daqui.
    return false;
  }
}

/**
 * Migração silenciosa do catálogo para o schema v2.
 *
 * - Formato v1 (array puro) é convertido e regravado no envelope `{schemaVersion: 2}`.
 * - O conteúdo (ids, rótulos, `active`) nunca é alterado; campos desconhecidos ficam
 *   `createdAt: null` / `updatedAt: null` em vez de receberem datas inventadas.
 * - Catálogo vazio/inválido cai no padrão, sem apagar nada que tenha sido lido com sucesso.
 */
export function loadCategories(): BehaviorCategory[] {
  try {
    const raw = localStorage.getItem(KEYS.CATEGORIES);
    if (!raw) return createDefaultCategories();
    const parsed = JSON.parse(raw);
    const store = migrateCategories(parsed);
    // Lista vazia explícita (ex.: backup importado sem categorias) é preservada.
    // Formato irreconhecível continua caindo no catálogo padrão.
    const hasExplicitList =
      Array.isArray(parsed) || (isPlainObject(parsed) && Array.isArray(parsed.categories));
    if (store.categories.length === 0 && !hasExplicitList) return createDefaultCategories();
    if (needsCategoryMigration(parsed)) {
      localStorage.setItem(KEYS.CATEGORIES, JSON.stringify(store));
    }
    return store.categories;
  } catch {
    return createDefaultCategories();
  }
}

export function saveCategories(categories: BehaviorCategory[]): void {
  try {
    localStorage.setItem(
      KEYS.CATEGORIES,
      JSON.stringify({ schemaVersion: 2, categories })
    );
  } catch {
    // Ignorar falha de quota
  }
}

const RECORD_LEVELS: Record<RecordLevel, RecordLevel> = {
  rapido: 'rapido',
  padrao: 'padrao',
  completo: 'completo',
};

/**
 * Normaliza preferências de qualquer origem (localStorage ou backup). Valores com
 * tipo inesperado caem no padrão; listas são filtradas pelos ids conhecidos para não
 * introduzir estados impossíveis na interface.
 */
export function normalizePreferences(raw: unknown): UserPreferences {
  const parsed = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const focusAreaIds = new Set(FOCUS_AREA_OPTIONS.map((option) => option.id));
  const profileHintIds = new Set(PROFILE_HINT_OPTIONS.map((option) => option.id));
  const packageIds = new Set(CATEGORY_PACKAGES.map((pkg) => pkg.id));

  return {
    theme: pickEnum<ThemeMode>(parsed.theme, ThemeMode) ?? DEFAULT_PREFERENCES.theme,
    reduceMotion:
      typeof parsed.reduceMotion === 'boolean'
        ? parsed.reduceMotion
        : DEFAULT_PREFERENCES.reduceMotion,
    focusModeDefault:
      typeof parsed.focusModeDefault === 'boolean'
        ? parsed.focusModeDefault
        : DEFAULT_PREFERENCES.focusModeDefault,
    showSexualCategory:
      typeof parsed.showSexualCategory === 'boolean'
        ? parsed.showSexualCategory
        : DEFAULT_PREFERENCES.showSexualCategory,
    trackCycle:
      typeof parsed.trackCycle === 'boolean'
        ? parsed.trackCycle
        : DEFAULT_PREFERENCES.trackCycle,
    defaultRecordLevel:
      pickEnum<RecordLevel>(parsed.defaultRecordLevel, RECORD_LEVELS) ??
      DEFAULT_PREFERENCES.defaultRecordLevel,
    reportLabel:
      typeof parsed.reportLabel === 'string'
        ? parsed.reportLabel
        : DEFAULT_PREFERENCES.reportLabel,
    focusAreas: Array.isArray(parsed.focusAreas)
      ? parsed.focusAreas.filter(
          (area): area is UserPreferences['focusAreas'][number] =>
            typeof area === 'string' && focusAreaIds.has(area as never)
        )
      : [],
    profileHint:
      typeof parsed.profileHint === 'string' && profileHintIds.has(parsed.profileHint as never)
        ? (parsed.profileHint as UserPreferences['profileHint'])
        : null,
    packageIds: Array.isArray(parsed.packageIds)
      ? parsed.packageIds.filter(
          (id): id is UserPreferences['packageIds'][number] =>
            typeof id === 'string' && packageIds.has(id as never)
        )
      : [],
    // Sem notificações implementadas, nenhuma preferência antiga pode ficar "ativa".
    reminderOptIn: false,
    reminderTime:
      typeof parsed.reminderTime === 'string' && /^\d{2}:\d{2}$/.test(parsed.reminderTime)
        ? parsed.reminderTime
        : DEFAULT_PREFERENCES.reminderTime,
  };
}

export function loadPreferences(): UserPreferences {
  try {
    const raw = localStorage.getItem(KEYS.PREFERENCES);
    if (!raw) return DEFAULT_PREFERENCES;
    return normalizePreferences(JSON.parse(raw));
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

const DEFAULT_ONBOARDING: OnboardingProgress = {
  version: 2,
  status: 'not_started',
  step: 0,
  skippedSteps: [],
  completedAt: null,
  lastSeenAt: null,
};

const clampStep = (value: unknown, max: number) =>
  Math.min(max, Math.max(0, Number(value) || 0));

/**
 * O onboarding antigo tinha 4 telas (foco, perfil, pacotes, conforto). O perfil foi
 * removido por não alterar o app; a etapa e as puladas antigas são remapeadas para
 * as 3 telas atuais sem reabrir perguntas já respondidas.
 */
function migrateOnboardingStep(step: number): number {
  if (step <= 0) return 0;
  if (step <= 2) return 1;
  return 2;
}

function migrateSkippedSteps(value: unknown): number[] {
  if (!Array.isArray(value)) return [];
  return Array.from(
    new Set(
      value
        .filter((n): n is number => typeof n === 'number' && n >= 0 && n <= 3)
        .map((n) => migrateOnboardingStep(n))
    )
  ).sort();
}

/**
 * Progresso do onboarding fica em chave própria: concluir o onboarding não pode ser
 * confundido com "já viu tudo", e um backup de preferências não reabre as telas.
 */
export function loadOnboardingProgress(): OnboardingProgress {
  try {
    const raw = localStorage.getItem(KEYS.ONBOARDING);
    if (!raw) return DEFAULT_ONBOARDING;
    const parsed = JSON.parse(raw);
    const status = parsed?.status;
    if (status !== 'in_progress' && status !== 'completed') return DEFAULT_ONBOARDING;

    const legacy = parsed?.version !== 2;
    const rawStep = clampStep(parsed?.step, legacy ? 3 : 2);
    return {
      version: 2,
      status,
      step: legacy ? migrateOnboardingStep(rawStep) : rawStep,
      skippedSteps: legacy
        ? migrateSkippedSteps(parsed?.skippedSteps)
        : Array.isArray(parsed?.skippedSteps)
          ? parsed.skippedSteps.filter(
              (n: unknown): n is number => typeof n === 'number' && n >= 0 && n <= 2
            )
          : [],
      completedAt: typeof parsed?.completedAt === 'string' ? parsed.completedAt : null,
      lastSeenAt: typeof parsed?.lastSeenAt === 'string' ? parsed.lastSeenAt : null,
    };
  } catch {
    return DEFAULT_ONBOARDING;
  }
}

export function saveOnboardingProgress(progress: OnboardingProgress): void {
  try {
    localStorage.setItem(KEYS.ONBOARDING, JSON.stringify({ ...progress, version: 2 }));
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
export function saveFormDraft(payload: Record<string, unknown>): FormDraft {
  const draft: FormDraft = { savedAt: new Date().toISOString(), payload };
  try {
    localStorage.setItem(KEYS.DRAFT, JSON.stringify(draft));
  } catch {
    // Ignorar falha de quota
  }
  return draft;
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

/**
 * Experimentos ficam em chave própria e 100% locais. Nenhum cálculo de veredito
 * é persistido: só a hipótese, a janela e a conclusão que o usuário escolheu.
 */
export function loadExperiments(): Experiment[] {
  try {
    const raw = localStorage.getItem(KEYS.EXPERIMENTS);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((item) => normalizeExperiment(item))
      .filter((item): item is Experiment => item !== null);
  } catch {
    return [];
  }
}

export function saveExperiments(experiments: Experiment[]): void {
  try {
    localStorage.setItem(KEYS.EXPERIMENTS, JSON.stringify(experiments));
  } catch {
    // Ignorar falha de quota
  }
}

export interface BackupPayload {
  app: 'PulseTrack';
  /** 2 = sprints 1–3; 3 = schema v2 de categorias + experimentos. */
  version: 2 | 3;
  exportedAt: string;
  entries: PulseEntry[];
  categories: BehaviorCategory[];
  preferences: UserPreferences;
  /** Ausente em backups antigos — importado como lista vazia, nunca como erro. */
  experiments: Experiment[];
}

/** Motivos de recusa de um arquivo; a interface escolhe a mensagem, sem detalhes técnicos. */
export type BackupValidationError =
  | 'invalid_json'
  | 'not_pulsetrack'
  | 'unsupported_version'
  | 'missing_data'
  | 'invalid_data';

export interface BackupValidationResult {
  backup: BackupPayload | null;
  error: BackupValidationError | null;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function isValidEntryShape(value: unknown): value is Record<string, unknown> {
  return (
    isPlainObject(value) &&
    typeof value.id === 'string' &&
    value.id.trim().length > 0 &&
    typeof value.date === 'string' &&
    /^\d{4}-\d{2}-\d{2}$/.test(value.date)
  );
}

function isValidCategoryShape(value: unknown): boolean {
  if (!isPlainObject(value)) return false;
  if (typeof value.id !== 'string' || !value.id.trim()) return false;
  if (typeof value.name !== 'string') return false;
  if (value.items === undefined) return true;
  if (!Array.isArray(value.items)) return false;
  return value.items.every(
    (item) =>
      isPlainObject(item) &&
      (item.isFreeText === true || (typeof item.label === 'string' && item.label.trim().length > 0))
  );
}

export function buildBackupJson(
  entries: PulseEntry[],
  categories: BehaviorCategory[],
  preferences: UserPreferences,
  experiments: Experiment[] = []
): string {
  const payload: BackupPayload = {
    app: 'PulseTrack',
    version: 3,
    exportedAt: new Date().toISOString(),
    entries,
    categories,
    preferences,
    experiments,
  };
  return JSON.stringify(payload, null, 2);
}

/**
 * Lê e valida o arquivo sem tocar no estado do app. O retorno tipado permite que a
 * interface explique o motivo da recusa antes de qualquer substituição.
 */
export function validateBackupJson(rawText: string): BackupValidationResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawText);
  } catch {
    return { backup: null, error: 'invalid_json' };
  }

  if (!isPlainObject(parsed) || parsed.app !== 'PulseTrack') {
    return { backup: null, error: 'not_pulsetrack' };
  }

  const rawVersion = parsed.version;
  // Backups v2 são suportados; versões futuras não são adivinhadas.
  if (rawVersion !== undefined && rawVersion !== 2 && rawVersion !== 3) {
    return { backup: null, error: 'unsupported_version' };
  }
  const version: 2 | 3 = rawVersion === 3 ? 3 : 2;

  if (!Array.isArray(parsed.entries) || !Array.isArray(parsed.categories)) {
    return { backup: null, error: 'missing_data' };
  }
  if (parsed.preferences !== undefined && !isPlainObject(parsed.preferences)) {
    return { backup: null, error: 'invalid_data' };
  }
  if (!parsed.entries.every(isValidEntryShape)) {
    return { backup: null, error: 'invalid_data' };
  }
  if (!parsed.categories.every(isValidCategoryShape)) {
    return { backup: null, error: 'invalid_data' };
  }

  const rawExperiments = parsed.experiments;
  if (rawExperiments !== undefined && !Array.isArray(rawExperiments)) {
    return { backup: null, error: 'invalid_data' };
  }
  const rawExperimentList = rawExperiments ?? [];
  const experiments = rawExperimentList
    .map((item) => normalizeExperiment(item))
    .filter((item): item is Experiment => item !== null);
  if (experiments.length !== rawExperimentList.length) {
    return { backup: null, error: 'invalid_data' };
  }

  const migrated = migrateCategories(parsed.categories).categories;
  if (migrated.length !== parsed.categories.length) {
    return { backup: null, error: 'invalid_data' };
  }

  return {
    backup: {
      app: 'PulseTrack',
      version,
      exportedAt: typeof parsed.exportedAt === 'string' ? parsed.exportedAt : '',
      entries: parsed.entries.map((entry) => normalizeEntry(entry as Partial<PulseEntry>)),
      categories: migrated,
      preferences: normalizePreferences(parsed.preferences),
      experiments,
    },
    error: null,
  };
}

export function parseBackupJson(rawText: string): BackupPayload | null {
  return validateBackupJson(rawText).backup;
}

/**
 * Grava o backup inteiro ou nada. O localStorage não tem transação: guardamos os
 * valores anteriores e restauramos se qualquer uma das quatro escritas falhar.
 */
export function applyBackup(payload: BackupPayload): boolean {
  const writes: Array<[string, string]> = [
    [KEYS.ENTRIES, JSON.stringify(payload.entries)],
    [KEYS.CATEGORIES, JSON.stringify({ schemaVersion: 2, categories: payload.categories })],
    [KEYS.PREFERENCES, JSON.stringify(payload.preferences)],
    [KEYS.EXPERIMENTS, JSON.stringify(payload.experiments)],
  ];

  const previous: Array<[string, string | null]> = [];
  try {
    for (const [key] of writes) previous.push([key, localStorage.getItem(key)]);
    for (const [key, value] of writes) localStorage.setItem(key, value);
    return true;
  } catch {
    for (const [key, value] of previous) {
      try {
        if (value === null) localStorage.removeItem(key);
        else localStorage.setItem(key, value);
      } catch {
        // Sem armazenamento disponível não há mais o que restaurar; o chamador avisa.
      }
    }
    return false;
  }
}
