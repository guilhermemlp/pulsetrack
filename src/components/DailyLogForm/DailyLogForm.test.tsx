import { render, screen, cleanup, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { createDefaultCategories } from '../../data/defaults';
import {
  BehaviorMode,
  EntryType,
  MoodStateId,
  PulseEntry,
  RecordLevel,
  ThemeMode,
} from '../../types/pulsetrack';
import { normalizeEntry } from '../../utils/storage';
import { toLocalIsoDate } from '../../utils/analytics';
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

interface RenderOptions {
  defaultRecordLevel?: RecordLevel;
  focusAreas?: Array<'emocional' | 'ativacao' | 'sono' | 'comportamentos' | 'gatilhos' | 'medicacao' | 'ciclo' | 'seguranca'>;
  onCreateBehaviorItem?: (categoryId: string, label: string) => { id: string; label: string } | null;
  onSaveAndCompleteLater?: (entry: unknown, isEdit: boolean, nextLevel: RecordLevel) => void;
  entries?: PulseEntry[];
}

function renderForm(onSaveEntry = vi.fn(), options: RenderOptions = {}) {
  const onCreateBehaviorItem =
    options.onCreateBehaviorItem ??
    vi.fn((categoryId: string, label: string) => ({ id: `novo_${categoryId}`, label }));

  const view = render(
    <DailyLogForm
      categories={createDefaultCategories()}
      entries={options.entries ?? []}
      editingEntry={null}
      focusMode={false}
      onToggleFocusMode={() => {}}
      onSaveEntry={onSaveEntry}
      onCancelEdit={() => {}}
      theme={ThemeMode.LIGHT}
      showSexualCategory={false}
      trackCycle={false}
      defaultRecordLevel={options.defaultRecordLevel ?? 'rapido'}
      focusAreas={options.focusAreas ?? []}
      reduceMotion={false}
      onCreateBehaviorItem={onCreateBehaviorItem}
      onSaveAndCompleteLater={options.onSaveAndCompleteLater ?? (() => {})}
      onDraftChange={() => {}}
    />
  );
  return { onSaveEntry, onCreateBehaviorItem, unmount: view.unmount };
}

async function escolherMood(user: ReturnType<typeof userEvent.setup>, label: string) {
  await user.click(screen.getByRole('button', { name: label }));
}

describe('DailyLogForm', () => {
  it('renderiza os três pilares do registro diário no nível rápido', () => {
    renderForm();

    expect(screen.getByRole('heading', { name: 'Acompanhamento diário' })).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Como você estava se sentindo?' })).toBeTruthy();
    // No rápido o Pilar 3 é uma única pergunta, não o catálogo inteiro.
    expect(screen.getByRole('heading', { name: 'Teve algum impulso hoje?' })).toBeTruthy();
    expect(screen.queryByText(/nenhum comportamento registrado neste check-in/i)).toBeNull();
    expect(screen.getByRole('button', { name: 'Salvar check-in rápido' })).toBeTruthy();
  });

  it('respeita a profundidade padrão vinda das preferências', () => {
    renderForm(vi.fn(), { defaultRecordLevel: 'padrao' });

    expect(screen.getByRole('button', { name: 'Salvar check-in detalhado' })).toBeTruthy();
    expect(screen.getByText(/nenhum comportamento registrado neste check-in/i)).toBeTruthy();
  });

  it('no nível padrão os pilares viram seções recolhíveis com resumo', async () => {
    const user = userEvent.setup();
    renderForm(vi.fn(), { defaultRecordLevel: 'padrao' });

    const header = screen.getByRole('button', { name: /Pilar 1 · Estado emocional/ });
    expect(header.getAttribute('aria-expanded')).toBe('true');
    expect(header.textContent).toContain('0 de 3 campos respondidos');

    await escolherMood(user, 'Ansioso');
    expect(header.textContent).toContain('1 de 3 campos respondidos');

    await user.click(header);
    expect(header.getAttribute('aria-expanded')).toBe('false');
    expect(screen.queryByRole('heading', { name: 'Como você estava se sentindo?' })).toBeNull();
    expect(screen.getByRole('list', { name: /Resumo de Pilar 1/ }).textContent).toContain(
      'Ansioso'
    );
  });

  it('troca de nível sem perder o que já foi respondido', async () => {
    const user = userEvent.setup();
    renderForm();

    await escolherMood(user, 'Neutro');
    await user.click(screen.getByRole('button', { name: 'Padrão' }));

    expect(screen.getByRole('button', { name: 'Salvar check-in detalhado' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Neutro' }).getAttribute('aria-pressed')).toBe(
      'true'
    );

    // Voltar ao rápido não apaga a resposta e o rótulo de salvar acompanha o nível.
    await user.click(screen.getByRole('button', { name: 'Rápido' }));
    expect(screen.getByRole('button', { name: 'Salvar check-in rápido' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Neutro' }).getAttribute('aria-pressed')).toBe(
      'true'
    );
  });

  it('grava a profundidade usada no registro', async () => {
    const user = userEvent.setup();
    const { onSaveEntry } = renderForm(vi.fn(), { defaultRecordLevel: 'padrao' });

    await escolherMood(user, 'Neutro');
    await user.click(screen.getByRole('button', { name: 'Salvar check-in detalhado' }));

    const [entry] = onSaveEntry.mock.calls[0];
    expect(entry.depth).toBe('padrao');
  });

  it('salva sem humor e mantém a ausência como vazio, sem preencher "Neutro"', async () => {
    const user = userEvent.setup();
    const { onSaveEntry } = renderForm();

    await user.click(screen.getByRole('button', { name: 'Salvar check-in rápido' }));

    expect(onSaveEntry).toHaveBeenCalledTimes(1);
    const [entry] = onSaveEntry.mock.calls[0];
    expect(entry.moods).toEqual([]);
    expect(entry.moodIntensity).toEqual({});
  });

  it('salva um check-in diário sem comportamentos', async () => {
    const user = userEvent.setup();
    const { onSaveEntry } = renderForm();

    await escolherMood(user, 'Neutro');
    await user.click(screen.getByRole('button', { name: 'Salvar check-in rápido' }));

    expect(onSaveEntry).toHaveBeenCalledTimes(1);
    const [entry, isEdit] = onSaveEntry.mock.calls[0];

    expect(isEdit).toBe(false);
    expect(entry.entryType).toBe(EntryType.DAILY_CHECKIN);
    expect(entry.depth).toBe('rapido');
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

  it('oferece salvar e completar depois, reabrindo um nível acima', async () => {
    const user = userEvent.setup();
    const onSaveAndCompleteLater = vi.fn();
    const { onSaveEntry } = renderForm(vi.fn(), { onSaveAndCompleteLater });

    await escolherMood(user, 'Neutro');
    await user.click(screen.getByRole('button', { name: 'Salvar e completar depois' }));

    expect(onSaveEntry).not.toHaveBeenCalled();
    expect(onSaveAndCompleteLater).toHaveBeenCalledTimes(1);
    const [entry, isEdit, nextLevel] = onSaveAndCompleteLater.mock.calls[0];
    expect(entry.depth).toBe('rapido');
    expect(isEdit).toBe(false);
    expect(nextLevel).toBe('padrao');
  });

  it('exige um comportamento quando o registro é declarado como episódio', async () => {
    const user = userEvent.setup();
    const { onSaveEntry } = renderForm();

    await escolherMood(user, 'Ansioso');
    await user.click(screen.getByRole('button', { name: /Comportamento \(ação ou impulso\)/ }));
    await user.click(screen.getByRole('button', { name: 'Salvar registro de comportamento' }));

    expect(screen.getByRole('alert').textContent).toMatch(/pelo menos um comportamento/i);
    expect(onSaveEntry).not.toHaveBeenCalled();
  });

  it('não seleciona um comportamento sem escolher entre impulso e ação', async () => {
    const user = userEvent.setup();
    const { onSaveEntry } = renderForm();

    await escolherMood(user, 'Ansioso');
    await user.click(screen.getByRole('button', { name: /Comportamento \(ação ou impulso\)/ }));
    await user.click(screen.getByRole('button', { name: 'Compras impulsivas' }));
    // Os chips aparecem, mas nada foi adicionado ao registro ainda.
    expect(
      screen.getByRole('button', { name: 'Compras impulsivas: Fiz' })
    ).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'Salvar registro de comportamento' }));

    expect(screen.getByRole('alert').textContent).toMatch(/pelo menos um comportamento/i);
    expect(onSaveEntry).not.toHaveBeenCalled();
  });

  it('salva um episódio com o comportamento selecionado', async () => {
    const user = userEvent.setup();
    const { onSaveEntry } = renderForm();

    await escolherMood(user, 'Ansioso');
    await user.click(screen.getByRole('button', { name: /Comportamento \(ação ou impulso\)/ }));
    await user.click(screen.getByRole('button', { name: 'Compras impulsivas' }));
    await user.click(screen.getByRole('button', { name: 'Compras impulsivas: Fiz' }));
    await user.click(screen.getByRole('button', { name: 'Salvar registro de comportamento' }));
    expect(onSaveEntry).toHaveBeenCalledTimes(1);
    const [entry] = onSaveEntry.mock.calls[0];

    expect(entry.entryType).toBe(EntryType.EPISODE);
    expect(entry.depth).toBe('padrao');
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
    const { onSaveEntry } = renderForm();

    await escolherMood(user, 'Ansioso');
    await user.click(screen.getByRole('button', { name: /Comportamento \(ação ou impulso\)/ }));
    await user.click(screen.getByRole('button', { name: 'Compras impulsivas' }));
    await user.click(
      screen.getByRole('button', { name: 'Compras impulsivas: Só o impulso' })
    );
    await user.click(screen.getByRole('button', { name: 'Salvar registro de comportamento' }));

    const [entry] = onSaveEntry.mock.calls[0];
    expect(entry.behaviors[0].mode).toBe(BehaviorMode.IMPULSO);
    // Prejuízo só é oferecido para o que aconteceu de fato.
    expect(entry.behaviors[0].harm).toBe(false);
  });

  it('registra a resposta "Não" no portão rápido e permite corrigir', async () => {
    const user = userEvent.setup();
    renderForm();

    await escolherMood(user, 'Ansioso');
    const impulseSection = screen
      .getByRole('heading', { name: 'Teve algum impulso hoje?' })
      .closest('section') as HTMLElement;
    await user.click(within(impulseSection).getByRole('button', { name: 'Não' }));

    expect(screen.getByText(/sem impulso registrado/i)).toBeTruthy();
    expect(screen.queryByRole('heading', { name: 'Teve algum impulso hoje?' })).toBeNull();

    await user.click(screen.getByRole('button', { name: 'Na verdade, houve impulso' }));
    expect(screen.getByRole('button', { name: 'Compras impulsivas' })).toBeTruthy();
  });

  it('permite impulso contido em um check-in diário', async () => {
    const user = userEvent.setup();
    const { onSaveEntry } = renderForm();

    await escolherMood(user, 'Ansioso');
    // "Sim" também existe no marcador de sono: restringe ao Pilar 3.
    const impulseSection = screen
      .getByRole('heading', { name: 'Teve algum impulso hoje?' })
      .closest('section') as HTMLElement;
    await user.click(within(impulseSection).getByRole('button', { name: 'Sim' }));
    await user.click(screen.getByRole('button', { name: 'Compras impulsivas' }));
    await user.click(
      screen.getByRole('button', { name: 'Compras impulsivas: Só o impulso' })
    );
    await user.click(screen.getByRole('button', { name: 'Salvar check-in rápido' }));

    const [entry] = onSaveEntry.mock.calls[0];
    expect(entry.entryType).toBe(EntryType.DAILY_CHECKIN);
    expect(entry.behaviors).toHaveLength(1);
    expect(entry.behaviors[0].mode).toBe(BehaviorMode.IMPULSO);
  });

  it('cria um item dentro do Pilar 3 e o deixa pronto para escolher o modo', async () => {
    const user = userEvent.setup();
    const onCreateBehaviorItem = vi.fn((_categoryId: string, label: string) => ({
      id: 'item_novo',
      label,
    }));
    renderForm(vi.fn(), { onCreateBehaviorItem });

    await escolherMood(user, 'Ansioso');
    await user.click(screen.getByRole('button', { name: /Comportamento \(ação ou impulso\)/ }));
    await user.click(screen.getByRole('button', { name: 'Criar item em Financeira' }));
    await user.type(screen.getByPlaceholderText('Novo item em Financeira'), 'Gastos por impulso');
    await user.click(screen.getByRole('button', { name: 'Criar e usar' }));

    expect(onCreateBehaviorItem).toHaveBeenCalledWith('cat_financeira', 'Gastos por impulso');
    expect(screen.getByRole('status').textContent).toMatch(/criado/i);
  });

  it('mostra os últimos usados (incluindo impulso) e reaplica o modo da última vez', async () => {
    const user = userEvent.setup();
    renderForm(vi.fn(), {
      entries: [
        normalizeEntry({
          id: 'recente',
          date: toLocalIsoDate(new Date()),
          time: '09:00',
          entryType: EntryType.EPISODE,
          moods: [MoodStateId.ANSIOSO],
          behaviors: [
            {
              categoryId: 'cat_financeira',
              categoryName: 'Financeira',
              itemId: 'fin_compras',
              itemLabel: 'Compras impulsivas',
              mode: BehaviorMode.IMPULSO,
              harm: false,
            },
          ],
        } as Partial<PulseEntry>),
      ],
    });

    expect(screen.getByText('Últimos usados (14 dias)').textContent).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'Compras impulsivas (impulso) — usar de novo' }));

    expect(
      screen.getByRole('button', { name: 'Remover Compras impulsivas (impulso)' })
    ).toBeTruthy();
  });

  it('abre a busca de comportamentos com o atalho /', async () => {
    const user = userEvent.setup();
    renderForm();

    // "Sim" também existe no marcador de sono: restringe ao Pilar 3.
    const impulseSection = screen
      .getByRole('heading', { name: 'Teve algum impulso hoje?' })
      .closest('section') as HTMLElement;
    await user.click(within(impulseSection).getByRole('button', { name: 'Sim' }));

    const search = screen.getByLabelText('Buscar comportamento') as HTMLInputElement;
    search.blur();
    await user.keyboard('/');

    expect(document.activeElement).toBe(search);
  });

  it('mostra o horário do rascunho salvo automaticamente', async () => {
    const user = userEvent.setup();
    renderForm();

    await escolherMood(user, 'Ansioso');

    expect(screen.getByText(/Rascunho salvo às \d{2}:\d{2}/)).toBeTruthy();
  });

  describe('restauração de rascunho', () => {
    const DRAFT_KEY = 'pulsetrack_form_draft_v1';

    it('recupera humor, intensidade, energia e observações após recarregar', async () => {
      const user = userEvent.setup();
      const first = renderForm(vi.fn(), { defaultRecordLevel: 'padrao' });

      await escolherMood(user, 'Ansioso');
      fireEvent.change(screen.getByLabelText('Intensidade de Ansioso'), {
        target: { value: '8' },
      });
      fireEvent.change(screen.getByLabelText(/Nível de energia física e mental/), {
        target: { value: '3' },
      });
      await user.type(
        screen.getByPlaceholderText(/Qualquer detalhe que ajude você/),
        'dormi mal e acordei acelerado'
      );

      expect(localStorage.getItem(DRAFT_KEY)).not.toBeNull();
      first.unmount();

      renderForm(vi.fn(), { defaultRecordLevel: 'padrao' });

      expect(
        screen.getByText(/Rascunho do seu último registro foi restaurado/)
      ).toBeTruthy();
      expect(screen.getByRole('button', { name: 'Ansioso' }).getAttribute('aria-pressed')).toBe(
        'true'
      );
      expect((screen.getByLabelText('Intensidade de Ansioso') as HTMLInputElement).value).toBe(
        '8'
      );
      expect(
        (screen.getByLabelText(/Nível de energia física e mental/) as HTMLInputElement).value
      ).toBe('3');
      expect(
        (screen.getByPlaceholderText(/Qualquer detalhe que ajude você/) as HTMLTextAreaElement)
          .value
      ).toBe('dormi mal e acordei acelerado');
    });

    it('preserva o tipo episódio, o nível e os comportamentos escolhidos', async () => {
      const user = userEvent.setup();
      const first = renderForm();

      await escolherMood(user, 'Ansioso');
      await user.click(
        screen.getByRole('button', { name: /Comportamento.*ação ou impulso/ })
      );
      await user.click(screen.getByRole('button', { name: 'Compras impulsivas' }));
      await user.click(screen.getByRole('button', { name: 'Compras impulsivas: Fiz' }));
      first.unmount();

      renderForm();

      expect(screen.getByRole('button', { name: /^Comportamento: ação ou impulso/ })
          .getAttribute('aria-pressed')
      ).toBe('true');
      expect(screen.getByRole('button', { name: 'Salvar registro de comportamento' })).toBeTruthy();
      expect(
        screen.getByRole('button', { name: 'Remover Compras impulsivas (fiz)' })
      ).toBeTruthy();
    });

    it('preserva a resposta "Não" do portão de impulso', async () => {
      const user = userEvent.setup();
      const first = renderForm();

      await escolherMood(user, 'Ansioso');
      const impulseSection = screen
        .getByRole('heading', { name: 'Teve algum impulso hoje?' })
        .closest('section') as HTMLElement;
      await user.click(within(impulseSection).getByRole('button', { name: 'Não' }));
      first.unmount();

      renderForm();

      expect(screen.getByText(/sem impulso registrado/i)).toBeTruthy();
    });

    it('preserva a profundidade escolhida manualmente', async () => {
      const user = userEvent.setup();
      const first = renderForm();

      await escolherMood(user, 'Neutro');
      await user.click(screen.getByRole('button', { name: 'Padrão' }));
      first.unmount();

      renderForm();

      expect(screen.getByRole('button', { name: 'Salvar check-in detalhado' })).toBeTruthy();
    });

    it('reconhece e mantém um rascunho com apenas a intensidade de um humor', async () => {
      localStorage.setItem(
        DRAFT_KEY,
        JSON.stringify({
          savedAt: new Date().toISOString(),
          payload: { moodIntensity: { ansioso: 7 } },
        })
      );

      renderForm();

      expect(
        screen.getByText(/Rascunho do seu último registro foi restaurado/)
      ).toBeTruthy();
      await waitFor(() => expect(localStorage.getItem(DRAFT_KEY)).not.toBeNull());
    });

    it('reconhece e mantém um rascunho com apenas um campo de sono', async () => {
      localStorage.setItem(
        DRAFT_KEY,
        JSON.stringify({
          savedAt: new Date().toISOString(),
          payload: { sleepHours: 6 },
        })
      );

      renderForm();

      expect(
        screen.getByText(/Rascunho do seu último registro foi restaurado/)
      ).toBeTruthy();
      await waitFor(() => expect(localStorage.getItem(DRAFT_KEY)).not.toBeNull());
    });

    it('não apaga o rascunho quando a persistência final falha', async () => {
      const user = userEvent.setup();
      const onSaveEntry = vi.fn(() => false);
      renderForm(onSaveEntry);

      await escolherMood(user, 'Ansioso');
      await user.click(screen.getByRole('button', { name: 'Salvar check-in rápido' }));

      expect(onSaveEntry).toHaveBeenCalledTimes(1);
      expect(localStorage.getItem(DRAFT_KEY)).not.toBeNull();
      expect(screen.getByRole('button', { name: 'Ansioso' }).getAttribute('aria-pressed')).toBe(
        'true'
      );
    });

    it('remove o rascunho somente após salvar com sucesso', async () => {
      const user = userEvent.setup();
      renderForm();

      await escolherMood(user, 'Ansioso');
      expect(localStorage.getItem(DRAFT_KEY)).not.toBeNull();

      await user.click(screen.getByRole('button', { name: 'Salvar check-in rápido' }));

      expect(localStorage.getItem(DRAFT_KEY)).toBeNull();
    });
  });
});

describe('DailyLogForm — foco do onboarding', () => {
  it('destaca as áreas escolhidas sem esconder os pilares', () => {
    renderForm(vi.fn(), { focusAreas: ['sono', 'comportamentos'] });

    const focus = screen.getByRole('region', { name: 'Seu foco inicial' });
    expect(within(focus).getByText('Sono')).toBeTruthy();
    expect(within(focus).getByText('Comportamentos')).toBeTruthy();
    expect(within(focus).getByText(/nenhum pilar foi escondido/i)).toBeTruthy();
    expect(screen.getByText(/Pilar 1 · Estado emocional/)).toBeTruthy();
    expect(screen.getByText(/Pilar 2 · Estado de ativação e sono/)).toBeTruthy();
    expect(screen.getByText(/Pilar 3 · Comportamento/)).toBeTruthy();
  });
});
