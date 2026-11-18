import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DEFAULT_PREFERENCES } from '../data/defaults';
import { OnboardingProgress, ThemeMode, UserPreferences } from '../types/pulsetrack';
import { Onboarding } from './Onboarding';

beforeEach(() => {
  localStorage.clear();
});

afterEach(cleanup);

const baseProgress: OnboardingProgress = {
  status: 'in_progress',
  step: 0,
  skippedSteps: [],
  completedAt: null,
  lastSeenAt: null,
};

function renderOnboarding(
  overrides: Partial<{
    progress: OnboardingProgress;
    preferences: UserPreferences;
    availablePackageIds: string[];
  }> = {}
) {
  const onSaveProgress = vi.fn();
  const onChangePreferences = vi.fn();
  const onApplyPackages = vi.fn();
  const onFinish = vi.fn();

  render(
    <Onboarding
      progress={overrides.progress ?? baseProgress}
      preferences={overrides.preferences ?? DEFAULT_PREFERENCES}
      availablePackageIds={
        (overrides.availablePackageIds ?? [
          'pkg_tdah',
          'pkg_bipolar',
          'pkg_compulsoes',
          'pkg_autismo_sensorial',
          'pkg_geral',
        ]) as never
      }
      onSaveProgress={onSaveProgress}
      onChangePreferences={onChangePreferences}
      onApplyPackages={onApplyPackages}
      onFinish={onFinish}
    />
  );

  return { onSaveProgress, onChangePreferences, onApplyPackages, onFinish };
}

describe('Onboarding', () => {
  it('retoma na tela salva', () => {
    renderOnboarding({ progress: { ...baseProgress, step: 2 } });

    expect(screen.getByRole('heading', { name: 'Ritmo e conforto' })).toBeTruthy();
    expect(screen.getByText('Etapa 3 de 3')).toBeTruthy();
  });

  it('salva a área de foco no clique, sem depender de continuar', async () => {
    const user = userEvent.setup();
    const { onChangePreferences, onSaveProgress } = renderOnboarding();

    await user.click(screen.getByRole('button', { name: /Humor e emoções/ }));

    expect(onChangePreferences).toHaveBeenCalledWith({ focusAreas: ['emocional'] });
    expect(onSaveProgress).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'in_progress', step: 0 })
    );

    await user.click(screen.getByRole('button', { name: /Continuar/ }));

    expect(onSaveProgress).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'in_progress', step: 1 })
    );
    expect(screen.getByRole('heading', { name: 'Pacotes de categorias' })).toBeTruthy();
  });

  it('pular a etapa não grava resposta inventada', async () => {
    const user = userEvent.setup();
    const { onChangePreferences, onSaveProgress } = renderOnboarding();

    await user.click(screen.getByRole('button', { name: 'Pular esta etapa' }));

    expect(onChangePreferences).not.toHaveBeenCalled();
    expect(onSaveProgress).toHaveBeenCalledWith(
      expect.objectContaining({ step: 1, skippedSteps: [0] })
    );
  });

  it('pular tudo conclui sem reabrir e sem aplicar pacote', async () => {
    const user = userEvent.setup();
    const { onSaveProgress, onApplyPackages, onFinish } = renderOnboarding();

    await user.click(screen.getByRole('button', { name: 'Pular tudo' }));

    expect(onSaveProgress).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'completed', skippedSteps: [0, 1, 2] })
    );
    expect(onApplyPackages).not.toHaveBeenCalled();
    expect(onFinish).toHaveBeenCalled();
  });

  it('não oferece pacote já aplicado', async () => {
    const user = userEvent.setup();
    const preferences: UserPreferences = {
      ...DEFAULT_PREFERENCES,
      packageIds: ['pkg_tdah', 'pkg_bipolar', 'pkg_compulsoes', 'pkg_autismo_sensorial'],
    };
    const { onApplyPackages } = renderOnboarding({
      progress: { ...baseProgress, step: 1 },
      preferences,
      availablePackageIds: ['pkg_geral'],
    });

    expect(screen.queryByRole('button', { name: /TDAH/ })).toBeNull();
    await user.click(screen.getByRole('button', { name: /Visão geral/ }));
    expect(screen.getByRole('button', { name: /Visão geral/ }).getAttribute('aria-pressed')).toBe(
      'true'
    );
    expect(onApplyPackages).toHaveBeenCalledWith(['pkg_geral']);
  });

  it('última tela grava conforto e conclui', async () => {
    const user = userEvent.setup();
    const { onChangePreferences, onFinish } = renderOnboarding({
      progress: { ...baseProgress, step: 2 },
    });

    expect(screen.queryByRole('checkbox', { name: /lembrete/i })).toBeNull();

    await user.click(screen.getByRole('button', { name: 'Escuro' }));
    await user.click(screen.getByRole('button', { name: /Concluir/ }));

    expect(onChangePreferences).toHaveBeenCalledWith({ theme: ThemeMode.DARK });
    expect(onFinish).toHaveBeenCalled();
  });

  it('não pergunta mais o perfil sem efeito funcional', () => {
    renderOnboarding();

    expect(screen.queryByText('Como você se descreve?')).toBeNull();
    expect(screen.getByText('Etapa 1 de 3')).toBeTruthy();
  });

  it('deixa claro que não é diagnóstico', () => {
    renderOnboarding();

    expect(screen.getByText(/nada do que você responder indica diagnóstico/i)).toBeTruthy();
  });
});
