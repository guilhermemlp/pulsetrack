import { jsPDF } from 'jspdf';
import {
  ACTIVATION_SIGNAL_OPTIONS,
  FUNCTIONAL_IMPACT_OPTIONS,
  MOOD_DEFINITIONS,
  REDUCED_SLEEP_NEED_OPTIONS,
  SLEEP_QUALITY_OPTIONS,
  STATE_DURATION_OPTIONS,
} from '../data/defaults';
import {
  AnalyticsSummary,
  AwarenessType,
  EntryType,
  PeriodFilter,
  PulseEntry,
  ResistanceResult,
} from '../types/pulsetrack';
import { formatLongDate, isEpisodeEntry, toLocalIsoDate } from './analytics';

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
  const labels = entry.moods.map((id) => MOOD_DEFINITIONS.find((m) => m.id === id)?.label ?? id);
  if (entry.moodOtherText.trim()) {
    labels.push(`Outro: ${entry.moodOtherText.trim()}`);
  }
  return labels.join('; ');
}

function getAwarenessLabel(a: AwarenessType): string {
  if (a === AwarenessType.CONSCIENTE) return 'Consciente';
  if (a === AwarenessType.AUTOMATICO) return 'Automático';
  return 'Mistura';
}

function getResistanceLabel(r: ResistanceResult): string {
  if (r === ResistanceResult.SIM) return 'Sim';
  if (r === ResistanceResult.PARCIALMENTE) return 'Parcialmente';
  return 'Não';
}

function getSleepQualityLabel(q: PulseEntry['sleep']['quality']): string {
  return SLEEP_QUALITY_OPTIONS.find((o) => o.id === q)?.label ?? q;
}

function getReducedSleepLabel(r: PulseEntry['sleep']['reducedNeed']): string {
  return REDUCED_SLEEP_NEED_OPTIONS.find((o) => o.id === r)?.label ?? r;
}

function getDurationLabel(d: PulseEntry['stateDuration']): string {
  return STATE_DURATION_OPTIONS.find((o) => o.id === d)?.label ?? d;
}

function getActivationLabels(signals: PulseEntry['activationSignals']): string {
  return signals
    .map((id) => ACTIVATION_SIGNAL_OPTIONS.find((o) => o.id === id)?.label ?? id)
    .join('; ');
}

function getImpactLabel(lvl: PulseEntry['functionalImpact']['work']): string {
  return FUNCTIONAL_IMPACT_OPTIONS.find((o) => o.id === lvl)?.label ?? lvl;
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
export function exportEntriesToCsv(entries: PulseEntry[], period: PeriodFilter): void {
  const headers = [
    'Tipo de Registro',
    'Data',
    'Horário',
    'Estado Emocional (Humor)',
    'Oscilação de Humor',
    'Descrição da Oscilação',
    'Energia (0-10)',
    'Sono (Horas)',
    'Qualidade do Sono',
    'Redução da Necessidade de Sono',
    'Duração do Estado',
    'Sinais de Ativação',
    'Gatilho / Contexto',
    'Categorias e Comportamentos',
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
    'Eventos do Dia',
    'Observações',
  ];

  const rows = entries.map((entry) => {
    const isEp = isEpisodeEntry(entry);
    const behaviorsText = entry.behaviors
      .map((b) => `${b.categoryName}: ${b.itemLabel}`)
      .join(' | ');
    const eventsText = [entry.dayEvents.join(' | '), entry.dayEventsNote.trim()]
      .filter(Boolean)
      .join(' - ');

    return [
      isEp ? 'Episódio comportamental' : 'Check-in diário (sem episódio)',
      formatLongDate(entry.date),
      entry.time,
      getMoodLabels(entry),
      entry.hadMoodSwing ? 'Sim' : 'Não',
      entry.moodSwingDescription,
      entry.energyLevel,
      entry.sleep.hours,
      getSleepQualityLabel(entry.sleep.quality),
      getReducedSleepLabel(entry.sleep.reducedNeed),
      getDurationLabel(entry.stateDuration),
      getActivationLabels(entry.activationSignals),
      entry.triggerContext,
      behaviorsText,
      entry.behaviorOtherText,
      isEp ? getAwarenessLabel(entry.awareness) : '-',
      isEp ? getResistanceLabel(entry.resisted) : '-',
      isEp ? entry.urgeIntensity : '-',
      entry.feelingDuring,
      entry.feelingAfter,
      getImpactLabel(entry.functionalImpact.work),
      getImpactLabel(entry.functionalImpact.relationships),
      getImpactLabel(entry.functionalImpact.routine),
      entry.functionalImpact.note,
      eventsText,
      entry.notes,
    ]
      .map(escapeCsvCell)
      .join(';');
  });

  const csvContent = '\uFEFF' + [headers.map(escapeCsvCell).join(';'), ...rows].join('\r\n');
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
 */
export function exportClinicalReportPdf(
  entries: PulseEntry[],
  analytics: AnalyticsSummary,
  period: PeriodFilter,
  reportLabel: string
): void {
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
    `Dias no recorte (${analytics.periodDays}d): ${analytics.daysWithEpisodes} dia(s) com episódios | ${analytics.daysWithoutEpisodes} dia(s) sem episódios.`
  );
  addParagraph(
    `Médias do período: Energia ${analytics.avgEnergy}/10 | Sono ${analytics.avgSleepHours}h/noite | Intensidade da vontade (nos episódios) ${analytics.avgUrgeIntensity}/10.`
  );

  // 2. Estado de Ativação, Sono e Duração
  addSectionTitle('2. Estado de Ativação, Sono e Duração das Alterações');
  addParagraph(
    `- Sono: média de ${analytics.avgSleepHours}h/noite. Redução da necessidade de sono relatada em ${analytics.reducedSleepNeedCount} registro(s) (${analytics.reducedSleepNeedRate}%). Noites com sono ruim ou <6h: ${analytics.poorSleepCount}.`
  );
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
    `- Episódios em Alta Energia / Euforia (Energia >= 7 ou Eufórico/Agitado): ${bi.highEnergyEpisodes} de ${analytics.totalEpisodes} (${bi.highEnergyPercent}%), vontade média ${bi.highEnergyAvgUrge}/10.${
      bi.highEnergyTopBehaviors.length > 0 ? ` Itens: ${bi.highEnergyTopBehaviors.join(', ')}.` : ''
    }`
  );
  addParagraph(
    `- Episódios de Alívio em Baixa Energia / Tristeza / Apatia: ${bi.lowEnergyReliefEpisodes} de ${analytics.totalEpisodes} (${bi.lowEnergyPercent}%), ${bi.lowEnergyAutomaticRate}% em modo automático ou misto.${
      bi.lowEnergyTopBehaviors.length > 0 ? ` Itens: ${bi.lowEnergyTopBehaviors.join(', ')}.` : ''
    }`
  );
  addParagraph(
    `- Oscilações de humor relatadas: em ${bi.moodSwingEntries} registro(s) (${bi.moodSwingPercent}%). Nos episódios com oscilação prévia, vontade média ${bi.moodSwingAvgUrge}/10 e taxa de não interrupção ${bi.moodSwingNoResistRate}%.`
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
        `- ${cat.categoryName}: ${cat.count} episódio(s) (${cat.percentage}%) | Vontade média ${cat.avgUrge}/10${topStr}`
      );
    }
  }
  const fi = analytics.functionalImpactSummary;
  addParagraph(
    `Impacto funcional moderado/intenso: presente em ${fi.anySignificantImpactRate}% dos registros (Trabalho/Estudos: ${fi.workModerateOrHigh}x | Relacionamentos: ${fi.relationshipsModerateOrHigh}x | Rotina: ${fi.routineModerateOrHigh}x).`,
    9.5,
    true
  );

  // 6. Evolução e Linha do Tempo Recente
  addSectionTitle('6. Evolução e Registros Diários Recentes (Check-ins e Episódios)');
  addParagraph(`${analytics.evolution.label}: ${analytics.evolution.description}`, 9.5, true);

  const recentEntries = entries.slice(0, 14);
  for (const entry of recentEntries) {
    ensureSpace(22);
    const isEp = isEpisodeEntry(entry);
    const typeLabel = isEp ? 'EPISÓDIO' : 'CHECK-IN DIÁRIO';
    addParagraph(
      `[${typeLabel}] ${formatLongDate(entry.date)} ${entry.time} | Emocional: ${getMoodLabels(
        entry
      )} | Ativação: Energia ${entry.energyLevel}/10, Sono ${entry.sleep.hours}h (${getSleepQualityLabel(
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
      const behaviorsStr = [...entry.behaviors.map((b) => b.itemLabel), entry.behaviorOtherText]
        .filter(Boolean)
        .join(', ');
      addParagraph(
        `Comportamento: ${behaviorsStr || '-'} | Vontade: ${entry.urgeIntensity}/10 | ${getAwarenessLabel(
          entry.awareness
        )} | Resistiu: ${getResistanceLabel(entry.resisted)}`,
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
      entry.functionalImpact.work !== 'nenhum' ||
      entry.functionalImpact.relationships !== 'nenhum' ||
      entry.functionalImpact.routine !== 'nenhum'
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
