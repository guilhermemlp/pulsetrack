import React from 'react';
import { AnalyticsSummary, DailyPoint, ThemeMode } from '../types/pulsetrack';

interface ChartsProps {
  analytics: AnalyticsSummary;
  theme: ThemeMode;
}

export const DashboardCharts: React.FC<ChartsProps> = ({ analytics, theme }) => {
  const maxCatCount = Math.max(1, ...analytics.categoryStats.map((c) => c.count));
  const maxMoodCount = Math.max(1, ...analytics.moodStats.map((m) => m.count));

  const totalAwareness =
    analytics.awarenessBreakdown.consciente +
    analytics.awarenessBreakdown.automatico +
    analytics.awarenessBreakdown.mistura;

  const totalResist =
    analytics.resistanceBreakdown.sim +
    analytics.resistanceBreakdown.parcialmente +
    analytics.resistanceBreakdown.nao;

  const pct = (val: number, total: number) => (total > 0 ? Math.round((val / total) * 100) : 0);

  const getMoodColor = (m: AnalyticsSummary['moodStats'][number]) => {
    if (theme === ThemeMode.DARK) return m.colorDark;
    if (theme === ThemeMode.HIGH_CONTRAST) return m.colorHighContrast;
    return m.colorLight;
  };

  const getTimelineMoodColor = (pt: DailyPoint) => {
    if (theme === ThemeMode.DARK) return pt.primaryMoodColorDark ?? 'var(--color-primary)';
    if (theme === ThemeMode.HIGH_CONTRAST) return pt.primaryMoodColorHC ?? 'var(--color-primary-strong)';
    return pt.primaryMoodColorLight ?? 'var(--color-primary)';
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Gráfico Longitudinal Principal: Linha do Tempo Conjunta (Humor, Energia, Sono e Episódios) */}
      <section
        aria-labelledby="chart-longitudinal-title"
        className="lg:col-span-2 rounded-2xl border p-6"
        style={{
          backgroundColor: 'var(--bg-surface)',
          borderColor: 'var(--border-hairline)',
          boxShadow: 'var(--shadow-soft)',
        }}
      >
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-5">
          <div>
            <h3
              id="chart-longitudinal-title"
              className="text-lg font-semibold"
              style={{ color: 'var(--text-primary)' }}
            >
              Linha do tempo conjunta: humor, energia, sono, ações e impulsos
            </h3>
            <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
              Últimos {analytics.dailyTimeline.length} dias · acompanhe como sono e energia evoluem antes, durante e depois das ações realizadas
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs" style={{ color: 'var(--text-secondary)' }}>
            <span className="inline-flex items-center gap-1.5">
              <span
                className="inline-block w-2.5 h-2.5 rounded-xs shrink-0"
                style={{ backgroundColor: 'var(--color-primary)' }}
                aria-hidden="true"
              />
              <span>Energia (0–10)</span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span
                className="inline-block w-2.5 h-2.5 rounded-xs shrink-0"
                style={{ backgroundColor: 'var(--color-secondary)' }}
                aria-hidden="true"
              />
              <span>Sono (h)</span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span
                className="inline-block w-2.5 h-1.5 rounded-xs shrink-0"
                style={{ backgroundColor: 'var(--color-primary-strong)' }}
                aria-hidden="true"
              />
              <span>Valência (prazer)</span>
            </span>
            <span>Ep = Episódio com ação realizada</span>
            <span>Im = Impulso contido</span>
            <span>* = Redução da necessidade de sono</span>
          </div>
        </div>

        <div className="overflow-x-auto pb-2">
          <div className="min-w-[680px]">
            {/* Grade de dias com 4 faixas alinhadas */}
            <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${analytics.dailyTimeline.length}, minmax(0, 1fr))` }}>
              {analytics.dailyTimeline.map((pt) => {
                const isLogged = pt.totalEntries > 0;
                const energyPct = pt.avgEnergy !== null ? Math.max(12, pt.avgEnergy * 10) : 0;
                const sleepPct =
                  pt.avgSleepHours !== null ? Math.min(100, Math.max(12, Math.round((pt.avgSleepHours / 11) * 100))) : 0;

                const statusLabel = !isLogged
                  ? 'Sem registro'
                  : pt.episodeCount > 0
                  ? `${pt.episodeCount} episódio(s) com ação`
                  : pt.hasImpulse
                  ? 'Impulso contido'
                  : 'Check-in calmo';

                // Mesmo texto no tooltip e no rótulo acessível (o título sozinho não chega
                // a leitores de tela).
                const cellLabel = `${pt.shortLabel} (${statusLabel})${
                  isLogged
                    ? ` · Humor: ${pt.primaryMoodLabel ?? '-'} · Energia: ${
                        pt.avgEnergy !== null ? `${pt.avgEnergy}/10` : 'não informado'
                      } · Valência: ${
                        pt.avgValence !== null ? `${pt.avgValence}/10` : 'não informado'
                      } · Sono: ${pt.avgSleepHours !== null ? `${pt.avgSleepHours}h` : 'não informado'}${
                        pt.hasReducedSleepNeed ? ' (redução necessidade de sono)' : ''
                      }`
                    : ''
                }`;

                return (
                  <div
                    key={pt.date}
                    role="group"
                    aria-label={cellLabel}
                    className="flex flex-col items-center gap-1.5 p-1 rounded-lg"
                    style={{
                      backgroundColor: pt.episodeCount > 0 ? 'var(--color-accent-soft)' : 'transparent',
                    }}
                    title={cellLabel}
                  >
                    {/* Indicador de episódio ou check-in */}
                    <div className="h-5 flex items-center justify-center text-[10px] font-mono font-semibold tabular-nums">
                      {pt.episodeCount > 0 ? (
                        <span style={{ color: 'var(--color-accent)' }}>Ep{pt.episodeCount > 1 ? pt.episodeCount : ''}</span>
                      ) : pt.hasImpulse ? (
                        <span style={{ color: 'var(--color-secondary-ink)' }}>Im</span>
                      ) : pt.hasCheckinOnly ? (
                        <span style={{ color: 'var(--color-secondary-ink)' }}>Ok</span>
                      ) : (
                        <span style={{ color: 'var(--text-muted)' }}>-</span>
                      )}
                    </div>

                    {/* Barras pareadas: Energia (esq) e Sono (dir) */}
                    <div className="w-full h-24 flex items-end justify-center gap-0.5 px-0.5 border-b" style={{ borderColor: 'var(--border-hairline)' }}>
                      <div
                        className="w-1/2 rounded-t-sm"
                        style={{
                          height: isLogged ? `${energyPct}%` : '4px',
                          backgroundColor: isLogged
                            ? pt.avgEnergy !== null && pt.avgEnergy >= 8
                              ? 'var(--color-accent)'
                              : 'var(--color-primary)'
                            : 'var(--bg-subtle)',
                        }}
                      />
                      <div
                        className="w-1/2 rounded-t-sm"
                        style={{
                          height: isLogged ? `${sleepPct}%` : '4px',
                          backgroundColor: isLogged ? 'var(--color-secondary)' : 'var(--bg-subtle)',
                        }}
                      />
                    </div>

                    {/* Cor do estado emocional */}
                    <div
                      className="w-full h-2 rounded-sm"
                      style={{
                        backgroundColor: isLogged ? getTimelineMoodColor(pt) : 'var(--bg-subtle)',
                      }}
                    />

                    {/* Valência do afeto: eixo separado da energia */}
                    <div
                      className="w-full h-1.5 rounded-sm overflow-hidden"
                      style={{ backgroundColor: 'var(--bg-subtle)' }}
                      aria-hidden="true"
                    >
                      <div
                        className="h-full rounded-sm"
                        style={{
                          width:
                            isLogged && pt.avgValence !== null
                              ? `${Math.max(6, pt.avgValence * 10)}%`
                              : '0%',
                          backgroundColor: 'var(--color-primary-strong)',
                          opacity: 0.75,
                        }}
                      />
                    </div>

                    {/* Leituras numéricas curtas */}
                    <div className="text-[10px] font-mono tabular-nums leading-tight text-center" style={{ color: 'var(--text-secondary)' }}>
                      <div>{pt.avgSleepHours !== null ? `${pt.avgSleepHours}h` : '·'}</div>
                      {pt.hasReducedSleepNeed && (
                        <div className="font-bold" style={{ color: 'var(--color-accent)' }}>
                          *
                        </div>
                      )}
                    </div>

                    {/* Data */}
                    <div className="text-[10px] font-mono tabular-nums" style={{ color: 'var(--text-muted)' }}>
                      {pt.shortLabel.slice(0, 2)}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 text-xs mt-3 pt-3 border-t" style={{ borderColor: 'var(--border-hairline)', color: 'var(--text-muted)' }}>
              <span>Barra esquerda: Energia (coral quando ≥ 7/10) · Barra direita: Horas de sono · Faixa inferior: cor do humor</span>
              <span>Ok = dia acompanhado sem episódio nem impulso · Im = impulso contido · Ep = dia com ação realizada</span>
            </div>
          </div>
        </div>
      </section>

      {/* Gráfico 2: Frequência por Categoria */}
      <section
        aria-labelledby="chart-cat-title"
        className="rounded-2xl border p-6"
        style={{
          backgroundColor: 'var(--bg-surface)',
          borderColor: 'var(--border-hairline)',
          boxShadow: 'var(--shadow-soft)',
        }}
      >
        <div className="mb-5">
          <h3 id="chart-cat-title" className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
            Frequência por categoria comportamental
          </h3>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
            Distribuição dos registros com comportamento, separando ação realizada e
            impulso contido. A vontade média é dos registros que a informaram.
          </p>
        </div>

        {analytics.categoryStats.length === 0 ? (
          <p className="text-sm py-8 text-center" style={{ color: 'var(--text-muted)' }}>
            Nenhum comportamento registrado neste período — nem ação realizada nem impulso contido.
          </p>
        ) : (
          <div className="space-y-4">
            {analytics.categoryStats.map((cat) => {
              const barWidth = Math.max(6, Math.round((cat.count / maxCatCount) * 100));
              return (
                <div key={cat.categoryId} className="space-y-1.5">
                  <div className="flex items-baseline justify-between gap-3 text-sm">
                    <span className="font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                      {cat.categoryName}
                    </span>
                    <span
                      className="font-mono tabular-nums text-xs shrink-0"
                      style={{ color: 'var(--text-secondary)' }}
                    >
                      {cat.count} reg. · {cat.realizedCount} com ação · {cat.impulseCount} com
                      impulso · vontade{' '}
                      {cat.avgUrge !== null ? `${cat.avgUrge}/10` : 'não informada'}
                      {cat.harmCount > 0 ? ` · prejuízo ${cat.harmCount}x` : ''}
                    </span>
                  </div>
                  <div
                    className="h-3.5 w-full rounded-full overflow-hidden border"
                    style={{
                      backgroundColor: 'var(--bg-subtle)',
                      borderColor: 'var(--border-hairline)',
                    }}
                  >
                    <div
                      className="h-full rounded-full transition-all duration-200"
                      style={{
                        width: `${barWidth}%`,
                        backgroundColor:
                          theme === ThemeMode.HIGH_CONTRAST ? 'var(--color-primary-strong)' : cat.color,
                      }}
                    />
                  </div>
                  {cat.topItems.length > 0 && (
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                      Mais frequentes: {cat.topItems.map((i) => `${i.label} (${i.count}x)`).join(' · ')}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Gráfico 3: Relação Humor / Energia / Vontade */}
      <section
        aria-labelledby="chart-mood-title"
        className="rounded-2xl border p-6"
        style={{
          backgroundColor: 'var(--bg-surface)',
          borderColor: 'var(--border-hairline)',
          boxShadow: 'var(--shadow-soft)',
        }}
      >
        <div className="mb-5">
          <h3 id="chart-mood-title" className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
            Estado emocional × energia e vontade
          </h3>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
            Para cada estado emocional: quantos registros ocorreram, em quantos houve ação
            realizada, a energia média e a intensidade da vontade (calculada apenas sobre
            registros com ação)
          </p>
        </div>

        {analytics.moodStats.length === 0 ? (
          <p className="text-sm py-8 text-center" style={{ color: 'var(--text-muted)' }}>
            Sem registros de humor neste período.
          </p>
        ) : (
          <div className="space-y-4">
            {analytics.moodStats.map((m) => {
              const barWidth = Math.max(8, Math.round((m.count / maxMoodCount) * 100));
              const moodColor = getMoodColor(m);
              return (
                <div key={m.moodId} className="space-y-1.5">
                  <div className="flex flex-wrap items-baseline justify-between gap-2 text-sm">
                    <div className="flex items-center gap-2">
                      <span
                        className="inline-block w-3 h-3 rounded-sm shrink-0"
                        style={{ backgroundColor: moodColor }}
                        aria-hidden="true"
                      />
                      <span className="font-medium" style={{ color: 'var(--text-primary)' }}>
                        {m.label}
                      </span>
                    </div>
                    <span className="font-mono tabular-nums text-xs" style={{ color: 'var(--text-secondary)' }}>
                      {m.count}x · {m.episodeCount} ep.
                      {m.count >= 5 ? ` (${m.episodeRate}%)` : ''} · energia{' '}
                      {m.avgEnergy !== null ? `${m.avgEnergy}/10` : 'não informada'} · valência{' '}
                      {m.avgValence !== null ? `${m.avgValence}/10` : 'não informada'} · vontade{' '}
                      {m.episodeCount > 0
                        ? m.avgUrge !== null
                          ? `${m.avgUrge}/10`
                          : 'não informada'
                        : '—'}
                    </span>
                  </div>
                  <div
                    className="h-3.5 w-full rounded-full overflow-hidden border"
                    style={{
                      backgroundColor: 'var(--bg-subtle)',
                      borderColor: 'var(--border-hairline)',
                    }}
                  >
                    <div
                      className="h-full rounded-full transition-all duration-200"
                      style={{
                        width: `${barWidth}%`,
                        backgroundColor: moodColor,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Gráfico 4: Consciência e Interrupção */}
      <section
        aria-labelledby="chart-awareness-title"
        className="lg:col-span-2 rounded-2xl border p-6"
        style={{
          backgroundColor: 'var(--bg-surface)',
          borderColor: 'var(--border-hairline)',
          boxShadow: 'var(--shadow-soft)',
        }}
      >
        <div className="mb-5">
          <h3 id="chart-awareness-title" className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
            Consciência e interrupção nos registros com comportamento ou impulso
          </h3>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
            Proporção de ação consciente vs. automática e capacidade de pausa
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div>
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="font-medium" style={{ color: 'var(--text-primary)' }}>
                Grau de consciência no momento
              </span>
              <span className="font-mono tabular-nums text-xs" style={{ color: 'var(--text-secondary)' }}>
                {totalAwareness} registros
              </span>
            </div>
            <div
              className="h-5 w-full rounded-xl overflow-hidden flex border"
              style={{
                backgroundColor: 'var(--bg-subtle)',
                borderColor: 'var(--border-hairline)',
              }}
            >
              {analytics.awarenessBreakdown.consciente > 0 && (
                <div
                  style={{
                    width: `${pct(analytics.awarenessBreakdown.consciente, totalAwareness)}%`,
                    backgroundColor: 'var(--color-secondary)',
                  }}
                />
              )}
              {analytics.awarenessBreakdown.mistura > 0 && (
                <div
                  style={{
                    width: `${pct(analytics.awarenessBreakdown.mistura, totalAwareness)}%`,
                    backgroundColor: 'var(--color-primary)',
                  }}
                />
              )}
              {analytics.awarenessBreakdown.automatico > 0 && (
                <div
                  style={{
                    width: `${pct(analytics.awarenessBreakdown.automatico, totalAwareness)}%`,
                    backgroundColor: 'var(--color-accent)',
                  }}
                />
              )}
            </div>
            <div className="flex flex-wrap gap-4 mt-3 text-xs">
              <span style={{ color: 'var(--text-secondary)' }}>
                Consciente: <strong className="font-mono tabular-nums">{analytics.awarenessBreakdown.consciente}</strong>
                {totalAwareness >= 5 ? ` (${pct(analytics.awarenessBreakdown.consciente, totalAwareness)}%)` : ''}
              </span>
              <span style={{ color: 'var(--text-secondary)' }}>
                Mistura: <strong className="font-mono tabular-nums">{analytics.awarenessBreakdown.mistura}</strong>
                {totalAwareness >= 5 ? ` (${pct(analytics.awarenessBreakdown.mistura, totalAwareness)}%)` : ''}
              </span>
              <span style={{ color: 'var(--text-secondary)' }}>
                Automático: <strong className="font-mono tabular-nums">{analytics.awarenessBreakdown.automatico}</strong>
                {totalAwareness >= 5 ? ` (${pct(analytics.awarenessBreakdown.automatico, totalAwareness)}%)` : ''}
              </span>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="font-medium" style={{ color: 'var(--text-primary)' }}>
                Conseguiu interromper ou resistir?
              </span>
              <span className="font-mono tabular-nums text-xs" style={{ color: 'var(--text-secondary)' }}>
                {totalResist} registros
              </span>
            </div>
            <div
              className="h-5 w-full rounded-xl overflow-hidden flex border"
              style={{
                backgroundColor: 'var(--bg-subtle)',
                borderColor: 'var(--border-hairline)',
              }}
            >
              {analytics.resistanceBreakdown.sim > 0 && (
                <div
                  style={{
                    width: `${pct(analytics.resistanceBreakdown.sim, totalResist)}%`,
                    backgroundColor: 'var(--color-secondary)',
                  }}
                />
              )}
              {analytics.resistanceBreakdown.parcialmente > 0 && (
                <div
                  style={{
                    width: `${pct(analytics.resistanceBreakdown.parcialmente, totalResist)}%`,
                    backgroundColor: 'var(--color-primary)',
                  }}
                />
              )}
              {analytics.resistanceBreakdown.nao > 0 && (
                <div
                  style={{
                    width: `${pct(analytics.resistanceBreakdown.nao, totalResist)}%`,
                    backgroundColor: 'var(--color-accent)',
                  }}
                />
              )}
            </div>
            <div className="flex flex-wrap gap-4 mt-3 text-xs">
              <span style={{ color: 'var(--text-secondary)' }}>
                Sim: <strong className="font-mono tabular-nums">{analytics.resistanceBreakdown.sim}</strong>
                {totalResist >= 5 ? ` (${pct(analytics.resistanceBreakdown.sim, totalResist)}%)` : ''}
              </span>
              <span style={{ color: 'var(--text-secondary)' }}>
                Parcial: <strong className="font-mono tabular-nums">{analytics.resistanceBreakdown.parcialmente}</strong>
                {totalResist >= 5 ? ` (${pct(analytics.resistanceBreakdown.parcialmente, totalResist)}%)` : ''}
              </span>
              <span style={{ color: 'var(--text-secondary)' }}>
                Não: <strong className="font-mono tabular-nums">{analytics.resistanceBreakdown.nao}</strong>
                {totalResist >= 5 ? ` (${pct(analytics.resistanceBreakdown.nao, totalResist)}%)` : ''}
              </span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
