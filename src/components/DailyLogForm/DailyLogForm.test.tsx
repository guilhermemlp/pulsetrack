import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { createDefaultCategories } from '../../data/defaults';
import { BehaviorMode, EntryType, MoodStateId, ThemeMode } from '../../types/pulsetrack';
import { DailyLogForm } from './index';

// O jsdom não implementa scrollIntoView, usado no alerta de validação.
beforeAll(() => {
  Element.prototype.scrollIntoView = () => {};
});

beforeEach(() => {
  // O rascunho automático vive no localStorage: isolar cada teste evita restaurar
  // respostas do caso anterior.
  localStorage.clear();
});

afterEach(() => {
  cleanup();
});

function renderForm(onSaveEntry = vi.fn()) {
  render(
    <DailyLogForm
      categories={createDefaultCategories()}
      editingEntry={null}
      focusMode={false}
      onToggleFocusMode={() => {}}
      onSaveEntry={onSaveEntry}
      onCancelEdit={() => {}}
      theme={ThemeMode.LIGHT}
      showSexualCategory={false}
      trackCycle={false}
    />
  );
  return onSaveEntry;
}

async function escolherMood(user: ReturnType<typeof userEvent.setup>, label: string) {
  await user.click(screen.getByRole('button', { name: label }));
}

describe('DailyLogForm', () => {
  it('renderiza os três pilares do registro diário', () => {
    renderForm();

    expect(screen.getByRole('heading', { name: 'Acompanhamento diário' })).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Como você estava se sentindo?' })).toBeTruthy();
    // Pilar 3 fica em modo "sem episódio" até o usuário declarar um episódio
    expect(screen.getByText(/sem episódio compulsivo neste registro/i)).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Salvar check-in diário' })).toBeTruthy();
  });

  it('exige pelo menos um estado emocional antes de salvar', async () => {
    const user = userEvent.setup();
    const onSaveEntry = renderForm();

    await user.click(screen.getByRole('button', { name: 'Salvar check-in diário' }));

    expect(screen.getByRole('alert').textContent).toMatch(/pelo menos um estado emocional/i);
    expect(onSaveEntry).not.toHaveBeenCalled();
  });

  it('salva um check-in diário sem comportamentos', async () => {
    const user = userEvent.setup();
    const onSaveEntry = renderForm();

    await escolherMood(user, 'Neutro');
    await user.click(screen.getByRole('button', { name: 'Salvar check-in diário' }));

    expect(onSaveEntry).toHaveBeenCalledTimes(1);
    const [entry, isEdit] = onSaveEntry.mock.calls[0];

    expect(isEdit).toBe(false);
    expect(entry.entryType).toBe(EntryType.DAILY_CHECKIN);
    expect(entry.moods).toEqual([MoodStateId.NEUTRO]);
    expect(entry.behaviors).toEqual([]);
    // Campos não respondidos permanecem null: nada é presumido no relatório.
    expect(entry.urgeIntensity).toBeNull();
    expect(entry.awareness).toBeNull();
    expect(entry.resisted).toBeNull();
    expect(entry.energyLevel).toBeNull();
    expect(entry.sleep.hours).toBeNull();
    expect(entry.sleep.quality).toBeNull();
    expect(entry.valence).toBeNull();
    expect(entry.stateDuration).toBeNull();
    expect(entry.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(entry.time).toMatch(/^\d{2}:\d{2}$/);
  });

  it('exige um comportamento quando o registro é declarado como episódio', async () => {
    const user = userEvent.setup();
    const onSaveEntry = renderForm();

    await escolherMood(user, 'Ansioso');
    await user.click(screen.getByRole('button', { name: /Episódio comportamental/ }));
    await user.click(screen.getByRole('button', { name: 'Salvar episódio' }));

    expect(screen.getByRole('alert').textContent).toMatch(/pelo menos um comportamento/i);
    expect(onSaveEntry).not.toHaveBeenCalled();
  });

  it('salva um episódio com o comportamento selecionado', async () => {
    const user = userEvent.setup();
    const onSaveEntry = renderForm();

    await escolherMood(user, 'Ansioso');
    await user.click(screen.getByRole('button', { name: /Episódio comportamental/ }));
    await user.click(screen.getByRole('button', { name: 'Compras impulsivas' }));
    await user.click(screen.getByRole('button', { name: 'Salvar episódio' }));
    expect(onSaveEntry).toHaveBeenCalledTimes(1);
    const [entry] = onSaveEntry.mock.calls[0];

    expect(entry.entryType).toBe(EntryType.EPISODE);
    expect(entry.behaviors).toHaveLength(1);
    expect(entry.behaviors[0]).toMatchObject({
      categoryId: 'cat_financeira',
      itemId: 'fin_compras',
      itemLabel: 'Compras impulsivas',
      mode: BehaviorMode.FEITO,
    });
  });

  it('separa impulso contido de comportamento realizado', async () => {
    const user = userEvent.setup();
    const onSaveEntry = renderForm();

    await escolherMood(user, 'Ansioso');
    await user.click(screen.getByRole('button', { name: /Episódio comportamental/ }));
    await user.click(screen.getByRole('button', { name: 'Compras impulsivas' }));
    await user.click(
      screen.getByRole('button', { name: 'Compras impulsivas: Só o impulso' })
    );
    await user.click(screen.getByRole('button', { name: 'Salvar episódio' }));

    const [entry] = onSaveEntry.mock.calls[0];
    expect(entry.behaviors[0].mode).toBe(BehaviorMode.IMPULSO);
  });
});
