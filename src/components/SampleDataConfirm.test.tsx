import React, { useState } from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SampleDataConfirm } from './SampleDataConfirm';

function renderDialog(overrides: Partial<React.ComponentProps<typeof SampleDataConfirm>> = {}) {
  const props: React.ComponentProps<typeof SampleDataConfirm> = {
    entriesCount: 3,
    sampleCount: 14,
    categoriesCount: 4,
    experimentsCount: 2,
    error: '',
    onDownloadBackup: vi.fn(),
    onConfirm: vi.fn(),
    onCancel: vi.fn(),
    ...overrides,
  };

  render(<SampleDataConfirm {...props} />);
  return props;
}

afterEach(cleanup);

describe('SampleDataConfirm', () => {
  it('explica o impacto com contagens reais antes de qualquer alteração', () => {
    renderDialog();

    const dialog = screen.getByRole('dialog', {
      name: 'Substituir seus registros pelos exemplos?',
    });
    expect(dialog.textContent).toContain('3 registros salvos');
    expect(dialog.textContent).toContain('14 registros ilustrativos');
    expect(dialog.textContent).toContain('substituirão todos os registros atuais');
    expect(dialog.textContent).toContain('Categorias, preferências e experimentos serão mantidos');
    expect(dialog.textContent).toContain('baixaremos uma cópia dos dados atuais');
  });

  it('não confirma nem baixa nada ao renderizar', () => {
    const props = renderDialog();

    expect(props.onConfirm).not.toHaveBeenCalled();
    expect(props.onDownloadBackup).not.toHaveBeenCalled();
  });

  it('cancela sem confirmar', () => {
    const props = renderDialog();

    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));

    expect(props.onCancel).toHaveBeenCalledTimes(1);
    expect(props.onConfirm).not.toHaveBeenCalled();
  });

  it('confirma a substituição somente pelo botão explícito', () => {
    const props = renderDialog();

    fireEvent.click(
      screen.getByRole('button', { name: 'Substituir registros pelos exemplos' })
    );

    expect(props.onConfirm).toHaveBeenCalledTimes(1);
  });

  it('permite baixar a cópia antes de confirmar', () => {
    const props = renderDialog();

    fireEvent.click(
      screen.getByRole('button', { name: 'Baixar cópia dos dados atuais' })
    );

    expect(props.onDownloadBackup).toHaveBeenCalledTimes(1);
    expect(props.onConfirm).not.toHaveBeenCalled();
  });

  it('foca a saída segura, fecha com Escape e devolve o foco ao disparador', async () => {
    const user = userEvent.setup();

    function Harness() {
      const [open, setOpen] = useState(false);
      return (
        <>
          <button type="button" onClick={() => setOpen(true)}>
            Abrir confirmação
          </button>
          {open && (
            <SampleDataConfirm
              entriesCount={3}
              sampleCount={14}
              categoriesCount={4}
              experimentsCount={2}
              error=""
              onDownloadBackup={vi.fn()}
              onConfirm={vi.fn()}
              onCancel={() => setOpen(false)}
            />
          )}
        </>
      );
    }

    render(<Harness />);
    const trigger = screen.getByRole('button', { name: 'Abrir confirmação' });

    await user.click(trigger);
    const cancel = screen.getByRole('button', { name: 'Cancelar' });
    expect(cancel).toBe(document.activeElement);
    expect(screen.getByRole('dialog').getAttribute('aria-describedby')).toBe(
      'sample-data-description'
    );

    await user.keyboard('{Escape}');

    expect(screen.queryByRole('dialog')).toBeNull();
    expect(trigger).toBe(document.activeElement);
  });

  it('mostra erro e mantém o diálogo quando a operação falha', () => {
    renderDialog({ error: 'Não foi possível gerar a cópia dos dados atuais.' });

    expect(screen.getByRole('alert').textContent).toContain('cópia dos dados atuais');
    expect(
      screen.getByRole('button', { name: 'Substituir registros pelos exemplos' })
    ).toBeTruthy();
  });
});
