import { toLocalIsoDate } from './analytics';
import { FormDraft, normalizeBehaviors, normalizeStateDuration } from './storage';
import {
  ActivationSignal,
  AwarenessType,
  CyclePhase,
  EntryType,
  FunctionalImpactLevel,
  MedicationStatus,
  MoodStateId,
  MoodSwingDirection,
  MoodSwingWindow,
  RecordLevel,
  ReducedSleepNeed,
  ResistanceResult,
  SafetyConcern,
  SelectedBehavior,
  SleepQuality,
  StateDuration,
} from '../types/pulsetrack';

/** Versão do payload persistido. A v1 (anterior) não tinha metadados do formulário. */
export const DRAFT_VERSION = 2;

export type QuickImpulseAnswer = 'sim' | 'nao' | null;

/**
 * Formato único do rascunho: é ao mesmo tempo o que se grava e o que se restaura.
 * Como o tipo é obrigatório, esquecer um campo novo quebra o typecheck em vez de
 * produzir uma lista de gravação divergente da lista de restauração.
 */
export interface DailyLogDraft {
  version: number;
  entryType: EntryType;
  level: RecordLevel;
  quickImpulseAnswer: QuickImpulseAnswer;
  date: string;
  time: string;
  moods: MoodStateId[];
  moodIntensity: Record<string, number>;
  moodOtherText: string;
  valence: number | null;
  hadMoodSwing: boolean;
  moodSwingDirection: MoodSwingDirection | null;
  moodSwingWindow: MoodSwingWindow | null;
  moodSwingDescription: string;
  energyLevel: number | null;
  sleepHours: number | null;
  sleepQuality: SleepQuality | null;
  reducedSleepNeed: ReducedSleepNeed | null;
  noFatigueAfterShortSleep: boolean | null;
  bedTime: string;
  wakeTime: string;
  latencyMinutes: number | null;
  awakenings: number | null;
  stateDuration: StateDuration | null;
  activationSignals: ActivationSignal[];
  triggerContext: string;
  behaviors: SelectedBehavior[];
  behaviorOtherText: string;
  awareness: AwarenessType | null;
  resisted: ResistanceResult | null;
  urgeIntensity: number | null;
  feelingDuring: string;
  feelingAfter: string;
  impactWork: FunctionalImpactLevel | null;
  impactRelationships: FunctionalImpactLevel | null;
  impactRoutine: FunctionalImpactLevel | null;
  impactNote: string;
  medicationStatus: MedicationStatus | null;
  medicationEffects: string;
  cyclePhase: CyclePhase | null;
  notes: string;
  dayEvents: string[];
  dayEventsNote: string;
  safetyConcern: SafetyConcern | null;
}

interface DraftFallbacks {
  date: string;
  time: string;
  level: RecordLevel;
  entryType?: EntryType;
}

const LEVELS: Record<RecordLevel, RecordLevel> = {
  rapido: 'rapido',
  padrao: 'padrao',
  completo: 'completo',
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function readString(raw: Record<string, unknown>, key: string, fallback = ''): string {
  const value = raw[key];
  return typeof value === 'string' ? value : fallback;
}

function readNullableNumber(raw: Record<string, unknown>, key: string): number | null {
  const value = raw[key];
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function readBool(raw: Record<string, unknown>, key: string, fallback: boolean): boolean {
  const value = raw[key];
  return typeof value === 'boolean' ? value : fallback;
}

function readNullableBool(raw: Record<string, unknown>, key: string): boolean | null {
  const value = raw[key];
  return typeof value === 'boolean' ? value : null;
}

function pickEnum<T extends string>(value: unknown, allowed: Record<string, string>): T | null {
  if (typeof value !== 'string') return null;
  return Object.values(allowed).includes(value) ? (value as T) : null;
}

function readEnumArray<T extends string>(
  value: unknown,
  allowed: Record<string, string>
): T[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (item): item is T => typeof item === 'string' && Object.values(allowed).includes(item)
  );
}

function readNumberRecord(value: unknown): Record<string, number> {
  if (!isRecord(value)) return {};
  const result: Record<string, number> = {};
  for (const [key, item] of Object.entries(value)) {
    if (typeof item === 'number' && Number.isFinite(item)) result[key] = item;
  }
  return result;
}

/**
 * Normaliza o payload persistido (inclusive rascunhos v1, sem metadados) sem
 * descartar respostas. Valores desconhecidos viram ausência (`null`/vazio), nunca
 * um palpite. Objetos e arrays são lidos pelo tipo esperado — não caem no fallback.
 */
export function parseFormDraft(
  payload: Record<string, unknown> | undefined,
  fallbacks: DraftFallbacks
): DailyLogDraft {
  const raw = isRecord(payload) ? payload : {};
  const behaviors = normalizeBehaviors(raw.behaviors);
  const urgeIntensity = readNullableNumber(raw, 'urgeIntensity');

  // Rascunhos v1 não guardavam metadados. Recupera apenas o que pode ser deduzido
  // do próprio conteúdo; o resto fica no padrão, sem inventar episódio ou nível.
  const legacyQuickImpulse =
    behaviors.length > 0 || urgeIntensity !== null ? 'sim' : null;
  const quickImpulseAnswer =
    raw.quickImpulseAnswer === 'sim' || raw.quickImpulseAnswer === 'nao'
      ? raw.quickImpulseAnswer
      : legacyQuickImpulse;

  return {
    version: typeof raw.version === 'number' ? raw.version : 1,
    entryType:
      pickEnum<EntryType>(raw.entryType, EntryType) ??
      fallbacks.entryType ??
      EntryType.DAILY_CHECKIN,
    level: pickEnum<RecordLevel>(raw.level, LEVELS) ?? fallbacks.level,
    quickImpulseAnswer,
    date: readString(raw, 'date', fallbacks.date),
    time: readString(raw, 'time', fallbacks.time),
    moods: readEnumArray<MoodStateId>(raw.moods, MoodStateId),
    moodIntensity: readNumberRecord(raw.moodIntensity),
    moodOtherText: readString(raw, 'moodOtherText'),
    valence: readNullableNumber(raw, 'valence'),
    hadMoodSwing: readBool(raw, 'hadMoodSwing', false),
    moodSwingDirection: pickEnum<MoodSwingDirection>(
      raw.moodSwingDirection,
      MoodSwingDirection
    ),
    moodSwingWindow: pickEnum<MoodSwingWindow>(raw.moodSwingWindow, MoodSwingWindow),
    moodSwingDescription: readString(raw, 'moodSwingDescription'),
    energyLevel: readNullableNumber(raw, 'energyLevel'),
    sleepHours: readNullableNumber(raw, 'sleepHours'),
    sleepQuality: pickEnum<SleepQuality>(raw.sleepQuality, SleepQuality),
    reducedSleepNeed: pickEnum<ReducedSleepNeed>(raw.reducedSleepNeed, ReducedSleepNeed),
    noFatigueAfterShortSleep: readNullableBool(raw, 'noFatigueAfterShortSleep'),
    bedTime: readString(raw, 'bedTime'),
    wakeTime: readString(raw, 'wakeTime'),
    latencyMinutes: readNullableNumber(raw, 'latencyMinutes'),
    awakenings: readNullableNumber(raw, 'awakenings'),
    stateDuration: normalizeStateDuration(raw.stateDuration),
    activationSignals: readEnumArray<ActivationSignal>(
      raw.activationSignals,
      ActivationSignal
    ),
    triggerContext: readString(raw, 'triggerContext'),
    behaviors,
    behaviorOtherText: readString(raw, 'behaviorOtherText'),
    awareness: pickEnum<AwarenessType>(raw.awareness, AwarenessType),
    resisted: pickEnum<ResistanceResult>(raw.resisted, ResistanceResult),
    urgeIntensity,
    feelingDuring: readString(raw, 'feelingDuring'),
    feelingAfter: readString(raw, 'feelingAfter'),
    impactWork: pickEnum<FunctionalImpactLevel>(raw.impactWork, FunctionalImpactLevel),
    impactRelationships: pickEnum<FunctionalImpactLevel>(
      raw.impactRelationships,
      FunctionalImpactLevel
    ),
    impactRoutine: pickEnum<FunctionalImpactLevel>(
      raw.impactRoutine,
      FunctionalImpactLevel
    ),
    impactNote: readString(raw, 'impactNote'),
    medicationStatus: pickEnum<MedicationStatus>(raw.medicationStatus, MedicationStatus),
    medicationEffects: readString(raw, 'medicationEffects'),
    cyclePhase: pickEnum<CyclePhase>(raw.cyclePhase, CyclePhase),
    notes: readString(raw, 'notes'),
    dayEvents: Array.isArray(raw.dayEvents)
      ? raw.dayEvents.filter((item): item is string => typeof item === 'string')
      : [],
    dayEventsNote: readString(raw, 'dayEventsNote'),
    safetyConcern: pickEnum<SafetyConcern>(raw.safetyConcern, SafetyConcern),
  };
}

function hasText(value: string): boolean {
  return value.trim().length > 0;
}

/**
 * Um rascunho existe quando há qualquer resposta relevante — inclusive um único
 * objeto (intensidade de humor), um sinal de ativação, um horário de sono ou o
 * tipo de registro escolhido. Valores padrão (data/hora atuais, nível inicial,
 * `hadMoodSwing: false`, listas vazias) não contam como resposta.
 */
export function draftHasContent(draft: DailyLogDraft): boolean {
  return (
    draft.entryType !== EntryType.DAILY_CHECKIN ||
    draft.quickImpulseAnswer !== null ||
    draft.moods.length > 0 ||
    Object.keys(draft.moodIntensity).length > 0 ||
    hasText(draft.moodOtherText) ||
    draft.valence !== null ||
    draft.hadMoodSwing ||
    draft.moodSwingDirection !== null ||
    draft.moodSwingWindow !== null ||
    hasText(draft.moodSwingDescription) ||
    draft.energyLevel !== null ||
    draft.sleepHours !== null ||
    draft.sleepQuality !== null ||
    draft.reducedSleepNeed !== null ||
    draft.noFatigueAfterShortSleep !== null ||
    hasText(draft.bedTime) ||
    hasText(draft.wakeTime) ||
    draft.latencyMinutes !== null ||
    draft.awakenings !== null ||
    draft.stateDuration !== null ||
    draft.activationSignals.length > 0 ||
    hasText(draft.triggerContext) ||
    draft.behaviors.length > 0 ||
    hasText(draft.behaviorOtherText) ||
    draft.awareness !== null ||
    draft.resisted !== null ||
    draft.urgeIntensity !== null ||
    hasText(draft.feelingDuring) ||
    hasText(draft.feelingAfter) ||
    draft.impactWork !== null ||
    draft.impactRelationships !== null ||
    draft.impactRoutine !== null ||
    hasText(draft.impactNote) ||
    draft.medicationStatus !== null ||
    hasText(draft.medicationEffects) ||
    draft.cyclePhase !== null ||
    hasText(draft.notes) ||
    draft.dayEvents.length > 0 ||
    hasText(draft.dayEventsNote) ||
    draft.safetyConcern !== null
  );
}

/** HH:mm local a partir do ISO do rascunho. */
export function formatDraftTime(isoTimestamp: string): string {
  const date = new Date(isoTimestamp);
  if (Number.isNaN(date.getTime())) return '--:--';
  const hh = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}

/** dd/mm local a partir do ISO do rascunho. */
export function formatDraftDate(isoTimestamp: string): string {
  const date = new Date(isoTimestamp);
  if (Number.isNaN(date.getTime())) return '--/--';
  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  return `${dd}/${mm}`;
}

/** O rascunho foi salvo em um dia anterior ao de hoje (fuso local). */
export function isDraftFromPreviousDay(
  draft: FormDraft | null,
  today: Date = new Date()
): boolean {
  if (!draft) return false;
  const savedAt = new Date(draft.savedAt);
  if (Number.isNaN(savedAt.getTime())) return false;
  return toLocalIsoDate(savedAt) < toLocalIsoDate(today);
}
