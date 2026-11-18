import { beforeEach, describe, expect, it } from 'vitest';
import { loadOnboardingProgress, saveOnboardingProgress } from './storage';

beforeEach(() => {
  localStorage.clear();
});

describe('progresso do onboarding', () => {
  it('começa não iniciado quando não há nada salvo', () => {
    expect(loadOnboardingProgress().status).toBe('not_started');
  });

  it('retoma na tela onde parou', () => {
    saveOnboardingProgress({
      status: 'in_progress',
      step: 2,
      skippedSteps: [0],
      completedAt: null,
      lastSeenAt: '2026-11-17T10:00:00.000Z',
    });

    const progress = loadOnboardingProgress();
    expect(progress.status).toBe('in_progress');
    expect(progress.step).toBe(2);
    expect(progress.skippedSteps).toEqual([0]);
  });

  it('migra o progresso antigo de 4 telas para as 3 telas atuais', () => {
    localStorage.setItem(
      'pulsetrack_onboarding_v1',
      JSON.stringify({
        status: 'in_progress',
        step: 3,
        skippedSteps: [1, 2, 3],
        completedAt: null,
        lastSeenAt: '2026-11-17T10:00:00.000Z',
      })
    );

    const progress = loadOnboardingProgress();

    expect(progress.version).toBe(2);
    expect(progress.step).toBe(2);
    expect(progress.skippedSteps).toEqual([1, 2]);
  });

  it('concluído permanece concluído (não reabre sozinho)', () => {
    saveOnboardingProgress({
      status: 'completed',
      step: 3,
      skippedSteps: [1],
      completedAt: '2026-11-17T10:10:00.000Z',
      lastSeenAt: '2026-11-17T10:10:00.000Z',
    });

    expect(loadOnboardingProgress().status).toBe('completed');
    expect(loadOnboardingProgress().completedAt).toBe('2026-11-17T10:10:00.000Z');
  });

  it('ignora passo fora do intervalo e status desconhecido', () => {
    localStorage.setItem(
      'pulsetrack_onboarding_v1',
      JSON.stringify({ status: 'whatever', step: 99, skippedSteps: ['x'] })
    );

    const progress = loadOnboardingProgress();
    expect(progress.status).toBe('not_started');
    expect(progress.step).toBe(0);
  });
});
