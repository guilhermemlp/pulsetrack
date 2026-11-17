import React from 'react';
import { AnalyticsSummary, AppTab, PeriodFilter } from '../types/pulsetrack';

interface InsightsViewProps {
  analytics: AnalyticsSummary;
  totalAllEntries: number;
  period: PeriodFilter;
  onChangePeriod: (p: PeriodFilter) => void;
  onNavigate: (tab: AppTab) => void;
}

const CATEGORY_LABEL: Record<string, string> = {
  bipolaridade: 'Ativação, sono e humor',
  ciclo: 'Análise longitudinal de ciclos',
  compulsao: 'Padrão compulsivo',
  gatilho: 'Gatilhos e impacto funcional',
  evolucao: 'Evolução no período',
  neurodivergencia: 'Experiências neurodivergentes',
  seguranca: 'Segurança e sofrimento grave',
};

export const InsightsView: React.FC<InsightsViewProps> = ({
  analytics,
  totalAllEntries,
  period,
  onChangePeriod,
  onNavigate,
}) => {
  if (totalAllEntries === 0) {
    return (
      <section
        className="rounded-2xl border p-8 sm:p-10 text-center max-w-2xl mx-auto space-y-4"
        style={{
          backgroundColor: 'var(--bg-surface)',
          borderColor: 'var(--border-hairline)',
        }}
      >
        <h1 className="text-2xl font-semibold" style={{ color: 'var(--text-primary)' }}>
          Insights automáticos
        </h1>
        <p className="text-base" style={{ color: 'var(--text-secondary)' }}>
          Com registros contínuos de humor, sono e episódios, o PulseTrack organiza padrões longitudinais para apoiar suas conversas com o psiquiatra ou psicólogo.
        </p>
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
      </section>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight" style={{ color: 'var(--text-primary)' }}>
            Insights e leitura de ciclos
          </h1>
          <p className="text-base mt-1" style={{ color: 'var(--text-secondary)' }}>
            Distinção entre estado emocional, estado de ativação/sono e comportamento ao longo dos dias.
          </p>
        </div>

        <div
          role="group"
          aria-label="Filtrar período dos insights"
          className="inline-flex flex-wrap items-center gap-1 p-1 rounded-xl border self-start"
          style={{
            backgroundColor: 'var(--bg-subtle)',
            borderColor: 'var(--border-hairline)',
          }}
        >
          {(['7', '14', '30', '90', 'all'] as PeriodFilter[]).map((p) => {
            const active = period === p;
            return (
              <button
                key={p}
                type="button"
                onClick={() => onChangePeriod(p)}
                aria-pressed={active}
                className="min-h-[48px] px-3.5 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap shrink-0 cursor-pointer"
                style={{
                  backgroundColor: active ? 'var(--bg-surface)' : 'transparent',
                  color: active ? 'var(--color-primary-strong)' : 'var(--text-secondary)',
                }}
              >
                {p === 'all' ? 'Tudo' : `${p}d`}
              </button>
            );
          })}
        </div>
      </div>

      {analytics.totalEntries === 0 ? (
        <div
          className="rounded-2xl border p-8 text-center space-y-3"
          style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-hairline)' }}
        >
          <p className="text-base font-medium" style={{ color: 'var(--text-primary)' }}>
            Nenhum registro encontrado neste recorte de tempo.
          </p>
          <button
            type="button"
            onClick={() => onChangePeriod('all')}
            className="min-h-[48px] px-5 py-2.5 rounded-xl border text-sm font-medium cursor-pointer"
            style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-strong)', color: 'var(--text-primary)' }}
          >
            Mostrar todo o histórico
          </button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {analytics.insights.map((insight) => (
              <article
                key={insight.id}
                className="rounded-2xl border p-6 flex flex-col justify-between gap-4"
                style={{
                  backgroundColor: 'var(--bg-surface)',
                  borderColor: 'var(--border-hairline)',
                  boxShadow: 'var(--shadow-soft)',
                }}
              >
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between gap-2 text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
                    <span>{CATEGORY_LABEL[insight.category] ?? 'Observação'}</span>
                    <span className="font-mono tabular-nums">{insight.metricLabel}</span>
                  </div>
                  <h2 className="text-lg font-semibold leading-snug" style={{ color: 'var(--text-primary)' }}>
                    {insight.title}
                  </h2>
                  <p className="text-base font-medium" style={{ color: 'var(--color-primary-strong)' }}>
                    {insight.summary}
                  </p>
                  <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                    {insight.detail}
                  </p>
                </div>
              </article>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <section
              className="rounded-2xl border p-6 space-y-4"
              style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-hairline)' }}
            >
              <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
                Principais gatilhos relatados
              </h2>
              {analytics.topTriggers.length === 0 ? (
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                  Nenhum gatilho textual preenchido neste período.
                </p>
              ) : (
                <ul className="divide-y" style={{ borderColor: 'var(--border-hairline)' }}>
                  {analytics.topTriggers.map((t) => (
                    <li
                      key={t.label}
                      className="py-3 flex items-baseline justify-between gap-4 text-sm"
                      style={{ borderColor: 'var(--border-hairline)' }}
                    >
                      <span style={{ color: 'var(--text-primary)' }}>{t.label}</span>
                      <span className="font-mono tabular-nums shrink-0" style={{ color: 'var(--text-secondary)' }}>
                        {t.count}x
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section
              className="rounded-2xl border p-6 space-y-4"
              style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-hairline)' }}
            >
              <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
                Eventos do dia mais presentes
              </h2>
              {analytics.topDayEvents.length === 0 ? (
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                  Nenhum evento do dia marcado neste período.
                </p>
              ) : (
                <ul className="divide-y" style={{ borderColor: 'var(--border-hairline)' }}>
                  {analytics.topDayEvents.map((ev) => (
                    <li
                      key={ev.label}
                      className="py-3 flex items-baseline justify-between gap-4 text-sm"
                      style={{ borderColor: 'var(--border-hairline)' }}
                    >
                      <span style={{ color: 'var(--text-primary)' }}>{ev.label}</span>
                      <span className="font-mono tabular-nums shrink-0" style={{ color: 'var(--text-secondary)' }}>
                        {ev.count}x
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        </>
      )}
    </div>
  );
};
