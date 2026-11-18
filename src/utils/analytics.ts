import {
  behaviorItemKey,
  buildItemLookup,
  canonicalItemLabel,
  resolveBehaviorItem,
  type ItemLookup,
} from './categories';
import {
  ACTIVATION_SIGNAL_OPTIONS,
  CYCLE_PHASE_OPTIONS,
  MOOD_DEFINITIONS,
  STATE_DURATION_OPTIONS,
} from '../data/defaults';
import {
  ActivationSignal,
  AnalyticsSummary,
  AwarenessType,
  BehaviorCategory,
  BehaviorMode,
  CategoryStat,
  MedicationStatus,
  MenstrualPhaseStat,
  SafetyConcern,
  CycleAnalysis,
  CyclePhaseMetrics,
  DailyPoint,
  EntryType,
  FunctionalImpactLevel,
  InsightItem,
  MetricCoverage,
  MetricKey,
  MoodBehaviorStat,
  MoodStateId,
  PeriodFilter,
  PulseEntry,
  ReducedSleepNeed,
  ResistanceResult,
  SleepQuality,
  StateDuration,
} from '../types/pulsetrack';

/**
 * Retorna YYYY-MM-DD no fuso horário local (evita deslocamento de dia após 21h no Brasil em UTC).
 */
export function toLocalIsoDate(date: Date = new Date()): string {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export function formatShortDate(isoDate: string): string {
  const parts = isoDate.split('-');
  if (parts.length !== 3) return isoDate;
  return `${parts[2]}/${parts[1]}`;
}

export function formatLongDate(isoDate: string): string {
  const parts = isoDate.split('-');
  if (parts.length !== 3) return isoDate;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

function addDays(isoDate: string, delta: number): string {
  const d = new Date(`${isoDate}T12:00:00`);
  d.setDate(d.getDate() + delta);
  return toLocalIsoDate(d);
}

/** Média apenas sobre valores realmente informados; null quando não há nenhum. */
function averageOrNull(values: number[]): number | null {
  if (values.length === 0) return null;
  return Number((values.reduce((sum, v) => sum + v, 0) / values.length).toFixed(1));
}

function reported(values: Array<number | null | undefined>): number[] {
  return values.filter((v): v is number => typeof v === 'number');
}

/** "7.2/10" ou "não informado" — nunca transforma ausência de resposta em zero. */
function metric(value: number | null, suffix = ''): string {
  return value === null ? 'não informado' : `${value}${suffix}`;
}

/** Abaixo disso um percentual distorce mais do que informa: usa-se contagem. */
export const MIN_PERCENT_BASE = 5;

/**
 * Proporção legível e honesta: percentual só com denominador ≥ 5; abaixo disso,
 * "2 de 3 episódios". Nunca devolve "0%" nem "—" sem dizer sobre o que conta.
 */
function proportion(count: number, base: number, noun: string): string {
  if (base <= 0) return `nenhum ${noun}`;
  if (base < MIN_PERCENT_BASE) return `${count} de ${base} ${noun}`;
  return `${Math.round((count / base) * 100)}% dos ${noun} (${count} de ${base})`;
}

/** Frase de base declarada, exibida em todo insight. */
function baseOf(count: number, base: number, noun: string): string {
  return `Base: ${count} de ${base} ${noun}.`;
}

export function getPeriodDays(period: PeriodFilter, entries: PulseEntry[]): number {
  if (period !== 'all') {
    return Number(period);
  }
  if (entries.length === 0) return 30;
  const sortedDates = [...entries].map((e) => e.date).sort();
  const first = new Date(`${sortedDates[0]}T00:00:00`);
  const last = new Date();
  return Math.max(1, Math.round((last.getTime() - first.getTime()) / (1000 * 60 * 60 * 24)) + 1);
}

export function filterEntriesByPeriod(entries: PulseEntry[], period: PeriodFilter): PulseEntry[] {
  if (period === 'all') {
    return [...entries].sort((a, b) => `${b.date}T${b.time}`.localeCompare(`${a.date}T${a.time}`));
  }
  const days = Number(period);
  const cutoff = new Date();
  cutoff.setHours(0, 0, 0, 0);
  cutoff.setDate(cutoff.getDate() - (days - 1));
  const cutoffStr = toLocalIsoDate(cutoff);

  return entries
    .filter((entry) => entry.date >= cutoffStr)
    .sort((a, b) => `${b.date}T${b.time}`.localeCompare(`${a.date}T${a.time}`));
}

/**
 * Conta itens por identidade (itemId, com fallback para label em registros legados)
 * e devolve os rótulos atuais. Renomear um item não divide a contagem: o id é a chave.
 */
function countBehaviorItems(
  entries: PulseEntry[],
  lookup: ItemLookup
): Map<string, { label: string; count: number }> {
  const counts = new Map<string, { label: string; count: number }>();
  for (const entry of entries) {
    const seen = new Set<string>();
    for (const behavior of entry.behaviors) {
      const key = behaviorItemKey(behavior, lookup);
      if (seen.has(key)) continue;
      seen.add(key);
      const existing = counts.get(key);
      counts.set(key, {
        label: canonicalItemLabel(behavior, lookup),
        count: (existing?.count ?? 0) + 1,
      });
    }
  }
  return counts;
}

function getTopItemLabels(
  entries: PulseEntry[],
  lookup: ItemLookup,
  limit = 3
): string[] {
  return [...countBehaviorItems(entries, lookup).values()]
    .sort((a, b) => b.count - a.count)
    .slice(0, limit)
    .map((item) => item.label);
}

export function isEpisodeEntry(entry: PulseEntry): boolean {
  return (
    entry.entryType === EntryType.EPISODE ||
    entry.behaviors.length > 0 ||
    entry.behaviorOtherText.trim().length > 0
  );
}

interface DayBucket {
  date: string;
  entries: PulseEntry[];
  hasEpisode: boolean;
  energyValues: number[];
  sleepValues: number[];
  hasReducedSleepNeed: boolean;
  hasMoodSwing: boolean;
  signals: ActivationSignal[];
  moods: MoodStateId[];
}

function summarizeCyclePhase(buckets: DayBucket[]): CyclePhaseMetrics {
  if (buckets.length === 0) {
    return {
      sampleDays: 0,
      avgEnergy: null,
      avgSleepHours: null,
      reducedSleepNeedRate: 0,
      moodSwingRate: 0,
      topActivationSignal: null,
      dominantMood: null,
    };
  }

  const avgEnergy = averageOrNull(buckets.flatMap((b) => b.energyValues));
  const avgSleepHours = averageOrNull(buckets.flatMap((b) => b.sleepValues));
  const reducedSleepNeedRate = Math.round(
    (buckets.filter((b) => b.hasReducedSleepNeed).length / buckets.length) * 100
  );
  const moodSwingRate = Math.round(
    (buckets.filter((b) => b.hasMoodSwing).length / buckets.length) * 100
  );

  const signalCounts = new Map<ActivationSignal, number>();
  const moodCounts = new Map<MoodStateId, number>();

  for (const b of buckets) {
    for (const sig of b.signals) {
      signalCounts.set(sig, (signalCounts.get(sig) ?? 0) + 1);
    }
    for (const m of b.moods) {
      moodCounts.set(m, (moodCounts.get(m) ?? 0) + 1);
    }
  }

  const topSigId = [...signalCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
  const topMoodId = [...moodCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];

  return {
    sampleDays: buckets.length,
    avgEnergy,
    avgSleepHours,
    reducedSleepNeedRate,
    moodSwingRate,
    topActivationSignal:
      ACTIVATION_SIGNAL_OPTIONS.find((s) => s.id === topSigId)?.label ?? null,
    dominantMood: MOOD_DEFINITIONS.find((m) => m.id === topMoodId)?.label ?? null,
  };
}

/**
 * Analisa os dias anteriores (D-2 a D-1), durante (bloco de episódios) e posteriores (D+1 a D+2)
 * utilizando todos os registros disponíveis para contextualizar cada ciclo longitudinalmente.
 */
function computeCycleAnalysis(allEntries: PulseEntry[], periodEntries: PulseEntry[]): CycleAnalysis {
  const dayMap = new Map<string, DayBucket>();
  const sortedAll = [...allEntries].sort((a, b) => a.date.localeCompare(b.date));

  const byDate = new Map<string, PulseEntry[]>();
  for (const e of sortedAll) {
    const list = byDate.get(e.date) ?? [];
    list.push(e);
    byDate.set(e.date, list);
  }

  for (const [date, list] of byDate.entries()) {
    dayMap.set(date, {
      date,
      entries: list,
      hasEpisode: list.some(isEpisodeEntry),
      energyValues: reported(list.map((e) => e.energyLevel)),
      sleepValues: reported(list.map((e) => e.sleep?.hours)),
      hasReducedSleepNeed: list.some(
        (e) => e.sleep?.reducedNeed && e.sleep.reducedNeed !== ReducedSleepNeed.NAO
      ),
      hasMoodSwing: list.some((e) => e.hadMoodSwing),
      signals: [...new Set(list.flatMap((e) => e.activationSignals ?? []))],
      moods: [...new Set(list.flatMap((e) => e.moods))],
    });
  }

  const periodDatesWithEpisodes = [
    ...new Set(periodEntries.filter(isEpisodeEntry).map((e) => e.date)),
  ].sort();

  if (periodDatesWithEpisodes.length === 0) {
    return {
      analyzedEpisodes: 0,
      before: summarizeCyclePhase([]),
      during: summarizeCyclePhase([]),
      after: summarizeCyclePhase([]),
      findings: [],
    };
  }

  // Agrupa dias consecutivos com episódios em janelas/ciclos para não misturar "durante" com "antes/depois"
  const clusters: Array<{ start: string; end: string; days: string[] }> = [];
  for (const d of periodDatesWithEpisodes) {
    const prev = clusters[clusters.length - 1];
    if (prev && addDays(prev.end, 1) === d) {
      prev.end = d;
      prev.days.push(d);
    } else {
      clusters.push({ start: d, end: d, days: [d] });
    }
  }

  const beforeBuckets = new Map<string, DayBucket>();
  const duringBuckets = new Map<string, DayBucket>();
  const afterBuckets = new Map<string, DayBucket>();

  for (const cluster of clusters) {
    for (const d of cluster.days) {
      const b = dayMap.get(d);
      if (b) duringBuckets.set(d, b);
    }
    for (const offset of [-2, -1]) {
      const d = addDays(cluster.start, offset);
      const b = dayMap.get(d);
      if (b && !b.hasEpisode) beforeBuckets.set(d, b);
    }
    for (const offset of [1, 2]) {
      const d = addDays(cluster.end, offset);
      const b = dayMap.get(d);
      if (b && !b.hasEpisode) afterBuckets.set(d, b);
    }
  }

  const before = summarizeCyclePhase([...beforeBuckets.values()]);
  const during = summarizeCyclePhase([...duringBuckets.values()]);
  const after = summarizeCyclePhase([...afterBuckets.values()]);

  const findings: string[] = [];

  if (before.sampleDays > 0 && during.avgSleepHours !== null && before.avgSleepHours !== null) {
    if (before.reducedSleepNeedRate >= 35 || before.avgSleepHours <= 6) {
      findings.push(
        `Nos dias prévios aos episódios, o sono médio foi de ${before.avgSleepHours}h (com redução da necessidade de sono em ${before.reducedSleepNeedRate}% desses dias).`
      );
    } else {
      findings.push(
        `Antes dos episódios, a média de sono foi de ${before.avgSleepHours}h e a energia média ficou em ${before.avgEnergy}/10.`
      );
    }
  }

  if (
    during.avgEnergy !== null &&
    after.avgEnergy !== null &&
    after.sampleDays > 0
  ) {
    if (during.avgEnergy - after.avgEnergy >= 1.5) {
      findings.push(
        `Observa-se queda de energia após os episódios (média de ${during.avgEnergy}/10 durante para ${after.avgEnergy}/10 nos dias seguintes), sugerindo efeito rebote ou exaustão.`
      );
    } else if (after.avgSleepHours !== null && during.avgSleepHours !== null && after.avgSleepHours - during.avgSleepHours >= 1.2) {
      findings.push(
        `Nos dias posteriores aos episódios, o sono aumentou de ${during.avgSleepHours}h para ${after.avgSleepHours}h como possível compensação.`
      );
    }
  }

  if (before.topActivationSignal) {
    findings.push(
      `Sinal de ativação mais presente nos dias anteriores: "${before.topActivationSignal}".`
    );
  }

  return {
    analyzedEpisodes: periodEntries.filter(isEpisodeEntry).length,
    before,
    during,
    after,
    findings,
  };
}

/** Agrupamento de cobertura por seção do relatório ("informado em X de Y"). */
export const COVERAGE_SECTIONS: Array<{ id: string; label: string; metrics: MetricKey[] }> = [
  { id: 'emocional', label: 'Estado emocional', metrics: ['mood', 'valence'] },
  {
    id: 'ativacao',
    label: 'Ativação e sono',
    metrics: ['energy', 'sleepHours', 'sleepQuality', 'stateDuration', 'activationSignals'],
  },
  { id: 'comportamento', label: 'Comportamento e impulso', metrics: ['behavior', 'urge', 'awareness'] },
  {
    id: 'contexto',
    label: 'Impacto, medicação e segurança',
    metrics: ['functionalImpact', 'medication', 'safety', 'cycle', 'notes'],
  },
];

export interface SectionCoverage {
  id: string;
  label: string;
  answered: number;
  base: number;
}

/** Soma os eixos de cada seção; seções sem base não inventam percentual. */
export function summarizeCoverage(
  coverage: Record<MetricKey, MetricCoverage>
): SectionCoverage[] {
  return COVERAGE_SECTIONS.map((section) => {
    const answered = section.metrics.reduce((sum, key) => sum + (coverage[key]?.answered ?? 0), 0);
    const base = section.metrics.reduce((sum, key) => sum + (coverage[key]?.base ?? 0), 0);
    return { id: section.id, label: section.label, answered, base };
  });
}

/**
 * Motor analítico longitudinal offline do PulseTrack.
 */
export function computeAnalytics(
  allEntries: PulseEntry[],
  categories: BehaviorCategory[],
  period: PeriodFilter
): AnalyticsSummary {
  const entries = filterEntriesByPeriod(allEntries, period);
  const itemLookup = buildItemLookup(categories);
  const periodDays = getPeriodDays(period, entries);
  const totalEntries = entries.length;

  const episodes = entries.filter(isEpisodeEntry);
  const checkinsOnly = entries.filter((e) => !isEpisodeEntry(e));

  const totalEpisodes = episodes.length;
  const totalCheckinsOnly = checkinsOnly.length;

  const daysLogged = new Set(entries.map((e) => e.date)).size;
  const daysWithEpisodes = new Set(episodes.map((e) => e.date)).size;
  // Dias acompanhados sem episódio — não confundir com dias em que nada foi registrado.
  const daysWithoutEpisodes = Math.max(0, daysLogged - daysWithEpisodes);
  const daysWithoutLog = Math.max(0, periodDays - daysLogged);

  // Todas as médias usam apenas registros que informaram o campo. Sem resposta => null,
  // e o relatório mostra "não informado" em vez de um zero ou de um valor padrão inventado.
  const urgeValues = reported(entries.map((e) => e.urgeIntensity));
  const avgUrgeIntensity = averageOrNull(urgeValues);

  const energyValues = reported(entries.map((e) => e.energyLevel));
  const avgEnergy = averageOrNull(energyValues);

  const sleepValues = reported(entries.map((e) => e.sleep?.hours));
  const avgSleepHours = averageOrNull(sleepValues);

  const valenceValues = reported(entries.map((e) => e.valence));
  const avgValence = averageOrNull(valenceValues);

  const sleepReportedCount = entries.filter(
    (e) => typeof e.sleep?.hours === 'number' || e.sleep?.quality !== null
  ).length;

  const reducedSleepNeedCount = entries.filter(
    (e) => e.sleep?.reducedNeed && e.sleep.reducedNeed !== ReducedSleepNeed.NAO
  ).length;
  const reducedSleepNeedBase = entries.filter((e) => Boolean(e.sleep?.reducedNeed)).length;
  const reducedSleepNeedRate =
    reducedSleepNeedBase > 0
      ? Math.round((reducedSleepNeedCount / reducedSleepNeedBase) * 100)
      : 0;

  const poorSleepCount = entries.filter(
    (e) =>
      e.sleep?.quality === SleepQuality.MUITO_RUIM ||
      e.sleep?.quality === SleepQuality.RUIM ||
      (typeof e.sleep?.hours === 'number' && e.sleep.hours < 6)
  ).length;

  const noFatigueAfterShortSleepCount = entries.filter(
    (e) =>
      e.sleep?.noFatigueAfterShortSleep === true &&
      typeof e.sleep?.hours === 'number' &&
      e.sleep.hours <= 6
  ).length;

  // Duração dos estados — base = quem respondeu (não o total de registros)
  const durationBase = entries.filter((e) => e.stateDuration !== null).length;
  const durationDistribution = STATE_DURATION_OPTIONS.map((opt) => {
    const count = entries.filter((e) => e.stateDuration === opt.id).length;
    return {
      id: opt.id,
      label: opt.label,
      count,
      percentage: durationBase > 0 ? Math.round((count / durationBase) * 100) : 0,
    };
  }).filter((d) => d.count > 0);

  // Sinais de ativação
  const activationSignalStats = ACTIVATION_SIGNAL_OPTIONS.map((opt) => {
    const count = entries.filter((e) => e.activationSignals?.includes(opt.id)).length;
    return {
      id: opt.id,
      label: opt.label,
      count,
      percentage: totalEntries > 0 ? Math.round((count / totalEntries) * 100) : 0,
    };
  }).sort((a, b) => b.count - a.count);

  // Impacto funcional
  const isModerateOrHigh = (lvl?: FunctionalImpactLevel | null) =>
    lvl === FunctionalImpactLevel.MODERADO || lvl === FunctionalImpactLevel.INTENSO;

  const workModerateOrHigh = entries.filter((e) => isModerateOrHigh(e.functionalImpact?.work)).length;
  const relationshipsModerateOrHigh = entries.filter((e) =>
    isModerateOrHigh(e.functionalImpact?.relationships)
  ).length;
  const routineModerateOrHigh = entries.filter((e) =>
    isModerateOrHigh(e.functionalImpact?.routine)
  ).length;
  const anySignificantImpactCount = entries.filter(
    (e) =>
      isModerateOrHigh(e.functionalImpact?.work) ||
      isModerateOrHigh(e.functionalImpact?.relationships) ||
      isModerateOrHigh(e.functionalImpact?.routine)
  ).length;

  const functionalImpactSummary = {
    workModerateOrHigh,
    relationshipsModerateOrHigh,
    routineModerateOrHigh,
    anySignificantImpactRate:
      totalEntries > 0 ? Math.round((anySignificantImpactCount / totalEntries) * 100) : 0,
    unansweredCount: entries.filter(
      (e) =>
        !e.functionalImpact?.work &&
        !e.functionalImpact?.relationships &&
        !e.functionalImpact?.routine
    ).length,
  };

  // Consciência e resistência (calculados prioritariamente sobre episódios comportamentais)
  const behaviorBase = episodes.length > 0 ? episodes : entries;
  const awarenessBreakdown = {
    consciente: behaviorBase.filter((e) => e.awareness === AwarenessType.CONSCIENTE).length,
    automatico: behaviorBase.filter((e) => e.awareness === AwarenessType.AUTOMATICO).length,
    mistura: behaviorBase.filter((e) => e.awareness === AwarenessType.MISTURA).length,
    naoInformado: behaviorBase.filter((e) => !e.awareness).length,
  };

  const resistanceBreakdown = {
    sim: behaviorBase.filter((e) => e.resisted === ResistanceResult.SIM).length,
    parcialmente: behaviorBase.filter((e) => e.resisted === ResistanceResult.PARCIALMENTE).length,
    nao: behaviorBase.filter((e) => e.resisted === ResistanceResult.NAO).length,
    naoInformado: behaviorBase.filter((e) => !e.resisted).length,
  };

  // Impulso x ação: base para não contar como ocorrência o que não aconteceu.
  const allBehaviors = entries.flatMap((e) => e.behaviors);
  const behaviorModes = {
    feitos: allBehaviors.filter((b) => b.mode === BehaviorMode.FEITO).length,
    impulsos: allBehaviors.filter((b) => b.mode === BehaviorMode.IMPULSO).length,
    comPrejuizo: allBehaviors.filter((b) => b.harm).length,
    registrosComImpulsoSemAcao: entries.filter(
      (e) =>
        e.behaviors.length > 0 &&
        e.behaviors.every((b) => b.mode === BehaviorMode.IMPULSO)
    ).length,
  };

  const safetySummary = {
    pensamentosMorte: entries.filter(
      (e) => e.safetyConcern === SafetyConcern.PENSAMENTOS_MORTE
    ).length,
    autolesao: entries.filter((e) => e.safetyConcern === SafetyConcern.AUTOLESAO).length,
    naoResponder: entries.filter((e) => e.safetyConcern === SafetyConcern.NAO_RESPONDER).length,
  };

  const medicationBase = entries.filter((e) => Boolean(e.medication?.status));
  const medicationSummary = {
    regular: medicationBase.filter((e) => e.medication.status === MedicationStatus.USO_REGULAR)
      .length,
    esquecida: medicationBase.filter((e) => e.medication.status === MedicationStatus.ESQUECI)
      .length,
    parcial: medicationBase.filter((e) => e.medication.status === MedicationStatus.PARCIAL).length,
    naoUso: medicationBase.filter((e) => e.medication.status === MedicationStatus.NAO_USO).length,
    naoInformado: entries.length - medicationBase.length,
  };

  const menstrualPhaseStats: MenstrualPhaseStat[] = CYCLE_PHASE_OPTIONS.map((opt) => {
      const phaseEntries = entries.filter((e) => e.cyclePhase === opt.id);
      return {
        phase: opt.id,
        label: opt.label,
        entries: phaseEntries.length,
        avgEnergy: averageOrNull(reported(phaseEntries.map((e) => e.energyLevel))),
        avgValence: averageOrNull(reported(phaseEntries.map((e) => e.valence))),
        avgSleepHours: averageOrNull(reported(phaseEntries.map((e) => e.sleep?.hours))),
        episodeRate:
          phaseEntries.length > 0
            ? Math.round(
                (phaseEntries.filter(isEpisodeEntry).length / phaseEntries.length) * 100
              )
            : 0,
      };
    })
    .filter((stat) => stat.entries > 0);

  // Frequência por categoria
  const catColorMap = new Map<string, string>();
  for (const c of categories) {
    catColorMap.set(c.id, c.color);
  }

  const catAgg = new Map<
    string,
    {
      categoryId: string;
      categoryName: string;
      color: string;
      entryIds: Set<string>;
      urgeSum: number;
      urgeCount: number;
      harmEntryIds: Set<string>;
      itemCounts: Map<string, { label: string; count: number }>;
    }
  >();

  for (const entry of episodes) {
    const seenCatsInEntry = new Set<string>();
    for (const b of entry.behaviors) {
      if (!catAgg.has(b.categoryId)) {
        catAgg.set(b.categoryId, {
          categoryId: b.categoryId,
          categoryName: b.categoryName,
          color: catColorMap.get(b.categoryId) ?? '#3B6F8F',
          entryIds: new Set(),
          urgeSum: 0,
          urgeCount: 0,
          harmEntryIds: new Set(),
          itemCounts: new Map(),
        });
      }
      const bucket = catAgg.get(b.categoryId)!;
      if (b.harm) bucket.harmEntryIds.add(entry.id);
      if (!seenCatsInEntry.has(b.categoryId)) {
        bucket.entryIds.add(entry.id);
        if (typeof entry.urgeIntensity === 'number') {
          bucket.urgeSum += entry.urgeIntensity;
          bucket.urgeCount += 1;
        }
        seenCatsInEntry.add(b.categoryId);
      }
      // Agrupa por identidade do item; o rótulo exibido é o atual do catálogo.
      const itemKey = behaviorItemKey(b, itemLookup);
      const existing = bucket.itemCounts.get(itemKey);
      bucket.itemCounts.set(itemKey, {
        label: canonicalItemLabel(b, itemLookup),
        count: (existing?.count ?? 0) + 1,
      });
    }
  }

  const categoryStats: CategoryStat[] = [...catAgg.values()]
    .map((bucket) => {
      const count = bucket.entryIds.size;
      const topItems = [...bucket.itemCounts.values()]
        .sort((a, b) => b.count - a.count)
        .slice(0, 4)
        .map((item) => ({ label: item.label, count: item.count }));

      return {
        categoryId: bucket.categoryId,
        categoryName: bucket.categoryName,
        color: bucket.color,
        count,
        percentage: totalEpisodes > 0 ? Math.round((count / totalEpisodes) * 100) : 0,
        avgUrge:
          bucket.urgeCount > 0
            ? Number((bucket.urgeSum / bucket.urgeCount).toFixed(1))
            : null,
        harmCount: bucket.harmEntryIds.size,
        topItems,
      };
    })
    .sort((a, b) => b.count - a.count);

  // Relação Humor x Energia x Vontade (inclui todos os dias registrados)
  const moodStats: MoodBehaviorStat[] = MOOD_DEFINITIONS.map((moodDef) => {
    const matching = entries.filter((e) => e.moods.includes(moodDef.id));
    const count = matching.length;
    // A vontade só existe em episódios: incluir check-ins (urge 0) diluiria a média.
    const moodEpisodes = matching.filter(isEpisodeEntry);
    const episodeCount = moodEpisodes.length;
    return {
      moodId: moodDef.id,
      label: moodDef.label,
      count,
      episodeCount,
      episodeRate: count > 0 ? Math.round((episodeCount / count) * 100) : 0,
      avgEnergy: averageOrNull(reported(matching.map((e) => e.energyLevel))),
      avgValence: averageOrNull(reported(matching.map((e) => e.valence))),
      avgUrge: averageOrNull(reported(moodEpisodes.map((e) => e.urgeIntensity))),
      colorLight: moodDef.colorLight,
      colorDark: moodDef.colorDark,
      colorHighContrast: moodDef.colorHighContrast,
    };
  }).filter((m) => m.count > 0);

  // Linha do tempo conjunta (humor + energia + sono + episódios)
  const timelineLength = Math.min(periodDays, 30);
  const dailyTimeline: DailyPoint[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let i = timelineLength - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const iso = toLocalIsoDate(d);
    const dayEntries = entries.filter((e) => e.date === iso);
    const dayEpisodes = dayEntries.filter(isEpisodeEntry);

    const primaryMoodId = dayEntries[0]?.moods[0] ?? null;
    const primaryMoodDef = primaryMoodId
      ? MOOD_DEFINITIONS.find((m) => m.id === primaryMoodId) ?? null
      : null;

    dailyTimeline.push({
      date: iso,
      shortLabel: formatShortDate(iso),
      totalEntries: dayEntries.length,
      episodeCount: dayEpisodes.length,
      hasCheckinOnly: dayEntries.length > 0 && dayEpisodes.length === 0,
      avgEnergy: averageOrNull(reported(dayEntries.map((e) => e.energyLevel))),
      avgValence: averageOrNull(reported(dayEntries.map((e) => e.valence))),
      avgSleepHours: averageOrNull(reported(dayEntries.map((e) => e.sleep?.hours))),
      hasReducedSleepNeed: dayEntries.some(
        (e) => e.sleep?.reducedNeed && e.sleep.reducedNeed !== ReducedSleepNeed.NAO
      ),
      avgUrge: averageOrNull(reported(dayEpisodes.map((e) => e.urgeIntensity))),
      hasMoodSwing: dayEntries.some((e) => e.hadMoodSwing),
      primaryMoodLabel: primaryMoodDef?.label ?? null,
      primaryMoodColorLight: primaryMoodDef?.colorLight ?? null,
      primaryMoodColorDark: primaryMoodDef?.colorDark ?? null,
      primaryMoodColorHC: primaryMoodDef?.colorHighContrast ?? null,
      activationCount: new Set(dayEntries.flatMap((e) => e.activationSignals ?? [])).size,
    });
  }

  // Análise longitudinal de ciclos (Antes x Durante x Depois)
  const cycleAnalysis = computeCycleAnalysis(allEntries, entries);

  // Indicadores clínicos relevantes para bipolaridade e compulsões.
  // Energia alta isolada não basta: hiperfoco e ativação ansiosa também marcam 8-10.
  // Por isso o indicador exige a combinação com redução da necessidade de sono,
  // o sinal mais específico de ativação de humor.
  const hasReducedSleepNeedSignal = (e: PulseEntry): boolean =>
    e.sleep?.reducedNeed === ReducedSleepNeed.LEVE ||
    e.sleep?.reducedNeed === ReducedSleepNeed.MARCANTE;

  const highEnergyList = episodes.filter(
    (e) =>
      typeof e.energyLevel === 'number' &&
      e.energyLevel >= 8 &&
      hasReducedSleepNeedSignal(e)
  );
  const lowEnergyReliefList = episodes.filter(
    (e) =>
      (typeof e.energyLevel === 'number' && e.energyLevel <= 3) ||
      e.moods.includes(MoodStateId.TRISTE_VAZIO) ||
      e.moods.includes(MoodStateId.APATIA_EXAUSTAO)
  );
  const lowEnergyAutoCount = lowEnergyReliefList.filter(
    (e) => e.awareness === AwarenessType.AUTOMATICO || e.awareness === AwarenessType.MISTURA
  ).length;

  const moodSwingList = entries.filter((e) => e.hadMoodSwing);
  const moodSwingEpisodes = episodes.filter((e) => e.hadMoodSwing);
  const moodSwingNoResist = moodSwingEpisodes.filter(
    (e) => e.resisted === ResistanceResult.NAO
  ).length;

  const obsessiveThoughtsCount = entries.filter(
    (e) =>
      e.behaviors.some(
        (b) =>
          b.itemId === 'out_obsessivos' || b.itemLabel.toLowerCase().includes('obsessiv')
      ) ||
      e.triggerContext.toLowerCase().includes('obsessiv') ||
      e.notes.toLowerCase().includes('obsessiv')
  ).length;

  const expectationDropPatternCount = episodes.filter((e) => {
    const during = `${e.feelingDuring} ${e.triggerContext}`.toLowerCase();
    const after = `${e.feelingAfter} ${e.notes}`.toLowerCase();
    const hasExpectationOrHigh =
      e.moods.includes(MoodStateId.EUFORICO_AGITADO) ||
      during.includes('expectativa') ||
      during.includes('euforia') ||
      during.includes('adrenalina') ||
      during.includes('urgência') ||
      during.includes('estímulo') ||
      e.behaviors.some((b) => b.categoryId === 'cat_afetiva' || b.categoryId === 'cat_sexual');

    const hasDropAfter =
      after.includes('queda') ||
      after.includes('desinteresse') ||
      after.includes('perda de interesse') ||
      after.includes('vazio') ||
      after.includes('exaust') ||
      after.includes('culpa') ||
      after.includes('arrepend') ||
      after.includes('abrupta') ||
      after.includes('descarga');

    return hasExpectationOrHigh && hasDropAfter;
  }).length;

  const bipolarIndicators = {
    highEnergyEpisodes: highEnergyList.length,
    highEnergyPercent:
      totalEpisodes > 0 ? Math.round((highEnergyList.length / totalEpisodes) * 100) : 0,
    highEnergyAvgUrge: averageOrNull(reported(highEnergyList.map((e) => e.urgeIntensity))),
    highEnergyTopBehaviors: getTopItemLabels(highEnergyList, itemLookup, 3),

    lowEnergyReliefEpisodes: lowEnergyReliefList.length,
    lowEnergyPercent:
      totalEpisodes > 0 ? Math.round((lowEnergyReliefList.length / totalEpisodes) * 100) : 0,
    lowEnergyAutomaticRate:
      lowEnergyReliefList.length > 0
        ? Math.round((lowEnergyAutoCount / lowEnergyReliefList.length) * 100)
        : 0,
    lowEnergyTopBehaviors: getTopItemLabels(lowEnergyReliefList, itemLookup, 3),

    moodSwingEntries: moodSwingList.length,
    moodSwingPercent: totalEntries > 0 ? Math.round((moodSwingList.length / totalEntries) * 100) : 0,
    moodSwingAvgUrge: averageOrNull(reported(moodSwingEpisodes.map((e) => e.urgeIntensity))),
    moodSwingNoResistRate:
      moodSwingEpisodes.length > 0
        ? Math.round((moodSwingNoResist / moodSwingEpisodes.length) * 100)
        : 0,

    obsessiveThoughtsCount,
    expectationDropPatternCount,
  };

  // Comparativo de evolução: período atual vs janela imediatamente anterior de mesmo tamanho.
  // Na visão "Tudo" não existe janela anterior, então o período é dividido ao meio.
  let basis: AnalyticsSummary['evolution']['basis'] =
    period === 'all' ? 'metades' : 'periodo_anterior';

  const currentWindowStart = new Date();
  currentWindowStart.setHours(0, 0, 0, 0);
  currentWindowStart.setDate(currentWindowStart.getDate() - (periodDays - 1));
  const previousWindowEnd = new Date(currentWindowStart);
  previousWindowEnd.setDate(previousWindowEnd.getDate() - 1);
  const previousWindowStart = new Date(previousWindowEnd);
  previousWindowStart.setDate(previousWindowStart.getDate() - (periodDays - 1));

  const previousWindowStartStr = toLocalIsoDate(previousWindowStart);
  const previousWindowEndStr = toLocalIsoDate(previousWindowEnd);

  let previousWindowEntries: PulseEntry[] = [];
  let currentWindowEpisodes: PulseEntry[] = episodes;

  if (period !== 'all') {
    previousWindowEntries = allEntries.filter(
      (e) => e.date >= previousWindowStartStr && e.date <= previousWindowEndStr
    );
    // Sem nenhum registro na janela anterior, compara as metades do próprio período
    // (evita "indisponível" para quem acabou de começar a registrar).
    if (previousWindowEntries.length === 0) {
      basis = 'metades';
    }
  }

  if (basis === 'metades') {
    const halfDays = Math.max(1, Math.floor(periodDays / 2));
    const splitDate = new Date();
    splitDate.setHours(0, 0, 0, 0);
    splitDate.setDate(splitDate.getDate() - (halfDays - 1));
    const splitStr = toLocalIsoDate(splitDate);
    previousWindowEntries = entries.filter((e) => e.date < splitStr);
    currentWindowEpisodes = episodes.filter((e) => e.date >= splitStr);
  }

  const previousWindowEpisodes = previousWindowEntries.filter(isEpisodeEntry);
  const prevCount = previousWindowEpisodes.length;
  const currCount = currentWindowEpisodes.length;  const prevUrge = averageOrNull(reported(previousWindowEpisodes.map((e) => e.urgeIntensity)));
  const currUrge = averageOrNull(reported(currentWindowEpisodes.map((e) => e.urgeIntensity)));

  const hasBaselineRecords = previousWindowEntries.length > 0;
  const comparisonLabel =
    basis === 'periodo_anterior'
      ? `o período anterior de ${periodDays} dias`
      : 'a metade inicial do período';

  // Margens de significância: queda >= 40% ou +1,5 ponto na vontade (melhora);
  // aumento >= 50% (ou surgimento de 2+ episódios) ou +1,5 ponto (piora).
  const countDropRate = prevCount >= 2 ? (prevCount - currCount) / prevCount : 0;
  const countRiseRate = prevCount >= 2 ? (currCount - prevCount) / prevCount : 0;
  const countDelta = currCount - prevCount;
  const urgeDelta =
    prevUrge !== null && currUrge !== null ? Number((currUrge - prevUrge).toFixed(1)) : 0;

  // Motivo explícito de cada veredito (o texto precisa dizer o que disparou o alerta)
  const countPercent = (value: number) => Math.abs(Math.round(value * 100));
  const improvementReasons: string[] = [];
  if (countDelta <= -2 || countDropRate >= 0.4) {
    improvementReasons.push(
      `${prevCount} → ${currCount} episódio(s), ${countPercent(countDropRate)}% a menos`
    );
  }
  if (urgeDelta <= -1.5) {
    improvementReasons.push(
      `vontade média ${metric(prevUrge, '/10')} → ${metric(currUrge, '/10')}`
    );
  }

  const worseningReasons: string[] = [];
  if (countDelta >= 2 || countRiseRate >= 0.5) {
    worseningReasons.push(
      `${prevCount} → ${currCount} episódio(s), ${countPercent(countRiseRate)}% a mais`
    );
  }
  if (urgeDelta >= 1.5) {
    worseningReasons.push(
      `vontade média ${metric(prevUrge, '/10')} → ${metric(currUrge, '/10')}`
    );
  }

  let evolution: AnalyticsSummary['evolution'];
  if (!hasBaselineRecords || prevCount + currCount < 2) {
    evolution = {
      status: 'insuficiente',
      label: 'Comparação indisponível',
      description: hasBaselineRecords
        ? `Há ${currCount} episódio(s) no período atual e ${prevCount} na referência (${comparisonLabel}) — base pequena demais para afirmar piora ou melhora. Continue registrando diariamente.`
        : `Ainda não há registros anteriores para comparar (referência: ${comparisonLabel}). Continue registrando para liberar o alerta de piora ou melhora.`,
      basis,
      previousCount: prevCount,
      currentCount: currCount,
      previousUrge: prevUrge,
      currentUrge: currUrge,
    };
  } else if (countDelta <= -2 || countDropRate >= 0.4 || urgeDelta <= -1.5) {
    evolution = {
      status: 'melhora',
      label: 'Tendência de melhora',
      description: `Melhora (referência: ${comparisonLabel}): ${improvementReasons.join(' · ')}. Critério: queda de 40% ou mais nos episódios, ou 1,5 ponto ou mais na vontade média.`,
      basis,
      previousCount: prevCount,
      currentCount: currCount,
      previousUrge: prevUrge,
      currentUrge: currUrge,
    };
  } else if (countDelta >= 2 || countRiseRate >= 0.5 || urgeDelta >= 1.5) {
    evolution = {
      status: 'piora',
      label: 'Tendência de piora',
      description: `Piora (referência: ${comparisonLabel}): ${worseningReasons.join(' · ')}. Critério: aumento de 50% ou mais (ou 2 episódios a mais), ou 1,5 ponto ou mais na vontade média. Vale observar sono e sinais de ativação.`,
      basis,
      previousCount: prevCount,
      currentCount: currCount,
      previousUrge: prevUrge,
      currentUrge: currUrge,
    };
  } else {
    evolution = {
      status: 'estabilidade',
      label: 'Sem mudança significativa',
      description: `Sem mudança significativa (referência: ${comparisonLabel}): ${prevCount} → ${currCount} episódio(s), vontade média ${metric(prevUrge, '/10')} → ${metric(currUrge, '/10')}.`,
      basis,
      previousCount: prevCount,
      currentCount: currCount,
      previousUrge: prevUrge,
      currentUrge: currUrge,
    };
  }

  // Principais gatilhos e eventos do dia
  const triggerCounts = new Map<string, number>();
  const eventCounts = new Map<string, number>();
  for (const e of entries) {
    const cleanTrigger = e.triggerContext.trim();
    if (cleanTrigger) {
      triggerCounts.set(cleanTrigger, (triggerCounts.get(cleanTrigger) ?? 0) + 1);
    }
    for (const ev of e.dayEvents) {
      eventCounts.set(ev, (eventCounts.get(ev) ?? 0) + 1);
    }
  }

  const topTriggers = [...triggerCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([label, count]) => ({ label, count }));

  const topDayEvents = [...eventCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([label, count]) => ({ label, count }));

  // Cruzamento por categoria: humor predominante e grau de consciência de cada tipo de comportamento
  interface CategoryCross {
    categoryId: string;
    categoryName: string;
    episodeCount: number;
    topMoodLabel: string | null;
    topMoodCount: number;
    topMoodShare: number;
    automaticCount: number;
    mixedCount: number;
    consciousCount: number;
    automaticShare: number;
  }

  const episodesByCategory = new Map<string, { name: string; list: PulseEntry[] }>();
  for (const entry of episodes) {
    const seen = new Set<string>();
    for (const behavior of entry.behaviors) {
      if (seen.has(behavior.categoryId)) continue;
      seen.add(behavior.categoryId);
      const acc = episodesByCategory.get(behavior.categoryId) ?? {
        name: behavior.categoryName,
        list: [],
      };
      acc.list.push(entry);
      episodesByCategory.set(behavior.categoryId, acc);
    }
  }

  const categoryCross: CategoryCross[] = [...episodesByCategory.entries()].map(
    ([categoryId, { name, list }]) => {
      const moodCounts = new Map<MoodStateId, number>();
      for (const e of list) {
        for (const mood of new Set(e.moods)) {
          moodCounts.set(mood, (moodCounts.get(mood) ?? 0) + 1);
        }
      }
      const topMood = [...moodCounts.entries()].sort((a, b) => b[1] - a[1])[0];
      const automaticCount = list.filter((e) => e.awareness === AwarenessType.AUTOMATICO).length;

      return {
        categoryId,
        categoryName: name,
        episodeCount: list.length,
        topMoodLabel: topMood
          ? MOOD_DEFINITIONS.find((m) => m.id === topMood[0])?.label ?? null
          : null,
        topMoodCount: topMood?.[1] ?? 0,
        topMoodShare: list.length > 0 ? Math.round(((topMood?.[1] ?? 0) / list.length) * 100) : 0,
        automaticCount,
        mixedCount: list.filter((e) => e.awareness === AwarenessType.MISTURA).length,
        consciousCount: list.filter((e) => e.awareness === AwarenessType.CONSCIENTE).length,
        automaticShare: list.length > 0 ? Math.round((automaticCount / list.length) * 100) : 0,
      };
    }
  );

  // Comparação de itens de comportamento entre alta energia (mesma base dos indicadores
  // bipolares) e os demais episódios do período.
  const otherEnergyEpisodes = episodes.filter((e) => !highEnergyList.includes(e));
  interface EnergyShift {
    label: string;
    highShare: number;
    otherShare: number;
    deltaPoints: number;
    highCount: number;
    highTotal: number;
  }

  let energyShift: EnergyShift | null = null;

  if (highEnergyList.length >= 3 && otherEnergyEpisodes.length >= 3) {
    const sharePerItem = (list: PulseEntry[]) => {
      const counts = new Map<string, { label: string; count: number }>();
      for (const entry of list) {
        for (const behavior of entry.behaviors) {
          const item = resolveBehaviorItem(behavior, itemLookup);
          // Sem identidade resolvível, o rótulo normalizado ainda evita colisão de caixa.
          const key = item ? `id:${item.itemId}` : `label:${behavior.itemLabel.trim().toLowerCase()}`;
          const existing = counts.get(key);
          counts.set(key, {
            label: item?.label ?? behavior.itemLabel,
            count: (existing?.count ?? 0) + 1,
          });
        }
      }
      return counts;
    };

    const highCounts = sharePerItem(highEnergyList);
    const otherCounts = sharePerItem(otherEnergyEpisodes);
    let best: EnergyShift | null = null;

    for (const [itemKey, high] of highCounts.entries()) {
      const highShare = Math.round((high.count / highEnergyList.length) * 100);
      const otherShare = Math.round(
        ((otherCounts.get(itemKey)?.count ?? 0) / otherEnergyEpisodes.length) * 100
      );
      const deltaPoints = highShare - otherShare;
      if (deltaPoints >= 20 && (!best || deltaPoints > best.deltaPoints)) {
        best = {
          label: high.label,
          highShare,
          otherShare,
          deltaPoints,
          highCount: high.count,
          highTotal: highEnergyList.length,
        };
      }
    }
    energyShift = best;
  }

  // Insights automáticos (incluindo sono, duração, sinais de ativação e ciclos)
  const insights: InsightItem[] = [];

  if (totalEntries > 0) {
    // Base mínima: uma média de sono com 1–2 noites não sustenta leitura nenhuma.
    if (sleepValues.length >= 3) {
      insights.push({
        id: 'ins_sleep',
        title: 'Sono e redução da necessidade de sono',
        category: 'bipolaridade',
        summary: `Média de ${metric(avgSleepHours, 'h')} de sono por noite entre as ${sleepValues.length} noites informadas. Redução da necessidade de sono apareceu em ${proportion(reducedSleepNeedCount, reducedSleepNeedBase, 'registros que responderam sobre isso')}.`,
        detail:
          reducedSleepNeedCount > 0
            ? 'Dormir poucas horas e ainda assim acordar com energia alta ou sem cansaço é um marcador clínico relevante para diferenciar ativação de humor de uma privação comum de sono.'
            : poorSleepCount > 0
            ? `Foram registrados ${poorSleepCount} dia(s) com sono ruim ou inferior a 6h, fator que reduz o limiar para impulsividade. A redução da necessidade de sono não foi marcada.`
            : 'Nenhuma noite informada ficou abaixo de 6h ou foi marcada como ruim, e a redução da necessidade de sono não apareceu neste recorte.',
        metricLabel: `Sono informado: ${sleepValues.length} de ${totalEntries} registros`,
        basis: `Base: ${sleepValues.length} de ${totalEntries} registro(s) com horas de sono informadas; ${reducedSleepNeedBase} responderam sobre redução da necessidade de sono.`,
      });
    }

    if (cycleAnalysis.findings.length > 0 && cycleAnalysis.analyzedEpisodes >= 2) {
      insights.push({
        id: 'ins_cycle',
        title: 'Padrão longitudinal (antes, durante e depois)',
        category: 'ciclo',
        summary: cycleAnalysis.findings[0],
        detail: cycleAnalysis.findings.slice(1).join(' ') || 'Comparação baseada nos dias adjacentes registrados antes e depois dos blocos de episódios.',
        metricLabel: `${cycleAnalysis.analyzedEpisodes} episódio(s) em ciclo`,
        basis: `Base: ${cycleAnalysis.analyzedEpisodes} episódio(s) em ${cycleAnalysis.during.sampleDays} dia(s), comparados a ${cycleAnalysis.before.sampleDays} dia(s) antes e ${cycleAnalysis.after.sampleDays} depois.`,
      });
    }

    const multiDayCount = entries.filter(
      (e) =>
        e.stateDuration === StateDuration.DIAS_1_3 ||
        e.stateDuration === StateDuration.DIAS_4_6 ||
        e.stateDuration === StateDuration.DIAS_7_13 ||
        e.stateDuration === StateDuration.DIAS_14_MAIS
    ).length;
    const topSignal = activationSignalStats.find((s) => s.count > 0);
    const sustainedSignalBase = multiDayCount >= 2 || (topSignal?.count ?? 0) >= 3;
    if (sustainedSignalBase) {
      insights.push({
        id: 'ins_activation_duration',
        title: 'Duração dos estados e sinais de ativação',
        category: 'bipolaridade',
        summary: `${multiDayCount} registro(s) indicaram estados sustentados por dias ou semanas.${
          topSignal ? ` Sinal mais frequente: "${topSignal.label}" (${topSignal.count}x).` : ''
        }`,
        detail:
          'Separar se a aceleração mental ou irritabilidade dura algumas horas (mais comum em picos de TDAH/estresse) ou vários dias seguidos ajuda o psiquiatra na investigação diagnóstica.',
        metricLabel: `${multiDayCount} estados multi-dias`,
        basis: `Base: ${totalEntries} registro(s) no período; ${multiDayCount} descreveram duração de dias ou semanas${
          topSignal ? ` e ${topSignal.count} marcaram "${topSignal.label}"` : ''
        }.`,
      });
    }

    // Comparações entre grupos só entram com pelo menos 2 episódios de cada lado.
    if (bipolarIndicators.highEnergyEpisodes > 0 && totalEpisodes >= 2) {
      const topList =
        bipolarIndicators.highEnergyTopBehaviors.length > 0
          ? `Mais frequentes: ${bipolarIndicators.highEnergyTopBehaviors.join(', ')}.`
          : '';
      insights.push({
        id: 'ins_high_energy',
        title: 'Impulsividade em estados de alta energia ou euforia',
        category: 'bipolaridade',
        summary: `${proportion(
          bipolarIndicators.highEnergyEpisodes,
          totalEpisodes,
          'episódios'
        )} ocorreram com energia ≥ 8/10 combinada à redução da necessidade de sono.`,
        detail: `Nestes momentos, a intensidade média da vontade foi de ${metric(
          bipolarIndicators.highEnergyAvgUrge,
          '/10'
        )}. Energia alta isolada (hiperfoco, ansiedade, cafeína) não entra neste indicador. ${topList}`,
        metricLabel: `${bipolarIndicators.highEnergyEpisodes} de ${totalEpisodes} episódios`,
        basis: baseOf(bipolarIndicators.highEnergyEpisodes, totalEpisodes, 'episódio(s) do período'),
      });
    }

    if (bipolarIndicators.lowEnergyReliefEpisodes > 0 && totalEpisodes >= 2) {
      const topLow =
        bipolarIndicators.lowEnergyTopBehaviors.length > 0
          ? `Comportamentos mais presentes: ${bipolarIndicators.lowEnergyTopBehaviors.join(', ')}.`
          : '';
      insights.push({
        id: 'ins_low_energy',
        title: 'Comportamentos de alívio em tristeza, vazio ou exaustão',
        category: 'bipolaridade',
        summary: `${proportion(
          bipolarIndicators.lowEnergyReliefEpisodes,
          totalEpisodes,
          'episódios'
        )} surgiram em energia baixa (≤ 3/10) ou estados de Tristeza/Vazio e Apatia.`,
        detail: `O comportamento foi automático ou misto em ${proportion(
          lowEnergyAutoCount,
          bipolarIndicators.lowEnergyReliefEpisodes,
          'desses episódios'
        )}. ${topLow}`,
        metricLabel: `${bipolarIndicators.lowEnergyAutomaticRate}% automático/misto`,
        basis: baseOf(
          bipolarIndicators.lowEnergyReliefEpisodes,
          totalEpisodes,
          'episódio(s) do período'
        ),
      });
    }

    if (bipolarIndicators.expectationDropPatternCount >= 2) {
      insights.push({
        id: 'ins_expectation_drop',
        title: 'Ciclo “euforia na expectativa → descarga → queda de interesse”',
        category: 'compulsao',
        summary: `Identificado em ${bipolarIndicators.expectationDropPatternCount} episódio(s), ligado à busca de validação ou intensidade.`,
        detail:
          'Descreve um pico rápido de excitação na expectativa seguido de queda abrupta de energia, desinteresse ou vazio logo depois.',
        metricLabel: `${bipolarIndicators.expectationDropPatternCount} ocorrência(s)`,
        basis: `Base: ${bipolarIndicators.expectationDropPatternCount} de ${totalEpisodes} episódio(s) com relato de expectativa/euforia seguido de queda.`,
      });
    }

    const impactAnswered = totalEntries - functionalImpactSummary.unansweredCount;
    if (anySignificantImpactCount > 0 && impactAnswered >= 3) {
      insights.push({
        id: 'ins_functional',
        title: 'Impacto funcional no dia a dia',
        category: 'gatilho',
        summary: `${proportion(
          anySignificantImpactCount,
          impactAnswered,
          'registros que avaliaram o impacto'
        )} indicaram impacto moderado ou intenso em trabalho, relacionamentos ou rotina.`,
        detail: `Ocorrências moderadas/intensas: Trabalho (${functionalImpactSummary.workModerateOrHigh}x), Relacionamentos (${functionalImpactSummary.relationshipsModerateOrHigh}x), Rotina (${functionalImpactSummary.routineModerateOrHigh}x). ${functionalImpactSummary.unansweredCount} registro(s) não avaliaram impacto e ficam fora da base.`,
        metricLabel: `${anySignificantImpactCount} de ${impactAnswered} com impacto`,
        basis: baseOf(anySignificantImpactCount, impactAnswered, 'registro(s) que avaliaram impacto'),
      });
    }

    // Humor predominante por categoria (ex.: "68% dos episódios de compulsão alimentar
    // ocorreram em estados de tristeza/vazio").
    const rankedCategories = [...categoryCross].sort((a, b) => b.episodeCount - a.episodeCount);

    for (const cross of rankedCategories) {
      if (cross.episodeCount < 3 || cross.topMoodShare < 60 || !cross.topMoodLabel) continue;
      insights.push({
        id: `ins_cat_mood_${cross.categoryId}`,
        title: `Humor predominante — ${cross.categoryName}`,
        category: 'compulsao',
        summary: `${proportion(
          cross.topMoodCount,
          cross.episodeCount,
          `episódios de ${cross.categoryName.toLowerCase()}`
        )} ocorreram em estados de ${cross.topMoodLabel.toLowerCase()}.`,
        detail: `${cross.topMoodCount} de ${cross.episodeCount} episódio(s) com esse comportamento registraram ${cross.topMoodLabel}. Os demais se distribuíram entre outros estados emocionais.`,
        metricLabel: `${cross.topMoodCount} de ${cross.episodeCount} episódios`,
        basis: baseOf(cross.topMoodCount, cross.episodeCount, `episódio(s) de ${cross.categoryName.toLowerCase()} no período`),
      });
    }

    // Grau de consciência por categoria (ex.: "a maioria dos episódios de hiperestimulação
    // digital foi automática").
    for (const cross of rankedCategories) {
      if (cross.episodeCount < 3 || cross.automaticShare < 50) continue;
      insights.push({
        id: `ins_cat_awareness_${cross.categoryId}`,
        title: `Ação automática — ${cross.categoryName}`,
        category: 'compulsao',
        summary: `${proportion(
          cross.automaticCount,
          cross.episodeCount,
          `episódios de ${cross.categoryName.toLowerCase()}`
        )} foram automáticos, sem percepção no momento.`,
        detail: `Automático: ${cross.automaticCount} · Mistura: ${cross.mixedCount} · Consciente: ${cross.consciousCount} de ${cross.episodeCount} episódio(s). Comportamento automático é o alvo mais direto de treino de pausa e atenção plena.`,
        metricLabel: `${cross.automaticCount} de ${cross.episodeCount} automáticos`,
        basis: baseOf(cross.automaticCount, cross.episodeCount, `episódio(s) de ${cross.categoryName.toLowerCase()} no período`),
      });
    }

    // Concentração de um comportamento específico em estados de alta energia
    if (energyShift) {
      const bothBasesEnough =
        energyShift.highTotal >= MIN_PERCENT_BASE && otherEnergyEpisodes.length >= MIN_PERCENT_BASE;
      insights.push({
        id: 'ins_energy_shift',
        title: 'Comportamentos concentrados em alta energia',
        category: 'bipolaridade',
        summary: `"${energyShift.label}" aparece em ${proportion(
          energyShift.highCount,
          energyShift.highTotal,
          'episódios de alta energia (energia ≥ 8/10 + redução da necessidade de sono)'
        )} contra ${proportion(
          Math.round((energyShift.otherShare / 100) * otherEnergyEpisodes.length),
          otherEnergyEpisodes.length,
          'demais episódios'
        )}${
          bothBasesEnough ? ` — ${energyShift.deltaPoints} pontos percentuais a mais` : ''
        }.`,
        detail: `Comparação entre ${energyShift.highTotal} episódio(s) de alta energia e ${otherEnergyEpisodes.length} demais episódios do período.${
          bothBasesEnough
            ? ' A diferença em pontos percentuais evita distorção ao falar em "aumento de X%".'
            : ' Com menos de 5 episódios em um dos lados, a leitura fica em contagem — diferença percentual seria instável.'
        }`,
        metricLabel:
          energyShift.highTotal >= MIN_PERCENT_BASE
            ? `+${energyShift.deltaPoints} p.p. em alta energia`
            : `${energyShift.highCount} de ${energyShift.highTotal} em alta energia`,
        basis: `Base: ${energyShift.highTotal} episódio(s) de alta energia e ${otherEnergyEpisodes.length} demais episódios.`,
      });
    }

    // Segurança: sofrimento grave não pode ficar só no texto livre — e os recursos de apoio
    // precisam estar sempre acessíveis, mesmo quando nada grave foi registrado.
    const safetyTotal = safetySummary.pensamentosMorte + safetySummary.autolesao;
    insights.push({
      id: 'ins_safety',
      title: safetyTotal > 0 ? 'Sofrimento grave registrado' : 'Segurança e recursos de apoio',
      category: 'seguranca',
      summary:
        safetyTotal > 0
          ? `${safetyTotal} registro(s) indicaram pensamentos de morte ou impulso de autolesão.`
          : 'Nenhum registro do período indicou pensamentos de morte ou impulso de autolesão. Isso não mede risco agora — é só o que foi registrado.',
      detail:
        safetyTotal > 0
          ? 'Vale levar isso explicitamente para a próxima consulta. Em caso de risco imediato: CVV 188 (24h), SAMU 192 ou o pronto-socorro mais próximo. O PulseTrack não é serviço de emergência.'
          : 'Em qualquer momento de risco: CVV 188 (ligação gratuita, 24h), SAMU 192 ou o pronto-socorro mais próximo. O PulseTrack não é serviço de emergência.',
      metricLabel:
        safetyTotal > 0
          ? `${safetyTotal} registro(s)`
          : `0 de ${totalEntries} registro(s)`,
      basis: baseOf(safetyTotal, totalEntries, 'registro(s) do período'),
    });

    // Impulso x ação: base honesta para a frequência de compulsões.
    if (behaviorModes.impulsos > 0) {
      insights.push({
        id: 'ins_behavior_mode',
        title: 'Impulsos segurados x comportamentos efetivados',
        category: 'compulsao',
        summary: `${behaviorModes.feitos} comportamento(s) aconteceram e ${behaviorModes.impulsos} ficaram só no impulso.`,
        detail: `Em ${behaviorModes.registrosComImpulsoSemAcao} registro(s) nada foi levado adiante. Prejuízo ou sofrimento foi marcado em ${behaviorModes.comPrejuizo} ocorrência(s). Contar apenas as ações evita inflar a frequência de compulsões com vontades que foram contidas.`,
        metricLabel: `${behaviorModes.impulsos} impulso(s) contido(s)`,
        basis: `Base: ${behaviorModes.feitos + behaviorModes.impulsos} item(ns) registrado(s) no período, em ${entries.filter((e) => e.behaviors.length > 0).length} registro(s) com comportamento.`,
      });
    }

    // Experiências neurodivergentes que se confundem com sintomas de mania.
    const neurodivergentStats = activationSignalStats.filter((stat) =>
      ACTIVATION_SIGNAL_OPTIONS.some(
        (opt) => opt.id === stat.id && opt.group === 'neurodivergente'
      )
    );
    const neurodivergentEntries = entries.filter((e) =>
      e.activationSignals?.some((sig) =>
        ACTIVATION_SIGNAL_OPTIONS.some(
          (opt) => opt.id === sig && opt.group === 'neurodivergente'
        )
      )
    ).length;
    const topNeurodivergent = neurodivergentStats.find((stat) => stat.count > 0);
    if (neurodivergentEntries > 0 && topNeurodivergent) {
      insights.push({
        id: 'ins_neurodivergence',
        title: 'Experiências neurodivergentes no período',
        category: 'neurodivergencia',
        summary: `${neurodivergentEntries} registro(s) trouxeram sinais como sobrecarga sensorial, mascaramento ou disfunção executiva. Mais frequente: "${topNeurodivergent.label}" (${topNeurodivergent.count}x).`,
        detail:
          'Esses sinais não são sintomas de mania e costumam ser lidos como "aceleração" por engano. Registrar separadamente ajuda o profissional a diferenciar ativação de humor de sobrecarga, camuflagem e paralisia de tarefa.',
        metricLabel: `${neurodivergentEntries} registro(s)`,
        basis: baseOf(neurodivergentEntries, totalEntries, 'registro(s) do período'),
      });
    }

    insights.push({
      id: 'ins_evolution',
      title: evolution.status === 'insuficiente' ? 'Acompanhamento contínuo' : evolution.label,
      category: 'evolucao',
      summary: evolution.description,
      detail: `Base: ${daysLogged} dia(s) acompanhados no recorte (${totalCheckinsOnly} check-in(s) sem compulsão e ${totalEpisodes} episódio(s)); ${daysWithoutEpisodes} dia(s) acompanhados sem episódio e ${daysWithoutLog} sem registro.`,
      metricLabel:
        evolution.status === 'insuficiente'
          ? `${currCount} episódio(s) no período`
          : `${prevCount} → ${currCount} episódios`,
      basis: `Base: ${totalEntries} registro(s) — ${totalEpisodes} episódio(s) e ${totalCheckinsOnly} check-in(s) — em ${daysLogged} dia(s) acompanhados de ${periodDays}.`,
    });
  }

  /**
   * Cobertura: para cada eixo, quantos registros responderam e a quantos ele se aplica.
   * É o que permite ao relatório dizer "informado em 8 de 12" em vez de sugerir que
   * uma média fraca representa o período inteiro.
   */
  const hasAnyImpact = (entry: PulseEntry) =>
    entry.functionalImpact.work !== null ||
    entry.functionalImpact.relationships !== null ||
    entry.functionalImpact.routine !== null;

  const coverage: Record<MetricKey, MetricCoverage> = {
    mood: { answered: entries.filter((e) => e.moods.length > 0).length, base: totalEntries },
    valence: { answered: entries.filter((e) => e.valence !== null).length, base: totalEntries },
    energy: { answered: energyValues.length, base: totalEntries },
    sleepHours: { answered: sleepReportedCount, base: totalEntries },
    sleepQuality: {
      answered: entries.filter((e) => e.sleep.quality !== null).length,
      base: totalEntries,
    },
    stateDuration: {
      answered: entries.filter((e) => e.stateDuration !== null).length,
      base: totalEntries,
    },
    activationSignals: {
      answered: entries.filter((e) => e.activationSignals.length > 0).length,
      base: totalEntries,
    },
    behavior: {
      answered: episodes.filter(
        (e) => e.behaviors.length > 0 || e.behaviorOtherText.trim().length > 0
      ).length,
      base: totalEpisodes,
    },
    urge: { answered: urgeValues.length, base: totalEpisodes },
    awareness: {
      answered: episodes.filter((e) => e.awareness !== null).length,
      base: totalEpisodes,
    },
    functionalImpact: {
      answered: entries.filter(hasAnyImpact).length,
      base: totalEntries,
    },
    medication: {
      answered: entries.filter((e) => e.medication.status !== null).length,
      base: totalEntries,
    },
    safety: {
      answered: entries.filter((e) => e.safetyConcern !== null).length,
      base: totalEntries,
    },
    notes: {
      answered: entries.filter((e) => e.notes.trim().length > 0).length,
      base: totalEntries,
    },
    cycle: { answered: entries.filter((e) => e.cyclePhase !== null).length, base: totalEntries },
  };

  return {
    coverage,
    totalEntries,
    totalEpisodes,
    totalCheckinsOnly,
    periodDays,
    daysLogged,
    daysWithEpisodes,
    daysWithoutEpisodes,
    daysWithoutLog,
    avgUrgeIntensity,
    avgEnergy,
    avgSleepHours,
    avgValence,
    energyReportedCount: energyValues.length,
    sleepReportedCount,
    valenceReportedCount: valenceValues.length,
    reducedSleepNeedCount,
    reducedSleepNeedRate,
    poorSleepCount,
    noFatigueAfterShortSleepCount,
    durationDistribution,
    activationSignalStats,
    functionalImpactSummary,
    awarenessBreakdown,
    resistanceBreakdown,
    behaviorModes,
    safetySummary,
    medicationSummary,
    menstrualPhaseStats,
    categoryStats,
    moodStats,
    dailyTimeline,
    cycleAnalysis,
    bipolarIndicators,
    evolution,
    topTriggers,
    topDayEvents,
    insights,
  };
}
