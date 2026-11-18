import { describe, expect, it } from 'vitest';
import {
  DailyLogDraft,
  DRAFT_VERSION,
  draftHasContent,
  formatDraftDate,
  formatDraftTime,
  isDraftFromPreviousDay,
  parseFormDraft,
} from './draft';
import { FormDraft } from './storage';
import {
  ActivationSignal,
  AwarenessType,
  BehaviorMode,
  CyclePhase,
  EntryType,
  FunctionalImpactLevel,
  MedicationStatus,
  MoodStateId,
  MoodSwingDirection,
  MoodSwingWindow,
  ReducedSleepNeed,
  ResistanceResult,
  SafetyConcern,
  SleepQuality,
  StateDuration,
} from '../types/pulsetrack';

const fallbacks = {
  date: '2026-11-18',
  time: '09:00',
  level: 'rapido' as const,
  entryType: EntryType.DAILY_CHECKIN,
};

const draftAt = (iso: string): FormDraft => ({ savedAt: iso, payload: { moods: ['ansioso'] } });

function fullDraft(): DailyLogDraft {
  return {
    version: DRAFT_VERSION,
    entryType: EntryType.EPISODE,
    level: 'completo',
    quickImpulseAnswer: 'sim',
    date: '2026-11-17',
    time: '21:05',
    moods: [MoodStateId.ANSIOSO, MoodStateId.IRRITADO],
    moodIntensity: { ansioso: 8, irritado: 6 },
    moodOtherText: 'inquieto por dentro',
    valence: 3,
    hadMoodSwing: true,
    moodSwingDirection: MoodSwingDirection.DESCEU,
    moodSwingWindow: MoodSwingWindow.HORAS,
    moodSwingDescription: 'passei de apatia para agitação',
    energyLevel: 4,
    sleepHours: 5.5,
    sleepQuality: SleepQuality.RUIM,
    reducedSleepNeed: ReducedSleepNeed.MARCANTE,
    noFatigueAfterShortSleep: false,
    bedTime: '01:30',
    wakeTime: '07:00',
    latencyMinutes: 40,
    awakenings: 3,
    stateDuration: StateDuration.DIAS_4_6,
    activationSignals: [
      ActivationSignal.PENSAMENTOS_ACELERADOS,
      ActivationSignal.FALA_INTENSA,
    ],
    triggerContext: 'sobrecarga sensorial',
    behaviors: [
      {
        categoryId: 'cat_financeira',
        categoryName: 'Financeira',
        itemId: 'fin_compras',
        itemLabel: 'Compras impulsivas',
        mode: BehaviorMode.FEITO,
        harm: true,
      },
      {
        categoryId: 'cat_financeira',
        categoryName: 'Financeira',
        itemId: 'fin_apostas',
        itemLabel: 'Apostas',
        mode: BehaviorMode.IMPULSO,
        harm: false,
      },
    ],
    behaviorOtherText: 'gasto pequeno',
    awareness: AwarenessType.AUTOMATICO,
    resisted: ResistanceResult.NAO,
    urgeIntensity: 9,
    feelingDuring: 'piloto automático',
    feelingAfter: 'arrependimento',
    impactWork: FunctionalImpactLevel.MODERADO,
    impactRelationships: FunctionalImpactLevel.LEVE,
    impactRoutine: FunctionalImpactLevel.INTENSO,
    impactNote: 'atrasei entregas',
    medicationStatus: MedicationStatus.USO_REGULAR,
    medicationEffects: 'mais estável à tarde',
    cyclePhase: CyclePhase.LUTEA,
    notes: 'detalhe livre',
    dayEvents: ['viagem', 'consulta'],
    dayEventsNote: 'consulta à tarde',
    safetyConcern: SafetyConcern.NENHUM,
  };
}

describe('rascunho: leitura tipada', () => {
  it('restaura todos os campos, incluindo metadados, objetos e arrays', () => {
    const restored = parseFormDraft(
      fullDraft() as unknown as Record<string, unknown>,
      fallbacks
    );

    expect(restored).toEqual(fullDraft());
    expect(restored.moodIntensity).toEqual({ ansioso: 8, irritado: 6 });
    expect(restored.behaviors).toHaveLength(2);
    expect(restored.activationSignals).toEqual([
      ActivationSignal.PENSAMENTOS_ACELERADOS,
      ActivationSignal.FALA_INTENSA,
    ]);
  });

  it('mantém objetos quando o payload vem de JSON (não cai no fallback vazio)', () => {
    const parsed = JSON.parse(
      JSON.stringify({ version: 2, moods: ['ansioso'], moodIntensity: { ansioso: 7 } })
    );
    const restored = parseFormDraft(parsed, fallbacks);

    expect(restored.moodIntensity).toEqual({ ansioso: 7 });
  });

  it('preserva tipo e nível de registro escolhidos', () => {
    const restored = parseFormDraft(
      { version: 2, entryType: EntryType.EPISODE, level: 'completo' },
      fallbacks
    );

    expect(restored.entryType).toBe(EntryType.EPISODE);
    expect(restored.level).toBe('completo');
    expect(restored.quickImpulseAnswer).toBeNull();
  });

  it('lê rascunho v1 sem metadados sem perder respostas', () => {
    const restored = parseFormDraft(
      {
        moods: ['ansioso'],
        moodIntensity: { ansioso: 6 },
        sleepHours: 5,
        activationSignals: ['pensamentos_acelerados'],
        behaviors: [
          {
            categoryId: 'cat_financeira',
            categoryName: 'Financeira',
            itemId: 'fin_compras',
            itemLabel: 'Compras impulsivas',
            mode: 'feito',
            harm: false,
          },
        ],
        notes: 'rascunho antigo',
      },
      fallbacks
    );

    expect(restored.version).toBe(1);
    expect(restored.entryType).toBe(EntryType.DAILY_CHECKIN);
    expect(restored.level).toBe('rapido');
    expect(restored.moods).toEqual([MoodStateId.ANSIOSO]);
    expect(restored.moodIntensity).toEqual({ ansioso: 6 });
    expect(restored.sleepHours).toBe(5);
    expect(restored.activationSignals).toEqual([ActivationSignal.PENSAMENTOS_ACELERADOS]);
    expect(restored.behaviors[0].mode).toBe(BehaviorMode.FEITO);
    expect(restored.notes).toBe('rascunho antigo');
    // Resposta de impulso pode ser deduzida do comportamento já registrado.
    expect(restored.quickImpulseAnswer).toBe('sim');
  });

  it('descarta valores com tipo inesperado sem inventar respostas', () => {
    const restored = parseFormDraft(
      {
        version: 2,
        moods: ['ansioso', 'id_invalido', 42],
        moodIntensity: { ansioso: 'muito', irritado: 4 },
        energyLevel: 'alta',
        awareness: 'talvez',
        behaviors: [{ itemId: 'fin_compras', mode: 'modo_invalido' }],
      },
      fallbacks
    );

    expect(restored.moods).toEqual([MoodStateId.ANSIOSO]);
    expect(restored.moodIntensity).toEqual({ irritado: 4 });
    expect(restored.energyLevel).toBeNull();
    expect(restored.awareness).toBeNull();
    // Modo inválido/ausente não vira ação nem impulso: fica explicitamente sem classificação.
    expect(restored.behaviors[0].mode).toBe(BehaviorMode.DESCONHECIDO);
  });
});

describe('rascunho: detecção de conteúdo', () => {
  it('não considera um formulário vazio como rascunho', () => {
    expect(draftHasContent(parseFormDraft({}, fallbacks))).toBe(false);
  });

  it('reconhece apenas a intensidade de um humor (objeto)', () => {
    const restored = parseFormDraft(
      { version: 2, moodIntensity: { ansioso: 7 } },
      fallbacks
    );

    expect(draftHasContent(restored)).toBe(true);
  });

  it('reconhece um único campo de sono', () => {
    expect(draftHasContent(parseFormDraft({ sleepHours: 6 }, fallbacks))).toBe(true);
    expect(draftHasContent(parseFormDraft({ wakeTime: '07:00' }, fallbacks))).toBe(true);
    expect(
      draftHasContent(parseFormDraft({ noFatigueAfterShortSleep: false }, fallbacks))
    ).toBe(true);
  });

  it('reconhece um único sinal de ativação', () => {
    expect(
      draftHasContent(
        parseFormDraft({ activationSignals: ['pensamentos_acelerados'] }, fallbacks)
      )
    ).toBe(true);
  });

  it('reconhece respostas de comportamento, impacto e segurança', () => {
    expect(draftHasContent(parseFormDraft({ urgeIntensity: 8 }, fallbacks))).toBe(true);
    expect(
      draftHasContent(parseFormDraft({ impactWork: 'moderado' }, fallbacks))
    ).toBe(true);
    expect(
      draftHasContent(parseFormDraft({ safetyConcern: 'nenhum' }, fallbacks))
    ).toBe(true);
  });

  it('reconhece a intenção de registrar um episódio mesmo sem campos preenchidos', () => {
    expect(
      draftHasContent(parseFormDraft({ entryType: EntryType.EPISODE }, fallbacks))
    ).toBe(true);
  });
});

describe('rascunho: data e hora', () => {
  it('formata em HH:mm e dd/mm no fuso local', () => {
    const iso = new Date(2026, 10, 16, 21, 5).toISOString();

    expect(formatDraftTime(iso)).toBe('21:05');
    expect(formatDraftDate(iso)).toBe('16/11');
  });

  it('identifica rascunho salvo em um dia anterior', () => {
    const ontem = new Date();
    ontem.setDate(ontem.getDate() - 1);
    ontem.setHours(22, 0, 0, 0);

    const hoje = new Date();
    hoje.setHours(9, 0, 0, 0);

    expect(isDraftFromPreviousDay(draftAt(ontem.toISOString()))).toBe(true);
    expect(isDraftFromPreviousDay(draftAt(hoje.toISOString()))).toBe(false);
    expect(isDraftFromPreviousDay(null)).toBe(false);
  });

  it('não quebra com data inválida', () => {
    expect(formatDraftTime('não é data')).toBe('--:--');
    expect(formatDraftDate('não é data')).toBe('--/--');
    expect(isDraftFromPreviousDay(draftAt('não é data'))).toBe(false);
  });
});
