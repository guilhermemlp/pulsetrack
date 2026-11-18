import { render, screen, cleanup, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { createDefaultCategories, MOOD_DEFINITIONS } from '../../data/defaults';
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
  onCreateBehaviorItem?: (categoryId: string, label: string) => { id: string; label: string } | null;
  onSaveAndCompleteLater?: (entry: unknown, isEdit: boolean, nextLevel: RecordLevel) => void;
  entries?: PulseEntry[];
}

function renderForm(onSaveEntry = vi.fn(), options: RenderOptions = {}) {
  const onCreateBehaviorItem =
    options.onCreateBehaviorItem ??
    vi.fn((categoryId: string, label: string) => ({ id: `novo_${categoryId}`, label }));

  render(
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
      reduceMotion={false}
      onCreateBehaviorItem={onCreateBehaviorItem}
      onSaveAndCompleteLater={options.onSaveAndCompleteLater ?? (() => {})}
      onDraftChange={() => {}}
    />
  );
  return { onSaveEntry, onCreateBehaviorItem };
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
    expect(screen.queryByText(/sem episódio compulsivo neste registro/i)).toBeNull();
    expect(screen.getByRole('button', { name: 'Salvar check-in rápido' })).toBeTruthy();
  });

  it('respeita a profundidade padrão vinda das preferências', () => {
    renderForm(vi.fn(), { defaultRecordLevel: 'padrao' });

    expect(screen.getByRole('button', { name: 'Salvar check-in detalhado' })).toBeTruthy();
    expect(screen.getByText(/sem episódio compulsivo neste registro/i)).toBeTruthy();
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

  it('exige pelo menos um estado emocional e mostra o erro dentro da MoodSection', async () => {
    const user = userEvent.setup();
    const { onSaveEntry } = renderForm();

    await user.click(screen.getByRole('button', { name: 'Salvar check-in rápido' }));

    const alert = screen.getByRole('alert');
    expect(alert.textContent).toMatch(/pelo menos um estado emocional/i);
    // O erro nasce junto ao campo: foco no primeiro chip de humor.
    expect(document.activeElement).toBe(
      screen.getByRole('button', { name: MOOD_DEFINITIONS[0].label })
    );
    expect(onSaveEntry).not.toHaveBeenCalled();
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
    await user.click(screen.getByRole('button', { name: /Episódio comportamental/ }));
    await user.click(screen.getByRole('button', { name: 'Salvar episódio' }));

    expect(screen.getByRole('alert').textContent).toMatch(/pelo menos um comportamento/i);
    expect(onSaveEntry).not.toHaveBeenCalled();
  });

  it('não seleciona um comportamento sem escolher entre impulso e ação', async () => {
    const user = userEvent.setup();
    const { onSaveEntry } = renderForm();

    await escolherMood(user, 'Ansioso');
    await user.click(screen.getByRole('button', { name: /Episódio comportamental/ }));
    await user.click(screen.getByRole('button', { name: 'Compras impulsivas' }));
    // Os chips aparecem, mas nada foi adicionado ao registro ainda.
    expect(
      screen.getByRole('button', { name: 'Compras impulsivas: Fiz' })
    ).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'Salvar episódio' }));

    expect(screen.getByRole('alert').textContent).toMatch(/pelo menos um comportamento/i);
    expect(onSaveEntry).not.toHaveBeenCalled();
  });

  it('salva um episódio com o comportamento selecionado', async () => {
    const user = userEvent.setup();
    const { onSaveEntry } = renderForm();

    await escolherMood(user, 'Ansioso');
    await user.click(screen.getByRole('button', { name: /Episódio comportamental/ }));
    await user.click(screen.getByRole('button', { name: 'Compras impulsivas' }));
    await user.click(screen.getByRole('button', { name: 'Compras impulsivas: Fiz' }));
    await user.click(screen.getByRole('button', { name: 'Salvar episódio' }));
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
    await user.click(screen.getByRole('button', { name: /Episódio comportamental/ }));
    await user.click(screen.getByRole('button', { name: 'Compras impulsivas' }));
    await user.click(
      screen.getByRole('button', { name: 'Compras impulsivas: Só o impulso' })
    );
    await user.click(screen.getByRole('button', { name: 'Salvar episódio' }));

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
    await user.click(screen.getByRole('button', { name: /Episódio comportamental/ }));
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
});
