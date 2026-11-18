import { describe, expect, it } from 'vitest';
import { BehaviorMode, EntryType, PulseEntry } from '../types/pulsetrack';
import {
  analyzeExperiment,
  createExperiment,
  describeExperiment,
  experimentBaselineWindow,
  normalizeExperiment,
} from './experiments';

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

function entry(id: string, date: string, overrides: Partial<PulseEntry> = {}): PulseEntry {
  return {
    ...BASE_FIELDS,
    id,
    date,
    entryType: EntryType.DAILY_CHECKIN,
    ...overrides,
  } as PulseEntry;
}

function urgeEpisode(id: string, date: string, urge: number | null): PulseEntry {
  return entry(id, date, {
    entryType: EntryType.EPISODE,
    urgeIntensity: urge,
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
  });
}

const experiment = createExperiment({
  hypothesis: 'A vontade aumenta em semanas de pouco sono',
  metric: 'urge',
  startDate: '2026-11-08',
  endDate: '2026-11-14',
});

describe('janelas do experimento', () => {
  it('compara com o mesmo número de dias imediatamente anterior', () => {
    const baseline = experimentBaselineWindow(experiment);
    expect(baseline).toEqual({ startDate: '2026-11-01', endDate: '2026-11-07', days: 7 });
  });

  it('inclui o último dia da janela', () => {
    const entries = [
      urgeEpisode('antigo', '2026-11-07', 4),
      urgeEpisode('durante', '2026-11-08', 8),
      urgeEpisode('ultimo', '2026-11-14', 6),
      urgeEpisode('fora', '2026-11-15', 10),
    ];

    const analysis = analyzeExperiment(experiment, entries, '2026-11-17');

    expect(analysis.during).toEqual({ answered: 2, base: 2, value: 7 });
    expect(analysis.before).toEqual({ answered: 1, base: 1, value: 4 });
    expect(analysis.delta).toBe(3);
    expect(analysis.windowClosed).toBe(true);
    expect(analysis.empty).toBe(false);
  });

  it('sem registros, não inventa zero', () => {
    const analysis = analyzeExperiment(experiment, [], '2026-11-10');

    expect(analysis.during.value).toBeNull();
    expect(analysis.before.value).toBeNull();
    expect(analysis.delta).toBeNull();
    expect(analysis.empty).toBe(true);
    expect(analysis.windowClosed).toBe(false);
  });

  it('média considera apenas quem informou o eixo', () => {
    const entries = [
      urgeEpisode('a', '2026-11-09', 6),
      urgeEpisode('b', '2026-11-10', null),
    ];

    const analysis = analyzeExperiment(experiment, entries, '2026-11-20');
    expect(analysis.during.answered).toBe(1);
    expect(analysis.during.base).toBe(2);
    expect(analysis.during.value).toBe(6);
  });

  it('inclui impulso contido na média de vontade', () => {
    const entries = [
      urgeEpisode('acao', '2026-11-09', 6),
      entry('impulso', '2026-11-10', {
        entryType: EntryType.EPISODE,
        urgeIntensity: 8,
        behaviors: [
          {
            categoryId: 'cat_financeira',
            categoryName: 'Financeira',
            itemId: 'fin_compras',
            itemLabel: 'Compras impulsivas',
            mode: BehaviorMode.IMPULSO,
            harm: false,
          },
        ],
      }),
      entry('checkin', '2026-11-11'),
    ];

    const analysis = analyzeExperiment(experiment, entries, '2026-11-20');

    expect(analysis.during).toEqual({ answered: 2, base: 2, value: 7 });
  });

  it('conta episódios como total, sem média', () => {
    const episodesExperiment = createExperiment({
      hypothesis: 'Episódios caem quando durmo melhor',
      metric: 'episodes',
      startDate: '2026-11-08',
      endDate: '2026-11-14',
    });
    const entries = [
      urgeEpisode('antigo', '2026-11-05', 5),
      urgeEpisode('durante', '2026-11-09', 5),
      urgeEpisode('durante2', '2026-11-10', 5),
      entry('impulso', '2026-11-12', {
        entryType: EntryType.EPISODE,
        urgeIntensity: 9,
        behaviors: [
          {
            categoryId: 'cat_financeira',
            categoryName: 'Financeira',
            itemId: 'fin_compras',
            itemLabel: 'Compras impulsivas',
            mode: BehaviorMode.IMPULSO,
            harm: false,
          },
        ],
      }),
      entry('checkin', '2026-11-11'),
    ];

    const analysis = analyzeExperiment(episodesExperiment, entries, '2026-11-20');

    expect(analysis.before.value).toBe(1);
    expect(analysis.during.value).toBe(2);
    expect(analysis.delta).toBe(1);
  });
});

describe('descrição e encerramento', () => {
  it('mostra a conclusão registrada, sem calcular veredito', () => {
    const finished = {
      ...experiment,
      status: 'finished' as const,
      result: 'difference' as const,
      resultNote: 'Notei mais vontade depois de noites curtas.',
      closedAt: '2026-11-15T10:00:00.000Z',
    };

    const text = describeExperiment(
      finished,
      analyzeExperiment(finished, [urgeEpisode('a', '2026-11-09', 8)], '2026-11-20')
    ).join('\n');

    expect(text).toContain('Conclusão registrada por você: Apareceu diferença.');
    expect(text).toContain('Notei mais vontade');
    expect(text).toContain('informado em 1 de 1 registros');
  });

  it('janela vencida sem resultado permanece ativa e pede a conclusão', () => {
    const analysis = analyzeExperiment(experiment, [], '2026-11-20');
    const text = describeExperiment(experiment, analysis).join('\n');
    expect(text).toContain('Janela encerrada — a conclusão ainda não foi registrada.');
    expect(experiment.status).toBe('active');
  });

  it('normalização descarta registro sem identidade e não inventa status concluído', () => {
    expect(normalizeExperiment({ hypothesis: 'x' })).toBeNull();

    const normalized = normalizeExperiment({
      ...experiment,
      status: 'finished',
      result: null,
    });
    expect(normalized?.status).toBe('active');
    expect(normalized?.result).toBeNull();
  });

  it('normalização preserva as três saídas válidas', () => {
    for (const result of ['difference', 'no_difference', 'insufficient_data'] as const) {
      const normalized = normalizeExperiment({ ...experiment, status: 'finished', result });
      expect(normalized?.status).toBe('finished');
      expect(normalized?.result).toBe(result);
    }
  });
});
