import { describe, expect, it } from 'vitest';
import { createDefaultCategories } from '../data/defaults';
import {
  BehaviorMode,
  EntryType,
  Experiment,
  MoodStateId,
  PulseEntry,
} from '../types/pulsetrack';
import { computeAnalytics, toLocalIsoDate } from './analytics';
import { buildDominantPattern, buildExecutiveReport, experimentsInPeriod, pickTopInsights } from './executive';
import { createExperiment } from './experiments';

const BASE_FIELDS = {
  depth: null,
  time: '20:00',
  createdAt: '2026-11-01T20:00:00.000Z',
  moods: [],
  moodIntensity: {},
  moodOtherText: '',
  valence: null,
  hadMoodSwing: false,
  moodSwingDirection: null,
  moodSwingWindow: null,
  moodSwingDescription: '',
  energyLevel: null,
  sleep: {
    hours: null,
    quality: null,
    reducedNeed: null,
    bedTime: null,
    wakeTime: null,
    latencyMinutes: null,
    awakenings: null,
    noFatigueAfterShortSleep: null,
  },
  stateDuration: null,
  activationSignals: [],
  triggerContext: '',
  behaviors: [],
  behaviorOtherText: '',
  awareness: null,
  resisted: null,
  urgeIntensity: null,
  feelingDuring: '',
  feelingAfter: '',
  functionalImpact: { work: null, relationships: null, routine: null, note: '' },
  medication: { status: null, effects: '' },
  cyclePhase: null,
  safetyConcern: null,
  notes: '',
  dayEvents: [],
  dayEventsNote: '',
} as const;

function daysAgo(days: number): string {
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  date.setDate(date.getDate() - days);
  return toLocalIsoDate(date);
}

function episodeWithPurchase(id: string, days: number): PulseEntry {
  return {
    ...BASE_FIELDS,
    id,
    entryType: EntryType.EPISODE,
    date: daysAgo(days),
    urgeIntensity: 7,
    moods: [MoodStateId.ANSIOSO],
    behaviors: [
      {
        categoryId: 'cat_financeira',
        categoryName: 'Financeira',
        itemId: 'fin_compras',
        itemLabel: 'Compras impulsivas',
        mode: BehaviorMode.FEITO,
        harm: false,
      },
    ],
  } as unknown as PulseEntry;
}

function checkin(id: string, days: number, energy: number): PulseEntry {
  return {
    ...BASE_FIELDS,
    id,
    entryType: EntryType.DAILY_CHECKIN,
    date: daysAgo(days),
    energyLevel: energy,
    moods: [MoodStateId.NEUTRO],
  } as unknown as PulseEntry;
}

describe('relatório executivo', () => {
  it('usa o comportamento mais frequente como padrão dominante', () => {
    const entries = [
      episodeWithPurchase('a', 2),
      episodeWithPurchase('b', 3),
      episodeWithPurchase('c', 4),
    ];
    const analytics = computeAnalytics(entries, createDefaultCategories(), '30');
    const pattern = buildDominantPattern(analytics);

    expect(pattern.title).toContain('Financeira');
    expect(pattern.detail).toContain('3 de 3');
    expect(pattern.detail).toContain('Compras impulsivas');
  });

  it('sem episódios suficientes, descreve o humor mais registrado', () => {
    const entries = [checkin('a', 1, 5), checkin('b', 2, 6)];
    const analytics = computeAnalytics(entries, createDefaultCategories(), '30');
    const pattern = buildDominantPattern(analytics);

    expect(pattern.title).toContain('Estado emocional mais registrado');
  });

  it('limita a três insights e evita repetir o mesmo grupo quando há variedade', () => {
    const entries = [checkin('a', 1, 5), checkin('b', 2, 6), checkin('c', 3, 9)];
    const analytics = computeAnalytics(entries, createDefaultCategories(), '30');

    const insights = pickTopInsights(analytics);
    expect(insights.length).toBeLessThanOrEqual(3);
    expect(new Set(insights.map((i) => i.category)).size).toBe(insights.length);
  });

  it('monta as cinco partes e filtra experimentos pela janela do período', () => {
    const entries = [
      episodeWithPurchase('a', 2),
      episodeWithPurchase('b', 3),
      episodeWithPurchase('c', 4),
      checkin('d', 5, 6),
    ];
    const analytics = computeAnalytics(entries, createDefaultCategories(), '30');

    const recent = createExperiment({
      hypothesis: 'Compras aumentam no fim do mês',
      metric: 'urge',
      startDate: daysAgo(6),
      endDate: daysAgo(0),
    });
    const old = createExperiment({
      hypothesis: 'Observação antiga',
      metric: 'energy',
      startDate: '2020-01-01',
      endDate: '2020-01-10',
    });

    const report = buildExecutiveReport(analytics, [recent, old], entries, '7');

    expect(report.dominantPattern.title).toBeTruthy();
    expect(report.insights.length).toBeGreaterThan(0);
    expect(report.evolution.label).toBeTruthy();
    expect(report.coverage.length).toBeGreaterThan(0);
    expect(report.experiments).toHaveLength(1);
    expect(report.experiments[0].heading).toBe('Compras aumentam no fim do mês');
    expect(report.experiments[0].lines.join('\n')).toContain('Durante a janela');
  });

  it('experimentosInPeriod mantém tudo quando o período é “all”', () => {
    const experiments: Experiment[] = [
      createExperiment({
        hypothesis: 'H1',
        metric: 'energy',
        startDate: '2020-01-01',
        endDate: '2020-01-10',
      }),
    ];
    expect(experimentsInPeriod(experiments, 'all')).toHaveLength(1);
    expect(experimentsInPeriod(experiments, '7')).toHaveLength(0);
  });
});
