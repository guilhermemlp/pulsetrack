import {
  ACTIVATION_SIGNAL_OPTIONS,
  MOOD_DEFINITIONS,
  STATE_DURATION_OPTIONS,
} from '../data/defaults';
import {
  ActivationSignal,
  AnalyticsSummary,
  AwarenessType,
  BehaviorCategory,
  CategoryStat,
  CycleAnalysis,
  CyclePhaseMetrics,
  DailyPoint,
  EntryType,
  FunctionalImpactLevel,
  InsightItem,
  MoodBehaviorStat,
  MoodStateId,
  PeriodFilter,
  PulseEntry,
  ReducedSleepNeed,
  ResistanceResult,
  SleepQuality,
  StateDuration,
} from '../types/pulsetrack';

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
  return d.toISOString().slice(0, 10);
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
  const cutoffStr = cutoff.toISOString().slice(0, 10);

  return entries
    .filter((entry) => entry.date >= cutoffStr)
    .sort((a, b) => `${b.date}T${b.time}`.localeCompare(`${a.date}T${a.time}`));
}

function getTopItemLabels(entries: PulseEntry[], limit = 3): string[] {
  const counts = new Map<string, number>();
  for (const entry of entries) {
    for (const b of entry.behaviors) {
      counts.set(b.itemLabel, (counts.get(b.itemLabel) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([label]) => label);
}

function isEpisodeEntry(entry: PulseEntry): boolean {
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
  avgEnergy: number;
  avgSleep: number;
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

  const avgEnergy = Number(
    (buckets.reduce((s, b) => s + b.avgEnergy, 0) / buckets.length).toFixed(1)
  );
  const avgSleepHours = Number(
    (buckets.reduce((s, b) => s + b.avgSleep, 0) / buckets.length).toFixed(1)
  );
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
      avgEnergy: list.reduce((s, e) => s + e.energyLevel, 0) / list.length,
      avgSleep: list.reduce((s, e) => s + (e.sleep?.hours ?? 7), 0) / list.length,
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
    before.avgEnergy !== null &&
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

/**
 * Motor analítico longitudinal offline do PulseTrack.
 */
export function computeAnalytics(
  allEntries: PulseEntry[],
  categories: BehaviorCategory[],
  period: PeriodFilter
): AnalyticsSummary {
  const entries = filterEntriesByPeriod(allEntries, period);
  const periodDays = getPeriodDays(period, entries);
  const totalEntries = entries.length;

  const episodes = entries.filter(isEpisodeEntry);
  const checkinsOnly = entries.filter((e) => !isEpisodeEntry(e));

  const totalEpisodes = episodes.length;
  const totalCheckinsOnly = checkinsOnly.length;

  const daysLogged = new Set(entries.map((e) => e.date)).size;
  const daysWithEpisodes = new Set(episodes.map((e) => e.date)).size;
  const daysWithoutEpisodes = Math.max(0, periodDays - daysWithEpisodes);

  const avgUrgeIntensity =
    totalEpisodes > 0
      ? Number((episodes.reduce((sum, e) => sum + e.urgeIntensity, 0) / totalEpisodes).toFixed(1))
      : totalEntries > 0
      ? Number((entries.reduce((sum, e) => sum + e.urgeIntensity, 0) / totalEntries).toFixed(1))
      : 0;

  const avgEnergy =
    totalEntries > 0
      ? Number((entries.reduce((sum, e) => sum + e.energyLevel, 0) / totalEntries).toFixed(1))
      : 0;

  const avgSleepHours =
    totalEntries > 0
      ? Number((entries.reduce((sum, e) => sum + (e.sleep?.hours ?? 7), 0) / totalEntries).toFixed(1))
      : 0;

  const reducedSleepNeedCount = entries.filter(
    (e) => e.sleep?.reducedNeed && e.sleep.reducedNeed !== ReducedSleepNeed.NAO
  ).length;
  const reducedSleepNeedRate =
    totalEntries > 0 ? Math.round((reducedSleepNeedCount / totalEntries) * 100) : 0;

  const poorSleepCount = entries.filter(
    (e) =>
      e.sleep?.quality === SleepQuality.MUITO_RUIM ||
      e.sleep?.quality === SleepQuality.RUIM ||
      (e.sleep?.hours ?? 7) < 6
  ).length;

  // Duração dos estados
  const durationDistribution = STATE_DURATION_OPTIONS.map((opt) => {
    const count = entries.filter((e) => e.stateDuration === opt.id).length;
    return {
      id: opt.id,
      label: opt.label,
      count,
      percentage: totalEntries > 0 ? Math.round((count / totalEntries) * 100) : 0,
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
  const isModerateOrHigh = (lvl?: FunctionalImpactLevel) =>
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
  };

  // Consciência e resistência (calculados prioritariamente sobre episódios comportamentais)
  const behaviorBase = episodes.length > 0 ? episodes : entries;
  const awarenessBreakdown = {
    consciente: behaviorBase.filter((e) => e.awareness === AwarenessType.CONSCIENTE).length,
    automatico: behaviorBase.filter((e) => e.awareness === AwarenessType.AUTOMATICO).length,
    mistura: behaviorBase.filter((e) => e.awareness === AwarenessType.MISTURA).length,
  };

  const resistanceBreakdown = {
    sim: behaviorBase.filter((e) => e.resisted === ResistanceResult.SIM).length,
    parcialmente: behaviorBase.filter((e) => e.resisted === ResistanceResult.PARCIALMENTE).length,
    nao: behaviorBase.filter((e) => e.resisted === ResistanceResult.NAO).length,
  };

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
      itemCounts: Map<string, number>;
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
          itemCounts: new Map(),
        });
      }
      const bucket = catAgg.get(b.categoryId)!;
      if (!seenCatsInEntry.has(b.categoryId)) {
        bucket.entryIds.add(entry.id);
        bucket.urgeSum += entry.urgeIntensity;
        seenCatsInEntry.add(b.categoryId);
      }
      bucket.itemCounts.set(b.itemLabel, (bucket.itemCounts.get(b.itemLabel) ?? 0) + 1);
    }
  }

  const categoryStats: CategoryStat[] = [...catAgg.values()]
    .map((bucket) => {
      const count = bucket.entryIds.size;
      const topItems = [...bucket.itemCounts.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 4)
        .map(([label, itemCount]) => ({ label, count: itemCount }));

      return {
        categoryId: bucket.categoryId,
        categoryName: bucket.categoryName,
        color: bucket.color,
        count,
        percentage: totalEpisodes > 0 ? Math.round((count / totalEpisodes) * 100) : 0,
        avgUrge: count > 0 ? Number((bucket.urgeSum / count).toFixed(1)) : 0,
        topItems,
      };
    })
    .sort((a, b) => b.count - a.count);

  // Relação Humor x Energia x Vontade (inclui todos os dias registrados)
  const moodStats: MoodBehaviorStat[] = MOOD_DEFINITIONS.map((moodDef) => {
    const matching = entries.filter((e) => e.moods.includes(moodDef.id));
    const count = matching.length;
    return {
      moodId: moodDef.id,
      label: moodDef.label,
      count,
      avgEnergy:
        count > 0 ? Number((matching.reduce((s, e) => s + e.energyLevel, 0) / count).toFixed(1)) : 0,
      avgUrge:
        count > 0 ? Number((matching.reduce((s, e) => s + e.urgeIntensity, 0) / count).toFixed(1)) : 0,
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
    const iso = d.toISOString().slice(0, 10);
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
      avgEnergy:
        dayEntries.length > 0
          ? Number(
              (dayEntries.reduce((s, e) => s + e.energyLevel, 0) / dayEntries.length).toFixed(1)
            )
          : null,
      avgSleepHours:
        dayEntries.length > 0
          ? Number(
              (
                dayEntries.reduce((s, e) => s + (e.sleep?.hours ?? 7), 0) / dayEntries.length
              ).toFixed(1)
            )
          : null,
      hasReducedSleepNeed: dayEntries.some(
        (e) => e.sleep?.reducedNeed && e.sleep.reducedNeed !== ReducedSleepNeed.NAO
      ),
      avgUrge:
        dayEpisodes.length > 0
          ? Number(
              (dayEpisodes.reduce((s, e) => s + e.urgeIntensity, 0) / dayEpisodes.length).toFixed(1)
            )
          : null,
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

  // Indicadores clínicos relevantes para bipolaridade e compulsões
  const highEnergyList = episodes.filter(
    (e) => e.energyLevel >= 7 || e.moods.includes(MoodStateId.EUFORICO_AGITADO)
  );
  const lowEnergyReliefList = episodes.filter(
    (e) =>
      e.energyLevel <= 3 ||
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
    highEnergyAvgUrge:
      highEnergyList.length > 0
        ? Number(
            (highEnergyList.reduce((s, e) => s + e.urgeIntensity, 0) / highEnergyList.length).toFixed(1)
          )
        : 0,
    highEnergyTopBehaviors: getTopItemLabels(highEnergyList, 3),

    lowEnergyReliefEpisodes: lowEnergyReliefList.length,
    lowEnergyPercent:
      totalEpisodes > 0 ? Math.round((lowEnergyReliefList.length / totalEpisodes) * 100) : 0,
    lowEnergyAutomaticRate:
      lowEnergyReliefList.length > 0
        ? Math.round((lowEnergyAutoCount / lowEnergyReliefList.length) * 100)
        : 0,
    lowEnergyTopBehaviors: getTopItemLabels(lowEnergyReliefList, 3),

    moodSwingEntries: moodSwingList.length,
    moodSwingPercent: totalEntries > 0 ? Math.round((moodSwingList.length / totalEntries) * 100) : 0,
    moodSwingAvgUrge:
      moodSwingEpisodes.length > 0
        ? Number(
            (
              moodSwingEpisodes.reduce((s, e) => s + e.urgeIntensity, 0) / moodSwingEpisodes.length
            ).toFixed(1)
          )
        : 0,
    moodSwingNoResistRate:
      moodSwingEpisodes.length > 0
        ? Math.round((moodSwingNoResist / moodSwingEpisodes.length) * 100)
        : 0,

    obsessiveThoughtsCount,
    expectationDropPatternCount,
  };

  // Comparativo de evolução (episódios na metade inicial vs metade recente)
  const halfDays = Math.max(1, Math.floor(periodDays / 2));
  const splitDate = new Date();
  splitDate.setHours(0, 0, 0, 0);
  splitDate.setDate(splitDate.getDate() - (halfDays - 1));
  const splitStr = splitDate.toISOString().slice(0, 10);

  const currentHalf = episodes.filter((e) => e.date >= splitStr);
  const previousHalf = episodes.filter((e) => e.date < splitStr);

  const prevCount = previousHalf.length;
  const currCount = currentHalf.length;
  const prevUrge =
    prevCount > 0
      ? Number((previousHalf.reduce((s, e) => s + e.urgeIntensity, 0) / prevCount).toFixed(1))
      : 0;
  const currUrge =
    currCount > 0
      ? Number((currentHalf.reduce((s, e) => s + e.urgeIntensity, 0) / currCount).toFixed(1))
      : 0;

  let evolution: AnalyticsSummary['evolution'];
  if (totalEpisodes < 2 || (prevCount === 0 && currCount === 0)) {
    evolution = {
      status: 'insuficiente',
      label: totalCheckinsOnly > 0 ? 'Acompanhamento contínuo ativo' : 'Dados em construção',
      description:
        totalCheckinsOnly > 0
          ? `Você registrou ${totalCheckinsOnly} dia(s) de acompanhamento sem episódios compulsivos neste período.`
          : 'Continue registrando diariamente para comparar a metade inicial e a metade recente do período.',
      previousHalfCount: prevCount,
      currentHalfCount: currCount,
      previousHalfUrge: prevUrge,
      currentHalfUrge: currUrge,
    };
  } else if (currCount < prevCount || currUrge <= prevUrge - 1) {
    evolution = {
      status: 'melhora',
      label: 'Tendência de melhora',
      description: `Na metade recente, os episódios diminuíram (${currCount} vs ${prevCount}) ou a intensidade média da vontade caiu (${currUrge}/10 vs ${prevUrge}/10).`,
      previousHalfCount: prevCount,
      currentHalfCount: currCount,
      previousHalfUrge: prevUrge,
      currentHalfUrge: currUrge,
    };
  } else if (currCount > prevCount + 1 || currUrge >= prevUrge + 1.2) {
    evolution = {
      status: 'piora',
      label: 'Aumento de ativação recente',
      description: `Houve elevação nos episódios recentes (${currCount} vs ${prevCount}) ou na intensidade da vontade (${currUrge}/10 vs ${prevUrge}/10). Vale observar sono e sinais de ativação.`,
      previousHalfCount: prevCount,
      currentHalfCount: currCount,
      previousHalfUrge: prevUrge,
      currentHalfUrge: currUrge,
    };
  } else {
    evolution = {
      status: 'estabilidade',
      label: 'Estabilidade no período',
      description: `Frequência (${currCount} vs ${prevCount} episódios) e intensidade média (${currUrge}/10 vs ${prevUrge}/10) mantiveram-se estáveis.`,
      previousHalfCount: prevCount,
      currentHalfCount: currCount,
      previousHalfUrge: prevUrge,
      currentHalfUrge: currUrge,
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

  // Insights automáticos (incluindo sono, duração, sinais de ativação e ciclos)
  const insights: InsightItem[] = [];

  if (totalEntries > 0) {
    if (reducedSleepNeedCount > 0 || poorSleepCount > 0) {
      insights.push({
        id: 'ins_sleep',
        title: 'Sono e redução da necessidade de sono',
        category: 'bipolaridade',
        summary: `Média de ${avgSleepHours}h de sono por noite. Redução da necessidade de sono apareceu em ${reducedSleepNeedRate}% dos registros.`,
        detail:
          reducedSleepNeedCount > 0
            ? 'Dormir poucas horas e ainda assim acordar com energia alta ou sem cansaço é um marcador clínico relevante para diferenciar ativação de humor de uma privação comum de sono.'
            : `Foram registrados ${poorSleepCount} dia(s) com sono ruim ou inferior a 6h, fator que reduz o limiar para impulsividade.`,
        metricLabel: `Média ${avgSleepHours}h/noite`,
      });
    }

    if (cycleAnalysis.findings.length > 0) {
      insights.push({
        id: 'ins_cycle',
        title: 'Padrão longitudinal (antes, durante e depois)',
        category: 'ciclo',
        summary: cycleAnalysis.findings[0],
        detail: cycleAnalysis.findings.slice(1).join(' ') || 'Comparação baseada nos dias adjacentes registrados antes e depois dos blocos de episódios.',
        metricLabel: `${cycleAnalysis.analyzedEpisodes} episódio(s) em ciclo`,
      });
    }

    const multiDayCount = entries.filter(
      (e) =>
        e.stateDuration === StateDuration.DIAS_CURTO ||
        e.stateDuration === StateDuration.DIAS_MEDIO ||
        e.stateDuration === StateDuration.SEMANAS
    ).length;
    const topSignal = activationSignalStats.find((s) => s.count > 0);
    if (multiDayCount > 0 || topSignal) {
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
      });
    }

    if (bipolarIndicators.highEnergyEpisodes > 0) {
      const topList =
        bipolarIndicators.highEnergyTopBehaviors.length > 0
          ? `Mais frequentes: ${bipolarIndicators.highEnergyTopBehaviors.join(', ')}.`
          : '';
      insights.push({
        id: 'ins_high_energy',
        title: 'Impulsividade em estados de alta energia ou euforia',
        category: 'bipolaridade',
        summary: `${bipolarIndicators.highEnergyPercent}% dos episódios ocorreram com energia ≥ 7/10 ou humor Eufórico/Agitado.`,
        detail: `Nestes momentos, a intensidade média da vontade foi de ${bipolarIndicators.highEnergyAvgUrge}/10. ${topList}`,
        metricLabel: `${bipolarIndicators.highEnergyEpisodes} de ${totalEpisodes} episódios`,
      });
    }

    if (bipolarIndicators.lowEnergyReliefEpisodes > 0) {
      const topLow =
        bipolarIndicators.lowEnergyTopBehaviors.length > 0
          ? `Comportamentos mais presentes: ${bipolarIndicators.lowEnergyTopBehaviors.join(', ')}.`
          : '';
      insights.push({
        id: 'ins_low_energy',
        title: 'Comportamentos de alívio em tristeza, vazio ou exaustão',
        category: 'bipolaridade',
        summary: `${bipolarIndicators.lowEnergyPercent}% dos episódios surgiram em energia baixa (≤ 3/10) ou estados de Tristeza/Vazio e Apatia.`,
        detail: `Em ${bipolarIndicators.lowEnergyAutomaticRate}% desses momentos, o comportamento foi automático ou misto. ${topLow}`,
        metricLabel: `${bipolarIndicators.lowEnergyAutomaticRate}% automático/misto`,
      });
    }

    if (bipolarIndicators.expectationDropPatternCount > 0) {
      insights.push({
        id: 'ins_expectation_drop',
        title: 'Ciclo “euforia na expectativa → descarga → queda de interesse”',
        category: 'compulsao',
        summary: `Identificado em ${bipolarIndicators.expectationDropPatternCount} episódio(s), ligado à busca de validação ou intensidade.`,
        detail:
          'Descreve um pico rápido de excitação na expectativa seguido de queda abrupta de energia, desinteresse ou vazio logo depois.',
        metricLabel: `${bipolarIndicators.expectationDropPatternCount} ocorrência(s)`,
      });
    }

    if (functionalImpactSummary.anySignificantImpactRate > 0) {
      insights.push({
        id: 'ins_functional',
        title: 'Impacto funcional no dia a dia',
        category: 'gatilho',
        summary: `Em ${functionalImpactSummary.anySignificantImpactRate}% dos registros houve impacto moderado ou intenso em trabalho, relacionamentos ou rotina.`,
        detail: `Ocorrências moderadas/intensas: Trabalho (${functionalImpactSummary.workModerateOrHigh}x), Relacionamentos (${functionalImpactSummary.relationshipsModerateOrHigh}x), Rotina (${functionalImpactSummary.routineModerateOrHigh}x).`,
        metricLabel: `${functionalImpactSummary.anySignificantImpactRate}% com impacto`,
      });
    }

    insights.push({
      id: 'ins_evolution',
      title: evolution.label,
      category: 'evolucao',
      summary: evolution.description,
      detail: `Nos últimos ${periodDays} dias: ${daysLogged} dia(s) acompanhados (${totalCheckinsOnly} check-ins sem compulsão e ${totalEpisodes} episódio(s)).`,
      metricLabel: `${daysWithoutEpisodes} dias sem episódios`,
    });
  }

  return {
    totalEntries,
    totalEpisodes,
    totalCheckinsOnly,
    periodDays,
    daysLogged,
    daysWithEpisodes,
    daysWithoutEpisodes,
    avgUrgeIntensity,
    avgEnergy,
    avgSleepHours,
    reducedSleepNeedCount,
    reducedSleepNeedRate,
    poorSleepCount,
    durationDistribution,
    activationSignalStats,
    functionalImpactSummary,
    awarenessBreakdown,
    resistanceBreakdown,
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
