import React, { useState } from 'react';
import { FileSpreadsheet, FileText, Sparkles } from 'lucide-react';
import {
  AnalyticsSummary,
  AppTab,
  Experiment,
  PeriodFilter,
  PulseEntry,
} from '../types/pulsetrack';
import {
  exportClinicalReportPdf,
  exportEntriesToCsv,
  exportExecutiveReportPdf,
} from '../utils/exporters';
import { buildExecutiveReport } from '../utils/executive';

interface ReportsViewProps {
  filteredEntries: PulseEntry[];
  analytics: AnalyticsSummary;
  totalAllEntries: number;
  period: PeriodFilter;
  onChangePeriod: (p: PeriodFilter) => void;
  reportLabel: string;
  onChangeReportLabel: (val: string) => void;
  onNavigate: (tab: AppTab) => void;
  onFeedback: (msg: string) => void;
  experiments: Experiment[];
}

export const ReportsView: React.FC<ReportsViewProps> = ({
  filteredEntries,
  analytics,
  totalAllEntries,
  period,
  onChangePeriod,
  reportLabel,
  onChangeReportLabel,
  onNavigate,
  onFeedback,
  experiments,
}) => {
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [isExportingExec, setIsExportingExec] = useState(false);

  const handleDownloadPdf = async () => {
    if (isExportingPdf) return;
    setIsExportingPdf(true);
    try {
      await exportClinicalReportPdf(
        filteredEntries,
        analytics,
        period,
        reportLabel,
        experiments
      );
      onFeedback('Relatório clínico ampliado em PDF gerado e baixado.');
    } catch {
      onFeedback('Não foi possível gerar o PDF. Tente novamente.');
    } finally {
      setIsExportingPdf(false);
    }
  };

  const handleDownloadExecutive = async () => {
    if (isExportingExec) return;
    setIsExportingExec(true);
    try {
      await exportExecutiveReportPdf(
        analytics,
        filteredEntries,
        experiments,
        period,
        reportLabel
      );
      onFeedback('Relatório executivo de 1 página gerado e baixado.');
    } catch {
      onFeedback('Não foi possível gerar o relatório executivo. Tente novamente.');
    } finally {
      setIsExportingExec(false);
    }
  };

  const handleDownloadCsv = () => {
    exportEntriesToCsv(filteredEntries, period, analytics);
    onFeedback('Planilha CSV longitudinal exportada com sucesso.');
  };

  if (totalAllEntries === 0) {
    return (
      <section
        className="rounded-2xl border p-8 text-center max-w-2xl mx-auto space-y-4"
        style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-hairline)' }}
      >
        <h1 className="text-2xl font-semibold" style={{ color: 'var(--text-primary)' }}>
          Relatório clínico ampliado
        </h1>
        <p className="text-base" style={{ color: 'var(--text-secondary)' }}>
          Faça registros diários ou episódios para gerar o relatório longitudinal em PDF ou exportar em CSV para seu psiquiatra ou psicólogo.
        </p>
        <button
          type="button"
          onClick={() => onNavigate('registrar')}
          className="min-h-[48px] px-6 py-3 rounded-xl text-base font-semibold cursor-pointer"
          style={{ backgroundColor: 'var(--color-primary-strong)', color: 'var(--color-primary-ink)' }}
        >
          Fazer primeiro check-in
        </button>
      </section>
    );
  }

  const bi = analytics.bipolarIndicators;
  const cy = analytics.cycleAnalysis;
  const fi = analytics.functionalImpactSummary;
  const activeSignals = analytics.activationSignalStats.filter((s) => s.count > 0);
  const executive = buildExecutiveReport(analytics, experiments, filteredEntries, period);

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight" style={{ color: 'var(--text-primary)' }}>
            Relatório clínico longitudinal
          </h1>
          <p className="text-base mt-1" style={{ color: 'var(--text-secondary)' }}>
            Organiza separadamente estado emocional, estado de ativação/sono, comportamentos, impacto funcional e análise de ciclos.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={handleDownloadCsv}
            disabled={filteredEntries.length === 0}
            className="min-h-[48px] px-5 py-2.5 rounded-xl border text-base font-medium inline-flex items-center gap-2 disabled:opacity-50 cursor-pointer"
            style={{
              backgroundColor: 'var(--bg-surface)',
              borderColor: 'var(--border-strong)',
              color: 'var(--text-primary)',
            }}
          >
            <FileSpreadsheet className="w-5 h-5" aria-hidden="true" />
            <span>Exportar CSV</span>
          </button>

          <button
            type="button"
            onClick={handleDownloadExecutive}
            disabled={filteredEntries.length === 0 || isExportingExec}
            aria-busy={isExportingExec}
            className="min-h-[48px] px-5 py-2.5 rounded-xl border text-base font-medium inline-flex items-center gap-2 disabled:opacity-50 cursor-pointer"
            style={{
              backgroundColor: 'var(--bg-surface)',
              borderColor: 'var(--border-strong)',
              color: 'var(--text-primary)',
            }}
          >
            <Sparkles className="w-5 h-5" aria-hidden="true" />
            <span>{isExportingExec ? 'Gerando executivo…' : 'Relatório executivo (1 página)'}</span>
          </button>

          <button
            type="button"
            onClick={handleDownloadPdf}
            disabled={filteredEntries.length === 0 || isExportingPdf}
            aria-busy={isExportingPdf}
            className="min-h-[48px] px-6 py-2.5 rounded-xl text-base font-semibold inline-flex items-center gap-2 disabled:opacity-50 cursor-pointer"
            style={{
              backgroundColor: 'var(--color-primary-strong)',
              color: 'var(--color-primary-ink)',
            }}
          >
            <FileText className="w-5 h-5" aria-hidden="true" />
            <span>{isExportingPdf ? 'Gerando PDF…' : 'Baixar relatório PDF'}</span>
          </button>
        </div>
      </div>

      <section
        className="rounded-2xl border p-5 sm:p-6 grid grid-cols-1 md:grid-cols-2 gap-5"
        style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-hairline)' }}
      >
        <div>
          <p className="text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
            Período do relatório
          </p>
          <div className="flex flex-wrap gap-1.5">
            {(['7', '14', '30', '90', 'all'] as PeriodFilter[]).map((p) => {
              const active = period === p;
              return (
                <button
                  key={p}
                  type="button"
                  onClick={() => onChangePeriod(p)}
                  aria-pressed={active}
                  className="min-h-[48px] px-3.5 py-1.5 rounded-xl border text-sm font-medium cursor-pointer"
                  style={{
                    backgroundColor: active ? 'var(--color-primary-soft)' : 'var(--bg-elevated)',
                    borderColor: active ? 'var(--color-primary-strong)' : 'var(--border-hairline)',
                    color: active ? 'var(--color-primary-strong)' : 'var(--text-secondary)',
                  }}
                >
                  {p === 'all' ? 'Tudo' : `${p} dias`}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <label htmlFor="report-label" className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
            Nome ou iniciais no cabeçalho do PDF (opcional)
          </label>
          <input
            id="report-label"
            type="text"
            value={reportLabel}
            onChange={(e) => onChangeReportLabel(e.target.value)}
            placeholder="Ex.: Paciente G.M. — Consulta Psiquiatria"
            className="w-full min-h-[48px] px-4 rounded-xl border text-base"
            style={{
              backgroundColor: 'var(--bg-elevated)',
              borderColor: 'var(--border-strong)',
              color: 'var(--text-primary)',
            }}
          />
        </div>
      </section>

      {filteredEntries.length > 0 && (
        <section
          aria-label="Prévia do relatório executivo"
          className="rounded-2xl border p-6 space-y-4"
          style={{
            backgroundColor: 'var(--bg-surface)',
            borderColor: 'var(--border-hairline)',
            boxShadow: 'var(--shadow-soft)',
          }}
        >
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
              Prévia: relatório executivo (1 página)
            </h2>
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
              Dados brutos continuam nos exports completos
            </span>
          </div>

          <div className="space-y-1">
            <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
              Padrão dominante
            </p>
            <p className="text-base font-semibold" style={{ color: 'var(--color-primary-strong)' }}>
              {executive.dominantPattern.title}
            </p>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              {executive.dominantPattern.detail}
            </p>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
              Três insights principais
            </p>
            {executive.insights.length === 0 ? (
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                Nenhum insight com base suficiente neste período.
              </p>
            ) : (
              <ul className="list-disc pl-5 space-y-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
                {executive.insights.map((insight) => (
                  <li key={insight.id}>
                    <strong style={{ color: 'var(--text-primary)' }}>{insight.title}</strong> —{' '}
                    {insight.summary}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
            <div>
              <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Evolução</p>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                {executive.evolution.label}. {executive.evolution.description}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                Cobertura de dados
              </p>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                {executive.coverage.length === 0
                  ? 'Nenhum eixo com base no período.'
                  : executive.coverage
                      .map((entry) => `${entry.label}: ${entry.answered} de ${entry.base}`)
                      .join(' · ')}
              </p>
            </div>
          </div>

          <div>
            <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
              Experimentos observados
            </p>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              {executive.experiments.length === 0
                ? 'Nenhuma hipótese acompanhada nas datas deste período.'
                : `${executive.experiments.length} observação(ões) com janela neste período.`}
            </p>
          </div>
        </section>
      )}

      {filteredEntries.length === 0 ? (
        <div
          className="rounded-2xl border p-8 text-center"
          style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-hairline)' }}
        >
          <p className="text-base" style={{ color: 'var(--text-secondary)' }}>
            Não há registros neste período para incluir no relatório.
          </p>
        </div>
      ) : (
        <article
          aria-label="Pré-visualização do relatório clínico"
          className="rounded-2xl border p-6 sm:p-8 space-y-6"
          style={{
            backgroundColor: 'var(--bg-surface)',
            borderColor: 'var(--border-hairline)',
            boxShadow: 'var(--shadow-soft)',
          }}
        >
          <header className="pb-4 border-b space-y-1" style={{ borderColor: 'var(--border-hairline)' }}>
            <h2 className="text-xl font-bold" style={{ color: 'var(--color-primary-strong)' }}>
              Pré-visualização: Relatório Clínico Longitudinal PulseTrack
            </h2>
            <p className="text-sm font-mono tabular-nums" style={{ color: 'var(--text-secondary)' }}>
              {period === 'all' ? 'Todo o histórico' : `Últimos ${period} dias`} · {analytics.totalCheckinsOnly} check-ins +{' '}
              {analytics.totalEpisodes} episódios · {analytics.daysLogged} dia(s) acompanhados
              {reportLabel.trim() ? ` · ${reportLabel.trim()}` : ''}
            </p>
          </header>

          {/* Seção 1 */}
          <section className="space-y-2">
            <h3 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
              1. Estado emocional, ativação e sono
            </h3>
            <p className="text-sm sm:text-base leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              Sono médio de{' '}
              <strong className="font-mono tabular-nums">
                {analytics.avgSleepHours !== null ? `${analytics.avgSleepHours}h/noite` : 'não informado'}
              </strong>
              , com redução da necessidade de sono em{' '}
              <strong className="font-mono tabular-nums">{analytics.reducedSleepNeedRate}%</strong> dos registros que
              responderam ({analytics.reducedSleepNeedCount}x). Energia média de{' '}
              <strong className="font-mono tabular-nums">
                {analytics.avgEnergy !== null ? `${analytics.avgEnergy}/10` : 'não informada'}
              </strong>{' '}
              e valência média de{' '}
              <strong className="font-mono tabular-nums">
                {analytics.avgValence !== null ? `${analytics.avgValence}/10` : 'não informada'}
              </strong>
              . Oscilação de humor percebida em{' '}
              <strong className="font-mono tabular-nums">{bi.moodSwingPercent}%</strong> dos dias.
              <span className="block text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                Campos não respondidos aparecem como “não informado” — nenhuma média usa valor presumido.
              </span>
            </p>
            {activeSignals.length > 0 && (
              <p className="text-sm sm:text-base" style={{ color: 'var(--text-secondary)' }}>
                <strong style={{ color: 'var(--text-primary)' }}>Sinais de ativação:</strong>{' '}
                {activeSignals.map((s) => `${s.label} (${s.count}x)`).join(' · ')}
              </p>
            )}
            {analytics.durationDistribution.length > 0 && (
              <p className="text-sm sm:text-base" style={{ color: 'var(--text-secondary)' }}>
                <strong style={{ color: 'var(--text-primary)' }}>Duração dos estados:</strong>{' '}
                {analytics.durationDistribution.map((d) => `${d.label} (${d.count}x)`).join(' · ')}
              </p>
            )}
          </section>

          {/* Seção 2 */}
          <section className="pt-4 border-t space-y-2" style={{ borderColor: 'var(--border-hairline)' }}>
            <h3 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
              2. Análise longitudinal de ciclos (Antes × Durante × Depois)
            </h3>
            {cy.analyzedEpisodes === 0 ? (
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                Sem episódios comportamentais neste período.
              </p>
            ) : (
              <div className="space-y-1.5 text-sm sm:text-base" style={{ color: 'var(--text-secondary)' }}>
                <p>
                  <strong style={{ color: 'var(--text-primary)' }}>Antes (D-2 a D-1, {cy.before.sampleDays}d):</strong>{' '}
                  Energia {cy.before.avgEnergy !== null ? `${cy.before.avgEnergy}/10` : '-'} · Sono{' '}
                  {cy.before.avgSleepHours !== null ? `${cy.before.avgSleepHours}h` : '-'} · Redução necessidade sono{' '}
                  {cy.before.reducedSleepNeedRate}%
                </p>
                <p>
                  <strong style={{ color: 'var(--text-primary)' }}>Durante ({cy.during.sampleDays}d):</strong>{' '}
                  Energia {cy.during.avgEnergy !== null ? `${cy.during.avgEnergy}/10` : '-'} · Sono{' '}
                  {cy.during.avgSleepHours !== null ? `${cy.during.avgSleepHours}h` : '-'} · Redução necessidade sono{' '}
                  {cy.during.reducedSleepNeedRate}%
                </p>
                <p>
                  <strong style={{ color: 'var(--text-primary)' }}>Depois (D+1 a D+2, {cy.after.sampleDays}d):</strong>{' '}
                  Energia {cy.after.avgEnergy !== null ? `${cy.after.avgEnergy}/10` : '-'} · Sono{' '}
                  {cy.after.avgSleepHours !== null ? `${cy.after.avgSleepHours}h` : '-'} · Humor predominante:{' '}
                  {cy.after.dominantMood ?? '-'}
                </p>
              </div>
            )}
          </section>

          {/* Seção 3 */}
          <section className="pt-4 border-t space-y-2" style={{ borderColor: 'var(--border-hairline)' }}>
            <h3 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
              3. Comportamentos, bipolaridade e impacto funcional
            </h3>
            <ul className="space-y-1.5 text-sm sm:text-base list-disc pl-5" style={{ color: 'var(--text-secondary)' }}>
              <li>
                <strong>Alta energia / euforia:</strong> {bi.highEnergyEpisodes} de {analytics.totalEpisodes} episódio(s) ({bi.highEnergyPercent}%), vontade média {bi.highEnergyAvgUrge}/10.
              </li>
              <li>
                <strong>Baixa energia / tristeza / apatia:</strong> {bi.lowEnergyReliefEpisodes} episódio(s) ({bi.lowEnergyPercent}%), sendo {bi.lowEnergyAutomaticRate}% automáticos/mistos.
              </li>
              <li>
                <strong>Impacto funcional moderado/intenso:</strong> presente em {fi.anySignificantImpactRate}% dos registros (Trabalho {fi.workModerateOrHigh}x · Relacionamentos {fi.relationshipsModerateOrHigh}x · Rotina {fi.routineModerateOrHigh}x).
              </li>
            </ul>
          </section>

          {/* Seção 4 */}
          <section className="pt-4 border-t space-y-2" style={{ borderColor: 'var(--border-hairline)' }}>
            <h3 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
              4. Evolução comparativa
            </h3>
            <p className="text-sm sm:text-base font-medium" style={{ color: 'var(--color-primary-strong)' }}>
              {analytics.evolution.label}
            </p>
            <p className="text-sm sm:text-base" style={{ color: 'var(--text-secondary)' }}>
              {analytics.evolution.description}
            </p>
          </section>
        </article>
      )}
    </div>
  );
};
