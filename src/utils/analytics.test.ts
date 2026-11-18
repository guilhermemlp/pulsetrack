import { describe, expect, it } from 'vitest';
import { createDefaultCategories } from '../data/defaults';
import { renameItem } from './categories';
import {
  AwarenessType,
  BehaviorMode,
  EntryType,
  FunctionalImpactLevel,
  MoodStateId,
  PulseEntry,
  ReducedSleepNeed,
  ResistanceResult,
  SelectedBehavior,
  SleepQuality,
  SleepRecord,
  StateDuration,
} from '../types/pulsetrack';
import {
  computeAnalytics,
  filterEntriesByPeriod,
  formatLongDate,
  formatShortDate,
  hasImpulse,
  hasRealizedBehavior,
  hasReportedHarm,
  hasUnclassifiedBehavior,
  isEpisodeEntry,
  summarizeCoverage,
  toLocalIsoDate,
} from './analytics';
import { normalizeEntry } from './storage';

/** Data (YYYY-MM-DD) no fuso local, deslocada em `daysAgo` dias a partir de hoje. */
function dateOffset(daysAgo: number): string {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() - daysAgo);
  return toLocalIsoDate(d);
}

type BehaviorSeed = Partial<SelectedBehavior> &
  Pick<SelectedBehavior, 'categoryId' | 'categoryName' | 'itemId' | 'itemLabel'>;

type EntrySeed = Omit<Partial<PulseEntry>, 'sleep' | 'behaviors'> & {
  sleep?: Partial<SleepRecord>;
  behaviors?: BehaviorSeed[];
};

/** Fixture explícita: ação realizada sem prejuízo, salvo quando o teste disser o contrário. */
function behavior(overrides: Partial<SelectedBehavior> = {}): SelectedBehavior {
  return {
    categoryId: 'cat_financeira',
    categoryName: 'Financeira',
    itemId: 'fin_compras',
    itemLabel: 'Compras impulsivas',
    mode: BehaviorMode.FEITO,
    harm: false,
    ...overrides,
  };
}

function makeEntry(overrides: EntrySeed = {}): PulseEntry {
  return normalizeEntry({
    id: overrides.id ?? `entry_${Math.random().toString(36).slice(2, 8)}`,
    date: overrides.date ?? dateOffset(1),
    time: '20:00',
    createdAt: `${overrides.date ?? dateOffset(1)}T20:00:00`,
    ...overrides,
    // A fixture só cria ação/impulso quando o modo é dito; não usa o fallback legado.
    behaviors: overrides.behaviors?.map((item) => ({
      ...item,
      mode: item.mode ?? BehaviorMode.FEITO,
      harm: item.harm ?? false,
    })),
  } as Partial<PulseEntry>);
}

/** Cenário: 1 check-in calmo, seguido de 2 episódios (alta energia e queda posterior). */
function buildScenario(): PulseEntry[] {
  return [
    makeEntry({
      id: 'calmo',
      date: dateOffset(3),
      entryType: EntryType.DAILY_CHECKIN,
      moods: [MoodStateId.NEUTRO],
      energyLevel: 7,
      sleep: { hours: 5, quality: SleepQuality.REGULAR, reducedNeed: ReducedSleepNeed.LEVE },
      stateDuration: StateDuration.HORAS,
    }),
    makeEntry({
      id: 'alta-energia',
      date: dateOffset(2),
      entryType: EntryType.EPISODE,
      moods: [MoodStateId.EUFORICO_AGITADO],
      energyLevel: 8,
      sleep: { hours: 4.5, quality: SleepQuality.RUIM, reducedNeed: ReducedSleepNeed.MARCANTE },
      stateDuration: StateDuration.DIAS_1_3,
      hadMoodSwing: true,
      behaviors: [behavior()],
      awareness: AwarenessType.AUTOMATICO,
      resisted: ResistanceResult.NAO,
      urgeIntensity: 9,
      functionalImpact: {
        work: FunctionalImpactLevel.MODERADO,
        relationships: FunctionalImpactLevel.NENHUM,
        routine: FunctionalImpactLevel.NENHUM,
        note: '',
      },
    }),
    makeEntry({
      id: 'queda',
      date: dateOffset(1),
      entryType: EntryType.EPISODE,
      moods: [MoodStateId.APATIA_EXAUSTAO],
      energyLevel: 2,
      sleep: { hours: 9, quality: SleepQuality.BOA, reducedNeed: ReducedSleepNeed.NAO },
      stateDuration: StateDuration.DIAS_1_3,
      behaviors: [
        behavior({
          categoryId: 'cat_digital',
          categoryName: 'Digital / Hiperestimulação',
          itemId: 'dig_scroll',
          itemLabel: 'Scroll infinito / feeds',
        }),
      ],
      urgeIntensity: 5,
    }),
  ];
}

describe('helpers de data', () => {
  it('formata datas ISO locais sem deslocamento de fuso', () => {
    expect(toLocalIsoDate(new Date(2026, 0, 5))).toBe('2026-01-05');
    expect(formatShortDate('2026-01-05')).toBe('05/01');
    expect(formatLongDate('2026-01-05')).toBe('05/01/2026');
  });

  it('devolve a entrada crua quando o formato não é ISO', () => {
    expect(formatShortDate('ontem')).toBe('ontem');
  });
});

describe('filterEntriesByPeriod', () => {
  it('mantém apenas o intervalo pedido, do mais recente para o mais antigo', () => {
    const entries = buildScenario();
    entries.push(makeEntry({ id: 'antigo', date: dateOffset(20) }));

    const filtrados = filterEntriesByPeriod(entries, '7');

    expect(filtrados.map((e) => e.id)).toEqual(['queda', 'alta-energia', 'calmo']);
  });

  it('em "all" mantém todo o histórico ordenado', () => {
    const entries = [...buildScenario(), makeEntry({ id: 'antigo', date: dateOffset(20) })];

    expect(filterEntriesByPeriod(entries, 'all').map((e) => e.id)).toEqual([
      'queda',
      'alta-energia',
      'calmo',
      'antigo',
    ]);
  });
});

describe('isEpisodeEntry e predicados de comportamento', () => {
  it('não considera episódio apenas pelo tipo declarado', () => {
    expect(isEpisodeEntry(makeEntry({ entryType: EntryType.EPISODE }))).toBe(false);
  });

  it('considera episódio quando há ação realizada, mesmo em check-in', () => {
    expect(
      isEpisodeEntry(
        makeEntry({ entryType: EntryType.DAILY_CHECKIN, behaviors: [behavior()] })
      )
    ).toBe(true);
  });

  it('não conta impulso contido como ação realizada', () => {
    const impulso = makeEntry({
      entryType: EntryType.EPISODE,
      behaviors: [behavior({ mode: BehaviorMode.IMPULSO })],
    });

    expect(hasImpulse(impulso)).toBe(true);
    expect(hasRealizedBehavior(impulso)).toBe(false);
    expect(isEpisodeEntry(impulso)).toBe(false);
  });

  it('reconhece impulso seguido de ação sem reduzir os dois a uma única categoria', () => {
    const misto = makeEntry({
      behaviors: [
        behavior({ mode: BehaviorMode.IMPULSO }),
        behavior({
          categoryId: 'cat_digital',
          categoryName: 'Digital',
          itemId: 'dig_scroll',
          itemLabel: 'Scroll',
        }),
      ],
    });

    expect(hasImpulse(misto)).toBe(true);
    expect(hasRealizedBehavior(misto)).toBe(true);
    expect(isEpisodeEntry(misto)).toBe(true);
  });

  it('não presume impulso nem prejuízo pela existência de uma ação', () => {
    const acao = makeEntry({ behaviors: [behavior()] });
    expect(hasImpulse(acao)).toBe(false);
    expect(hasImpulse(makeEntry({ urgeIntensity: 0 }))).toBe(false);
    expect(hasImpulse(makeEntry({ urgeIntensity: 5 }))).toBe(true);
    expect(hasReportedHarm(acao)).toBe(false);
    expect(hasReportedHarm(makeEntry({ behaviors: [behavior({ harm: true })] }))).toBe(true);
  });

  it('mantém texto livre isolado como não classificado', () => {
    const livre = makeEntry({ behaviorOtherText: 'Vontade de comprar' });

    expect(hasRealizedBehavior(livre)).toBe(false);
    expect(hasImpulse(livre)).toBe(false);
    expect(hasUnclassifiedBehavior(livre)).toBe(true);
    expect(isEpisodeEntry(livre)).toBe(false);
  });

  it('mantém dado legado sem modo como não classificado', () => {
    const legado = normalizeEntry({
      id: 'legado',
      date: dateOffset(1),
      behaviors: [
        {
          categoryId: 'cat_financeira',
          categoryName: 'Financeira',
          itemId: 'fin_compras',
          itemLabel: 'Compras impulsivas',
        },
      ] as PulseEntry['behaviors'],
    });

    expect(legado.behaviors[0]?.mode).toBe(BehaviorMode.DESCONHECIDO);
    expect(hasImpulse(legado)).toBe(false);
    expect(hasRealizedBehavior(legado)).toBe(false);
    expect(hasUnclassifiedBehavior(legado)).toBe(true);
  });

  it('não considera episódio um check-in sem comportamentos', () => {
    expect(
      isEpisodeEntry(makeEntry({ entryType: EntryType.DAILY_CHECKIN, moods: [MoodStateId.NEUTRO] }))
    ).toBe(false);
  });
});

describe('computeAnalytics', () => {
  it('não quebra e devolve null quando não há registros', () => {
    const analytics = computeAnalytics([], createDefaultCategories(), '30');

    expect(analytics.totalEntries).toBe(0);
    // Sem resposta não existe média: null em vez de 0 (que viraria um dado falso).
    expect(analytics.avgEnergy).toBeNull();
    expect(analytics.avgSleepHours).toBeNull();
    expect(analytics.avgUrgeIntensity).toBeNull();
    expect(analytics.avgValence).toBeNull();
    expect(analytics.categoryStats).toEqual([]);
    expect(analytics.insights).toEqual([]);
    expect(analytics.dailyTimeline).toHaveLength(30);
  });

  it('separa check-ins de episódios e calcula as médias do período', () => {
    const analytics = computeAnalytics(buildScenario(), createDefaultCategories(), '7');

    expect(analytics.totalEntries).toBe(3);
    expect(analytics.totalEpisodes).toBe(2);
    expect(analytics.totalEntriesWithoutRealizedBehavior).toBe(1);
    expect(analytics.daysLogged).toBe(3);
    expect(analytics.daysWithEpisodes).toBe(2);
    // 3 dias acompanhados, 2 com episódio → 1 dia acompanhado sem episódio
    expect(analytics.daysWithoutEpisodes).toBe(1);
    // recorte de 7 dias com 3 dias registrados → 4 dias sem nenhum registro
    expect(analytics.daysWithoutLog).toBe(4);
    // (7 + 8 + 2) / 3 e (5 + 4.5 + 9) / 3
    expect(analytics.avgEnergy).toBe(5.7);
    expect(analytics.avgSleepHours).toBe(6.2);
    // A média de vontade usa todos os registros que a informaram: (9 + 5) / 2
    expect(analytics.avgUrgeIntensity).toBe(7);
  });

  it('separa ação realizada, impulso contido e prejuízo relatado', () => {
    const entries = [
      makeEntry({
        id: 'acao',
        date: dateOffset(1),
        behaviors: [behavior()],
      }),
      makeEntry({
        id: 'acao-com-prejuizo',
        date: dateOffset(2),
        behaviors: [behavior({ harm: true })],
      }),
      makeEntry({
        id: 'so-impulso',
        date: dateOffset(3),
        entryType: EntryType.EPISODE,
        behaviors: [behavior({ mode: BehaviorMode.IMPULSO })],
        urgeIntensity: 8,
      }),
      makeEntry({
        id: 'misto',
        date: dateOffset(4),
        behaviors: [
          behavior({ mode: BehaviorMode.IMPULSO }),
          behavior({
            categoryId: 'cat_digital',
            categoryName: 'Digital',
            itemId: 'dig_scroll',
            itemLabel: 'Scroll',
          }),
        ],
        urgeIntensity: 6,
      }),
      normalizeEntry({
        id: 'legado',
        date: dateOffset(5),
        behaviors: [
          {
            categoryId: 'cat_financeira',
            categoryName: 'Financeira',
            itemId: 'fin_compras',
            itemLabel: 'Compras impulsivas',
          },
        ] as PulseEntry['behaviors'],
      }),
    ];

    const analytics = computeAnalytics(entries, createDefaultCategories(), '7');

    expect(analytics.totalEntries).toBe(5);
    expect(analytics.totalEpisodes).toBe(3);
    expect(analytics.totalEntriesWithoutRealizedBehavior).toBe(2);
    expect(analytics.totalImpulseOnlyEntries).toBe(1);
    expect(analytics.totalUnclassifiedBehaviorEntries).toBe(1);
    expect(analytics.behaviorModes).toEqual({
      feitos: 3,
      impulsos: 2,
      comPrejuizo: 1,
      registrosComAcao: 3,
      registrosComImpulso: 2,
      registrosComPrejuizo: 1,
      registrosComClassificacaoDesconhecida: 1,
      registrosComImpulsoSemAcao: 1,
    });
    expect(analytics.coverage.behavior.base).toBe(5);
    expect(analytics.coverage.urge).toEqual({ answered: 2, base: 5 });

    const financeira = analytics.categoryStats.find((c) => c.categoryId === 'cat_financeira')!;
    expect(financeira.count).toBe(5);
    expect(financeira.realizedCount).toBe(2);
    expect(financeira.impulseCount).toBe(2);
    expect(financeira.harmCount).toBe(1);
  });

  it('sempre inclui o insight de segurança, com ou sem sofrimento grave', () => {
    const analytics = computeAnalytics(buildScenario(), createDefaultCategories(), '7');
    const safety = analytics.insights.find((i) => i.id === 'ins_safety');

    expect(safety).toBeTruthy();
    expect(safety?.summary).toMatch(/Nenhum registro do período/i);
    expect(safety?.detail).toContain('CVV 188');
    expect(safety?.basis).toContain('Base:');
  });

  it('só gera o insight de sono com pelo menos 3 registros de sono informado', () => {
    const curto = computeAnalytics(buildScenario().slice(0, 2), createDefaultCategories(), '7');
    expect(curto.insights.some((i) => i.id === 'ins_sleep')).toBe(false);

    const completo = computeAnalytics(buildScenario(), createDefaultCategories(), '7');
    expect(completo.insights.some((i) => i.id === 'ins_sleep')).toBe(true);
  });

  it('sinaliza redução da necessidade de sono e noites ruins', () => {
    const analytics = computeAnalytics(buildScenario(), createDefaultCategories(), '7');

    expect(analytics.reducedSleepNeedCount).toBe(2);
    expect(analytics.reducedSleepNeedBase).toBe(3);
    expect(analytics.reducedSleepNeedRate).toBe(67);
    expect(analytics.poorSleepCount).toBe(2);
  });

  it('agrega frequência por categoria com intensidade média da vontade', () => {
    const analytics = computeAnalytics(buildScenario(), createDefaultCategories(), '7');

    const financeira = analytics.categoryStats.find((c) => c.categoryId === 'cat_financeira');
    const digital = analytics.categoryStats.find((c) => c.categoryId === 'cat_digital');

    expect(financeira?.count).toBe(1);
    expect(financeira?.avgUrge).toBe(9);
    expect(financeira?.topItems).toEqual([{ label: 'Compras impulsivas', count: 1 }]);
    expect(digital?.count).toBe(1);
    expect(digital?.avgUrge).toBe(5);
  });

  it('compara o ciclo antes, durante e depois dos episódios', () => {
    const analytics = computeAnalytics(buildScenario(), createDefaultCategories(), '7');
    const ciclo = analytics.cycleAnalysis;

    expect(ciclo.analyzedEpisodes).toBe(2);
    expect(ciclo.during.sampleDays).toBe(2);
    // -2 e -1 são consecutivos: o único dia anterior registrado é o check-in calmo
    expect(ciclo.before.sampleDays).toBe(1);
    expect(ciclo.before.avgEnergy).toBe(7);
    expect(ciclo.findings.length).toBeGreaterThan(0);
  });

  it('produz insights e indicadores de alta energia coerentes com os dados', () => {
    const analytics = computeAnalytics(buildScenario(), createDefaultCategories(), '7');

    expect(analytics.bipolarIndicators.highEnergyEpisodes).toBe(1);
    expect(analytics.bipolarIndicators.highEnergyPercent).toBe(50);
    expect(analytics.bipolarIndicators.moodSwingEntries).toBe(1);
    expect(analytics.insights.some((i) => i.id === 'ins_high_energy')).toBe(true);
    expect(analytics.insights.some((i) => i.id === 'ins_evolution')).toBe(true);
  });
});

describe('moodStats', () => {
  it('calcula a taxa de ações realizadas e a vontade apenas sobre elas', () => {
    const entries = [
      // O mesmo humor em um check-in calmo e em um registro com ação:
      // a média de vontade não pode ser diluída pelo check-in.
      makeEntry({
        id: 'calmo',
        date: dateOffset(2),
        moods: [MoodStateId.TRISTE_VAZIO],
        energyLevel: 3,
        entryType: EntryType.DAILY_CHECKIN,
      }),
      makeEntry({
        id: 'episodio',
        date: dateOffset(1),
        moods: [MoodStateId.TRISTE_VAZIO],
        energyLevel: 3,
        entryType: EntryType.EPISODE,
        behaviors: [behavior()],
        urgeIntensity: 8,
      }),
    ];

    const stat = computeAnalytics(entries, createDefaultCategories(), '7').moodStats.find(
      (m) => m.moodId === MoodStateId.TRISTE_VAZIO
    );

    expect(stat?.count).toBe(2);
    expect(stat?.episodeCount).toBe(1);
    expect(stat?.episodeRate).toBe(50);
    expect(stat?.avgUrge).toBe(8);
  });
});

describe('evolução comparada ao período anterior', () => {
  const episodeAt = (daysAgo: number, id: string, urge = 5) =>
    makeEntry({
      id,
      date: dateOffset(daysAgo),
      entryType: EntryType.EPISODE,
      moods: [MoodStateId.ANSIOSO],
      behaviors: [behavior()],
      urgeIntensity: urge,
    });

  it('detecta melhora quando os episódios caem em relação à janela anterior', () => {
    const entries = [
      episodeAt(45, 'p1'),
      episodeAt(50, 'p2'),
      episodeAt(55, 'p3'),
      episodeAt(2, 'c1'),
    ];

    const evo = computeAnalytics(entries, createDefaultCategories(), '30').evolution;

    expect(evo.basis).toBe('periodo_anterior');
    expect(evo.status).toBe('melhora');
    expect(evo.previousCount).toBe(3);
    expect(evo.currentCount).toBe(1);
  });

  it('detecta piora quando os episódios aumentam', () => {
    const entries = [
      episodeAt(35, 'p1'),
      episodeAt(1, 'c1'),
      episodeAt(2, 'c2'),
      episodeAt(3, 'c3'),
    ];

    const evo = computeAnalytics(entries, createDefaultCategories(), '30').evolution;

    expect(evo.status).toBe('piora');
    expect(evo.previousCount).toBe(1);
    expect(evo.currentCount).toBe(3);
  });

  it('marca estabilidade quando a variação fica dentro da margem', () => {
    const entries = [
      episodeAt(35, 'p1'),
      episodeAt(40, 'p2'),
      episodeAt(45, 'p3'),
      episodeAt(1, 'c1'),
      episodeAt(5, 'c2'),
      episodeAt(9, 'c3'),
    ];

    const evo = computeAnalytics(entries, createDefaultCategories(), '30').evolution;

    expect(evo.status).toBe('estabilidade');
    expect(evo.previousCount).toBe(3);
    expect(evo.currentCount).toBe(3);
  });

  it('fica indisponível quando não há nenhum registro anterior', () => {
    const entries = [episodeAt(1, 'c1'), episodeAt(2, 'c2')];

    const evo = computeAnalytics(entries, createDefaultCategories(), '30').evolution;

    expect(evo.status).toBe('insuficiente');
    // Sem janela anterior, tenta as metades — mas o início do período também está vazio
    expect(evo.basis).toBe('metades');
  });

  it('cai para as metades quando a janela anterior está vazia mas o período tem registros', () => {
    const entries = [episodeAt(13, 'p1'), episodeAt(2, 'c1')];

    const evo = computeAnalytics(entries, createDefaultCategories(), '14').evolution;

    expect(evo.basis).toBe('metades');
    expect(evo.status).not.toBe('insuficiente');
    expect(evo.previousCount).toBe(1);
    expect(evo.currentCount).toBe(1);
  });

  it('usa as metades do período na visão "Tudo"', () => {
    const entries = [
      episodeAt(60, 'p1'),
      episodeAt(50, 'p2'),
      episodeAt(3, 'c1'),
      episodeAt(1, 'c2'),
    ];

    const evo = computeAnalytics(entries, createDefaultCategories(), 'all').evolution;

    expect(evo.basis).toBe('metades');
    expect(evo.previousCount).toBe(2);
    expect(evo.currentCount).toBe(2);
  });
});

describe('insights cruzados', () => {
  const behaviorEpisode = (
    id: string,
    daysAgo: number,
    options: {
      energyLevel: number;
      mood: MoodStateId;
      awareness?: AwarenessType;
      sleep?: Partial<SleepRecord>;
      category: { id: string; name: string; itemId: string; itemLabel: string };
    }
  ) =>
    makeEntry({
      id,
      date: dateOffset(daysAgo),
      entryType: EntryType.EPISODE,
      moods: [options.mood],
      energyLevel: options.energyLevel,
      sleep: options.sleep,
      awareness: options.awareness ?? AwarenessType.MISTURA,
      urgeIntensity: 6,
      behaviors: [
        {
          categoryId: options.category.id,
          categoryName: options.category.name,
          itemId: options.category.itemId,
          itemLabel: options.category.itemLabel,
        },
      ],
    });

  const alimentar = {
    id: 'cat_alimentar',
    name: 'Alimentar',
    itemId: 'al_noturna',
    itemLabel: 'Compulsão alimentar noturna',
  };
  const digital = {
    id: 'cat_digital',
    name: 'Digital / Hiperestimulação',
    itemId: 'dig_scroll',
    itemLabel: 'Scroll infinito / feeds',
  };
  const financeira = {
    id: 'cat_financeira',
    name: 'Financeira',
    itemId: 'fin_compras',
    itemLabel: 'Compras impulsivas',
  };

  it('identifica o humor predominante por categoria', () => {
    const entries = [1, 2, 3].map((i) =>
      behaviorEpisode(`alim${i}`, i, {
        energyLevel: 2,
        mood: MoodStateId.TRISTE_VAZIO,
        awareness: AwarenessType.CONSCIENTE,
        category: alimentar,
      })
    );

    const insight = computeAnalytics(entries, createDefaultCategories(), '30').insights.find(
      (i) => i.id === 'ins_cat_mood_cat_alimentar'
    );

    expect(insight).toBeTruthy();
    // Base < 5: contagem em vez de percentual.
    expect(insight?.summary).toContain('3 de 3 episódios');
    expect(insight?.summary).not.toContain('100%');
    expect(insight?.summary).toMatch(/triste \/ vazio/i);
    expect(insight?.metricLabel).toBe('3 de 3 episódios');
    expect(insight?.basis).toContain('Base: 3 de 3');
  });

  it('não gera insight de humor sem concentração suficiente', () => {
    const entries = [
      behaviorEpisode('a', 1, {
        energyLevel: 2,
        mood: MoodStateId.TRISTE_VAZIO,
        category: alimentar,
      }),
      behaviorEpisode('b', 2, {
        energyLevel: 8,
        mood: MoodStateId.EUFORICO_AGITADO,
        category: alimentar,
      }),
      behaviorEpisode('c', 3, {
        energyLevel: 5,
        mood: MoodStateId.ANSIOSO,
        category: alimentar,
      }),
    ];

    const insights = computeAnalytics(entries, createDefaultCategories(), '30').insights;

    expect(insights.some((i) => i.id.startsWith('ins_cat_mood_'))).toBe(false);
  });

  it('aponta ação automática por categoria', () => {
    const entries = [1, 2, 3].map((i) =>
      behaviorEpisode(`dig${i}`, i, {
        energyLevel: 3,
        mood: MoodStateId.APATIA_EXAUSTAO,
        awareness: AwarenessType.AUTOMATICO,
        category: digital,
      })
    );

    const insight = computeAnalytics(entries, createDefaultCategories(), '30').insights.find(
      (i) => i.id === 'ins_cat_awareness_cat_digital'
    );

    expect(insight).toBeTruthy();
    expect(insight?.summary).toContain('3 de 3 episódios');
    expect(insight?.summary).not.toContain('100%');
    expect(insight?.summary).toMatch(/automáticos/i);
  });

  it('usa percentual quando o denominador chega a 5', () => {
    const entries = [1, 2, 3, 4, 5].map((i) =>
      behaviorEpisode(`alim${i}`, i, {
        energyLevel: 2,
        mood: MoodStateId.TRISTE_VAZIO,
        awareness: AwarenessType.CONSCIENTE,
        category: alimentar,
      })
    );

    const insight = computeAnalytics(entries, createDefaultCategories(), '30').insights.find(
      (i) => i.id === 'ins_cat_mood_cat_alimentar'
    );

    expect(insight?.summary).toContain('100%');
    expect(insight?.summary).toContain('5 de 5');
    expect(insight?.basis).toContain('5 de 5');
  });

  it('destaca o comportamento concentrado em alta energia', () => {
    const high = [1, 2, 3].map((i) =>
      behaviorEpisode(`high${i}`, i, {
        energyLevel: 9,
        // O indicador exige energia alta + redução da necessidade de sono.
        sleep: { hours: 4.5, reducedNeed: ReducedSleepNeed.MARCANTE },
        mood: MoodStateId.EUFORICO_AGITADO,
        category: financeira,
      })
    );
    const other = [4, 5, 6].map((i) =>
      behaviorEpisode(`low${i}`, i, {
        energyLevel: 3,
        mood: MoodStateId.TRISTE_VAZIO,
        category: digital,
      })
    );

    const insight = computeAnalytics(
      [...high, ...other],
      createDefaultCategories(),
      '30'
    ).insights.find((i) => i.id === 'ins_energy_shift');

    expect(insight).toBeTruthy();
    expect(insight?.summary).toContain('Compras impulsivas');
    // 3 episódios de cada lado: contagem, sem delta percentual.
    expect(insight?.summary).toContain('3 de 3 episódios de alta energia');
    expect(insight?.summary).toContain('0 de 3 demais episódios');
    expect(insight?.summary).not.toContain('100%');
    expect(insight?.summary).not.toContain('pontos percentuais');
  });
});

describe('cobertura do período', () => {
  it('conta respondidos e base por eixo, sem inventar resposta', () => {
    const entries = [
      makeEntry({
        entryType: EntryType.DAILY_CHECKIN,
        date: dateOffset(1),
        moods: [MoodStateId.ANSIOSO],
        energyLevel: 6,
        sleep: { hours: 7, quality: SleepQuality.BOA },
      }),
      makeEntry({
        entryType: EntryType.EPISODE,
        date: dateOffset(2),
        moods: [MoodStateId.ANSIOSO],
        behaviors: [behavior()],
      }),
    ];

    const { coverage, totalEntries, totalEpisodes } = computeAnalytics(
      entries,
      createDefaultCategories(),
      '30'
    );

    expect(totalEntries).toBe(2);
    expect(totalEpisodes).toBe(1);
    expect(coverage.mood).toEqual({ answered: 2, base: 2 });
    expect(coverage.energy).toEqual({ answered: 1, base: 2 });
    expect(coverage.sleepHours).toEqual({ answered: 1, base: 2 });
    // Vontade e consciência se aplicam aos registros com comportamento/impulso.
    expect(coverage.urge.base).toBe(totalEpisodes);
    expect(coverage.behavior).toEqual({ answered: 1, base: 1 });
    expect(coverage.safety).toEqual({ answered: 0, base: 2 });
  });

  it('resume a cobertura por seção do relatório', () => {
    const entries = [makeEntry({ moods: [MoodStateId.NEUTRO], valence: 6, energyLevel: 5 })];
    const analytics = computeAnalytics(entries, createDefaultCategories(), '30');

    const emotional = summarizeCoverage(analytics.coverage).find((s) => s.id === 'emocional');

    expect(emotional?.answered).toBe(2);
    expect(emotional?.base).toBe(2);
  });
});

describe('série histórica por itemId (schema v2)', () => {
  const renameCompras = () =>
    renameItem(createDefaultCategories(), 'cat_financeira', 'fin_compras', 'Compras por impulso');

  function episode(label: string, itemId = 'fin_compras'): PulseEntry {
    return makeEntry({
      entryType: EntryType.EPISODE,
      behaviors: [
        {
          categoryId: 'cat_financeira',
          categoryName: 'Financeira',
          itemId,
          itemLabel: label,
        },
      ],
    });
  }

  it('renomear não divide a contagem: rótulos antigo e novo caem no mesmo item', () => {
    const entries = [episode('Compras impulsivas'), episode('Compras por impulso')];

    const analytics = computeAnalytics(entries, renameCompras(), '30');
    const financeira = analytics.categoryStats.find((c) => c.categoryId === 'cat_financeira')!;

    expect(financeira.count).toBe(2);
    expect(financeira.topItems).toEqual([{ label: 'Compras por impulso', count: 2 }]);
  });

  it('registro legado sem itemId é resolvido pelo alias do rótulo', () => {
    const entries = [episode('Compras impulsivas', ''), episode('Compras por impulso')];

    const analytics = computeAnalytics(entries, renameCompras(), '30');
    const financeira = analytics.categoryStats.find((c) => c.categoryId === 'cat_financeira')!;

    expect(financeira.topItems).toEqual([{ label: 'Compras por impulso', count: 2 }]);
  });

  it('os números não mudam com o rename — só o rótulo exibido', () => {
    const entries = [episode('Compras impulsivas'), episode('Compras impulsivas')];
    const before = computeAnalytics(entries, createDefaultCategories(), '30');
    const after = computeAnalytics(entries, renameCompras(), '30');

    const beforeFinanceira = before.categoryStats.find((c) => c.categoryId === 'cat_financeira')!;
    const afterFinanceira = after.categoryStats.find((c) => c.categoryId === 'cat_financeira')!;

    expect(afterFinanceira.count).toBe(beforeFinanceira.count);
    expect(afterFinanceira.percentage).toBe(beforeFinanceira.percentage);
    expect(afterFinanceira.harmCount).toBe(beforeFinanceira.harmCount);
    expect(afterFinanceira.avgUrge).toBe(beforeFinanceira.avgUrge);
    expect(beforeFinanceira.topItems[0].label).toBe('Compras impulsivas');
    expect(afterFinanceira.topItems[0].label).toBe('Compras por impulso');
  });

  it('rótulo desconhecido continua contando pelo label (nada é descartado)', () => {
    const entries = [
      makeEntry({
        entryType: EntryType.EPISODE,
        behaviors: [
          {
            categoryId: 'cat_outros',
            categoryName: 'Outros',
            itemId: 'item_que_nao_existe',
            itemLabel: 'Item removido do catálogo',
          },
        ],
      }),
    ];

    const analytics = computeAnalytics(entries, createDefaultCategories(), '30');
    const outros = analytics.categoryStats.find((c) => c.categoryId === 'cat_outros')!;

    expect(outros.topItems[0].label).toBe('Item removido do catálogo');
    expect(outros.count).toBe(1);
  });
});
