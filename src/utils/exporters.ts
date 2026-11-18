import {
  ACTIVATION_SIGNAL_OPTIONS,
  CYCLE_PHASE_OPTIONS,
  FUNCTIONAL_IMPACT_OPTIONS,
  MEDICATION_STATUS_OPTIONS,
  MOOD_DEFINITIONS,
  MOOD_SWING_DIRECTION_OPTIONS,
  MOOD_SWING_WINDOW_OPTIONS,
  REDUCED_SLEEP_NEED_OPTIONS,
  SAFETY_CONCERN_OPTIONS,
  SLEEP_QUALITY_OPTIONS,
  STATE_DURATION_OPTIONS,
} from '../data/defaults';
import {
  AnalyticsSummary,
  AwarenessType,
  BehaviorMode,
  Experiment,
  PeriodFilter,
  PulseEntry,
  ResistanceResult,
} from '../types/pulsetrack';
import {
  formatLongDate,
  isEpisodeEntry,
  summarizeCoverage,
  toLocalIsoDate,
} from './analytics';
import { analyzeExperiment, describeExperiment } from './experiments';
import { buildExecutiveReport } from './executive';

/** Marcador único de campo não respondido — nunca substituído por zero ou por um padrão. */
const NOT_INFORMED = 'não informado';

function num(value: number | null, suffix = ''): string {
  return value === null ? NOT_INFORMED : `${value}${suffix}`;
}

function pdfSafe(text: string): string {
  return text
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/→/g, '->')
    .replace(/—/g, '-')
    .replace(/–/g, '-')
    .replace(/≥/g, '>=')
    .replace(/≤/g, '<=')
    .replace(/·/g, '-');
}

function getMoodLabels(entry: PulseEntry): string {
  const labels = entry.moods.map((id) => {
    const label = MOOD_DEFINITIONS.find((m) => m.id === id)?.label ?? id;
    const intensity = entry.moodIntensity?.[id];
    return typeof intensity === 'number' ? `${label} (${intensity}/10)` : label;
  });
  if (entry.moodOtherText.trim()) {
    labels.push(`Outro: ${entry.moodOtherText.trim()}`);
  }
  return labels.length > 0 ? labels.join('; ') : NOT_INFORMED;
}

function getBehaviorModeLabel(mode: BehaviorMode): string {
  return mode === BehaviorMode.IMPULSO ? 'só impulso, não fiz' : 'fiz';
}

function getBehaviorsText(entry: PulseEntry): string {
  if (entry.behaviors.length === 0) return NOT_INFORMED;
  return entry.behaviors
    .map(
      (b) =>
        `${b.categoryName}: ${b.itemLabel} [${getBehaviorModeLabel(b.mode)}${
          b.harm ? ', com prejuízo' : ''
        }]`
    )
    .join(' | ');
}

function getAwarenessLabel(a: AwarenessType | null): string {
  if (a === AwarenessType.CONSCIENTE) return 'Consciente';
  if (a === AwarenessType.AUTOMATICO) return 'Automático';
  if (a === AwarenessType.MISTURA) return 'Mistura';
  return NOT_INFORMED;
}

function getResistanceLabel(r: ResistanceResult | null): string {
  if (r === ResistanceResult.SIM) return 'Sim';
  if (r === ResistanceResult.PARCIALMENTE) return 'Parcialmente';
  if (r === ResistanceResult.NAO) return 'Não';
  return NOT_INFORMED;
}

function getSleepQualityLabel(q: PulseEntry['sleep']['quality']): string {
  if (!q) return NOT_INFORMED;
  return SLEEP_QUALITY_OPTIONS.find((o) => o.id === q)?.label ?? q;
}

function getReducedSleepLabel(r: PulseEntry['sleep']['reducedNeed']): string {
  if (!r) return NOT_INFORMED;
  return REDUCED_SLEEP_NEED_OPTIONS.find((o) => o.id === r)?.label ?? r;
}

function getDurationLabel(d: PulseEntry['stateDuration']): string {
  if (!d) return NOT_INFORMED;
  return STATE_DURATION_OPTIONS.find((o) => o.id === d)?.label ?? d;
}

function getActivationLabels(signals: PulseEntry['activationSignals']): string {
  if (signals.length === 0) return 'nenhum sinal marcado';
  return signals
    .map((id) => ACTIVATION_SIGNAL_OPTIONS.find((o) => o.id === id)?.label ?? id)
    .join('; ');
}

function getImpactLabel(lvl: PulseEntry['functionalImpact']['work']): string {
  if (!lvl) return NOT_INFORMED;
  return FUNCTIONAL_IMPACT_OPTIONS.find((o) => o.id === lvl)?.label ?? lvl;
}

function getMoodSwingDirectionLabel(entry: PulseEntry): string {
  if (!entry.hadMoodSwing) return 'Não';
  const direction =
    MOOD_SWING_DIRECTION_OPTIONS.find((o) => o.id === entry.moodSwingDirection)?.label ??
    NOT_INFORMED;
  const window = MOOD_SWING_WINDOW_OPTIONS.find((o) => o.id === entry.moodSwingWindow)?.label;
  return window ? `Sim (${direction}; ${window})` : `Sim (${direction})`;
}

function getMedicationLabel(entry: PulseEntry): string {
  if (!entry.medication?.status) return NOT_INFORMED;
  return (
    MEDICATION_STATUS_OPTIONS.find((o) => o.id === entry.medication.status)?.label ?? NOT_INFORMED
  );
}

function getCyclePhaseLabel(entry: PulseEntry): string {
  if (!entry.cyclePhase) return NOT_INFORMED;
  return CYCLE_PHASE_OPTIONS.find((o) => o.id === entry.cyclePhase)?.label ?? NOT_INFORMED;
}

function getSafetyLabel(entry: PulseEntry): string {
  if (!entry.safetyConcern) return 'não respondido';
  return (
    SAFETY_CONCERN_OPTIONS.find((o) => o.id === entry.safetyConcern)?.label ?? 'não respondido'
  );
}

function getSleepDetailsText(entry: PulseEntry): string {
  const parts = [
    entry.sleep.bedTime ? `deitou ${entry.sleep.bedTime}` : '',
    entry.sleep.wakeTime ? `levantou ${entry.sleep.wakeTime}` : '',
    entry.sleep.latencyMinutes !== null ? `latência ${entry.sleep.latencyMinutes}min` : '',
    entry.sleep.awakenings !== null ? `despertares ${entry.sleep.awakenings}` : '',
  ].filter(Boolean);
  return parts.length > 0 ? parts.join(', ') : NOT_INFORMED;
}

function periodLabel(period: PeriodFilter): string {
  if (period === 'all') return 'Todo o histórico';
  return `Últimos ${period} dias`;
}

function escapeCsvCell(value: string | number | boolean): string {
  const str = String(value ?? '');
  const escaped = str.replace(/"/g, '""');
  return `"${escaped}"`;
}

/**
 * Exporta todos os registros (check-ins diários e episódios) em CSV UTF-8 com BOM.
 */
export function exportEntriesToCsv(
  entries: PulseEntry[],
  period: PeriodFilter,
  analytics: AnalyticsSummary
): void {
  const headers = [
    'Tipo de Registro',
    'Data',
    'Horário',
    'Estado Emocional (Humor)',
    'Valência do Afeto (0-10)',
    'Oscilação de Humor',
    'Descrição da Oscilação',
    'Energia / Ativação (0-10)',
    'Sono (Horas)',
    'Qualidade do Sono',
    'Redução da Necessidade de Sono',
    'Dormiu pouco sem fadiga',
    'Horários e Detalhes do Sono',
    'Duração do Estado',
    'Sinais de Ativação e Experiências Neurodivergentes',
    'Gatilho / Contexto',
    'Comportamentos (feito x impulso)',
    'Outro Comportamento',
    'Consciência',
    'Conseguiu Interromper',
    'Intensidade da Vontade (0-10)',
    'Sensação Durante',
    'Sensação / Consequência Depois',
    'Impacto Trabalho',
    'Impacto Relacionamentos',
    'Impacto Rotina',
    'Nota Impacto Funcional',
    'Medicação',
    'Efeitos da Medicação',
    'Fase do Ciclo',
    'Segurança (ideação / autolesão)',
    'Eventos do Dia',
    'Observações',
  ];

  const rows = entries.map((entry) => {
    const isEp = isEpisodeEntry(entry);
    const eventsText = [entry.dayEvents.join(' | '), entry.dayEventsNote.trim()]
      .filter(Boolean)
      .join(' - ');

    return [
      isEp ? 'Episódio comportamental' : 'Check-in diário (sem episódio)',
      formatLongDate(entry.date),
      entry.time,
      getMoodLabels(entry),
      num(entry.valence, '/10'),
      getMoodSwingDirectionLabel(entry),
      entry.moodSwingDescription,
      num(entry.energyLevel, '/10'),
      num(entry.sleep.hours, 'h'),
      getSleepQualityLabel(entry.sleep.quality),
      getReducedSleepLabel(entry.sleep.reducedNeed),
      entry.sleep.noFatigueAfterShortSleep === null
        ? NOT_INFORMED
        : entry.sleep.noFatigueAfterShortSleep
        ? 'Sim'
        : 'Não',
      getSleepDetailsText(entry),
      getDurationLabel(entry.stateDuration),
      getActivationLabels(entry.activationSignals),
      entry.triggerContext,
      getBehaviorsText(entry),
      entry.behaviorOtherText,
      isEp ? getAwarenessLabel(entry.awareness) : NOT_INFORMED,
      isEp ? getResistanceLabel(entry.resisted) : NOT_INFORMED,
      isEp ? num(entry.urgeIntensity, '/10') : NOT_INFORMED,
      entry.feelingDuring,
      entry.feelingAfter,
      getImpactLabel(entry.functionalImpact.work),
      getImpactLabel(entry.functionalImpact.relationships),
      getImpactLabel(entry.functionalImpact.routine),
      entry.functionalImpact.note,
      getMedicationLabel(entry),
      entry.medication?.effects ?? '',
      getCyclePhaseLabel(entry),
      getSafetyLabel(entry),
      eventsText,
      entry.notes,
    ]
      .map(escapeCsvCell)
      .join(';');
  });

  // Bloco de cobertura antes da tabela: o CSV também precisa dizer sobre quantos
  // registros cada seção foi realmente informada.
  const coverageBlock = [
    ['Cobertura do período (informado em X de Y)'].map(escapeCsvCell).join(';'),
    ['Seção', 'Informado', 'Base'].map(escapeCsvCell).join(';'),
    ...summarizeCoverage(analytics.coverage).map((section) =>
      [section.label, section.answered, section.base].map(escapeCsvCell).join(';')
    ),
    '',
  ];

  const csvContent =
    '\uFEFF' +
    [...coverageBlock, headers.map(escapeCsvCell).join(';'), ...rows].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const dateStamp = toLocalIsoDate();
  link.href = url;
  link.download = `PulseTrack_Longitudinal_${period === 'all' ? 'Completo' : `${period}d`}_${dateStamp}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Gera relatório clínico ampliado em PDF para consulta psiquiátrica/psicológica.
 * O jsPDF (e suas dependências de canvas) é carregado sob demanda para mantê-lo
 * fora do bundle inicial — só é baixado quando o usuário pede o relatório.
 */
export async function exportClinicalReportPdf(
  entries: PulseEntry[],
  analytics: AnalyticsSummary,
  period: PeriodFilter,
  reportLabel: string,
  experiments: Experiment[] = []
): Promise<void> {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 16;
  const maxLineWidth = pageWidth - margin * 2;
  let y = 18;

  const ensureSpace = (neededMm: number) => {
    if (y + neededMm > pageHeight - 16) {
      doc.addPage();
      y = 18;
    }
  };

  const addSectionTitle = (title: string) => {
    ensureSpace(14);
    y += 3;
    doc.setDrawColor(59, 111, 143);
    doc.setLineWidth(0.5);
    doc.line(margin, y, pageWidth - margin, y);
    y += 5;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11.5);
    doc.setTextColor(29, 39, 48);
    doc.text(pdfSafe(title), margin, y);
    y += 6;
  };

  const addParagraph = (
    text: string,
    fontSize = 9.5,
    bold = false,
    color: [number, number, number] = [45, 58, 68]
  ) => {
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    doc.setFontSize(fontSize);
    doc.setTextColor(color[0], color[1], color[2]);
    const lines = doc.splitTextToSize(pdfSafe(text), maxLineWidth);
    const lineHeight = fontSize * 0.44 + 1.2;
    for (const line of lines) {
      ensureSpace(lineHeight + 2);
      doc.text(line, margin, y);
      y += lineHeight;
    }
    y += 1.4;
  };

  // Cabeçalho
  doc.setFillColor(240, 245, 248);
  doc.rect(margin, y - 6, maxLineWidth, 24, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.setTextColor(44, 88, 115);
  doc.text('PulseTrack - Relatório Clínico Longitudinal', margin + 4, y + 2);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(73, 88, 102);
  const generatedAt = new Date().toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
  const headerSub = [
    `Período: ${periodLabel(period)}`,
    `Emitido em: ${generatedAt}`,
    reportLabel.trim() ? `Identificação: ${reportLabel.trim()}` : '',
  ]
    .filter(Boolean)
    .join('  |  ');
  doc.text(pdfSafe(headerSub), margin + 4, y + 10);
  y += 24;

  // 1. Resumo Longitudinal (Estado Emocional, Ativação/Sono e Comportamento)
  addSectionTitle('1. Visão Geral (Acompanhamento Contínuo + Episódios)');
  addParagraph(
    `Total de registros: ${analytics.totalEntries} (${analytics.totalCheckinsOnly} check-ins sem compulsão + ${analytics.totalEpisodes} episódios comportamentais) em ${analytics.daysLogged} dia(s) acompanhados.`
  );
  addParagraph(
    `Dias acompanhados: ${analytics.daysLogged} de ${analytics.periodDays} — ${analytics.daysWithEpisodes} com episódios | ${analytics.daysWithoutEpisodes} sem episódios | ${analytics.daysWithoutLog} sem nenhum registro.`
  );
  addParagraph(
    `Médias do período (somente campos respondidos): Valência ${num(
      analytics.avgValence,
      '/10'
    )} (${analytics.valenceReportedCount} resp.) | Energia ${num(
      analytics.avgEnergy,
      '/10'
    )} (${analytics.energyReportedCount} resp.) | Sono ${num(
      analytics.avgSleepHours,
      'h'
    )}/noite (${analytics.sleepReportedCount} resp.) | Vontade ${num(
      analytics.avgUrgeIntensity,
      '/10'
    )}.`
  );
  addParagraph(
    'Campos não respondidos aparecem como "não informado". Nenhuma média do relatório usa valor presumido.',
    8.5
  );
  addParagraph('Cobertura do período (informado em X de Y):', 9, true);
  for (const section of summarizeCoverage(analytics.coverage)) {
    addParagraph(`- ${section.label}: informado em ${section.answered} de ${section.base}.`, 8.5);
  }

  // 2. Estado de Ativação, Sono e Duração
  addSectionTitle('2. Estado de Ativação, Sono e Duração das Alterações');
  addParagraph(
    `- Sono: média de ${num(
      analytics.avgSleepHours,
      'h'
    )}/noite. Redução da necessidade de sono relatada em ${analytics.reducedSleepNeedCount} registro(s) (${analytics.reducedSleepNeedRate}% dos que responderam). Noites com sono ruim ou <6h: ${analytics.poorSleepCount}.
- Dormiu pouco (<= 6h) e passou o dia sem sono nem fadiga: ${analytics.noFatigueAfterShortSleepCount} registro(s) — marcador mais específico de ativação de humor do que a energia alta isolada.`
  );
  if (analytics.menstrualPhaseStats.length > 0) {
    addParagraph(
      `- Fase do ciclo menstrual: ${analytics.menstrualPhaseStats
        .map(
          (phase) =>
            `${phase.label} (${phase.entries} reg.; valência ${num(
              phase.avgValence,
              '/10'
            )}; energia ${num(phase.avgEnergy, '/10')}; ${phase.episodeRate}% com episódio)`
        )
        .join(' | ')}.`
    );
  }
  if (analytics.durationDistribution.length > 0) {
    addParagraph(
      `- Duração dos estados relatada: ${analytics.durationDistribution
        .map((d) => `${d.label} (${d.count}x / ${d.percentage}%)`)
        .join(' | ')}.`
    );
  }
  const activeSignals = analytics.activationSignalStats.filter((s) => s.count > 0);
  if (activeSignals.length > 0) {
    addParagraph(
      `- Sinais associados de ativação: ${activeSignals
        .map((s) => `${s.label} (${s.count}x / ${s.percentage}%)`)
        .join(' | ')}.`
    );
  } else {
    addParagraph('- Sinais associados de ativação: nenhum sinal marcado no período.');
  }

  // 3. Análise Longitudinal de Ciclos (Antes x Durante x Depois)
  addSectionTitle('3. Análise de Ciclos (Dias Anteriores x Durante x Posteriores)');
  const cy = analytics.cycleAnalysis;
  if (cy.analyzedEpisodes === 0) {
    addParagraph('Não houve episódios comportamentais neste período para comparar ciclos.');
  } else {
    addParagraph(
      `- Antes dos episódios (D-2 a D-1, ${cy.before.sampleDays} dia(s) registrados): Energia média ${
        cy.before.avgEnergy !== null ? `${cy.before.avgEnergy}/10` : '-'
      } | Sono médio ${cy.before.avgSleepHours !== null ? `${cy.before.avgSleepHours}h` : '-'} | Redução necessidade de sono: ${cy.before.reducedSleepNeedRate}%${
        cy.before.topActivationSignal ? ` | Sinal predominante: ${cy.before.topActivationSignal}` : ''
      }.`
    );
    addParagraph(
      `- Durante os episódios (${cy.during.sampleDays} dia(s)): Energia média ${
        cy.during.avgEnergy !== null ? `${cy.during.avgEnergy}/10` : '-'
      } | Sono médio ${cy.during.avgSleepHours !== null ? `${cy.during.avgSleepHours}h` : '-'} | Redução necessidade de sono: ${cy.during.reducedSleepNeedRate}% | Oscilação de humor: ${cy.during.moodSwingRate}%.`
    );
    addParagraph(
      `- Após os episódios (D+1 a D+2, ${cy.after.sampleDays} dia(s) registrados): Energia média ${
        cy.after.avgEnergy !== null ? `${cy.after.avgEnergy}/10` : '-'
      } | Sono médio ${cy.after.avgSleepHours !== null ? `${cy.after.avgSleepHours}h` : '-'} | Humor predominante: ${
        cy.after.dominantMood ?? '-'
      }.`
    );
    for (const finding of cy.findings) {
      addParagraph(`* ${finding}`, 9, true);
    }
  }

  // 4. Indicadores para Bipolaridade e Compulsões
  addSectionTitle('4. Indicadores para Investigação de Bipolaridade e Compulsões');
  const bi = analytics.bipolarIndicators;
  addParagraph(
    `- Episódios em alta energia (Energia >= 8/10 combinada com redução da necessidade de sono): ${bi.highEnergyEpisodes} de ${analytics.totalEpisodes} (${bi.highEnergyPercent}%), vontade média ${num(
      bi.highEnergyAvgUrge,
      '/10'
    )}.${
      bi.highEnergyTopBehaviors.length > 0 ? ` Itens: ${bi.highEnergyTopBehaviors.join(', ')}.` : ''
    } Energia alta isolada (hiperfoco, ansiedade, cafeína) não entra neste indicador.`
  );
  addParagraph(
    `- Episódios de Alívio em Baixa Energia / Tristeza / Apatia: ${bi.lowEnergyReliefEpisodes} de ${analytics.totalEpisodes} (${bi.lowEnergyPercent}%), ${bi.lowEnergyAutomaticRate}% em modo automático ou misto.${
      bi.lowEnergyTopBehaviors.length > 0 ? ` Itens: ${bi.lowEnergyTopBehaviors.join(', ')}.` : ''
    }`
  );
  addParagraph(
    `- Oscilações de humor relatadas: em ${bi.moodSwingEntries} registro(s) (${bi.moodSwingPercent}%). Nos episódios com oscilação prévia, vontade média ${num(
      bi.moodSwingAvgUrge,
      '/10'
    )} e taxa de não interrupção ${bi.moodSwingNoResistRate}%. Direção e janela de tempo são registradas por episódio.`
  );
  addParagraph(
    `- Pensamentos obsessivos intensos: ${bi.obsessiveThoughtsCount} ocorrência(s) | Padrão "expectativa alta -> descarga -> queda de interesse": ${bi.expectationDropPatternCount} ocorrência(s).`
  );

  // 5. Categorias Comportamentais e Impacto Funcional
  addSectionTitle('5. Comportamentos e Impacto Funcional');
  if (analytics.categoryStats.length === 0) {
    addParagraph('Nenhuma categoria comportamental registrada no período.');
  } else {
    for (const cat of analytics.categoryStats) {
      const topStr =
        cat.topItems.length > 0
          ? ` | Itens: ${cat.topItems.map((i) => `${i.label} (${i.count}x)`).join(', ')}`
          : '';
      addParagraph(
        `- ${cat.categoryName}: ${cat.count} episódio(s) (${cat.percentage}%) | Vontade média ${num(
          cat.avgUrge,
          '/10'
        )} | Com prejuízo/sofrimento: ${cat.harmCount}${topStr}`
      );
    }
  }
  const bm = analytics.behaviorModes;
  addParagraph(
    `Feito x impulso: ${bm.feitos} comportamento(s) efetivamente realizados e ${bm.impulsos} que ficaram só no impulso (${bm.registrosComImpulsoSemAcao} registro(s) sem nenhuma ação). Prejuízo ou sofrimento marcado em ${bm.comPrejuizo} ocorrência(s).`,
    9.5,
    true
  );
  const fi = analytics.functionalImpactSummary;
  addParagraph(
    `Impacto funcional moderado/intenso: presente em ${fi.anySignificantImpactRate}% dos registros (Trabalho/Estudos: ${fi.workModerateOrHigh}x | Relacionamentos: ${fi.relationshipsModerateOrHigh}x | Rotina: ${fi.routineModerateOrHigh}x).`,
    9.5,
    true
  );

  // 6. Segurança e Medicação
  addSectionTitle('6. Segurança e Adesão Medicamentosa');
  const safety = analytics.safetySummary;
  if (safety.pensamentosMorte + safety.autolesao > 0) {
    addParagraph(
      `- Registros com pensamentos de morte: ${safety.pensamentosMorte} | com impulso de autolesão: ${safety.autolesao} | "prefiro não responder": ${safety.naoResponder}.`,
      9.5,
      true,
      [148, 47, 25]
    );
    addParagraph(
      'Item de segurança autorreferido, não é instrumento de rastreio. Em risco imediato: CVV 188 (24h), SAMU 192 ou pronto-socorro.'
    );
  } else {
    addParagraph(
      `- Sem relato de pensamentos de morte ou impulso de autolesão nos registros respondidos ("prefiro não responder": ${safety.naoResponder}).`
    );
  }
  const med = analytics.medicationSummary;
  addParagraph(
    `- Medicação: tomou como prescrito ${med.regular}x | esqueceu ${med.esquecida}x | parcial ${med.parcial}x | não usa ${med.naoUso}x | não informado ${med.naoInformado}x.`
  );

  // 7. Evolução e Linha do Tempo Recente
  addSectionTitle('7. Evolução e Registros Diários Recentes (Check-ins e Episódios)');
  addParagraph(`${analytics.evolution.label}: ${analytics.evolution.description}`, 9.5, true);
  if (analytics.evolution.status !== 'insuficiente') {
    addParagraph(
      `Episódios (${analytics.evolution.previousCount} no período anterior → ${
        analytics.evolution.currentCount
      } no atual) | Vontade média ${num(analytics.evolution.previousUrge, '/10')} → ${num(
        analytics.evolution.currentUrge,
        '/10'
      )}.`,
      9
    );
  }

  const recentEntries = entries.slice(0, 14);
  for (const entry of recentEntries) {
    ensureSpace(22);
    const isEp = isEpisodeEntry(entry);
    const typeLabel = isEp ? 'EPISÓDIO' : 'CHECK-IN DIÁRIO';
    addParagraph(
      `[${typeLabel}] ${formatLongDate(entry.date)} ${entry.time} | Emocional: ${getMoodLabels(
        entry
      )} | Valência: ${num(entry.valence, '/10')} | Ativação: Energia ${num(
        entry.energyLevel,
        '/10'
      )}, Sono ${num(entry.sleep.hours, 'h')} (${getSleepQualityLabel(
        entry.sleep.quality
      )}, red. sono: ${getReducedSleepLabel(entry.sleep.reducedNeed)}) | Duração: ${getDurationLabel(
        entry.stateDuration
      )}`,
      9,
      true,
      [29, 39, 48]
    );

    if (entry.activationSignals.length > 0) {
      addParagraph(`Sinais de ativação: ${getActivationLabels(entry.activationSignals)}`, 8.5);
    }
    if (isEp) {
      const behaviorsStr = [getBehaviorsText(entry), entry.behaviorOtherText]
        .filter((v) => v && v !== NOT_INFORMED)
        .join(', ');
      addParagraph(
        `Comportamento: ${behaviorsStr || NOT_INFORMED} | Vontade: ${num(
          entry.urgeIntensity,
          '/10'
        )} | ${getAwarenessLabel(entry.awareness)} | Resistiu: ${getResistanceLabel(
          entry.resisted
        )}`,
        8.5
      );
    }
    if (entry.safetyConcern && entry.safetyConcern !== 'nenhum') {
      addParagraph(`Segurança: ${getSafetyLabel(entry)}`, 8.5, true, [148, 47, 25]);
    }
    if (entry.medication?.status || entry.medication?.effects) {
      addParagraph(
        `Medicação: ${getMedicationLabel(entry)}${
          entry.medication?.effects ? ` - ${entry.medication.effects}` : ''
        }`,
        8.5
      );
    }
    const impactDetails = [
      `Trab.: ${getImpactLabel(entry.functionalImpact.work)}`,
      `Relac.: ${getImpactLabel(entry.functionalImpact.relationships)}`,
      `Rotina: ${getImpactLabel(entry.functionalImpact.routine)}`,
    ].join(', ');
    if (
      entry.functionalImpact.note ||
      entry.notes ||
      entry.triggerContext ||
      entry.functionalImpact.work ||
      entry.functionalImpact.relationships ||
      entry.functionalImpact.routine
    ) {
      addParagraph(
        [
          entry.triggerContext ? `Gatilho: ${entry.triggerContext}` : '',
          `Impacto (${impactDetails})${entry.functionalImpact.note ? ` - ${entry.functionalImpact.note}` : ''}`,
          entry.notes ? `Obs.: ${entry.notes}` : '',
        ]
          .filter(Boolean)
          .join(' | '),
        8.5
      );
    }
    y += 1.5;
  }

  // 8. Experimentos observados (hipóteses do usuário, sem veredito automático)
  addSectionTitle('8. Experimentos Observados');
  if (experiments.length === 0) {
    addParagraph('Nenhuma observação registrada até o momento.');
  } else {
    addParagraph(
      'Hipóteses acompanhadas pelo próprio usuário. A janela é comparada com o mesmo número de dias imediatamente anterior; a conclusão registrada é sempre uma escolha da pessoa, não um cálculo do aplicativo.',
      8.5
    );
    for (const experiment of experiments) {
      for (const line of describeExperiment(experiment, analyzeExperiment(experiment, entries))) {
        addParagraph(line, 8.5);
      }
      y += 1.5;
    }
  }

  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(110, 122, 134);
    doc.text(
      pdfSafe(
        `PulseTrack - Acompanhamento longitudinal para apoio terapêutico (não substitui avaliação médica). Página ${i} de ${pageCount}`
      ),
      margin,
      pageHeight - 8
    );
  }

  const dateStamp = toLocalIsoDate();
  doc.save(`PulseTrack_Relatorio_Longitudinal_${dateStamp}.pdf`);
}

/**
 * Relatório executivo de 1 página: o que mais se repete, três insights, evolução,
 * cobertura honesta e experimentos observados. Os dados brutos continuam nos
 * exports completos (PDF clínico e CSV), nunca substituídos por este resumo.
 */
export async function exportExecutiveReportPdf(
  analytics: AnalyticsSummary,
  entries: PulseEntry[],
  experiments: Experiment[],
  period: PeriodFilter,
  reportLabel: string
): Promise<void> {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  const maxLineWidth = pageWidth - margin * 2;
  const report = buildExecutiveReport(analytics, experiments, entries, period);
  let y = 20;

  const write = (
    text: string,
    options: { size?: number; bold?: boolean; color?: [number, number, number]; gap?: number; maxLines?: number } = {}
  ) => {
    const { size = 9, bold = false, color = [45, 58, 68], gap = 1.4, maxLines } = options;
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    doc.setFontSize(size);
    doc.setTextColor(color[0], color[1], color[2]);
    const lineHeight = size * 0.45 + 0.9;
    let lines = doc.splitTextToSize(pdfSafe(text), maxLineWidth);
    if (maxLines && lines.length > maxLines) {
      lines = lines.slice(0, maxLines);
      lines[maxLines - 1] = `${lines[maxLines - 1]}…`;
    }
    for (const line of lines) {
      if (y > pageHeight - 16) return;
      doc.text(line, margin, y);
      y += lineHeight;
    }
    y += gap;
  };

  const section = (title: string) => {
    if (y > pageHeight - 24) return;
    y += 2;
    doc.setDrawColor(59, 111, 143);
    doc.setLineWidth(0.4);
    doc.line(margin, y, pageWidth - margin, y);
    y += 5;
    write(title, { size: 10, bold: true, color: [44, 88, 115], gap: 1.2 });
  };

  doc.setFillColor(240, 245, 248);
  doc.rect(margin, y - 7, maxLineWidth, 22, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.setTextColor(44, 88, 115);
  doc.text('PulseTrack - Relatório Executivo', margin + 4, y);
  y += 7;
  write(
    [
      `Período: ${periodLabel(period)}`,
      `Emitido em: ${new Date().toLocaleDateString('pt-BR')}`,
      reportLabel.trim() ? `Identificação: ${reportLabel.trim()}` : '',
    ]
      .filter(Boolean)
      .join('  |  '),
    { size: 8.5, color: [73, 88, 102], gap: 2 }
  );

  section('1. Padrão dominante');
  write(report.dominantPattern.title, { size: 10.5, bold: true, gap: 0.6 });
  write(report.dominantPattern.detail, { size: 9, maxLines: 4 });

  section('2. Três insights principais');
  if (report.insights.length === 0) {
    write('Nenhum insight com base suficiente neste período.', { size: 9, color: [110, 122, 134] });
  } else {
    report.insights.forEach((insight, index) => {
      write(`${index + 1}. ${insight.title}`, { size: 9.5, bold: true, gap: 0.3 });
      write(insight.summary, { size: 9, maxLines: 3, gap: 0.3 });
      write(insight.basis, { size: 8, color: [110, 122, 134], maxLines: 2, gap: 1 });
    });
  }

  section('3. Evolução');
  write(report.evolution.label, { size: 9.5, bold: true, gap: 0.3 });
  write(report.evolution.description, { size: 9, maxLines: 4 });

  section('4. Cobertura de dados');
  if (report.coverage.length === 0) {
    write('Nenhum eixo com base no período.', { size: 9, color: [110, 122, 134] });
  } else {
    write(
      report.coverage
        .map((entry) => `${entry.label}: informado em ${entry.answered} de ${entry.base}`)
        .join(' | '),
      { size: 8.5, maxLines: 4 }
    );
    write('Campos não respondidos não entram em médias: o relatório não presume valores.', {
      size: 8,
      color: [110, 122, 134],
      maxLines: 2,
    });
  }

  section('5. Experimentos observados');
  if (report.experiments.length === 0) {
    write('Nenhuma hipótese acompanhada nas datas deste período.', {
      size: 9,
      color: [110, 122, 134],
    });
  } else {
    for (const experiment of report.experiments.slice(0, 2)) {
      write(experiment.heading, { size: 9.5, bold: true, gap: 0.3 });
      for (const line of experiment.lines) {
        write(line, { size: 8, maxLines: 2, gap: 0.2 });
      }
      y += 1;
    }
    if (report.experiments.length > 2) {
      write(
        `+ ${report.experiments.length - 2} observação(ões) neste período — descritas no relatório clínico completo.`,
        { size: 8, color: [110, 122, 134] }
      );
    }
  }

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(110, 122, 134);
  doc.text(
    pdfSafe(
      'Resumo executivo gerado localmente. Não substitui avaliação médica. Dados brutos disponíveis no relatório completo e no CSV.'
    ),
    margin,
    pageHeight - 8
  );

  doc.save(`PulseTrack_Relatorio_Executivo_${toLocalIsoDate()}.pdf`);
}
