import {
  AnalyticsSummary,
  Experiment,
  InsightItem,
  PeriodFilter,
  PulseEntry,
} from '../types/pulsetrack';
import { summarizeCoverage, type SectionCoverage } from './analytics';
import { analyzeExperiment, describeExperiment } from './experiments';

export interface ExecutivePattern {
  title: string;
  detail: string;
}

export interface ExecutiveExperiment {
  id: string;
  heading: string;
  lines: string[];
  tag?: string;
}

export interface ExecutiveReport {
  dominantPattern: ExecutivePattern;
  insights: InsightItem[];
  evolution: { label: string; description: string };
  coverage: SectionCoverage[];
  experiments: ExecutiveExperiment[];
}

function periodStart(period: PeriodFilter): string | null {
  if (period === 'all') return null;
  const cutoff = new Date();
  cutoff.setHours(0, 0, 0, 0);
  cutoff.setDate(cutoff.getDate() - (Number(period) - 1));
  return cutoff.toISOString().slice(0, 10);
}

/**
 * Padrão dominante em linguagem descritiva: o comportamento mais frequente entre os
 * episódios; na ausência deles, o humor mais registrado. Sem juízo de valor e sem
 * escolher um padrão quando a base é pequena.
 */
export function buildDominantPattern(analytics: AnalyticsSummary): ExecutivePattern {
  const topCategory = analytics.categoryStats[0];
  if (topCategory && topCategory.realizedCount > 0 && analytics.totalEpisodes >= 3) {
    const topItem = topCategory.topItems[0];
    return {
      title: `Comportamento com mais ações realizadas: ${topCategory.categoryName}`,
      detail:
        `${topCategory.realizedCount} de ${analytics.totalEpisodes} episódio(s) com ação no período` +
        (topItem ? `, com "${topItem.label}" aparecendo ${topItem.count}x.` : '.') +
        ` Vontade média nesses registros: ${
          topCategory.avgUrge !== null ? `${topCategory.avgUrge}/10` : 'não informada'
        }.` +
        (topCategory.impulseCount > 0
          ? ` A categoria também apareceu como impulso em ${topCategory.impulseCount} registro(s), sem contar como ação.`
          : ''),
    };
  }

  const topMood = [...analytics.moodStats].sort((a, b) => b.count - a.count)[0];
  if (topMood && topMood.count > 0) {
    return {
      title: `Estado emocional mais registrado: ${topMood.label}`,
      detail:
        `Presente em ${topMood.count} registro(s) do período` +
        (topMood.episodeCount > 0
          ? `, com episódio em ${topMood.episodeCount} deles${
              topMood.count >= 5 ? ` (${topMood.episodeRate}%)` : ''
            }.`
          : ', sem episódios associados no período.') +
        ` Energia média ${topMood.avgEnergy !== null ? `${topMood.avgEnergy}/10` : 'não informada'}.`,
    };
  }

  const topSignal = [...analytics.activationSignalStats].sort((a, b) => b.count - a.count)[0];
  if (topSignal && topSignal.count > 0) {
    return {
      title: `Sinal de ativação mais presente: ${topSignal.label}`,
      detail: `${topSignal.count} registro(s) do período${
        topSignal.count >= 5 ? ` (${topSignal.percentage}%)` : ''
      }.`,
    };
  }

  return {
    title: 'Padrão dominante ainda não identificável',
    detail: `Há ${analytics.totalEntries} registro(s) no período, mas nenhum eixo repetido o suficiente para descrever um padrão.`,
  };
}

/** Até três insights, evitando dois do mesmo grupo quando houver variedade. */
export function pickTopInsights(analytics: AnalyticsSummary, limit = 3): InsightItem[] {
  const picked: InsightItem[] = [];
  const usedCategories = new Set<string>();

  for (const insight of analytics.insights) {
    if (picked.length >= limit) break;
    if (usedCategories.has(insight.category)) continue;
    picked.push(insight);
    usedCategories.add(insight.category);
  }
  for (const insight of analytics.insights) {
    if (picked.length >= limit) break;
    if (!picked.includes(insight)) picked.push(insight);
  }
  return picked.slice(0, limit);
}

/** Experimentos cuja janela cruza o período do relatório. */
export function experimentsInPeriod(
  experiments: Experiment[],
  period: PeriodFilter
): Experiment[] {
  const start = periodStart(period);
  if (!start) return experiments;
  return experiments.filter((experiment) => experiment.endDate >= start);
}

export function buildExecutiveReport(
  analytics: AnalyticsSummary,
  experiments: Experiment[],
  entries: PulseEntry[],
  period: PeriodFilter
): ExecutiveReport {
  const selectedExperiments = experimentsInPeriod(experiments, period).map((experiment) => {
    const analysis = analyzeExperiment(experiment, entries);
    const metricLabel = experiment.hypothesis;
    return {
      id: experiment.id,
      heading: metricLabel,
      tag: experiment.tag,
      lines: describeExperiment(experiment, analysis),
    };
  });

  return {
    dominantPattern: buildDominantPattern(analytics),
    insights: pickTopInsights(analytics),
    evolution: { label: analytics.evolution.label, description: analytics.evolution.description },
    coverage: summarizeCoverage(analytics.coverage).filter((section) => section.base > 0),
    experiments: selectedExperiments,
  };
}
