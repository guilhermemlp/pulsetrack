import { migrateCategories } from '../utils/categories';
import {
  ActivationSignal,
  AwarenessType,
  BehaviorCategory,
  BehaviorMode,
  CyclePhase,
  EntryType,
  FocusArea,
  FunctionalImpactLevel,
  MedicationStatus,
  MoodDefinition,
  MoodStateId,
  MoodSwingDirection,
  MoodSwingWindow,
  ProfileHint,
  PulseEntry,
  ReducedSleepNeed,
  ResistanceResult,
  SafetyConcern,
  SelectedBehavior,
  SleepRecord,
  SleepQuality,
  StateDuration,
  ThemeMode,
  UserPreferences,
} from '../types/pulsetrack';

/**
 * Definição de estados de humor com cores psicologicamente suaves e consistentes.
 */
export const MOOD_DEFINITIONS: MoodDefinition[] = [
  {
    id: MoodStateId.TRISTE_VAZIO,
    label: 'Triste / Vazio',
    description: 'Sensação de desânimo, melancolia ou vazio interno',
    colorLight: '#5C7B93',
    colorDark: '#82A4BE',
    colorHighContrast: '#1D4663',
    polarity: 'baixa',
  },
  {
    id: MoodStateId.ANSIOSO,
    label: 'Ansioso',
    description: 'Inquietação, aperto ou antecipação desconfortável',
    colorLight: '#A8842E',
    colorDark: '#D1AD56',
    colorHighContrast: '#75560B',
    polarity: 'mista',
  },
  {
    id: MoodStateId.IRRITADO,
    label: 'Irritado',
    description: 'Impaciência, tensão ou reatividade aumentada',
    colorLight: '#C4644E',
    colorDark: '#E38A75',
    colorHighContrast: '#942F19',
    polarity: 'mista',
  },
  {
    id: MoodStateId.EUFORICO_AGITADO,
    label: 'Euforia / expansão',
    description: 'Prazer expansivo, entusiasmo intenso ou sensação de grandiosidade',
    colorLight: '#C7753C',
    colorDark: '#E59A63',
    colorHighContrast: '#8C4310',
    polarity: 'alta',
  },
  {
    id: MoodStateId.AGITACAO,
    label: 'Agitação / aceleração',
    description: 'Energia alta acompanhada de desconforto, inquietação ou irritação',
    colorLight: '#C2603F',
    colorDark: '#DE8567',
    colorHighContrast: '#8E3517',
    polarity: 'mista',
  },
  {
    id: MoodStateId.HIPERFOCO,
    label: 'Hiperfoco',
    description: 'Absorção intensa em uma atividade, com noção de tempo reduzida',
    colorLight: '#3E7C8C',
    colorDark: '#6FA8B8',
    colorHighContrast: '#1D4B58',
    polarity: 'alta',
  },
  {
    id: MoodStateId.SOBRECARGA_SENSORIAL,
    label: 'Sobrecarga sensorial',
    description: 'Sensações (som, luz, toque, cheiro, gente) ficaram insuportáveis',
    colorLight: '#7A6BA8',
    colorDark: '#A398C9',
    colorHighContrast: '#4B3F73',
    polarity: 'mista',
  },
  {
    id: MoodStateId.MELTDOWN_SHUTDOWN,
    label: 'Meltdown / shutdown',
    description: 'Perda de controle emocional ou desligamento / retraimento total',
    colorLight: '#8A5A6B',
    colorDark: '#B28494',
    colorHighContrast: '#5A2F3D',
    polarity: 'baixa',
  },
  {
    id: MoodStateId.TEDIO,
    label: 'Tédio',
    description: 'Falta de estímulo, inquietação por monotonia',
    colorLight: '#6F777E',
    colorDark: '#9CA5AD',
    colorHighContrast: '#3D4349',
    polarity: 'baixa',
  },
  {
    id: MoodStateId.NEUTRO,
    label: 'Neutro',
    description: 'Estado estável, calmo ou sem alteração marcante',
    colorLight: '#5B8260',
    colorDark: '#86AD8B',
    colorHighContrast: '#1F5132',
    polarity: 'neutra',
  },
  {
    id: MoodStateId.APATIA_EXAUSTAO,
    label: 'Apatia / Exaustão',
    description: 'Cansaço profundo, desconexão ou falta de força',
    colorLight: '#7B6F94',
    colorDark: '#A599BF',
    colorHighContrast: '#4C3D6B',
    polarity: 'baixa',
  },
  {
    id: MoodStateId.OUTRO,
    label: 'Outro',
    description: 'Outro estado emocional descrito livremente',
    colorLight: '#526F7D',
    colorDark: '#81A0AF',
    colorHighContrast: '#243E4B',
    polarity: 'mista',
  },
];

export const SLEEP_QUALITY_OPTIONS: Array<{ id: SleepQuality; label: string }> = [
  { id: SleepQuality.MUITO_RUIM, label: 'Muito ruim' },
  { id: SleepQuality.RUIM, label: 'Ruim' },
  { id: SleepQuality.REGULAR, label: 'Regular' },
  { id: SleepQuality.BOA, label: 'Boa' },
  { id: SleepQuality.REPARADORA, label: 'Reparadora' },
];

export const REDUCED_SLEEP_NEED_OPTIONS: Array<{
  id: ReducedSleepNeed;
  label: string;
  hint: string;
}> = [
  { id: ReducedSleepNeed.NAO, label: 'Não', hint: 'Cansaço compatível com as horas dormidas' },
  { id: ReducedSleepNeed.LEVE, label: 'Leve', hint: 'Dormi pouco, mas com menos sono que o habitual' },
  {
    id: ReducedSleepNeed.MARCANTE,
    label: 'Marcante',
    hint: 'Dormi pouco e acordei acelerado ou sem sentir falta de sono',
  },
];

/**
 * Faixas alinhadas aos limiares clínicos de duração (episódio maníaco >= 4 dias,
 * hipomania >= 4 dias, episódio depressivo >= 14 dias).
 */
export const STATE_DURATION_OPTIONS: Array<{ id: StateDuration; label: string }> = [
  { id: StateDuration.ESTAVEL, label: 'Estável / sem alteração marcante' },
  { id: StateDuration.HORAS, label: 'Algumas horas' },
  { id: StateDuration.DIAS_1_3, label: '1 a 3 dias' },
  { id: StateDuration.DIAS_4_6, label: '4 a 6 dias' },
  { id: StateDuration.DIAS_7_13, label: '7 a 13 dias' },
  { id: StateDuration.DIAS_14_MAIS, label: '14 dias ou mais' },
];

export type ActivationSignalGroup = 'ativacao' | 'neurodivergente';

export const ACTIVATION_SIGNAL_OPTIONS: Array<{
  id: ActivationSignal;
  label: string;
  description: string;
  group: ActivationSignalGroup;
}> = [
  {
    id: ActivationSignal.PENSAMENTOS_ACELERADOS,
    label: 'Pensamentos acelerados',
    description: 'Muitas ideias rápidas ao mesmo tempo ou mente difícil de desacelerar',
    group: 'ativacao',
  },
  {
    id: ActivationSignal.FALA_INTENSA,
    label: 'Fala intensa ou rápida',
    description: 'Vontade de falar mais rápido, mais alto ou sem pausas',
    group: 'ativacao',
  },
  {
    id: ActivationSignal.AUMENTO_ATIVIDADES,
    label: 'Aumento de atividades',
    description: 'Muitos planos, projetos ou tarefas iniciadas simultaneamente',
    group: 'ativacao',
  },
  {
    id: ActivationSignal.IRRITABILIDADE,
    label: 'Irritabilidade aumentada',
    description: 'Baixa tolerância a interrupções, atrasos ou frustrações',
    group: 'ativacao',
  },
  {
    id: ActivationSignal.SOCIABILIDADE_AUMENTADA,
    label: 'Sociabilidade aumentada',
    description: 'Maior busca por contato, conversas, mensagens ou exposição social',
    group: 'ativacao',
  },
  {
    id: ActivationSignal.SOBRECARGA_SENSORIAL,
    label: 'Sobrecarga sensorial',
    description: 'Som, luz, toque, cheiro ou muita gente ficaram insuportáveis',
    group: 'neurodivergente',
  },
  {
    id: ActivationSignal.MELTDOWN_SHUTDOWN,
    label: 'Meltdown ou shutdown',
    description: 'Explosão emocional / colapso ou desligamento e retraimento',
    group: 'neurodivergente',
  },
  {
    id: ActivationSignal.DISFUNCAO_EXECUTIVA,
    label: 'Disfunção executiva / paralisia de tarefa',
    description: 'Saber o que fazer e não conseguir iniciar, mesmo querendo',
    group: 'neurodivergente',
  },
  {
    id: ActivationSignal.MASCARAMENTO,
    label: 'Custo de mascarar / camuflar',
    description: 'Esforço consciente para parecer “normal” e o cansaço que isso trouxe',
    group: 'neurodivergente',
  },
  {
    id: ActivationSignal.EVITACAO_DEMANDA,
    label: 'Evitação de demanda',
    description: 'Bloqueio ou recusa diante de uma exigência, mesmo sendo algo desejado',
    group: 'neurodivergente',
  },
  {
    id: ActivationSignal.CEGUEIRA_TEMPORAL,
    label: 'Cegueira temporal',
    description: 'Perder a noção do tempo, atrasos ou subestimar quanto algo leva',
    group: 'neurodivergente',
  },
  {
    id: ActivationSignal.STIMMING,
    label: 'Stimming / autorregulação',
    description: 'Movimentos ou repetições (balançar, girar, apertar) para se regular',
    group: 'neurodivergente',
  },
  {
    id: ActivationSignal.HIPERFOCO,
    label: 'Hiperfoco',
    description: 'Absorção intensa que fez o resto (comer, dormir, prazos) desaparecer',
    group: 'neurodivergente',
  },
];

export const MOOD_SWING_DIRECTION_OPTIONS: Array<{ id: MoodSwingDirection; label: string }> = [
  { id: MoodSwingDirection.SUBIU, label: 'Subiu (ficou mais ativado/elevado)' },
  { id: MoodSwingDirection.DESCEU, label: 'Desceu (ficou mais para baixo)' },
  { id: MoodSwingDirection.AMBOS, label: 'Oscilou para os dois lados' },
];

export const MOOD_SWING_WINDOW_OPTIONS: Array<{ id: MoodSwingWindow; label: string; hint: string }> = [
  { id: MoodSwingWindow.MINUTOS, label: 'Minutos', hint: 'Mudança muito rápida, reativa' },
  { id: MoodSwingWindow.HORAS, label: 'Horas', hint: 'Ao longo do mesmo dia' },
  { id: MoodSwingWindow.DIAS, label: 'Dias', hint: 'Mudança sustentada por um ou mais dias' },
];

export const SAFETY_CONCERN_OPTIONS: Array<{ id: SafetyConcern; label: string }> = [
  { id: SafetyConcern.NENHUM, label: 'Não tive esses pensamentos' },
  { id: SafetyConcern.PENSAMENTOS_MORTE, label: 'Tive pensamentos de morte ou de não existir' },
  { id: SafetyConcern.AUTOLESAO, label: 'Tive impulso de me machucar' },
  { id: SafetyConcern.NAO_RESPONDER, label: 'Prefiro não responder agora' },
];

export const MEDICATION_STATUS_OPTIONS: Array<{ id: MedicationStatus; label: string }> = [
  { id: MedicationStatus.USO_REGULAR, label: 'Tomei como prescrito' },
  { id: MedicationStatus.ESQUECI, label: 'Esqueci / não tomei' },
  { id: MedicationStatus.PARCIAL, label: 'Tomei parcialmente ou em outro horário' },
  { id: MedicationStatus.NAO_USO, label: 'Não uso medicação' },
];

export const CYCLE_PHASE_OPTIONS: Array<{ id: CyclePhase; label: string }> = [
  { id: CyclePhase.MENSTRUAL, label: 'Menstrual' },
  { id: CyclePhase.FOLICULAR, label: 'Folicular' },
  { id: CyclePhase.OVULATORIA, label: 'Ovulatória' },
  { id: CyclePhase.LUTEA, label: 'Lútea' },
  { id: CyclePhase.NAO_SE_APLICA, label: 'Não se aplica' },
];

export const FUNCTIONAL_IMPACT_OPTIONS: Array<{ id: FunctionalImpactLevel; label: string }> = [
  { id: FunctionalImpactLevel.NENHUM, label: 'Nenhum' },
  { id: FunctionalImpactLevel.LEVE, label: 'Leve' },
  { id: FunctionalImpactLevel.MODERADO, label: 'Moderado' },
  { id: FunctionalImpactLevel.INTENSO, label: 'Intenso' },
];

export const DEFAULT_DAY_EVENTS: string[] = [
  'Sono ruim ou insuficiente',
  'Noite de sono reparador',
  'Discussão ou conflito',
  'Mudança ou esquecimento de medicação',
  'Sobrecarga no trabalho / estudo',
  'Isolamento prolongado',
  'Excesso de cafeína / estimulantes',
  'Atividade física / movimento',
  'Sobrecarga sensorial (som, luz, toque, gente)',
  'Meltdown ou shutdown',
  'Precisei mascarar / me camuflar',
  'Demanda externa ou cobrança',
  'Mudança inesperada de plano',
  'Burnout / esgotamento neurodivergente',
  'Privação de sono por rotina desregulada',
];

export const DEFAULT_PREFERENCES: UserPreferences = {
  theme: ThemeMode.LIGHT,
  reduceMotion: false,
  focusModeDefault: false,
  showSexualCategory: false,
  trackCycle: false,
  defaultRecordLevel: 'rapido',
  reportLabel: '',
  focusAreas: [],
  profileHint: null,
  packageIds: [],
  reminderOptIn: false,
  reminderTime: '20:00',
};

export const FOCUS_AREA_OPTIONS: Array<{ id: FocusArea; label: string; hint: string }> = [
  { id: 'emocional', label: 'Humor e emoções', hint: 'Como o dia foi por dentro' },
  { id: 'ativacao', label: 'Energia e ativação', hint: 'Agitação, hiperfoco, exaustão' },
  { id: 'sono', label: 'Sono', hint: 'Horas, qualidade e ritmo' },
  { id: 'comportamentos', label: 'Comportamentos', hint: 'O que fiz e o que ficou no impulso' },
  { id: 'gatilhos', label: 'Gatilhos e contexto', hint: 'O que aconteceu antes' },
  { id: 'medicacao', label: 'Medicação', hint: 'Adesão e efeitos percebidos' },
  { id: 'ciclo', label: 'Ciclo menstrual', hint: 'Relação com humor e energia' },
  { id: 'seguranca', label: 'Segurança', hint: 'Momentos de risco e apoio' },
];

export const PROFILE_HINT_OPTIONS: Array<{ id: ProfileHint; label: string }> = [
  { id: 'neurodivergente', label: 'Neurodivergente (TDAH, autismo ou outro)' },
  { id: 'humor_oscilante', label: 'Humor muito oscilante' },
  { id: 'compulsoes', label: 'Compulsões ou impulsos difíceis de conter' },
  { id: 'ansiedade', label: 'Ansiedade frequente' },
  { id: 'em_investigacao', label: 'Ainda estou investigando' },
  { id: 'prefiro_nao_dizer', label: 'Prefiro não dizer' },
];

/**
 * Categorias e subitens iniciais exatamente conforme especificação clínica do usuário.
 */
export function createDefaultCategories(): BehaviorCategory[] {
  return migrateCategories(defaultCategorySeed()).categories;
}

/**
 * Semente no formato v1. Passar pela migração garante que o catálogo padrão e o
 * catálogo restaurado de um backup usem exatamente as mesmas regras de schema.
 */
function defaultCategorySeed(): unknown[] {
  return [
    {
      id: 'cat_afetiva',
      name: 'Afetiva / Social / Validação',
      color: '#3B6F8F',
      active: true,
      items: [
        { id: 'af_apps', label: 'Uso de apps de relacionamento', active: true },
        { id: 'af_likes', label: 'Dar likes em sequência', active: true },
        { id: 'af_validacao', label: 'Busca por validação / ser desejado', active: true },
        { id: 'af_encontro', label: 'Chamar para encontro sexual rapidamente', active: true },
        { id: 'af_masturb_conf', label: 'Masturbar-se com a confirmação de interesse', active: true },
      ],
    },
    {
      id: 'cat_financeira',
      name: 'Financeira',
      color: '#B8893A',
      active: true,
      items: [
        { id: 'fin_compras', label: 'Compras impulsivas', active: true },
        { id: 'fin_desnec', label: 'Gastos com coisas desnecessárias', active: true },
        { id: 'fin_navegar', label: 'Navegar por produtos sem necessidade', active: true },
      ],
    },
    {
      id: 'cat_alimentar',
      name: 'Alimentar',
      color: '#5B8260',
      active: true,
      items: [
        { id: 'al_noturna', label: 'Compulsão alimentar noturna', active: true },
        { id: 'al_acabar', label: 'Comer até acabar o que tem', active: true },
        { id: 'al_automatica', label: 'Alimentação automática (sem perceber a quantidade)', active: true },
        { id: 'al_saciedade', label: 'Perda de percepção de saciedade', active: true },
      ],
    },
    {
      id: 'cat_digital',
      name: 'Digital / Hiperestimulação',
      color: '#5D7A8C',
      active: true,
      items: [
        { id: 'dig_abas', label: 'Várias abas abertas / alternância constante', active: true },
        { id: 'dig_scroll', label: 'Scroll infinito / feeds', active: true },
        { id: 'dig_transe', label: 'Estado de “transe” digital', active: true },
        { id: 'dig_notif', label: 'Verificar notificações repetidamente', active: true },
      ],
    },
    {
      id: 'cat_sexual',
      name: 'Sexual / Intensidade',
      color: '#C85E42',
      active: true,
      items: [
        { id: 'sex_compulsiva', label: 'Masturbação compulsiva', active: true },
        { id: 'sex_nao_ereto', label: 'Masturbação com pênis não ereto ou pouco ereto', active: true },
        { id: 'sex_intensidade', label: 'Busca por intensidade / continuar até exaustão', active: true },
        { id: 'sex_pornografia', label: 'Uso de pornografia de forma compulsiva', active: true },
      ],
    },
    {
      id: 'cat_outros',
      name: 'Outros',
      color: '#7B6F94',
      active: true,
      items: [
        { id: 'out_obsessivos', label: 'Pensamentos obsessivos intensos', active: true },
        { id: 'out_risco', label: 'Comportamentos de risco', active: true },
        { id: 'out_livre', label: 'Outro (campo livre)', active: true, isFreeText: true },
      ],
    },
  ];
}

/**
 * Gera 14 dias contínuos (check-ins diários + episódios, sono, ativação e impacto)
 * para ilustrar evolução longitudinal, ciclos (antes/durante/depois) e relatórios.
 */
/**
 * Semente da amostra: campos derivados (intensidade do humor, valência, modo do
 * comportamento, detalhes do sono) são preenchidos por `completeSample`.
 */
type SampleSeed = Omit<
  PulseEntry,
  | 'moodIntensity'
  | 'valence'
  | 'moodSwingDirection'
  | 'moodSwingWindow'
  | 'medication'
  | 'cyclePhase'
  | 'safetyConcern'
  | 'behaviors'
  | 'sleep'
  | 'depth'
> & {
  valence?: number | null;
  moodSwingDirection?: MoodSwingDirection | null;
  moodSwingWindow?: MoodSwingWindow | null;
  cyclePhase?: CyclePhase | null;
  safetyConcern?: SafetyConcern | null;
  behaviors: Array<Omit<SelectedBehavior, 'mode' | 'harm'>>;
  sleep: Omit<
    SleepRecord,
    'bedTime' | 'wakeTime' | 'latencyMinutes' | 'awakenings' | 'noFatigueAfterShortSleep'
  > &
    Partial<
      Pick<
        SleepRecord,
        'bedTime' | 'wakeTime' | 'latencyMinutes' | 'awakenings' | 'noFatigueAfterShortSleep'
      >
    >;
};

/**
 * Deriva a valência do afeto a partir da polaridade dos humores marcados (apenas
 * para o conjunto de exemplo, que não pediu valência ao usuário).
 */
function deriveSampleValence(moods: MoodStateId[]): number | null {
  if (moods.length === 0) return null;
  const scores = moods.map((id) => {
    const polarity = MOOD_DEFINITIONS.find((m) => m.id === id)?.polarity;
    if (polarity === 'alta') return 8;
    if (polarity === 'baixa') return 2.5;
    if (polarity === 'neutra') return 5;
    return 4;
  });
  return Number((scores.reduce((s, v) => s + v, 0) / scores.length).toFixed(1));
}

function completeSample(seed: SampleSeed): PulseEntry {
  const moodIntensity: Record<string, number> = {};
  seed.moods.forEach((mood, index) => {
    moodIntensity[mood] = Math.max(4, 8 - index * 2);
  });

  // Resistiu totalmente => o registro descreve impulso sem ação; nos demais, ação efetiva.
  const mode = seed.resisted === ResistanceResult.SIM ? BehaviorMode.IMPULSO : BehaviorMode.FEITO;

  return {
    ...seed,
    // A amostra sempre ilustra o formulário completo, que é o que gera os dados ricos.
    depth: 'completo',
    moodIntensity,
    valence: seed.valence !== undefined ? seed.valence : deriveSampleValence(seed.moods),
    moodSwingDirection:
      seed.moodSwingDirection !== undefined
        ? seed.moodSwingDirection
        : seed.hadMoodSwing
        ? MoodSwingDirection.AMBOS
        : null,
    moodSwingWindow:
      seed.moodSwingWindow !== undefined
        ? seed.moodSwingWindow
        : seed.hadMoodSwing
        ? MoodSwingWindow.HORAS
        : null,
    behaviors: seed.behaviors.map((behavior) => ({
      ...behavior,
      mode,
      harm: mode === BehaviorMode.FEITO,
    })),
    sleep: {
      ...seed.sleep,
      bedTime: seed.sleep.bedTime ?? null,
      wakeTime: seed.sleep.wakeTime ?? null,
      latencyMinutes: seed.sleep.latencyMinutes ?? null,
      awakenings: seed.sleep.awakenings ?? null,
      noFatigueAfterShortSleep:
        seed.sleep.noFatigueAfterShortSleep ??
        (seed.sleep.reducedNeed === ReducedSleepNeed.MARCANTE
          ? true
          : seed.sleep.reducedNeed === ReducedSleepNeed.LEVE
          ? null
          : false),
    },
    medication: { status: MedicationStatus.USO_REGULAR, effects: '' },
    cyclePhase: seed.cyclePhase ?? null,
    safetyConcern: seed.safetyConcern ?? SafetyConcern.NENHUM,
  };
}

export const SAMPLE_ENTRY_ID_PREFIX = 'demo_';

/** Identifica registros ilustrativos sem depender de um campo extra no schema. */
export function isSampleEntry(entry: Pick<PulseEntry, 'id'>): boolean {
  return entry.id.startsWith(SAMPLE_ENTRY_ID_PREFIX);
}

export function createSampleEntries(): PulseEntry[] {
  const now = new Date();
  const daysAgo = (n: number): string => {
    const d = new Date(now);
    d.setDate(d.getDate() - n);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  const seeds: SampleSeed[] = [
    // D-13: Check-in sem episódio — início da queda de sono e leve ativação
    {
      id: 'demo_14',
      entryType: EntryType.DAILY_CHECKIN,
      date: daysAgo(13),
      time: '09:30',
      createdAt: `${daysAgo(13)}T09:30:00`,
      moods: [MoodStateId.NEUTRO, MoodStateId.ANSIOSO],
      moodOtherText: '',
      hadMoodSwing: false,
      moodSwingDescription: '',
      energyLevel: 7,
      sleep: { hours: 5.5, quality: SleepQuality.REGULAR, reducedNeed: ReducedSleepNeed.LEVE },
      stateDuration: StateDuration.HORAS,
      activationSignals: [ActivationSignal.PENSAMENTOS_ACELERADOS, ActivationSignal.AUMENTO_ATIVIDADES],
      triggerContext: '',
      behaviors: [],
      behaviorOtherText: '',
      awareness: AwarenessType.CONSCIENTE,
      resisted: ResistanceResult.SIM,
      urgeIntensity: 2,
      feelingDuring: '',
      feelingAfter: '',
      functionalImpact: {
        work: FunctionalImpactLevel.LEVE,
        relationships: FunctionalImpactLevel.NENHUM,
        routine: FunctionalImpactLevel.NENHUM,
        note: 'Muitas ideias novas de projeto logo cedo.',
      },
      notes: 'Sem episódio compulsivo hoje, mas dormi menos e acordei disposto.',
      dayEvents: ['Excesso de cafeína / estimulantes'],
      dayEventsNote: '',
    },
    // D-12: Episódio em alta energia após 2ª noite com pouco sono e redução da necessidade de sono
    {
      id: 'demo_13',
      entryType: EntryType.EPISODE,
      date: daysAgo(12),
      time: '23:20',
      createdAt: `${daysAgo(12)}T23:20:00`,
      moods: [MoodStateId.EUFORICO_AGITADO, MoodStateId.ANSIOSO],
      moodOtherText: '',
      hadMoodSwing: true,
      moodSwingDescription: 'Oscilação rápida no fim da tarde para sensação de aceleração intensa.',
      energyLevel: 9,
      sleep: { hours: 4.0, quality: SleepQuality.RUIM, reducedNeed: ReducedSleepNeed.MARCANTE },
      stateDuration: StateDuration.DIAS_1_3,
      activationSignals: [
        ActivationSignal.PENSAMENTOS_ACELERADOS,
        ActivationSignal.FALA_INTENSA,
        ActivationSignal.SOCIABILIDADE_AUMENTADA,
      ],
      triggerContext: 'Energia sobrando à noite, dificuldade de desacelerar e busca de estímulo imediato',
      behaviors: [
        { categoryId: 'cat_afetiva', categoryName: 'Afetiva / Social / Validação', itemId: 'af_apps', itemLabel: 'Uso de apps de relacionamento' },
        { categoryId: 'cat_afetiva', categoryName: 'Afetiva / Social / Validação', itemId: 'af_likes', itemLabel: 'Dar likes em sequência' },
        { categoryId: 'cat_afetiva', categoryName: 'Afetiva / Social / Validação', itemId: 'af_encontro', itemLabel: 'Chamar para encontro sexual rapidamente' },
      ],
      behaviorOtherText: '',
      awareness: AwarenessType.MISTURA,
      resisted: ResistanceResult.NAO,
      urgeIntensity: 9,
      feelingDuring: 'Euforia na expectativa, adrenalina e urgência por resposta imediata',
      feelingAfter: 'Queda abrupta de interesse após descarga, sensação de vazio',
      functionalImpact: {
        work: FunctionalImpactLevel.MODERADO,
        relationships: FunctionalImpactLevel.MODERADO,
        routine: FunctionalImpactLevel.INTENSO,
        note: 'Fui dormir às 3h da manhã e atrasei compromissos.',
      },
      notes: 'Segundo dia seguido dormindo pouco sem sentir sono na hora de deitar.',
      dayEvents: ['Sono ruim ou insuficiente', 'Excesso de cafeína / estimulantes'],
      dayEventsNote: '',
    },
    // D-11: Pós-episódio — queda brusca para apatia/exaustão
    {
      id: 'demo_12',
      entryType: EntryType.EPISODE,
      date: daysAgo(11),
      time: '15:40',
      createdAt: `${daysAgo(11)}T15:40:00`,
      moods: [MoodStateId.APATIA_EXAUSTAO, MoodStateId.TRISTE_VAZIO],
      moodOtherText: '',
      hadMoodSwing: true,
      moodSwingDescription: 'Queda marcante de energia em relação ao dia anterior.',
      energyLevel: 2,
      sleep: { hours: 9.5, quality: SleepQuality.MUITO_RUIM, reducedNeed: ReducedSleepNeed.NAO },
      stateDuration: StateDuration.DIAS_1_3,
      activationSignals: [],
      triggerContext: 'Exaustão física e mental após pico anterior, dificuldade para iniciar tarefas',
      behaviors: [
        { categoryId: 'cat_digital', categoryName: 'Digital / Hiperestimulação', itemId: 'dig_transe', itemLabel: 'Estado de “transe” digital' },
        { categoryId: 'cat_digital', categoryName: 'Digital / Hiperestimulação', itemId: 'dig_scroll', itemLabel: 'Scroll infinito / feeds' },
      ],
      behaviorOtherText: '',
      awareness: AwarenessType.AUTOMATICO,
      resisted: ResistanceResult.NAO,
      urgeIntensity: 6,
      feelingDuring: 'Entorpecimento e fuga do desconforto',
      feelingAfter: 'Mais cansaço e sensação de tempo perdido',
      functionalImpact: {
        work: FunctionalImpactLevel.INTENSO,
        relationships: FunctionalImpactLevel.LEVE,
        routine: FunctionalImpactLevel.MODERADO,
        note: 'Não consegui concluir entregas do trabalho.',
      },
      notes: '',
      dayEvents: ['Isolamento prolongado'],
      dayEventsNote: '',
    },
    // D-10: Baixa energia mantida + compulsão alimentar de alívio
    {
      id: 'demo_11',
      entryType: EntryType.EPISODE,
      date: daysAgo(10),
      time: '22:30',
      createdAt: `${daysAgo(10)}T22:30:00`,
      moods: [MoodStateId.TRISTE_VAZIO, MoodStateId.TEDIO],
      moodOtherText: '',
      hadMoodSwing: false,
      moodSwingDescription: '',
      energyLevel: 3,
      sleep: { hours: 8.0, quality: SleepQuality.RUIM, reducedNeed: ReducedSleepNeed.NAO },
      stateDuration: StateDuration.DIAS_1_3,
      activationSignals: [],
      triggerContext: 'Vazio noturno após dia isolado em casa',
      behaviors: [
        { categoryId: 'cat_alimentar', categoryName: 'Alimentar', itemId: 'al_noturna', itemLabel: 'Compulsão alimentar noturna' },
        { categoryId: 'cat_alimentar', categoryName: 'Alimentar', itemId: 'al_saciedade', itemLabel: 'Perda de percepção de saciedade' },
      ],
      behaviorOtherText: '',
      awareness: AwarenessType.AUTOMATICO,
      resisted: ResistanceResult.NAO,
      urgeIntensity: 7,
      feelingDuring: 'Alívio automático e desconexão',
      feelingAfter: 'Peso físico e desânimo',
      functionalImpact: {
        work: FunctionalImpactLevel.LEVE,
        relationships: FunctionalImpactLevel.NENHUM,
        routine: FunctionalImpactLevel.MODERADO,
        note: '',
      },
      notes: '',
      dayEvents: ['Isolamento prolongado'],
      dayEventsNote: '',
    },
    // D-9: Check-in independente de estabilização
    {
      id: 'demo_10',
      entryType: EntryType.DAILY_CHECKIN,
      date: daysAgo(9),
      time: '20:00',
      createdAt: `${daysAgo(9)}T20:00:00`,
      moods: [MoodStateId.NEUTRO],
      moodOtherText: '',
      hadMoodSwing: false,
      moodSwingDescription: '',
      energyLevel: 5,
      sleep: { hours: 7.5, quality: SleepQuality.BOA, reducedNeed: ReducedSleepNeed.NAO },
      stateDuration: StateDuration.ESTAVEL,
      activationSignals: [],
      triggerContext: '',
      behaviors: [],
      behaviorOtherText: '',
      awareness: AwarenessType.CONSCIENTE,
      resisted: ResistanceResult.SIM,
      urgeIntensity: 1,
      feelingDuring: '',
      feelingAfter: '',
      functionalImpact: {
        work: FunctionalImpactLevel.NENHUM,
        relationships: FunctionalImpactLevel.NENHUM,
        routine: FunctionalImpactLevel.NENHUM,
        note: 'Dia organizado e tranquilo.',
      },
      notes: 'Caminhada ajudou bastante na regulação.',
      dayEvents: ['Noite de sono reparador', 'Atividade física / movimento'],
      dayEventsNote: '',
    },
    // D-8: Check-in pré-episódio — irritabilidade + aceleração + sono menor
    {
      id: 'demo_9',
      entryType: EntryType.DAILY_CHECKIN,
      date: daysAgo(8),
      time: '21:10',
      createdAt: `${daysAgo(8)}T21:10:00`,
      moods: [MoodStateId.IRRITADO, MoodStateId.EUFORICO_AGITADO],
      moodOtherText: '',
      hadMoodSwing: true,
      moodSwingDescription: 'Manhã calma, tarde muito acelerada e impaciente.',
      energyLevel: 8,
      sleep: { hours: 5.0, quality: SleepQuality.REGULAR, reducedNeed: ReducedSleepNeed.LEVE },
      stateDuration: StateDuration.HORAS,
      activationSignals: [
        ActivationSignal.IRRITABILIDADE,
        ActivationSignal.PENSAMENTOS_ACELERADOS,
        ActivationSignal.AUMENTO_ATIVIDADES,
      ],
      triggerContext: '',
      behaviors: [],
      behaviorOtherText: '',
      awareness: AwarenessType.CONSCIENTE,
      resisted: ResistanceResult.SIM,
      urgeIntensity: 4,
      feelingDuring: '',
      feelingAfter: '',
      functionalImpact: {
        work: FunctionalImpactLevel.LEVE,
        relationships: FunctionalImpactLevel.MODERADO,
        routine: FunctionalImpactLevel.NENHUM,
        note: 'Falei de forma ríspida em reunião.',
      },
      notes: 'Percebi aumento de irritabilidade e vontade de começar mil tarefas.',
      dayEvents: ['Sobrecarga no trabalho / estudo'],
      dayEventsNote: '',
    },
    // D-7: Episódio financeiro + pensamentos obsessivos em estado ativado
    {
      id: 'demo_8',
      entryType: EntryType.EPISODE,
      date: daysAgo(7),
      time: '19:15',
      createdAt: `${daysAgo(7)}T19:15:00`,
      moods: [MoodStateId.EUFORICO_AGITADO, MoodStateId.IRRITADO],
      moodOtherText: '',
      hadMoodSwing: true,
      moodSwingDescription: 'Aceleração mental contínua desde ontem.',
      energyLevel: 8,
      sleep: { hours: 4.5, quality: SleepQuality.RUIM, reducedNeed: ReducedSleepNeed.MARCANTE },
      stateDuration: StateDuration.DIAS_1_3,
      activationSignals: [
        ActivationSignal.PENSAMENTOS_ACELERADOS,
        ActivationSignal.AUMENTO_ATIVIDADES,
        ActivationSignal.IRRITABILIDADE,
      ],
      triggerContext: 'Sobrecarga no trabalho seguida de impulso de comprar equipamentos novos',
      behaviors: [
        { categoryId: 'cat_financeira', categoryName: 'Financeira', itemId: 'fin_compras', itemLabel: 'Compras impulsivas' },
        { categoryId: 'cat_financeira', categoryName: 'Financeira', itemId: 'fin_navegar', itemLabel: 'Navegar por produtos sem necessidade' },
        { categoryId: 'cat_outros', categoryName: 'Outros', itemId: 'out_obsessivos', itemLabel: 'Pensamentos obsessivos intensos' },
      ],
      behaviorOtherText: '',
      awareness: AwarenessType.CONSCIENTE,
      resisted: ResistanceResult.PARCIALMENTE,
      urgeIntensity: 8,
      feelingDuring: 'Sensação de urgência para resolver ou comprar naquele instante',
      feelingAfter: 'Cancelei uma compra antes do pagamento, mas mantive outra fora do orçamento',
      functionalImpact: {
        work: FunctionalImpactLevel.LEVE,
        relationships: FunctionalImpactLevel.NENHUM,
        routine: FunctionalImpactLevel.MODERADO,
        note: 'Gasto não planejado.',
      },
      notes: 'Segundo dia desse estado mais acelerado.',
      dayEvents: ['Sobrecarga no trabalho / estudo', 'Sono ruim ou insuficiente'],
      dayEventsNote: '',
    },
    // D-6: Episódio afetivo/sexual — expectativa -> descarga -> queda
    {
      id: 'demo_7',
      entryType: EntryType.EPISODE,
      date: daysAgo(6),
      time: '00:10',
      createdAt: `${daysAgo(6)}T00:10:00`,
      moods: [MoodStateId.ANSIOSO, MoodStateId.EUFORICO_AGITADO],
      moodOtherText: '',
      hadMoodSwing: true,
      moodSwingDescription: 'Pico de excitação e ansiedade tarde da noite.',
      energyLevel: 8,
      sleep: { hours: 4.5, quality: SleepQuality.RUIM, reducedNeed: ReducedSleepNeed.MARCANTE },
      stateDuration: StateDuration.DIAS_7_13,
      activationSignals: [
        ActivationSignal.PENSAMENTOS_ACELERADOS,
        ActivationSignal.SOCIABILIDADE_AUMENTADA,
        ActivationSignal.FALA_INTENSA,
      ],
      triggerContext: 'Recebi mensagem de interesse e entrei em hiperfoco de validação',
      behaviors: [
        { categoryId: 'cat_afetiva', categoryName: 'Afetiva / Social / Validação', itemId: 'af_validacao', itemLabel: 'Busca por validação / ser desejado' },
        { categoryId: 'cat_afetiva', categoryName: 'Afetiva / Social / Validação', itemId: 'af_masturb_conf', itemLabel: 'Masturbar-se com a confirmação de interesse' },
        { categoryId: 'cat_sexual', categoryName: 'Sexual / Intensidade', itemId: 'sex_intensidade', itemLabel: 'Busca por intensidade / continuar até exaustão' },
      ],
      behaviorOtherText: '',
      awareness: AwarenessType.MISTURA,
      resisted: ResistanceResult.NAO,
      urgeIntensity: 9,
      feelingDuring: 'Euforia na expectativa de ser desejado e busca por pico de estímulo',
      feelingAfter: 'Queda abrupta de interesse logo após a descarga, exaustão emocional',
      functionalImpact: {
        work: FunctionalImpactLevel.MODERADO,
        relationships: FunctionalImpactLevel.MODERADO,
        routine: FunctionalImpactLevel.INTENSO,
        note: 'Dormi muito tarde novamente.',
      },
      notes: 'Padrão claro de 4 dias com menos sono e ativação elevada.',
      dayEvents: ['Discussão ou conflito', 'Sono ruim ou insuficiente'],
      dayEventsNote: '',
    },
    // D-5: Pós-episódio — queda para apatia
    {
      id: 'demo_6',
      entryType: EntryType.EPISODE,
      date: daysAgo(5),
      time: '16:30',
      createdAt: `${daysAgo(5)}T16:30:00`,
      moods: [MoodStateId.APATIA_EXAUSTAO],
      moodOtherText: '',
      hadMoodSwing: true,
      moodSwingDescription: 'Desligamento brusco após dias acelerados.',
      energyLevel: 2,
      sleep: { hours: 9.0, quality: SleepQuality.REGULAR, reducedNeed: ReducedSleepNeed.NAO },
      stateDuration: StateDuration.HORAS,
      activationSignals: [],
      triggerContext: 'Cansaço mental profundo e falta de estímulo',
      behaviors: [
        { categoryId: 'cat_sexual', categoryName: 'Sexual / Intensidade', itemId: 'sex_nao_ereto', itemLabel: 'Masturbação com pênis não ereto ou pouco ereto' },
        { categoryId: 'cat_digital', categoryName: 'Digital / Hiperestimulação', itemId: 'dig_abas', itemLabel: 'Várias abas abertas / alternância constante' },
      ],
      behaviorOtherText: '',
      awareness: AwarenessType.AUTOMATICO,
      resisted: ResistanceResult.NAO,
      urgeIntensity: 5,
      feelingDuring: 'Tentativa automática de regular o tédio e o cansaço, sem prazer real',
      feelingAfter: 'Sensação de esgotamento e vontade de dormir',
      functionalImpact: {
        work: FunctionalImpactLevel.MODERADO,
        relationships: FunctionalImpactLevel.LEVE,
        routine: FunctionalImpactLevel.MODERADO,
        note: 'Produtividade muito baixa à tarde.',
      },
      notes: '',
      dayEvents: ['Sobrecarga no trabalho / estudo'],
      dayEventsNote: '',
    },
    // D-4: Check-in sem episódio — recuperação do sono
    {
      id: 'demo_5',
      entryType: EntryType.DAILY_CHECKIN,
      date: daysAgo(4),
      time: '19:45',
      createdAt: `${daysAgo(4)}T19:45:00`,
      moods: [MoodStateId.APATIA_EXAUSTAO, MoodStateId.NEUTRO],
      moodOtherText: '',
      hadMoodSwing: false,
      moodSwingDescription: '',
      energyLevel: 4,
      sleep: { hours: 8.5, quality: SleepQuality.BOA, reducedNeed: ReducedSleepNeed.NAO },
      stateDuration: StateDuration.DIAS_1_3,
      activationSignals: [],
      triggerContext: '',
      behaviors: [],
      behaviorOtherText: '',
      awareness: AwarenessType.CONSCIENTE,
      resisted: ResistanceResult.SIM,
      urgeIntensity: 2,
      feelingDuring: '',
      feelingAfter: '',
      functionalImpact: {
        work: FunctionalImpactLevel.LEVE,
        relationships: FunctionalImpactLevel.NENHUM,
        routine: FunctionalImpactLevel.LEVE,
        note: 'Dia mais lento, mas sem compulsões.',
      },
      notes: 'Priorizei dormir mais cedo.',
      dayEvents: ['Noite de sono reparador'],
      dayEventsNote: '',
    },
    // D-3: Episódio interrompido (melhora)
    {
      id: 'demo_4',
      entryType: EntryType.EPISODE,
      date: daysAgo(3),
      time: '20:50',
      createdAt: `${daysAgo(3)}T20:50:00`,
      moods: [MoodStateId.ANSIOSO],
      moodOtherText: '',
      hadMoodSwing: false,
      moodSwingDescription: '',
      energyLevel: 5,
      sleep: { hours: 7.5, quality: SleepQuality.BOA, reducedNeed: ReducedSleepNeed.NAO },
      stateDuration: StateDuration.HORAS,
      activationSignals: [ActivationSignal.PENSAMENTOS_ACELERADOS],
      triggerContext: 'Pensamentos obsessivos antes de dormir sobre conversa difícil',
      behaviors: [
        { categoryId: 'cat_outros', categoryName: 'Outros', itemId: 'out_obsessivos', itemLabel: 'Pensamentos obsessivos intensos' },
        { categoryId: 'cat_digital', categoryName: 'Digital / Hiperestimulação', itemId: 'dig_notif', itemLabel: 'Verificar notificações repetidamente' },
      ],
      behaviorOtherText: '',
      awareness: AwarenessType.CONSCIENTE,
      resisted: ResistanceResult.SIM,
      urgeIntensity: 6,
      feelingDuring: 'Inquietação e vontade de checar o celular toda hora',
      feelingAfter: 'Deixei o celular em outro cômodo e respirei por 5 minutos; alívio gradual',
      functionalImpact: {
        work: FunctionalImpactLevel.NENHUM,
        relationships: FunctionalImpactLevel.NENHUM,
        routine: FunctionalImpactLevel.LEVE,
        note: '',
      },
      notes: 'Consegui interromper antes de entrar no scroll infinito.',
      dayEvents: ['Noite de sono reparador', 'Atividade física / movimento'],
      dayEventsNote: '',
    },
    // D-2: Check-in estável
    {
      id: 'demo_3',
      entryType: EntryType.DAILY_CHECKIN,
      date: daysAgo(2),
      time: '21:00',
      createdAt: `${daysAgo(2)}T21:00:00`,
      moods: [MoodStateId.NEUTRO],
      moodOtherText: '',
      hadMoodSwing: false,
      moodSwingDescription: '',
      energyLevel: 6,
      sleep: { hours: 7.5, quality: SleepQuality.REPARADORA, reducedNeed: ReducedSleepNeed.NAO },
      stateDuration: StateDuration.ESTAVEL,
      activationSignals: [],
      triggerContext: '',
      behaviors: [],
      behaviorOtherText: '',
      awareness: AwarenessType.CONSCIENTE,
      resisted: ResistanceResult.SIM,
      urgeIntensity: 1,
      feelingDuring: '',
      feelingAfter: '',
      functionalImpact: {
        work: FunctionalImpactLevel.NENHUM,
        relationships: FunctionalImpactLevel.NENHUM,
        routine: FunctionalImpactLevel.NENHUM,
        note: '',
      },
      notes: 'Boa regularidade de horários hoje.',
      dayEvents: ['Noite de sono reparador', 'Atividade física / movimento'],
      dayEventsNote: '',
    },
    // D-1: Episódio leve parcialmente resistido
    {
      id: 'demo_2',
      entryType: EntryType.EPISODE,
      date: daysAgo(1),
      time: '21:30',
      createdAt: `${daysAgo(1)}T21:30:00`,
      moods: [MoodStateId.NEUTRO, MoodStateId.TEDIO],
      moodOtherText: '',
      hadMoodSwing: false,
      moodSwingDescription: '',
      energyLevel: 4,
      sleep: { hours: 7.0, quality: SleepQuality.BOA, reducedNeed: ReducedSleepNeed.NAO },
      stateDuration: StateDuration.HORAS,
      activationSignals: [],
      triggerContext: 'Fim de noite calmo, leve vontade de comer por tédio',
      behaviors: [
        { categoryId: 'cat_alimentar', categoryName: 'Alimentar', itemId: 'al_automatica', itemLabel: 'Alimentação automática (sem perceber a quantidade)' },
      ],
      behaviorOtherText: '',
      awareness: AwarenessType.CONSCIENTE,
      resisted: ResistanceResult.PARCIALMENTE,
      urgeIntensity: 4,
      feelingDuring: 'Percebi cedo que era tédio e não fome real',
      feelingAfter: 'Comi uma porção pequena e fechei a cozinha sem culpa',
      functionalImpact: {
        work: FunctionalImpactLevel.NENHUM,
        relationships: FunctionalImpactLevel.NENHUM,
        routine: FunctionalImpactLevel.NENHUM,
        note: '',
      },
      notes: 'Melhora perceptível na pausa consciente.',
      dayEvents: ['Noite de sono reparador'],
      dayEventsNote: '',
    },
    // D0 (hoje): Check-in estável
    {
      id: 'demo_1',
      entryType: EntryType.DAILY_CHECKIN,
      date: daysAgo(0),
      time: '10:15',
      createdAt: `${daysAgo(0)}T10:15:00`,
      moods: [MoodStateId.NEUTRO],
      moodOtherText: '',
      hadMoodSwing: false,
      moodSwingDescription: '',
      energyLevel: 6,
      sleep: { hours: 7.5, quality: SleepQuality.BOA, reducedNeed: ReducedSleepNeed.NAO },
      stateDuration: StateDuration.ESTAVEL,
      activationSignals: [],
      triggerContext: '',
      behaviors: [],
      behaviorOtherText: '',
      awareness: AwarenessType.CONSCIENTE,
      resisted: ResistanceResult.SIM,
      urgeIntensity: 1,
      feelingDuring: '',
      feelingAfter: '',
      functionalImpact: {
        work: FunctionalImpactLevel.NENHUM,
        relationships: FunctionalImpactLevel.NENHUM,
        routine: FunctionalImpactLevel.NENHUM,
        note: '',
      },
      notes: 'Manhã tranquila e foco estável.',
      dayEvents: ['Noite de sono reparador'],
      dayEventsNote: '',
    },
  ];

  return seeds.map(completeSample);
}
