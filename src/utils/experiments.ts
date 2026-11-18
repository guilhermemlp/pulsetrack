import {
  Experiment,
  ExperimentMetric,
  ExperimentResult,
  ExperimentStatus,
  PulseEntry,
} from '../types/pulsetrack';
import { hasBehaviorRecord, isEpisodeEntry, toLocalIsoDate } from './analytics';

/**
 * Experimentos são hipóteses do usuário observadas em uma janela de datas.
 * O app NUNCA decide o resultado: ele mostra os números das duas janelas e a
 * pessoa registra uma das três conclusões válidas. Tudo fica no dispositivo.
 */

export interface ExperimentMetricDefinition {
  id: ExperimentMetric;
  label: string;
  unit: string;
  /** Como o valor é lido, em linguagem descritiva. */
  description: string;
  kind: 'average' | 'count';
}

export const EXPERIMENT_METRICS: ExperimentMetricDefinition[] = [
  {
    id: 'urge',
    label: 'Intensidade da vontade',
    unit: '/10',
    description: 'Média da vontade nos registros com comportamento.',
    kind: 'average',
  },
  {
    id: 'energy',
    label: 'Energia',
    unit: '/10',
    description: 'Média da energia percebida nos registros que informaram.',
    kind: 'average',
  },
  {
    id: 'valence',
    label: 'Valência do afeto',
    unit: '/10',
    description: 'Média de quão agradável o período foi (0–10).',
    kind: 'average',
  },
  {
    id: 'sleepHours',
    label: 'Horas de sono',
    unit: 'h',
    description: 'Média de horas dormidas nos registros que informaram.',
    kind: 'average',
  },
  {
    id: 'episodes',
    label: 'Episódios com ação realizada',
    unit: '',
    description: 'Quantidade de registros com ação realizada na janela.',
    kind: 'count',
  },
  {
    id: 'behaviorItems',
    label: 'Comportamentos registrados',
    unit: '',
    description: 'Quantidade de itens de comportamento (feitos ou impulsos).',
    kind: 'count',
  },
];

export function getExperimentMetric(id: ExperimentMetric): ExperimentMetricDefinition {
  return EXPERIMENT_METRICS.find((metric) => metric.id === id) ?? EXPERIMENT_METRICS[0];
}

export const EXPERIMENT_RESULT_LABELS: Record<ExperimentResult, string> = {
  difference: 'Apareceu diferença',
  no_difference: 'Não apareceu diferença',
  insufficient_data: 'Dados insuficientes',
};

export interface ExperimentWindowStats {
  /** Registros com o eixo respondido (ou ocorrências, em métricas de contagem). */
  answered: number;
  /** Registros da janela aos quais o eixo se aplica. */
  base: number;
  /** Valor médio/total; `null` quando nada foi informado. */
  value: number | null;
}

export interface ExperimentAnalysis {
  windowDays: number;
  during: ExperimentWindowStats;
  before: ExperimentWindowStats;
  /** during.value − before.value, quando ambos existem. */
  delta: number | null;
  /** A janela de observação já terminou (o encerramento é sempre manual). */
  windowClosed: boolean;
  /** Janela sem nenhum registro: o relatório diz isso em vez de mostrar zero. */
  empty: boolean;
}

function parseDateOnly(date: string): number {
  const [year, month, day] = date.split('-').map(Number);
  return Date.UTC(year, month - 1, day);
}

function formatDateOnly(utcMs: number): string {
  return new Date(utcMs).toISOString().slice(0, 10);
}

export function daysBetweenInclusive(startDate: string, endDate: string): number {
  const diff = Math.floor((parseDateOnly(endDate) - parseDateOnly(startDate)) / 86_400_000);
  return Math.max(0, diff) + 1;
}

/** Janela imediatamente anterior, com o mesmo número de dias. */
export function experimentBaselineWindow(experiment: Experiment): {
  startDate: string;
  endDate: string;
  days: number;
} {
  const windowDays = daysBetweenInclusive(experiment.startDate, experiment.endDate);
  const endMs = parseDateOnly(experiment.startDate) - 86_400_000;
  const startMs = endMs - (windowDays - 1) * 86_400_000;
  return { startDate: formatDateOnly(startMs), endDate: formatDateOnly(endMs), days: windowDays };
}

function entriesInWindow(entries: PulseEntry[], startDate: string, endDate: string): PulseEntry[] {
  return entries.filter((entry) => entry.date >= startDate && entry.date <= endDate);
}

function averageOrNull(values: number[]): number | null {
  if (values.length === 0) return null;
  return Number((values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(1));
}

function statsForWindow(
  entries: PulseEntry[],
  metric: ExperimentMetric
): ExperimentWindowStats {
  const definition = getExperimentMetric(metric);

  if (metric === 'episodes') {
    const episodes = entries.filter(isEpisodeEntry);
    return { answered: episodes.length, base: entries.length, value: episodes.length };
  }

  if (metric === 'behaviorItems') {
    const total = entries.reduce((sum, entry) => sum + entry.behaviors.length, 0);
    const withBehaviors = entries.filter((entry) => entry.behaviors.length > 0).length;
    return { answered: total, base: withBehaviors, value: total };
  }

  if (metric === 'urge') {
    // Vontade pode existir sem ação: impulsos contidos também entram neste eixo.
    const values = entries
      .map((entry) => entry.urgeIntensity)
      .filter((value): value is number => typeof value === 'number');
    return {
      answered: values.length,
      base: entries.filter(hasBehaviorRecord).length,
      value: averageOrNull(values),
    };
  }

  const read = (entry: PulseEntry): number | null => {
    if (metric === 'energy') return entry.energyLevel;
    if (metric === 'valence') return entry.valence;
    return entry.sleep?.hours ?? null;
  };

  const values = entries
    .map(read)
    .filter((value): value is number => typeof value === 'number');

  return {
    answered: values.length,
    base: entries.length,
    value: definition.kind === 'average' ? averageOrNull(values) : values.length,
  };
}

export function analyzeExperiment(
  experiment: Experiment,
  entries: PulseEntry[],
  today = toLocalIsoDate()
): ExperimentAnalysis {
  const windowDays = daysBetweenInclusive(experiment.startDate, experiment.endDate);
  const baseline = experimentBaselineWindow(experiment);
  const during = statsForWindow(
    entriesInWindow(entries, experiment.startDate, experiment.endDate),
    experiment.metric
  );
  const before = statsForWindow(
    entriesInWindow(entries, baseline.startDate, baseline.endDate),
    experiment.metric
  );
  const delta =
    during.value !== null && before.value !== null
      ? Number((during.value - before.value).toFixed(1))
      : null;

  return {
    windowDays,
    during,
    before,
    delta,
    windowClosed: experiment.endDate < today,
    empty: during.answered === 0 && before.answered === 0,
  };
}

export function formatExperimentDate(date: string): string {
  const [year, month, day] = date.split('-');
  return `${day}/${month}/${year}`;
}

function formatValue(metric: ExperimentMetric, value: number | null): string {
  if (value === null) return 'não informado';
  const definition = getExperimentMetric(metric);
  const rounded = Number.isInteger(value) ? String(value) : value.toFixed(1);
  if (definition.kind === 'count') return definition.unit ? `${rounded}${definition.unit}` : rounded;
  return `${rounded}${definition.unit}`;
}

/** Frases descritivas usadas no Painel e no PDF — nunca avaliativas. */
export function describeExperiment(
  experiment: Experiment,
  analysis: ExperimentAnalysis
): string[] {
  const metric = getExperimentMetric(experiment.metric);
  const baseline = experimentBaselineWindow(experiment);
  const lines: string[] = [
    `Hipótese: ${experiment.hypothesis}`,
    `Eixo observado: ${metric.label} (${metric.description})`,
    `Janela: ${formatExperimentDate(experiment.startDate)} a ${formatExperimentDate(
      experiment.endDate
    )} (${analysis.windowDays} dia(s)).`,
    `Janela anterior de comparação: ${formatExperimentDate(
      baseline.startDate
    )} a ${formatExperimentDate(baseline.endDate)}.`,
  ];

  if (analysis.empty) {
    lines.push('Nenhum registro nas duas janelas: não há números para comparar.');
  } else {
    lines.push(
      `Durante a janela: ${formatValue(experiment.metric, analysis.during.value)}` +
        (metric.kind === 'average'
          ? ` (informado em ${analysis.during.answered} de ${analysis.during.base} registros).`
          : ` (${analysis.during.answered} ocorrência(s) em ${analysis.during.base} registro(s)).`)
    );
    lines.push(
      `Janela anterior: ${formatValue(experiment.metric, analysis.before.value)}` +
        (metric.kind === 'average'
          ? ` (informado em ${analysis.before.answered} de ${analysis.before.base} registros).`
          : ` (${analysis.before.answered} ocorrência(s) em ${analysis.before.base} registro(s)).`)
    );
    if (analysis.delta !== null) {
      const direction =
        analysis.delta > 0 ? 'acima' : analysis.delta < 0 ? 'abaixo' : 'igual à';
      lines.push(
        `Diferença observada: ${formatValue(experiment.metric, Math.abs(analysis.delta))} ${
          analysis.delta === 0 ? 'igual' : direction
        } janela anterior.`
      );
    }
  }

  if (experiment.status === 'finished' && experiment.result) {
    lines.push(`Conclusão registrada por você: ${EXPERIMENT_RESULT_LABELS[experiment.result]}.`);
    if (experiment.resultNote.trim()) lines.push(`Observação: ${experiment.resultNote.trim()}`);
  } else if (analysis.windowClosed) {
    lines.push('Janela encerrada — a conclusão ainda não foi registrada.');
  } else {
    lines.push('Observação em andamento. O encerramento é sempre uma decisão sua.');
  }

  return lines;
}

export function createExperiment(input: {
  hypothesis: string;
  metric: ExperimentMetric;
  startDate: string;
  endDate: string;
  tag?: string;
  sourceInsightId?: string;
}): Experiment {
  const now = new Date().toISOString();
  return {
    id: `exp_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    hypothesis: input.hypothesis.trim(),
    metric: input.metric,
    startDate: input.startDate,
    endDate: input.endDate,
    ...(input.tag?.trim() ? { tag: input.tag.trim() } : {}),
    status: 'active',
    createdAt: now,
    updatedAt: now,
    result: null,
    resultNote: '',
    closedAt: null,
    ...(input.sourceInsightId ? { sourceInsightId: input.sourceInsightId } : {}),
  };
}

function isDateOnly(value: unknown): value is string {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

/** Normaliza experimentos persistidos; registros sem identidade mínima são descartados. */
export function normalizeExperiment(raw: unknown): Experiment | null {
  if (!raw || typeof raw !== 'object') return null;
  const candidate = raw as Partial<Experiment>;
  if (typeof candidate.id !== 'string' || !candidate.id.trim()) return null;
  if (typeof candidate.hypothesis !== 'string' || !candidate.hypothesis.trim()) return null;
  const metric = EXPERIMENT_METRICS.some((m) => m.id === candidate.metric)
    ? (candidate.metric as ExperimentMetric)
    : null;
  if (!metric) return null;
  if (!isDateOnly(candidate.startDate) || !isDateOnly(candidate.endDate)) return null;

  const status: ExperimentStatus = candidate.status === 'finished' ? 'finished' : 'active';
  const validResult =
    candidate.result === 'difference' ||
    candidate.result === 'no_difference' ||
    candidate.result === 'insufficient_data'
      ? candidate.result
      : null;

  return {
    id: candidate.id,
    hypothesis: candidate.hypothesis.trim(),
    metric,
    startDate: candidate.startDate,
    endDate: candidate.endDate,
    ...(typeof candidate.tag === 'string' && candidate.tag.trim()
      ? { tag: candidate.tag.trim() }
      : {}),
    // Janela concluída sem resultado continua "active": a conclusão não é inferida.
    status: status === 'finished' && validResult ? 'finished' : 'active',
    createdAt: typeof candidate.createdAt === 'string' ? candidate.createdAt : null,
    updatedAt: typeof candidate.updatedAt === 'string' ? candidate.updatedAt : null,
    result: status === 'finished' && validResult ? validResult : null,
    resultNote: typeof candidate.resultNote === 'string' ? candidate.resultNote : '',
    closedAt: typeof candidate.closedAt === 'string' ? candidate.closedAt : null,
    ...(typeof candidate.sourceInsightId === 'string'
      ? { sourceInsightId: candidate.sourceInsightId }
      : {}),
  };
}
