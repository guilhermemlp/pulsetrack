/**
 * Tipos e estruturas centrais do PulseTrack.
 * Arquitetura conceitual em 3 pilares:
 * 1. Estado emocional (como se sentia)
 * 2. Estado de ativação (energia, sono, duração e sinais mentais/motores)
 * 3. Comportamento (o que efetivamente fez, opcional em check-ins diários)
 */

export enum ThemeMode {
  LIGHT = 'light',
  DARK = 'dark',
  HIGH_CONTRAST = 'high-contrast',
}

export enum EntryType {
  DAILY_CHECKIN = 'daily_checkin',
  EPISODE = 'episode',
}

export enum MoodStateId {
  TRISTE_VAZIO = 'triste_vazio',
  ANSIOSO = 'ansioso',
  IRRITADO = 'irritado',
  EUFORICO_AGITADO = 'euforico_agitado',
  TEDIO = 'tedio',
  NEUTRO = 'neutro',
  APATIA_EXAUSTAO = 'apatia_exaustao',
  OUTRO = 'outro',
}

export enum SleepQuality {
  MUITO_RUIM = 'muito_ruim',
  RUIM = 'ruim',
  REGULAR = 'regular',
  BOA = 'boa',
  REPARADORA = 'reparadora',
}

export enum ReducedSleepNeed {
  NAO = 'nao',
  LEVE = 'leve',
  MARCANTE = 'marcante',
}

export enum StateDuration {
  ESTAVEL = 'estavel',
  HORAS = 'horas',
  DIAS_CURTO = 'dias_curto',
  DIAS_MEDIO = 'dias_medio',
  SEMANAS = 'semanas',
}

export enum ActivationSignal {
  PENSAMENTOS_ACELERADOS = 'pensamentos_acelerados',
  FALA_INTENSA = 'fala_intensa',
  AUMENTO_ATIVIDADES = 'aumento_atividades',
  IRRITABILIDADE = 'irritabilidade',
  SOCIABILIDADE_AUMENTADA = 'sociabilidade_aumentada',
}

export enum FunctionalImpactLevel {
  NENHUM = 'nenhum',
  LEVE = 'leve',
  MODERADO = 'moderado',
  INTENSO = 'intenso',
}

export enum AwarenessType {
  CONSCIENTE = 'consciente',
  AUTOMATICO = 'automatico',
  MISTURA = 'mistura',
}

export enum ResistanceResult {
  SIM = 'sim',
  NAO = 'nao',
  PARCIALMENTE = 'parcialmente',
}

export type AppTab = 'registrar' | 'painel' | 'insights' | 'historico' | 'categorias' | 'relatorios';

export type PeriodFilter = '7' | '14' | '30' | '90' | 'all';

export interface MoodDefinition {
  id: MoodStateId;
  label: string;
  description: string;
  colorLight: string;
  colorDark: string;
  colorHighContrast: string;
  polarity: 'alta' | 'baixa' | 'neutra' | 'mista';
}

export interface BehaviorSubItem {
  id: string;
  label: string;
  active: boolean;
  isFreeText?: boolean;
}

export interface BehaviorCategory {
  id: string;
  name: string;
  color: string;
  active: boolean;
  items: BehaviorSubItem[];
}

export interface SelectedBehavior {
  categoryId: string;
  categoryName: string;
  itemId: string;
  itemLabel: string;
}

export interface SleepRecord {
  hours: number;
  quality: SleepQuality;
  reducedNeed: ReducedSleepNeed;
}

export interface FunctionalImpact {
  work: FunctionalImpactLevel;
  relationships: FunctionalImpactLevel;
  routine: FunctionalImpactLevel;
  note: string;
}

export interface PulseEntry {
  id: string;
  /** Distingue check-in diário independente de episódio comportamental */
  entryType: EntryType;
  /** Formato YYYY-MM-DD */
  date: string;
  /** Formato HH:mm */
  time: string;
  /** Timestamp ISO para ordenação */
  createdAt: string;

  // PILAR 1: Estado Emocional
  moods: MoodStateId[];
  moodOtherText: string;
  hadMoodSwing: boolean;
  moodSwingDescription: string;

  // PILAR 2: Estado de Ativação e Sono
  energyLevel: number;
  sleep: SleepRecord;
  stateDuration: StateDuration;
  activationSignals: ActivationSignal[];

  // PILAR 3: Comportamento (vazio ou opcional em check-in sem compulsão)
  triggerContext: string;
  behaviors: SelectedBehavior[];
  behaviorOtherText: string;
  awareness: AwarenessType;
  resisted: ResistanceResult;
  urgeIntensity: number;
  feelingDuring: string;
  feelingAfter: string;

  // Impacto funcional e contexto do dia
  functionalImpact: FunctionalImpact;
  notes: string;
  dayEvents: string[];
  dayEventsNote: string;
}

export interface UserPreferences {
  theme: ThemeMode;
  reduceMotion: boolean;
  focusModeDefault: boolean;
  reportLabel: string;
}

export interface CategoryStat {
  categoryId: string;
  categoryName: string;
  color: string;
  count: number;
  percentage: number;
  avgUrge: number;
  topItems: Array<{ label: string; count: number }>;
}

export interface MoodBehaviorStat {
  moodId: MoodStateId;
  label: string;
  count: number;
  avgEnergy: number;
  avgUrge: number;
  colorLight: string;
  colorDark: string;
  colorHighContrast: string;
}

export interface DailyPoint {
  date: string;
  shortLabel: string;
  totalEntries: number;
  episodeCount: number;
  hasCheckinOnly: boolean;
  avgEnergy: number | null;
  avgSleepHours: number | null;
  hasReducedSleepNeed: boolean;
  avgUrge: number | null;
  hasMoodSwing: boolean;
  primaryMoodLabel: string | null;
  primaryMoodColorLight: string | null;
  primaryMoodColorDark: string | null;
  primaryMoodColorHC: string | null;
  activationCount: number;
}

export interface CyclePhaseMetrics {
  sampleDays: number;
  avgEnergy: number | null;
  avgSleepHours: number | null;
  reducedSleepNeedRate: number;
  moodSwingRate: number;
  topActivationSignal: string | null;
  dominantMood: string | null;
}

export interface CycleAnalysis {
  analyzedEpisodes: number;
  before: CyclePhaseMetrics;
  during: CyclePhaseMetrics;
  after: CyclePhaseMetrics;
  findings: string[];
}

export interface InsightItem {
  id: string;
  title: string;
  category: 'bipolaridade' | 'compulsao' | 'gatilho' | 'evolucao' | 'ciclo';
  summary: string;
  detail: string;
  metricLabel: string;
}

export interface AnalyticsSummary {
  totalEntries: number;
  totalEpisodes: number;
  totalCheckinsOnly: number;
  periodDays: number;
  daysLogged: number;
  daysWithEpisodes: number;
  daysWithoutEpisodes: number;
  avgUrgeIntensity: number;
  avgEnergy: number;
  avgSleepHours: number;
  reducedSleepNeedCount: number;
  reducedSleepNeedRate: number;
  poorSleepCount: number;
  durationDistribution: Array<{ id: StateDuration; label: string; count: number; percentage: number }>;
  activationSignalStats: Array<{ id: ActivationSignal; label: string; count: number; percentage: number }>;
  functionalImpactSummary: {
    workModerateOrHigh: number;
    relationshipsModerateOrHigh: number;
    routineModerateOrHigh: number;
    anySignificantImpactRate: number;
  };
  awarenessBreakdown: {
    consciente: number;
    automatico: number;
    mistura: number;
  };
  resistanceBreakdown: {
    sim: number;
    parcialmente: number;
    nao: number;
  };
  categoryStats: CategoryStat[];
  moodStats: MoodBehaviorStat[];
  dailyTimeline: DailyPoint[];
  cycleAnalysis: CycleAnalysis;
  bipolarIndicators: {
    highEnergyEpisodes: number;
    highEnergyPercent: number;
    highEnergyAvgUrge: number;
    highEnergyTopBehaviors: string[];
    lowEnergyReliefEpisodes: number;
    lowEnergyPercent: number;
    lowEnergyAutomaticRate: number;
    lowEnergyTopBehaviors: string[];
    moodSwingEntries: number;
    moodSwingPercent: number;
    moodSwingAvgUrge: number;
    moodSwingNoResistRate: number;
    obsessiveThoughtsCount: number;
    expectationDropPatternCount: number;
  };
  evolution: {
    status: 'melhora' | 'piora' | 'estabilidade' | 'insuficiente';
    label: string;
    description: string;
    previousHalfCount: number;
    currentHalfCount: number;
    previousHalfUrge: number;
    currentHalfUrge: number;
  };
  topTriggers: Array<{ label: string; count: number }>;
  topDayEvents: Array<{ label: string; count: number }>;
  insights: InsightItem[];
}
