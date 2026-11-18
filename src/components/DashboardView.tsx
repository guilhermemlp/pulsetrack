import React from 'react';
import {
  AnalyticsSummary,
  AppTab,
  Experiment,
  ExperimentResult,
  PeriodFilter,
  PulseEntry,
  ThemeMode,
} from '../types/pulsetrack';
import { FormDraft } from '../utils/storage';
import { summarizeCoverage } from '../utils/analytics';
import { DashboardCharts } from './Charts';
import { DraftResumeCard } from './DraftResumeCard';
import { ExperimentsPanel } from './ExperimentsPanel';

interface DashboardViewProps {
  analytics: AnalyticsSummary;
  totalAllEntries: number;
  period: PeriodFilter;
  onChangePeriod: (p: PeriodFilter) => void;
  onNavigate: (tab: AppTab) => void;
  onLoadSampleData: () => void;
  theme: ThemeMode;
  draft: FormDraft | null;
  onContinueDraft: () => void;
  onMoveDraftToToday: () => void;
  onDiscardDraft: () => void;
  experiments: Experiment[];
  entries: PulseEntry[];
  onCloseExperiment: (id: string, result: ExperimentResult, note: string) => void;
}

const PERIOD_OPTIONS: Array<{ value: PeriodFilter; label: string }> = [
  { value: '7', label: '7 dias' },
  { value: '14', label: '14 dias' },
  { value: '30', label: '30 dias' },
  { value: '90', label: '90 dias' },
  { value: 'all', label: 'Tudo' },
];

export const DashboardView: React.FC<DashboardViewProps> = ({
  analytics,
  totalAllEntries,
  period,
  onChangePeriod,
  onNavigate,
  onLoadSampleData,
  theme,
  draft,
  onContinueDraft,
  onMoveDraftToToday,
  onDiscardDraft,
  experiments,
  entries,
  onCloseExperiment,
}) => {
  const draftCard = draft ? (
    <DraftResumeCard
      draft={draft}
      onContinue={onContinueDraft}
      onMoveToToday={onMoveDraftToToday}
      onDiscard={onDiscardDraft}
    />
  ) : null;

  if (totalAllEntries === 0) {
    return (
      <div className="max-w-2xl mx-auto my-6 space-y-4">
        {draftCard}
      <section
        className="rounded-2xl border p-8 sm:p-12 text-center space-y-6"
        style={{
          backgroundColor: 'var(--bg-surface)',
          borderColor: 'var(--border-hairline)',
          boxShadow: 'var(--shadow-soft)',
        }}
      >
        <div className="space-y-3">
          <h1 className="text-2xl sm:text-3xl font-semibold" style={{ color: 'var(--text-primary)' }}>
            Seu painel longitudinal está pronto
          </h1>
          <p className="text-base leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            Registre diariamente como estão seu humor, energia e sono — mesmo em dias sem ação realizada — para enxergar ciclos completos ao longo das semanas.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3 pt-2">
          <button
            type="button"
            onClick={() => onNavigate('registrar')}
            className="min-h-[48px] px-6 py-3 rounded-xl text-base font-semibold cursor-pointer"
            style={{
              backgroundColor: 'var(--color-primary-strong)',
              color: 'var(--color-primary-ink)',
            }}
          >
            Fazer primeiro check-in
          </button>
          <button
            type="button"
            onClick={onLoadSampleData}
            className="min-h-[48px] px-6 py-3 rounded-xl border text-base font-medium cursor-pointer"
            style={{
              backgroundColor: 'var(--bg-elevated)',
              borderColor: 'var(--border-strong)',
              color: 'var(--text-primary)',
            }}
          >
            Explorar com exemplo longitudinal (14 dias)
          </button>
        </div>
      </section>
      </div>
    );
  }

  const bi = analytics.bipolarIndicators;
  const cy = analytics.cycleAnalysis;
  const fi = analytics.functionalImpactSummary;

  return (
    <div className="space-y-8">
      {draftCard}

      {/* Saudação e acesso rápido, conforme conceito visual do redesign */}
      <section
        className="rounded-2xl border p-6 sm:p-8 space-y-4"
        style={{
          backgroundColor: 'var(--bg-surface)',
          borderColor: 'var(--border-hairline)',
          boxShadow: 'var(--shadow-soft)',
        }}
      >
        <div className="space-y-2">
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight" style={{ color: 'var(--text-primary)' }}>
            Como você está?
          </h1>
          <p className="text-base" style={{ color: 'var(--text-secondary)' }}>
            Um espaço para observar, registrar e compreender seus próprios padrões.
          </p>
        </div>
        <button
          type="button"
          onClick={() => onNavigate('registrar')}
          className="min-h-[48px] px-5 py-2.5 rounded-xl text-sm font-semibold cursor-pointer inline-flex items-center gap-2"
          style={{
            backgroundColor: 'var(--color-primary-strong)',
            color: 'var(--color-primary-ink)',
          }}
        >
          ⊕ Novo registro
        </button>
      </section>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            title: 'Humor',
            subtitle: 'Estado emocional',
            value: analytics.avgValence !== null ? `${analytics.avgValence}/10` : '—',
            action: () => onNavigate('analises'),
          },
          {
            title: 'Energia',
            subtitle: 'Disposição percebida',
            value: analytics.avgEnergy !== null ? `${analytics.avgEnergy}/10` : '—',
            action: () => onNavigate('analises'),
          },
          {
            title: 'Comportamentos',
            subtitle: 'O que aconteceu',
            value: `${analytics.totalEpisodes}`,
            action: () => onNavigate('diario'),
          },
          {
            title: 'Padrões',
            subtitle: 'O que os registros mostram',
            value: analytics.evolution.label,
            action: () => onNavigate('analises'),
          },
        ].map((card) => (
          <button
            key={card.title}
            type="button"
            onClick={card.action}
            className="rounded-2xl border p-5 text-left cursor-pointer"
            style={{
              backgroundColor: 'var(--bg-surface)',
              borderColor: 'var(--border-hairline)',
              boxShadow: 'var(--shadow-soft)',
            }}
          >
            <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
              {card.title}
            </p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
              {card.subtitle}
            </p>
            <p className="text-2xl font-bold font-mono tabular-nums mt-3" style={{ color: 'var(--text-primary)' }}>
              {card.value}
            </p>
          </button>
        ))}
      </div>

      {/* Cabeçalho e filtro de período */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight" style={{ color: 'var(--text-primary)' }}>
            Painel longitudinal e ciclos
          </h1>
          <p className="text-base mt-1" style={{ color: 'var(--text-secondary)' }}>
            Evolução contínua de estado emocional, ativação/sono e comportamentos ao longo dos dias.
          </p>
        </div>

        <div
          role="group"
          aria-label="Filtrar por período"
          className="inline-flex flex-wrap items-center gap-1.5 p-1.5 rounded-xl border self-start"
          style={{
            backgroundColor: 'var(--bg-subtle)',
            borderColor: 'var(--border-hairline)',
          }}
        >
          {PERIOD_OPTIONS.map((opt) => {
            const active = period === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => onChangePeriod(opt.value)}
                aria-pressed={active}
                className="min-h-[48px] px-3.5 py-2 rounded-lg text-sm font-medium whitespace-nowrap shrink-0 transition-colors cursor-pointer"
                style={{
                  backgroundColor: active ? 'var(--bg-surface)' : 'transparent',
                  color: active ? 'var(--color-primary-strong)' : 'var(--text-secondary)',
                  boxShadow: active ? 'var(--shadow-soft)' : 'none',
                }}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>

      <ExperimentsPanel
        experiments={experiments}
        entries={entries}
        onCloseExperiment={onCloseExperiment}
      />

      {analytics.totalEntries === 0 ? (
        <section
          className="rounded-2xl border p-8 text-center space-y-4"
          style={{
            backgroundColor: 'var(--bg-surface)',
            borderColor: 'var(--border-hairline)',
          }}
        >
          <p className="text-base font-medium" style={{ color: 'var(--text-primary)' }}>
            Não há registros nos últimos {period} dias.
          </p>
          <button
            type="button"
            onClick={() => onChangePeriod('all')}
            className="min-h-[48px] px-5 py-2.5 rounded-xl border text-sm font-medium cursor-pointer"
            style={{
              backgroundColor: 'var(--bg-elevated)',
              borderColor: 'var(--border-strong)',
              color: 'var(--text-primary)',
            }}
          >
            Ver todo o histórico
          </button>
        </section>
      ) : (
        <>
          {/* Faixa de Métricas Principais (4 colunas) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div
              className="rounded-2xl border p-5"
              style={{
                backgroundColor: 'var(--bg-surface)',
                borderColor: 'var(--border-hairline)',
                boxShadow: 'var(--shadow-soft)',
              }}
            >
              <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                Registros no período
              </p>
              <p className="text-3xl font-bold font-mono tabular-nums mt-2" style={{ color: 'var(--text-primary)' }}>
                {analytics.totalEntries}
              </p>
              <p className="text-xs mt-1.5" style={{ color: 'var(--text-muted)' }}>
                {analytics.totalEpisodes} com ação realizada · {analytics.totalImpulseOnlyEntries} só com impulso ·{' '}
                {Math.max(
                  0,
                  analytics.totalEntries -
                    analytics.totalEpisodes -
                    analytics.totalImpulseOnlyEntries
                )}{' '}
                sem ação/impulso classificado
              </p>
            </div>

            <div
              className="rounded-2xl border p-5"
              style={{
                backgroundColor: 'var(--bg-surface)',
                borderColor: 'var(--border-hairline)',
                boxShadow: 'var(--shadow-soft)',
              }}
            >
              <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                Sono médio e redução
              </p>
              <p className="text-3xl font-bold font-mono tabular-nums mt-2" style={{ color: 'var(--color-primary-strong)' }}>
                {analytics.avgSleepHours !== null ? `${analytics.avgSleepHours}h` : '—'}
              </p>
              <p className="text-xs mt-1.5" style={{ color: 'var(--text-muted)' }}>
                {analytics.avgSleepHours === null
                  ? 'Nenhum registro informou as horas de sono'
                  : `${analytics.sleepReportedCount} registro(s) informaram o sono`}
                {' · '}Redução da necessidade de sono em {analytics.reducedSleepNeedCount} de{' '}
                {analytics.reducedSleepNeedBase} registro(s) que responderam
                {analytics.reducedSleepNeedBase >= 5 ? ` (${analytics.reducedSleepNeedRate}%)` : ''}
              </p>
            </div>

            <div
              className="rounded-2xl border p-5"
              style={{
                backgroundColor: 'var(--bg-surface)',
                borderColor: 'var(--border-hairline)',
                boxShadow: 'var(--shadow-soft)',
              }}
            >
              <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                Energia média (0–10)
              </p>
              <p className="text-3xl font-bold font-mono tabular-nums mt-2" style={{ color: 'var(--text-primary)' }}>
                {analytics.avgEnergy !== null ? analytics.avgEnergy : '—'}
                {analytics.avgEnergy !== null && (
                  <span className="text-lg font-normal" style={{ color: 'var(--text-muted)' }}>
                    /10
                  </span>
                )}
              </p>
              <p className="text-xs mt-1.5" style={{ color: 'var(--text-muted)' }}>
                Valência: {analytics.avgValence !== null ? `${analytics.avgValence}/10` : 'não informada'}
                {' · '}
                {analytics.evolution.label}
              </p>
            </div>

            <div
              className="rounded-2xl border p-5"
              style={{
                backgroundColor: 'var(--bg-surface)',
                borderColor: 'var(--border-hairline)',
                boxShadow: 'var(--shadow-soft)',
              }}
            >
              <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                Vontade média registrada
              </p>
              <p className="text-3xl font-bold font-mono tabular-nums mt-2" style={{ color: 'var(--color-accent)' }}>
                {analytics.avgUrgeIntensity !== null ? (
                  <>
                    {analytics.avgUrgeIntensity}
                    <span className="text-lg font-normal" style={{ color: 'var(--text-muted)' }}>
                      /10
                    </span>
                  </>
                ) : (
                  <span style={{ color: 'var(--text-muted)' }}>—</span>
                )}
              </p>
              <p className="text-xs mt-1.5" style={{ color: 'var(--text-muted)' }}>
                {analytics.daysWithoutEpisodes} dia(s) acompanhados sem ação realizada ·{' '}
                {analytics.daysWithoutLog} sem registro (recorte de {analytics.periodDays}d)
              </p>
            </div>
          </div>

          {(analytics.behaviorModes.feitos > 0 ||
            analytics.behaviorModes.impulsos > 0 ||
            analytics.behaviorModes.registrosComImpulso > 0 ||
            analytics.behaviorModes.registrosComClassificacaoDesconhecida > 0) && (
            <section aria-labelledby="behavior-outcomes-title" className="space-y-3">
              <div>
                <h2
                  id="behavior-outcomes-title"
                  className="text-lg font-semibold"
                  style={{ color: 'var(--text-primary)' }}
                >
                  Ação, impulso e prejuízo
                </h2>
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                  Ação realizada, impulso contido e prejuízo relatado são contados
                  separadamente. Impulso não vira episódio automaticamente.
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[
                  {
                    label: 'Comportamentos realizados',
                    value: analytics.behaviorModes.feitos,
                    detail: `${analytics.behaviorModes.registrosComAcao} registro(s) com ação`,
                    color: 'var(--color-primary-strong)',
                  },
                  {
                    label: 'Impulsos contidos',
                    value: analytics.behaviorModes.impulsos,
                    detail: `${analytics.behaviorModes.registrosComImpulsoSemAcao} registro(s) só com impulso`,
                    color: 'var(--color-secondary-ink)',
                  },
                  {
                    label: 'Prejuízo relatado',
                    value: analytics.behaviorModes.comPrejuizo,
                    detail: `${analytics.behaviorModes.registrosComPrejuizo} registro(s) com relato explícito`,
                    color: 'var(--color-accent)',
                  },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="rounded-2xl border p-4"
                    style={{
                      backgroundColor: 'var(--bg-surface)',
                      borderColor: 'var(--border-hairline)',
                    }}
                  >
                    <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                      {item.label}
                    </p>
                    <p
                      className="text-2xl font-bold font-mono tabular-nums mt-1"
                      style={{ color: item.color }}
                    >
                      {item.value}
                    </p>
                    <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                      {item.detail}
                    </p>
                  </div>
                ))}
              </div>
              {analytics.behaviorModes.registrosComClassificacaoDesconhecida > 0 && (
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  {analytics.behaviorModes.registrosComClassificacaoDesconhecida} registro(s)
                  antigo(s) não informam se houve ação ou impulso — eles não entram nas
                  contagens de ação nem de impulso.
                </p>
              )}
            </section>
          )}

          {/* Análise Longitudinal de Ciclos: Antes × Durante × Depois */}
          <section aria-labelledby="cycle-analysis-title" className="space-y-4">
            <div>
              <h2 id="cycle-analysis-title" className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>
                Análise de ciclos: dias anteriores, durante e posteriores
              </h2>
              <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
                Compara o padrão de sono, energia e sinais de ativação nos 2 dias anteriores (D-2 a D-1), durante e nos 2 dias seguintes (D+1 a D+2) aos episódios.
              </p>
            </div>

            {cy.analyzedEpisodes === 0 ? (
              <div
                className="rounded-2xl border p-6 text-sm"
                style={{
                  backgroundColor: 'var(--bg-surface)',
                  borderColor: 'var(--border-hairline)',
                  color: 'var(--text-secondary)',
                }}
              >
                Sem episódios com ação realizada neste período — impulsos contidos e o acompanhamento diário continuam visíveis nos indicadores acima.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {[
                  {
                    title: 'Antes (D-2 a D-1)',
                    data: cy.before,
                    bg: 'var(--bg-surface)',
                  },
                  {
                    title: 'Durante os episódios',
                    data: cy.during,
                    bg: 'var(--color-accent-soft)',
                  },
                  {
                    title: 'Depois (D+1 a D+2)',
                    data: cy.after,
                    bg: 'var(--color-primary-soft)',
                  },
                ].map((phase) => (
                  <div
                    key={phase.title}
                    className="rounded-2xl border p-6 space-y-3"
                    style={{
                      backgroundColor: phase.bg,
                      borderColor: 'var(--border-hairline)',
                      boxShadow: 'var(--shadow-soft)',
                    }}
                  >
                    <div className="flex items-baseline justify-between gap-2">
                      <h3 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
                        {phase.title}
                      </h3>
                      <span className="text-xs font-mono tabular-nums" style={{ color: 'var(--text-muted)' }}>
                        {phase.data.sampleDays} dia(s)
                      </span>
                    </div>

                    {phase.data.sampleDays === 0 ? (
                      <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                        Sem check-ins registrados nesta janela. Registrar dias calmos ajuda a revelar o ciclo completo.
                      </p>
                    ) : (
                      <dl className="space-y-1.5 text-sm" style={{ color: 'var(--text-secondary)' }}>
                        <div className="flex justify-between gap-2">
                          <dt>Energia média:</dt>
                          <dd className="font-mono tabular-nums font-semibold" style={{ color: 'var(--text-primary)' }}>
                            {phase.data.avgEnergy !== null ? `${phase.data.avgEnergy}/10` : '-'}
                          </dd>
                        </div>
                        <div className="flex justify-between gap-2">
                          <dt>Sono médio:</dt>
                          <dd className="font-mono tabular-nums font-semibold" style={{ color: 'var(--text-primary)' }}>
                            {phase.data.avgSleepHours !== null ? `${phase.data.avgSleepHours}h` : '-'}
                          </dd>
                        </div>
                        <div className="flex justify-between gap-2">
                          <dt>Redução necessidade de sono:</dt>
                          <dd className="font-mono tabular-nums font-semibold" style={{ color: 'var(--text-primary)' }}>
                            {phase.data.sampleDays >= 5
                              ? `${phase.data.reducedSleepNeedRate}%`
                              : 'amostra insuficiente'}
                          </dd>
                        </div>
                        {phase.data.dominantMood && (
                          <div className="flex justify-between gap-2">
                            <dt>Humor mais comum:</dt>
                            <dd className="font-medium text-right" style={{ color: 'var(--text-primary)' }}>
                              {phase.data.dominantMood}
                            </dd>
                          </div>
                        )}
                        {phase.data.topActivationSignal && (
                          <div className="pt-1 text-xs" style={{ color: 'var(--text-secondary)' }}>
                            Sinal frequente: <strong>{phase.data.topActivationSignal}</strong>
                          </div>
                        )}
                      </dl>
                    )}
                  </div>
                ))}
              </div>
            )}

            {cy.findings.length > 0 && (
              <div
                className="rounded-2xl border p-5 space-y-1.5 text-sm"
                style={{
                  backgroundColor: 'var(--bg-elevated)',
                  borderColor: 'var(--border-hairline)',
                  color: 'var(--text-primary)',
                }}
              >
                {cy.findings.map((finding) => (
                  <p key={finding}>· {finding}</p>
                ))}
              </div>
            )}
          </section>

          {/* Gráficos visuais limpos (incluindo Linha do Tempo Conjunta) */}
          <DashboardCharts analytics={analytics} theme={theme} />

          <section
            className="rounded-2xl border p-4 sm:p-5"
            style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-hairline)' }}
          >
            <h2 className="text-base font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>
              Cobertura dos dados
            </h2>
            <p className="text-sm mb-3" style={{ color: 'var(--text-secondary)' }}>
              Base analisada: {totalAllEntries} registro(s). Relações exibidas são exploratórias.
            </p>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
              {summarizeCoverage(analytics.coverage)
                .filter((section) => section.base > 0)
                .map((section) => (
                  <li key={section.id} className="flex items-center justify-between gap-3">
                    <span>{section.label}</span>
                    <span className="font-medium" style={{ color: 'var(--text-primary)' }}>
                      {section.answered}/{section.base}
                    </span>
                  </li>
                ))}
            </ul>
          </section>

          {/* Polaridade de energia e oscilações de humor */}
          <section aria-labelledby="bipolar-spotlight-title" className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h2 id="bipolar-spotlight-title" className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>
                  Polaridade de energia e oscilações de humor
                </h2>
                <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
                  Separação entre impulsividade em estados ativados/eufóricos e comportamentos de alívio em baixa energia.
                </p>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('analises')}
                className="min-h-[48px] px-4 py-2 rounded-xl border text-sm font-medium whitespace-nowrap shrink-0 self-start cursor-pointer"
                style={{
                  backgroundColor: 'var(--bg-surface)',
                  borderColor: 'var(--border-strong)',
                  color: 'var(--color-primary-strong)',
                }}
              >
                Ver análise detalhada
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div
                className="rounded-2xl border p-6 space-y-2.5"
                style={{
                  backgroundColor: 'var(--color-accent-soft)',
                  borderColor: 'var(--border-hairline)',
                  boxShadow: 'var(--shadow-soft)',
                }}
              >
                <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                  Alta energia / Euforia
                </p>
                <p className="text-2xl font-bold font-mono tabular-nums" style={{ color: 'var(--color-accent)' }}>
                  {bi.highEnergyEpisodes} ep. com ação
                  {analytics.totalEpisodes >= 5 ? ` (${bi.highEnergyPercent}%)` : ''}
                </p>
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                  Energia ≥ 7 ou Eufórico/Agitado. Vontade média:{' '}
                  <strong className="font-mono tabular-nums">{bi.highEnergyAvgUrge}/10</strong>.
                </p>
                {bi.highEnergyTopBehaviors.length > 0 && (
                  <p className="text-xs pt-1" style={{ color: 'var(--text-secondary)' }}>
                    Principais: {bi.highEnergyTopBehaviors.join(', ')}
                  </p>
                )}
              </div>

              <div
                className="rounded-2xl border p-6 space-y-2.5"
                style={{
                  backgroundColor: 'var(--color-primary-soft)',
                  borderColor: 'var(--border-hairline)',
                  boxShadow: 'var(--shadow-soft)',
                }}
              >
                <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                  Baixa energia / Tristeza / Vazio
                </p>
                <p className="text-2xl font-bold font-mono tabular-nums" style={{ color: 'var(--color-primary-strong)' }}>
                  {bi.lowEnergyReliefEpisodes} ep. com ação
                  {analytics.totalEpisodes >= 5 ? ` (${bi.lowEnergyPercent}%)` : ''}
                </p>
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                  Energia ≤ 3 ou Triste/Apatia.{' '}
                  {bi.lowEnergyReliefEpisodes >= 5 ? (
                    <>
                      <strong className="font-mono tabular-nums">{bi.lowEnergyAutomaticRate}%</strong> em
                      modo automático/misto.
                    </>
                  ) : (
                    'Amostra insuficiente para o modo automático/misto.'
                  )}
                </p>
                {bi.lowEnergyTopBehaviors.length > 0 && (
                  <p className="text-xs pt-1" style={{ color: 'var(--text-secondary)' }}>
                    Principais: {bi.lowEnergyTopBehaviors.join(', ')}
                  </p>
                )}
              </div>

              <div
                className="rounded-2xl border p-6 space-y-2.5"
                style={{
                  backgroundColor: 'var(--color-secondary-soft)',
                  borderColor: 'var(--border-hairline)',
                  boxShadow: 'var(--shadow-soft)',
                }}
              >
                <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                  Oscilação prévia de humor
                </p>
                <p className="text-2xl font-bold font-mono tabular-nums" style={{ color: 'var(--color-secondary-ink)' }}>
                  {bi.moodSwingEntries} reg.
                  {analytics.totalEntries >= 5 ? ` (${bi.moodSwingPercent}%)` : ''}
                </p>
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                  Nos episódios com oscilação: vontade média{' '}
                  <strong className="font-mono tabular-nums">{bi.moodSwingAvgUrge}/10</strong> ·{' '}
                  {bi.moodSwingEntries >= 5 ? (
                    <>
                      Não interrompido em{' '}
                      <strong className="font-mono tabular-nums">{bi.moodSwingNoResistRate}%</strong>.
                    </>
                  ) : (
                    'Amostra insuficiente para a taxa de não interrupção.'
                  )}
                </p>
              </div>
            </div>
          </section>

          {/* Duração dos estados, sinais de ativação e impacto funcional */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            <section
              className="rounded-2xl border p-6 space-y-3"
              style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-hairline)' }}
            >
              <h3 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
                Duração dos estados
              </h3>
              <ul className="space-y-2 text-sm">
                {analytics.durationDistribution.map((d) => (
                  <li key={d.id} className="flex justify-between gap-2" style={{ color: 'var(--text-secondary)' }}>
                    <span>{d.label}</span>
                    <span className="font-mono tabular-nums font-semibold" style={{ color: 'var(--text-primary)' }}>
                      {d.count}x
                    </span>
                  </li>
                ))}
              </ul>
            </section>

            <section
              className="rounded-2xl border p-6 space-y-3"
              style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-hairline)' }}
            >
              <h3 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
                Sinais associados de ativação
              </h3>
              <ul className="space-y-2 text-sm">
                {analytics.activationSignalStats.map((s) => (
                  <li key={s.id} className="flex justify-between gap-2" style={{ color: 'var(--text-secondary)' }}>
                    <span>{s.label}</span>
                    <span className="font-mono tabular-nums font-semibold" style={{ color: 'var(--text-primary)' }}>
                      {s.count}x
                    </span>
                  </li>
                ))}
              </ul>
            </section>

            <section
              className="rounded-2xl border p-6 space-y-3"
              style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-hairline)' }}
            >
              <h3 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
                Impacto funcional (moderado/intenso)
              </h3>
              <ul className="space-y-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
                <li className="flex justify-between gap-2">
                  <span>Trabalho / Estudos</span>
                  <span className="font-mono tabular-nums font-semibold" style={{ color: 'var(--text-primary)' }}>
                    {fi.workModerateOrHigh} dia(s)
                  </span>
                </li>
                <li className="flex justify-between gap-2">
                  <span>Relacionamentos</span>
                  <span className="font-mono tabular-nums font-semibold" style={{ color: 'var(--text-primary)' }}>
                    {fi.relationshipsModerateOrHigh} dia(s)
                  </span>
                </li>
                <li className="flex justify-between gap-2">
                  <span>Rotina / Autocuidado</span>
                  <span className="font-mono tabular-nums font-semibold" style={{ color: 'var(--text-primary)' }}>
                    {fi.routineModerateOrHigh} dia(s)
                  </span>
                </li>
              </ul>
              <p className="text-xs pt-2 border-t" style={{ borderColor: 'var(--border-hairline)', color: 'var(--text-muted)' }}>
                {analytics.totalEntries >= 5
                  ? `Impacto significativo presente em ${fi.anySignificantImpactRate}% dos registros no período.`
                  : 'Amostra insuficiente para calcular o percentual de impacto no período.'}
              </p>
            </section>
          </div>
        </>
      )}
    </div>
  );
};
