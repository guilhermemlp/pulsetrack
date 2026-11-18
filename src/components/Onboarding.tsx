import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Check, ShieldCheck, Sparkles } from 'lucide-react';
import { FOCUS_AREA_OPTIONS } from '../data/defaults';
import { CATEGORY_PACKAGES } from '../data/packages';
import {
  FocusArea,
  OnboardingProgress,
  PackageId,
  RecordLevel,
  ThemeMode,
  UserPreferences,
} from '../types/pulsetrack';

interface OnboardingProps {
  progress: OnboardingProgress;
  preferences: UserPreferences;
  /** Pacotes já aplicados não são oferecidos de novo (preferences.packageIds). */
  availablePackageIds: PackageId[];
  onSaveProgress: (progress: OnboardingProgress) => void;
  onChangePreferences: (patch: Partial<UserPreferences>) => void;
  onApplyPackages: (ids: PackageId[]) => void;
  onFinish: () => void;
}

const STEP_TITLES = [
  'O que você quer observar?',
  'Pacotes de categorias',
  'Ritmo e conforto',
] as const;

const TOTAL_STEPS = STEP_TITLES.length;

const LEVEL_OPTIONS: Array<{ id: RecordLevel; label: string; hint: string }> = [
  { id: 'rapido', label: 'Rápido', hint: 'Humor, energia e sono em menos de 1 minuto.' },
  { id: 'padrao', label: 'Padrão', hint: 'Inclui sinais, duração e contexto.' },
  { id: 'completo', label: 'Completo', hint: 'Inclui impacto funcional, eventos e notas.' },
];

const cardStyle: React.CSSProperties = {
  backgroundColor: 'var(--bg-surface)',
  borderColor: 'var(--border-hairline)',
  boxShadow: 'var(--shadow-soft)',
};

const chipStyle = (active: boolean): React.CSSProperties => ({
  backgroundColor: active ? 'var(--color-primary-soft)' : 'var(--bg-elevated)',
  borderColor: active ? 'var(--color-primary-strong)' : 'var(--border-hairline)',
  color: active ? 'var(--color-primary-strong)' : 'var(--text-primary)',
});

/**
 * Onboarding em 3 telas, com persistência incremental.
 *
 * Áreas de foco são salvas no clique; pacotes são aplicados no clique; ritmo e conforto
 * são salvos na própria alteração. Assim, fechar a aba não apaga uma escolha já feita.
 * Pular é uma resposta válida (a etapa entra em `skippedSteps`) e retomada usa a etapa
 * persistida. Nada aqui é diagnóstico: as escolhas só mudam o destaque e os atalhos.
 */
export const Onboarding: React.FC<OnboardingProps> = ({
  progress,
  preferences,
  availablePackageIds,
  onSaveProgress,
  onChangePreferences,
  onApplyPackages,
  onFinish,
}) => {
  const [step, setStep] = useState(() => Math.min(TOTAL_STEPS - 1, Math.max(0, progress.step)));
  const [focusAreas, setFocusAreas] = useState<FocusArea[]>(preferences.focusAreas);
  const [appliedPackageIds, setAppliedPackageIds] = useState<PackageId[]>([]);
  /** Snapshot: um pacote aplicado sai de `availablePackageIds`, mas continua visível aqui. */
  const [offeredPackageIds] = useState<PackageId[]>(availablePackageIds);
  const initializedRef = useRef(false);

  // Marca o início apenas uma vez; a partir daí cada navegação grava sua própria etapa.
  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;
    onSaveProgress({
      ...progress,
      version: 2,
      status: 'in_progress',
      step,
      lastSeenAt: new Date().toISOString(),
    });
    // A retomada é inicial; não deve reagir a cada mudança de etapa e sobrescrever pulos.
  }, []);

  const offeredPackages = useMemo(
    () => CATEGORY_PACKAGES.filter((pkg) => offeredPackageIds.includes(pkg.id)),
    [offeredPackageIds]
  );

  const toggleArea = (area: FocusArea) => {
    const next = focusAreas.includes(area)
      ? focusAreas.filter((a) => a !== area)
      : [...focusAreas, area];
    setFocusAreas(next);
    // Persistência incremental: não depende de clicar em Continuar.
    onChangePreferences({ focusAreas: next });
  };

  const applyPackage = (id: PackageId) => {
    if (appliedPackageIds.includes(id)) return;
    setAppliedPackageIds((prev) => [...prev, id]);
    // O pacote entra no catálogo na hora, sem duplicar categorias ou itens existentes.
    onApplyPackages([id]);
  };

  const recordStep = (target: number, skipped: boolean) => {
    const skippedSteps = skipped
      ? Array.from(new Set([...progress.skippedSteps, step])).sort()
      : progress.skippedSteps.filter((s) => s !== step);
    onSaveProgress({
      ...progress,
      version: 2,
      status: 'in_progress',
      step: target,
      skippedSteps,
      lastSeenAt: new Date().toISOString(),
    });
  };

  const goNext = () => {
    if (step === TOTAL_STEPS - 1) {
      onSaveProgress({
        ...progress,
        version: 2,
        status: 'completed',
        step: TOTAL_STEPS - 1,
        completedAt: new Date().toISOString(),
        lastSeenAt: new Date().toISOString(),
      });
      onFinish();
      return;
    }
    recordStep(step + 1, false);
    setStep(step + 1);
  };

  const skipStep = () => {
    recordStep(step === TOTAL_STEPS - 1 ? TOTAL_STEPS - 1 : step + 1, true);
    if (step === TOTAL_STEPS - 1) {
      onSaveProgress({
        ...progress,
        version: 2,
        status: 'completed',
        step: TOTAL_STEPS - 1,
        skippedSteps: Array.from(new Set([...progress.skippedSteps, step])).sort(),
        completedAt: new Date().toISOString(),
        lastSeenAt: new Date().toISOString(),
      });
      onFinish();
      return;
    }
    setStep(step + 1);
  };

  const skipAll = () => {
    onSaveProgress({
      ...progress,
      version: 2,
      status: 'completed',
      step: 0,
      skippedSteps: [0, 1, 2],
      completedAt: new Date().toISOString(),
      lastSeenAt: new Date().toISOString(),
    });
    onFinish();
  };

  const goBack = () => {
    if (step === 0) return;
    recordStep(step - 1, false);
    setStep(step - 1);
  };

  return (
    <div
      className="min-h-screen w-full flex flex-col"
      style={{ backgroundColor: 'var(--bg-canvas)', color: 'var(--text-primary)' }}
    >
      <header className="mx-auto w-full max-w-3xl px-4 sm:px-6 pt-6 sm:pt-10">
        <div className="flex items-center justify-between gap-4">
          <span
            className="text-xl font-bold tracking-tight font-display"
            style={{ color: 'var(--color-primary-strong)' }}
          >
            PulseTrack
          </span>
          <button
            type="button"
            onClick={skipAll}
            className="min-h-[44px] px-3 rounded-lg border text-sm font-medium cursor-pointer"
            style={{
              backgroundColor: 'var(--bg-surface)',
              borderColor: 'var(--border-hairline)',
              color: 'var(--text-secondary)',
            }}
          >
            Pular tudo
          </button>
        </div>

        <div className="mt-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
              Etapa {step + 1} de {TOTAL_STEPS}
            </span>
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
              Leva cerca de 2 minutos · dá para pular
            </span>
          </div>
          <div
            className="h-1.5 rounded-full overflow-hidden"
            style={{ backgroundColor: 'var(--border-hairline)' }}
            role="progressbar"
            aria-valuemin={1}
            aria-valuemax={TOTAL_STEPS}
            aria-valuenow={step + 1}
            aria-label="Progresso do onboarding"
          >
            <div
              className="h-full rounded-full"
              style={{
                width: `${((step + 1) / TOTAL_STEPS) * 100}%`,
                backgroundColor: 'var(--color-primary-strong)',
                transition: preferences.reduceMotion ? 'none' : 'width 220ms ease',
              }}
            />
          </div>
        </div>
      </header>

      <main className="flex-1 mx-auto w-full max-w-3xl px-4 sm:px-6 py-6 sm:py-8">
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">{STEP_TITLES[step]}</h1>

        {step === 0 && (
          <>
            <p className="mt-2 text-base" style={{ color: 'var(--text-secondary)' }}>
              Escolha quantas áreas quiser. Elas aparecem em destaque no início do registro, mas
              não escondem nenhum pilar — e podem mudar depois em Categorias.
            </p>
            <ul className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {FOCUS_AREA_OPTIONS.map((option) => {
                const active = focusAreas.includes(option.id);
                return (
                  <li key={option.id}>
                    <button
                      type="button"
                      onClick={() => toggleArea(option.id)}
                      aria-pressed={active}
                      className="w-full min-h-[60px] p-3.5 rounded-xl border text-left cursor-pointer"
                      style={chipStyle(active)}
                    >
                      <span className="flex items-center justify-between gap-2 text-sm font-semibold">
                        {option.label}
                        {active && <Check className="w-4 h-4 shrink-0" aria-hidden="true" />}
                      </span>
                      <span className="block text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                        {option.hint}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
            {focusAreas.length === 0 && (
              <p className="mt-3 text-sm" style={{ color: 'var(--text-muted)' }}>
                Nenhuma área escolhida: você pode seguir assim e ver tudo, ou pular esta etapa.
              </p>
            )}
          </>
        )}

        {step === 1 && (
          <>
            <p className="mt-2 text-base" style={{ color: 'var(--text-secondary)' }}>
              Pacotes são atalhos: ao tocar, eles ativam itens que já existem no catálogo, sem criar
              categoria nova nem mudar registros antigos. Você pode aplicar mais de um agora e
              ajustar tudo depois em Categorias.
            </p>
            {offeredPackages.length === 0 ? (
              <div className="mt-5 rounded-xl border p-4 text-sm" style={cardStyle}>
                Você já adicionou todos os pacotes. Nada novo para oferecer aqui — pode seguir.
              </div>
            ) : (
              <ul className="mt-5 space-y-2.5">
                {offeredPackages.map((pkg) => {
                  const active = appliedPackageIds.includes(pkg.id);
                  return (
                    <li key={pkg.id}>
                      <button
                        type="button"
                        onClick={() => applyPackage(pkg.id)}
                        aria-pressed={active}
                        className="w-full min-h-[64px] p-3.5 rounded-xl border text-left cursor-pointer"
                        style={chipStyle(active)}
                      >
                        <span className="flex items-center justify-between gap-2 text-sm font-semibold">
                          {pkg.name}
                          {active && <Check className="w-4 h-4 shrink-0" aria-hidden="true" />}
                        </span>
                        <span className="block text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                          {pkg.description}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
            <p className="mt-3 text-xs" style={{ color: 'var(--text-muted)' }}>
              A aplicação é imediata. Pacotes já adicionados não voltam a ser oferecidos.
            </p>
          </>
        )}

        {step === 2 && (
          <>
            <p className="mt-2 text-base" style={{ color: 'var(--text-secondary)' }}>
              Ajustes de ritmo e conforto. Tema e movimento ficam no topo do app; a profundidade
              também pode ser alterada depois na aba Categorias.
            </p>

            <div className="mt-5 space-y-5">
              <fieldset>
                <legend className="text-sm font-semibold mb-2">Nível padrão do registro</legend>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {LEVEL_OPTIONS.map((option) => {
                    const active = preferences.defaultRecordLevel === option.id;
                    return (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => onChangePreferences({ defaultRecordLevel: option.id })}
                        aria-pressed={active}
                        className="min-h-[64px] p-3 rounded-xl border text-left cursor-pointer"
                        style={chipStyle(active)}
                      >
                        <span className="text-sm font-semibold">{option.label}</span>
                        <span className="block text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                          {option.hint}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </fieldset>

              <fieldset>
                <legend className="text-sm font-semibold mb-2">Tema</legend>
                <div className="flex flex-wrap gap-2">
                  {[
                    { id: ThemeMode.LIGHT, label: 'Claro' },
                    { id: ThemeMode.DARK, label: 'Escuro' },
                    { id: ThemeMode.HIGH_CONTRAST, label: 'Alto contraste' },
                  ].map((theme) => {
                    const active = preferences.theme === theme.id;
                    return (
                      <button
                        key={theme.id}
                        type="button"
                        onClick={() => onChangePreferences({ theme: theme.id })}
                        aria-pressed={active}
                        className="min-h-[44px] px-4 rounded-lg border text-sm font-medium cursor-pointer"
                        style={chipStyle(active)}
                      >
                        {theme.label}
                      </button>
                    );
                  })}
                </div>
              </fieldset>

              <div className="rounded-xl border p-4" style={cardStyle}>
                <button
                  type="button"
                  onClick={() => onChangePreferences({ reduceMotion: !preferences.reduceMotion })}
                  aria-pressed={preferences.reduceMotion}
                  className="w-full min-h-[44px] flex items-center justify-between gap-3 text-left cursor-pointer"
                >
                  <span className="text-sm font-semibold">Reduzir movimento</span>
                  <span
                    className="text-xs font-medium px-2.5 py-1 rounded-full border"
                    style={{
                      backgroundColor: preferences.reduceMotion
                        ? 'var(--color-secondary-soft)'
                        : 'var(--bg-elevated)',
                      borderColor: preferences.reduceMotion
                        ? 'var(--color-secondary)'
                        : 'var(--border-hairline)',
                      color: 'var(--text-secondary)',
                    }}
                  >
                    {preferences.reduceMotion ? 'Ativo' : 'Desligado'}
                  </span>
                </button>
                <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
                  Remove animações de transição e rolagem suave.
                </p>
              </div>
            </div>
          </>
        )}

        <div className="mt-6 flex items-start gap-2.5 text-xs" style={{ color: 'var(--text-secondary)' }}>
          <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
          <span>
            O PulseTrack é uma ferramenta de auto-observação. As perguntas aqui não são um
            instrumento de rastreio e nada do que você responder indica diagnóstico.
          </span>
        </div>
      </main>

      <footer
        className="border-t"
        style={{ borderColor: 'var(--border-hairline)', backgroundColor: 'var(--bg-surface)' }}
      >
        <div className="mx-auto w-full max-w-3xl px-4 sm:px-6 py-3.5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={goBack}
              disabled={step === 0}
              className="min-h-[44px] px-3 rounded-lg border text-sm font-medium inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              style={{
                backgroundColor: 'var(--bg-elevated)',
                borderColor: 'var(--border-hairline)',
                color: 'var(--text-secondary)',
              }}
            >
              <ArrowLeft className="w-4 h-4" aria-hidden="true" />
              Voltar
            </button>
            <button
              type="button"
              onClick={skipStep}
              className="min-h-[44px] px-3 rounded-lg text-sm font-medium underline cursor-pointer"
              style={{ color: 'var(--text-secondary)' }}
            >
              Pular esta etapa
            </button>
          </div>
          <button
            type="button"
            onClick={goNext}
            className="min-h-[48px] px-5 rounded-xl text-sm font-semibold inline-flex items-center gap-2 cursor-pointer"
            style={{ backgroundColor: 'var(--color-primary-strong)', color: 'var(--color-primary-ink)' }}
          >
            {step === TOTAL_STEPS - 1 ? (
              <>
                <Sparkles className="w-4 h-4" aria-hidden="true" />
                Concluir
              </>
            ) : (
              <>
                Continuar
                <ArrowRight className="w-4 h-4" aria-hidden="true" />
              </>
            )}
          </button>
        </div>
      </footer>
    </div>
  );
};
