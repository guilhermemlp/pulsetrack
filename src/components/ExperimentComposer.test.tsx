import { useState } from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ExperimentComposer } from './ExperimentComposer';

afterEach(cleanup);

function Harness() {
  const [open, setOpen] = useState(false);
  const onCreate = vi.fn();

  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        Abrir composição
      </button>
      {open && (
        <ExperimentComposer
          initialHypothesis="A vontade aumenta quando durmo pouco"
          initialMetric="urge"
          onCancel={() => setOpen(false)}
          onCreate={onCreate}
        />
      )}
    </>
  );
}

describe('ExperimentComposer — diálogo acessível', () => {
  it('foca o campo inicial e expõe nome e descrição', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.click(screen.getByRole('button', { name: 'Abrir composição' }));

    const dialog = screen.getByRole('dialog', { name: 'Investigar isso' });
    expect(dialog.getAttribute('aria-modal')).toBe('true');
    expect(dialog.getAttribute('aria-describedby')).toBe('experiment-composer-description');
    expect(screen.getByLabelText('O que você quer observar?')).toBe(document.activeElement);
  });

  it('não fecha com Escape depois de alterar o texto e devolve o foco ao cancelar', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    const trigger = screen.getByRole('button', { name: 'Abrir composição' });
    await user.click(trigger);
    await user.type(screen.getByLabelText('O que você quer observar?'), ' com mais contexto');

    await user.keyboard('{Escape}');
    expect(screen.getByRole('dialog')).toBeTruthy();

    await user.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(trigger).toBe(document.activeElement);
  });
});
