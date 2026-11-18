/**
 * Tipos e estruturas centrais do PulseTrack.
 * Arquitetura conceitual em 3 pilares:
 * 1. Estado emocional (valência do afeto + estados descritivos)
 * 2. Estado de ativação (energia, sono, duração e sinais mentais/motores)
 * 3. Comportamento (o que efetivamente fez ou apenas sentiu impulso de fazer)
 *
 * Regra de integridade: todo campo que o usuário pode não responder é `null`,
 * nunca um valor assumido. O relatório exibe "não informado" em vez de inventar dado.
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
  /** Antes rotulado "Eufórico / Agitado"; separado em euforia, agitação e hiperfoco. */
  EUFORICO_AGITADO = 'euforico_agitado',
  TEDIO = 'tedio',
  NEUTRO = 'neutro',
  APATIA_EXAUSTAO = 'apatia_exaustao',
  HIPERFOCO = 'hiperfoco',
  AGITACAO = 'agitacao',
  SOBRECARGA_SENSORIAL = 'sobrecarga_sensorial',
  MELTDOWN_SHUTDOWN = 'meltdown_shutdown',
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
  DIAS_1_3 = 'dias_1_3',
  DIAS_4_6 = 'dias_4_6',
  DIAS_7_13 = 'dias_7_13',
  DIAS_14_MAIS = 'dias_14_mais',
}

export enum ActivationSignal {
  // Sinais clássicos de ativação (relevantes para investigação de mania/hipomania)
  PENSAMENTOS_ACELERADOS = 'pensamentos_acelerados',
  FALA_INTENSA = 'fala_intensa',
  AUMENTO_ATIVIDADES = 'aumento_atividades',
  IRRITABILIDADE = 'irritabilidade',
  SOCIABILIDADE_AUMENTADA = 'sociabilidade_aumentada',
  // Experiências neurodivergentes (TDAH / autismo) que não são sintomas de mania
  SOBRECARGA_SENSORIAL = 'sobrecarga_sensorial',
  DISFUNCAO_EXECUTIVA = 'disfuncao_executiva',
  MASCARAMENTO = 'mascaramento',
  EVITACAO_DEMANDA = 'evitacao_demanda',
  CEGUEIRA_TEMPORAL = 'cegueira_temporal',
  STIMMING = 'stimming',
  HIPERFOCO = 'hiperfoco',
  MELTDOWN_SHUTDOWN = 'meltdown_shutdown',
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

/** Distingue o que foi feito do que ficou apenas no impulso (dado central em controle de impulsos). */
export enum BehaviorMode {
  FEITO = 'feito',
  IMPULSO = 'impulso',
  /** Dado antigo/importado sem modo explícito: não é convertido em ação nem em impulso. */
  DESCONHECIDO = 'desconhecido',
}

export enum MoodSwingDirection {
  SUBIU = 'subiu',
  DESCEU = 'desceu',
  AMBOS = 'ambos',
}

export enum MoodSwingWindow {
  MINUTOS = 'minutos',
  HORAS = 'horas',
  DIAS = 'dias',
}

export enum SafetyConcern {
  NENHUM = 'nenhum',
  PENSAMENTOS_MORTE = 'pensamentos_morte',
  AUTOLESAO = 'autolesao',
  NAO_RESPONDER = 'nao_responder',
}

export enum MedicationStatus {
  USO_REGULAR = 'uso_regular',
  ESQUECI = 'esqueci',
  PARCIAL = 'parcial',
  NAO_USO = 'nao_uso',
}

export enum CyclePhase {
  MENSTRUAL = 'menstrual',
  FOLICULAR = 'folicular',
  OVULATORIA = 'ovulatoria',
  LUTEA = 'lutea',
  NAO_SE_APLICA = 'nao_se_aplica',
}

/**
 * Profundidade escolhida para o registro. É uma decisão de UX (não clínica):
 * descreve quantos eixos a pessoa quis revisar agora, para que a adesão diária não
 * dependa de preencher tudo. Nunca altera o valor das métricas.
 */
export type RecordLevel = 'rapido' | 'padrao' | 'completo';

export type AppTab = 'registrar' | 'visao' | 'diario' | 'analises' | 'ajustes';

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
  /** Origem do item: omitido em itens antigos/personalizados. */
  source?: 'default' | 'package';
  /** Item mantido apenas para o histórico: não aparece no formulário, mas nunca é apagado. */
  archived?: boolean;
  /**
   * ISO de criação. `null` quando o item já existia antes do schema v2 — a data real é
   * desconhecida e não é inventada na migração.
   */
  createdAt: string | null;
  /** Rótulos anteriores do mesmo item (renomear não cria um item novo). */
  aliases?: string[];
}

/** Pacotes oferecidos no onboarding. Reutilizam categorias e itens já existentes. */
export type PackageId =
  | 'pkg_tdah'
  | 'pkg_bipolar'
  | 'pkg_compulsoes'
  | 'pkg_autismo_sensorial'
  | 'pkg_geral';

/** Áreas que a pessoa quer observar (T1). Só orientam a apresentação do app. */
export type FocusArea =
  | 'emocional'
  | 'ativacao'
  | 'sono'
  | 'comportamentos'
  | 'gatilhos'
  | 'medicacao'
  | 'ciclo'
  | 'seguranca';

/* ------------------------------------------------------------------ *
 * Experimentos / hipóteses do usuário (100% locais, sem inferência de
 * veredito: o app mostra números e a pessoa registra a conclusão).
 * ------------------------------------------------------------------ */

export type ExperimentMetric =
  | 'urge'
  | 'energy'
  | 'sleepHours'
  | 'valence'
  | 'episodes'
  | 'behaviorItems';

export type ExperimentStatus = 'active' | 'finished';

/** As três saídas válidas de encerramento — nenhuma delas é "cura" ou "falha". */
export type ExperimentResult = 'difference' | 'no_difference' | 'insufficient_data';

export interface Experiment {
  id: string;
  /** Hipótese em linguagem do próprio usuário, ex.: "ansiedade aumenta à noite". */
  hypothesis: string;
  /** Eixo observado na janela. */
  metric: ExperimentMetric;
  /** YYYY-MM-DD — início (inclusive). */
  startDate: string;
  /** YYYY-MM-DD — fim (inclusive). */
  endDate: string;
  /** Marcador livre para agrupar observações (não filtra registros). */
  tag?: string;
  status: ExperimentStatus;
  /** ISO; `null` em registros importados sem a data (nunca inventada). */
  createdAt: string | null;
  updatedAt: string | null;
  /** Conclusão registrada pelo usuário; `null` enquanto a janela está aberta. */
  result: ExperimentResult | null;
  /** Observação livre do usuário no encerramento. */
  resultNote: string;
  closedAt: string | null;
  /** Insight que originou a observação, quando houver. */
  sourceInsightId?: string;
}

/**
 * Rascunho interno de perfil (T2). Nunca é exibido em relatório, exportação ou
 * analytics: serve apenas para o app não repetir perguntas e ajustar a linguagem.
 */
export type ProfileHint =
  | 'neurodivergente'
  | 'humor_oscilante'
  | 'compulsoes'
  | 'ansiedade'
  | 'em_investigacao'
  | 'prefiro_nao_dizer';

export interface OnboardingProgress {
  /** 2 = onboarding atual, com 3 telas; ausente = formato antigo de 4 telas. */
  version?: 2;
  status: 'not_started' | 'in_progress' | 'completed';
  /** Tela em que a pessoa parou (0–2). */
  step: number;
  /** Telas puladas explicitamente; não voltam sozinhas. */
  skippedSteps: number[];
  completedAt: string | null;
  lastSeenAt: string | null;
}

export interface BehaviorCategory {
  id: string;
  name: string;
  color: string;
  active: boolean;
  items: BehaviorSubItem[];
  /** Categoria mantida apenas para o histórico (tem episódios registrados). */
  archived?: boolean;
  /** Versão do schema desta categoria. A v1 era implícita; a v2 é explícita. */
  version: 2;
  /** ISO da última alteração estrutural; `null` quando anterior ao schema v2. */
  updatedAt: string | null;
  /** Pacote que ativou esta categoria, quando houver. */
  packageId?: PackageId;
}

export interface SelectedBehavior {
  categoryId: string;
  categoryName: string;
  itemId: string;
  itemLabel: string;
  /**
   * "feito" = ação efetivamente realizada; "impulso" = houve vontade e a pessoa não
   * levou adiante; "desconhecido" = dado legado/importado sem classificação explícita.
   */
  mode: BehaviorMode;
  /**
   * A ocorrência (ou o esforço para conter) gerou prejuízo ou sofrimento relevante?
   * É sempre um relato explícito; nunca inferido do modo ou da existência da ação.
   */
  harm: boolean;
}

export interface SleepRecord {
  hours: number | null;
  quality: SleepQuality | null;
  reducedNeed: ReducedSleepNeed | null;
  /** Horário de deitar (HH:mm) — variabilidade circadiana é marcador clínico. */
  bedTime: string | null;
  /** Horário de levantar (HH:mm). */
  wakeTime: string | null;
  /** Latência para adormecer, em minutos. */
  latencyMinutes: number | null;
  /** Número de despertares noturnos. */
  awakenings: number | null;
  /** Dormiu pouco e, ainda assim, não sentiu sono nem fadiga no dia seguinte. */
  noFatigueAfterShortSleep: boolean | null;
}

export interface FunctionalImpact {
  work: FunctionalImpactLevel | null;
  relationships: FunctionalImpactLevel | null;
  routine: FunctionalImpactLevel | null;
  note: string;
}

export interface MedicationRecord {
  status: MedicationStatus | null;
  effects: string;
}

export interface PulseEntry {
  id: string;
  /** Contexto declarado do formulário; a contagem de episódios usa as ações realizadas. */
  entryType: EntryType;
  /** Profundidade usada neste registro. Registros antigos ficam `null` (nunca inferido). */
  depth: RecordLevel | null;
  /** Formato YYYY-MM-DD */
  date: string;
  /** Formato HH:mm */
  time: string;
  /** Timestamp ISO para ordenação */
  createdAt: string;

  // PILAR 1: Estado Emocional
  moods: MoodStateId[];
  /** Intensidade percebida (0-10) de cada humor marcado, por id do humor. */
  moodIntensity: Record<string, number>;
  moodOtherText: string;
  /** Valência do afeto no momento: 0 = muito desagradável, 10 = muito prazeroso. */
  valence: number | null;
  hadMoodSwing: boolean;
  moodSwingDirection: MoodSwingDirection | null;
  moodSwingWindow: MoodSwingWindow | null;
  moodSwingDescription: string;

  // PILAR 2: Estado de Ativação e Sono
  energyLevel: number | null;
  sleep: SleepRecord;
  stateDuration: StateDuration | null;
  activationSignals: ActivationSignal[];

  // PILAR 3: Comportamento (vazio ou opcional em check-in sem compulsão)
  triggerContext: string;
  behaviors: SelectedBehavior[];
  behaviorOtherText: string;
  awareness: AwarenessType | null;
  resisted: ResistanceResult | null;
  urgeIntensity: number | null;
  feelingDuring: string;
  feelingAfter: string;

  // Impacto funcional e contexto do dia
  functionalImpact: FunctionalImpact;
  medication: MedicationRecord;
  /** Fase do ciclo menstrual, apenas quando o acompanhamento está ativado nas preferências. */
  cyclePhase: CyclePhase | null;
  /** Item de segurança: ideação de morte ou autolesão. */
  safetyConcern: SafetyConcern | null;
  notes: string;
  dayEvents: string[];
  dayEventsNote: string;
}

export interface UserPreferences {
  theme: ThemeMode;
  reduceMotion: boolean;
  focusModeDefault: boolean;
  /** Bloco de comportamentos sexuais oculto por padrão (conteúdo sensível). */
  showSexualCategory: boolean;
  /** Acompanhamento de fase do ciclo menstrual (opcional). */
  trackCycle: boolean;
  /** Profundidade inicial do formulário de registro. */
  defaultRecordLevel: RecordLevel;
  reportLabel: string;
  /** Áreas escolhidas no onboarding (T1). Destacam o foco no formulário. */
  focusAreas: FocusArea[];
  /**
   * Campo legado (T2): a pergunta foi removida do onboarding porque não tinha efeito
   * funcional. O valor antigo é preservado para não apagar dados, mas não é lido pelo app.
   */
  profileHint: ProfileHint | null;
  /** Pacotes já oferecidos/aplicados — evitam oferta repetida (T3). */
  packageIds: PackageId[];
  /**
   * Campos legados de lembrete: não há notificações nesta versão. São preservados para
   * compatibilidade de backup, mas normalizados como inativos e não lidos pela interface.
   */
  reminderOptIn: boolean;
  reminderTime: string;
}

export interface CategoryStat {
  categoryId: string;
  categoryName: string;
  color: string;
  /** Registros com a categoria, somando ação realizada e impulso contido. */
  count: number;
  /** Registros com ao menos uma ação realizada nesta categoria. */
  realizedCount: number;
  /** Registros com ao menos um impulso nesta categoria. */
  impulseCount: number;
  /** Participação nos registros que trouxeram algum comportamento (não nos episódios). */
  percentage: number;
  avgUrge: number | null;
  /** Registros da categoria em que o comportamento gerou prejuízo/sofrimento relatado. */
  harmCount: number;
  topItems: Array<{ label: string; count: number }>;
}

export interface MoodBehaviorStat {
  moodId: MoodStateId;
  label: string;
  /** Registros (check-ins + episódios) em que o humor foi marcado */
  count: number;
  /** Quantos desses registros tinham ao menos uma ação realizada */
  episodeCount: number;
  /** % de registros com esse humor que tiveram ação realizada */
  episodeRate: number;
  avgEnergy: number | null;
  avgValence: number | null;
  /** Intensidade média da vontade apenas entre registros com ação desse humor */
  avgUrge: number | null;
  colorLight: string;
  colorDark: string;
  colorHighContrast: string;
}

export interface DailyPoint {
  date: string;
  shortLabel: string;
  totalEntries: number;
  /** Registros com ao menos uma ação realizada. */
  episodeCount: number;
  hasImpulse: boolean;
  hasCheckinOnly: boolean;
  avgEnergy: number | null;
  avgValence: number | null;
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

export interface MenstrualPhaseStat {
  phase: CyclePhase;
  label: string;
  entries: number;
  avgEnergy: number | null;
  avgValence: number | null;
  avgSleepHours: number | null;
  episodeRate: number;
}

export interface InsightItem {
  id: string;
  title: string;
  category:
    | 'bipolaridade'
    | 'compulsao'
    | 'gatilho'
    | 'evolucao'
    | 'ciclo'
    | 'neurodivergencia'
    | 'seguranca';
  summary: string;
  detail: string;
  metricLabel: string;
  /** Sobre o que o insight conta (ex.: "9 de 12 registros com sono informado"). */
  basis: string;
}

/** Cada eixo que o relatório audita: quantos registros poderiam responder e quantos responderam. */
export type MetricKey =
  | 'mood'
  | 'valence'
  | 'energy'
  | 'sleepHours'
  | 'sleepQuality'
  | 'stateDuration'
  | 'activationSignals'
  | 'behavior'
  | 'urge'
  | 'awareness'
  | 'functionalImpact'
  | 'medication'
  | 'safety'
  | 'notes'
  | 'cycle';

export interface MetricCoverage {
  /** Registros com o campo respondido. */
  answered: number;
  /** Registros aos quais o campo se aplica (ex.: urge em registros com comportamento). */
  base: number;
}

export interface AnalyticsSummary {
  /** "informado em X de Y" por eixo — base honesta de cada seção do relatório. */
  coverage: Record<MetricKey, MetricCoverage>;
  totalEntries: number;
  /** Registros com ao menos uma ação realizada. Impulso contido não entra aqui. */
  totalEpisodes: number;
  /** Registros sem ação realizada (inclui impulsos contidos e dados não classificados). */
  totalEntriesWithoutRealizedBehavior: number;
  /** Registros com impulso e nenhuma ação realizada. */
  totalImpulseOnlyEntries: number;
  /** Registros com comportamento legado/importado sem classificação de modo. */
  totalUnclassifiedBehaviorEntries: number;
  periodDays: number;
  daysLogged: number;
  /** Dias com ao menos uma ação realizada. */
  daysWithEpisodes: number;
  /** Dias com registro e sem ação realizada (não inclui dias sem registro) */
  daysWithoutEpisodes: number;
  /** Dias do recorte sem nenhum registro */
  daysWithoutLog: number;
  /** null quando nenhum registro do período informou o campo */
  avgUrgeIntensity: number | null;
  avgEnergy: number | null;
  avgSleepHours: number | null;
  avgValence: number | null;
  /** Quantos registros informaram cada eixo (base real das médias acima) */
  energyReportedCount: number;
  sleepReportedCount: number;
  valenceReportedCount: number;
  reducedSleepNeedCount: number;
  /** Registros que responderam sobre redução da necessidade de sono. */
  reducedSleepNeedBase: number;
  reducedSleepNeedRate: number;
  poorSleepCount: number;
  /** Dormiu pouco e sem fadiga depois — marcador mais específico de mania */
  noFatigueAfterShortSleepCount: number;
  durationDistribution: Array<{ id: StateDuration; label: string; count: number; percentage: number }>;
  activationSignalStats: Array<{ id: ActivationSignal; label: string; count: number; percentage: number }>;
  functionalImpactSummary: {
    workModerateOrHigh: number;
    relationshipsModerateOrHigh: number;
    routineModerateOrHigh: number;
    anySignificantImpactRate: number;
    /** Registros em que o impacto funcional não foi respondido */
    unansweredCount: number;
  };
  awarenessBreakdown: {
    consciente: number;
    automatico: number;
    mistura: number;
    naoInformado: number;
  };
  resistanceBreakdown: {
    sim: number;
    parcialmente: number;
    nao: number;
    naoInformado: number;
  };
  behaviorModes: {
    /** Itens de comportamento marcados como realizados. */
    feitos: number;
    /** Itens marcados como impulso, com ou sem ação no mesmo registro. */
    impulsos: number;
    /** Itens com prejuízo/sofrimento explicitamente marcado. */
    comPrejuizo: number;
    registrosComAcao: number;
    registrosComImpulso: number;
    registrosComPrejuizo: number;
    registrosComClassificacaoDesconhecida: number;
    /** Registros com impulso e nenhuma ação realizada. */
    registrosComImpulsoSemAcao: number;
  };
  safetySummary: {
    pensamentosMorte: number;
    autolesao: number;
    naoResponder: number;
  };
  medicationSummary: {
    regular: number;
    esquecida: number;
    parcial: number;
    naoUso: number;
    naoInformado: number;
  };
  menstrualPhaseStats: MenstrualPhaseStat[];
  categoryStats: CategoryStat[];
  moodStats: MoodBehaviorStat[];
  dailyTimeline: DailyPoint[];
  cycleAnalysis: CycleAnalysis;
  bipolarIndicators: {
    highEnergyEpisodes: number;
    highEnergyPercent: number;
    highEnergyAvgUrge: number | null;
    highEnergyTopBehaviors: string[];
    lowEnergyReliefEpisodes: number;
    lowEnergyPercent: number;
    lowEnergyAutomaticRate: number;
    lowEnergyTopBehaviors: string[];
    moodSwingEntries: number;
    moodSwingPercent: number;
    moodSwingAvgUrge: number | null;
    moodSwingNoResistRate: number;
    obsessiveThoughtsCount: number;
    expectationDropPatternCount: number;
  };
  evolution: {
    status: 'melhora' | 'piora' | 'estabilidade' | 'insuficiente';
    label: string;
    description: string;
    /** "periodo_anterior": janela imediatamente anterior de mesmo tamanho; "metades": período dividido ao meio (aba Tudo) */
    basis: 'periodo_anterior' | 'metades';
    previousCount: number;
    currentCount: number;
    previousUrge: number | null;
    currentUrge: number | null;
  };
  topTriggers: Array<{ label: string; count: number }>;
  topDayEvents: Array<{ label: string; count: number }>;
  insights: InsightItem[];
}
