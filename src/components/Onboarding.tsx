import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, Check, ShieldCheck, Sparkles } from 'lucide-react';
import { FOCUS_AREA_OPTIONS, PROFILE_HINT_OPTIONS } from '../data/defaults';
import { CATEGORY_PACKAGES } from '../data/packages';
import {
  FocusArea,
  OnboardingProgress,
  PackageId,
  ProfileHint,
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
  'Como você se descreve?',
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
 * Onboarding em 4 telas, com salvamento a cada passo.
 *
 * Cada tela grava o que foi respondido ANTES de avançar; por isso fechar a aba no meio
 * não perde nada e a próxima abertura retoma na mesma tela. Pular é uma resposta válida
 * (a etapa entra em `skippedSteps` e não volta sozinha). Nada aqui é diagnóstico:
 * as escolhas só ajustam o que o app mostra primeiro.
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
  const [profileHint, setProfileHint] = useState<ProfileHint | null>(preferences.profileHint);
  const [selectedPackages, setSelectedPackages] = useState<PackageId[]>([]);

  // Marca a retomada no primeiro render da tela atual.
  useEffect(() => {
    onSaveProgress({
      ...progress,
      status: 'in_progress',
      step,
      lastSeenAt: new Date().toISOString(),
    });
    // Só a troca de tela deve gravar a retomada.
  }, [step]);

  const offeredPackages = useMemo(
    () => CATEGORY_PACKAGES.filter((pkg) => availablePackageIds.includes(pkg.id)),
    [availablePackageIds]
  );

  const toggleArea = (area: FocusArea) => {
    setFocusAreas((prev) => (prev.includes(area) ? prev.filter((a) => a !== area) : [...prev, area]));
  };

  const togglePackage = (id: PackageId) => {
    setSelectedPackages((prev) => (prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]));
  };

  const recordStep = (target: number, skipped: boolean) => {
    const skippedSteps = skipped
      ? Array.from(new Set([...progress.skippedSteps, step])).sort()
      : progress.skippedSteps.filter((s) => s !== step);
    onSaveProgress({
      ...progress,
      status: 'in_progress',
      step: target,
      skippedSteps,
      lastSeenAt: new Date().toISOString(),
    });
  };

  /** Grava a tela atual; `null` quando a pessoa pulou (nada é inventado). */
  const saveCurrentStep = () => {
    if (step === 0) {
      onChangePreferences({ focusAreas });
    } else if (step === 1) {
      onChangePreferences({ profileHint });
    } else if (step === 2) {
      if (selectedPackages.length > 0) onApplyPackages(selectedPackages);
    }
  };

  const goNext = () => {
    saveCurrentStep();
    if (step === TOTAL_STEPS - 1) {
      onSaveProgress({
        ...progress,
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
      status: 'completed',
      step: 0,
      skippedSteps: [0, 1, 2, 3],
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
              Escolha quantas áreas quiser. Isso só define o que aparece primeiro — não restringe
              nem fecha nenhum pilar, e pode mudar depois em Categorias.
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
              Opcional. Essa resposta fica só neste dispositivo e serve apenas como rascunho
              interno para ajustar a linguagem do app. Ela <strong>não</strong> é diagnóstico, não
              aparece em relatórios e não é enviada a ninguém.
            </p>
            <ul className="mt-5 grid grid-cols-1 gap-2.5">
              {PROFILE_HINT_OPTIONS.map((option) => {
                const active = profileHint === option.id;
                return (
                  <li key={option.id}>
                    <button
                      type="button"
                      onClick={() => setProfileHint(option.id)}
                      aria-pressed={active}
                      className="w-full min-h-[52px] px-4 rounded-xl border text-left text-sm font-medium flex items-center justify-between gap-3 cursor-pointer"
                      style={chipStyle(active)}
                    >
                      {option.label}
                      {active && <Check className="w-4 h-4 shrink-0" aria-hidden="true" />}
                    </button>
                  </li>
                );
              })}
            </ul>
            {profileHint && (
              <button
                type="button"
                onClick={() => setProfileHint(null)}
                className="mt-3 min-h-[44px] px-3 rounded-lg text-sm underline cursor-pointer"
                style={{ color: 'var(--text-secondary)' }}
              >
                Limpar resposta
              </button>
            )}
          </>
        )}

        {step === 2 && (
          <>
            <p className="mt-2 text-base" style={{ color: 'var(--text-secondary)' }}>
              Pacotes são atalhos: eles ativam itens que já existem no catálogo, sem criar
              categoria nova nem mudar registros antigos. Você pode marcar mais de um.
            </p>
            {offeredPackages.length === 0 ? (
              <div className="mt-5 rounded-xl border p-4 text-sm" style={cardStyle}>
                Você já adicionou todos os pacotes. Nada novo para oferecer aqui — pode seguir.
              </div>
            ) : (
              <ul className="mt-5 space-y-2.5">
                {offeredPackages.map((pkg) => {
                  const active = selectedPackages.includes(pkg.id);
                  return (
                    <li key={pkg.id}>
                      <button
                        type="button"
                        onClick={() => togglePackage(pkg.id)}
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
              Pacotes já adicionados não voltam a ser oferecidos.
            </p>
          </>
        )}

        {step === 3 && (
          <>
            <p className="mt-2 text-base" style={{ color: 'var(--text-secondary)' }}>
              Ajustes de ritmo e conforto. Tudo pode ser alterado depois na aba Categorias.
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

              <div className="rounded-xl border p-4" style={cardStyle}>
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={preferences.reminderOptIn}
                    onChange={(e) => onChangePreferences({ reminderOptIn: e.target.checked })}
                    className="mt-1 w-5 h-5 shrink-0"
                  />
                  <span>
                    <span className="block text-sm font-semibold">Quero um lembrete diário</span>
                    <span className="block text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                      Opcional. Guardamos horário e preferência neste dispositivo; o PulseTrack não
                      envia notificações automáticas.
                    </span>
                  </span>
                </label>
                {preferences.reminderOptIn && (
                  <div className="mt-3 flex items-center gap-2">
                    <label htmlFor="reminder-time" className="text-xs font-medium">
                      Horário
                    </label>
                    <input
                      id="reminder-time"
                      type="time"
                      value={preferences.reminderTime}
                      onChange={(e) => onChangePreferences({ reminderTime: e.target.value })}
                      className="min-h-[44px] px-3 rounded-lg border text-sm font-mono tabular-nums"
                      style={{
                        backgroundColor: 'var(--bg-elevated)',
                        borderColor: 'var(--border-strong)',
                        color: 'var(--text-primary)',
                      }}
                    />
                  </div>
                )}
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
