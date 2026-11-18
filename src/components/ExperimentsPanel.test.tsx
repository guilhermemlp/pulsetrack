import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BehaviorMode, EntryType, PulseEntry } from '../types/pulsetrack';
import { createExperiment } from '../utils/experiments';
import { ExperimentsPanel } from './ExperimentsPanel';

afterEach(cleanup);

function urgeEntry(id: string, date: string, urge: number): PulseEntry {
  return {
    id,
    entryType: EntryType.EPISODE,
    date,
    time: '20:00',
    createdAt: `${date}T20:00:00`,
    behaviors: [
      {
        categoryId: 'cat_financeira',
        categoryName: 'Financeira',
        itemId: 'fin_compras',
        itemLabel: 'Compras impulsivas',
        mode: BehaviorMode.FEITO,
        harm: false,
      },
    ],
    urgeIntensity: urge,
  } as unknown as PulseEntry;
}

const experiment = createExperiment({
  hypothesis: 'A vontade aumenta quando durmo pouco',
  metric: 'urge',
  startDate: '2026-11-08',
  endDate: '2026-11-14',
});

describe('ExperimentsPanel', () => {
  it('mostra a comparação das duas janelas sem sugerir conclusão', () => {
    render(
      <ExperimentsPanel
        experiments={[experiment]}
        entries={[urgeEntry('a', '2026-11-09', 8)]}
        onCloseExperiment={() => {}}
      />
    );

    expect(screen.getByText('A vontade aumenta quando durmo pouco')).toBeTruthy();
    expect(screen.getByText('Durante a janela')).toBeTruthy();
    expect(screen.getByText('Janela anterior')).toBeTruthy();
    expect(screen.getAllByText(/informado em 1 de 1 registro/).length).toBeGreaterThan(0);
    expect(screen.queryByText(/apareceu diferença/i)).toBeNull();
  });

  it('encerra com uma das três saídas e devolve a nota', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(
      <ExperimentsPanel
        experiments={[experiment]}
        entries={[urgeEntry('a', '2026-11-09', 8)]}
        onCloseExperiment={onClose}
      />
    );

    await user.click(screen.getByRole('button', { name: /Encerrar e registrar conclusão/ }));

    expect(screen.getByLabelText(/Apareceu diferença/)).toBeTruthy();
    expect(screen.getByLabelText(/Não apareceu diferença/)).toBeTruthy();
    expect(screen.getByLabelText(/Dados insuficientes/)).toBeTruthy();

    await user.click(screen.getByLabelText(/Não apareceu diferença/));
    await user.type(screen.getByLabelText(/Observação/), 'Sem mudança perceptível.');
    await user.click(screen.getByRole('button', { name: 'Registrar conclusão' }));

    expect(onClose).toHaveBeenCalledWith(experiment.id, 'no_difference', 'Sem mudança perceptível.');
  });
});
