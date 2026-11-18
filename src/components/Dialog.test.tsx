import { useRef, useState } from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import { Dialog } from './Dialog';

afterEach(cleanup);

function Harness({ closeOnEscape = true }: { closeOnEscape?: boolean }) {
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        Abrir diálogo
      </button>
      <button type="button">Conteúdo de fundo</button>
      {open && (
        <Dialog
          labelledBy="test-dialog-title"
          describedBy="test-dialog-description"
          onClose={() => setOpen(false)}
          closeOnEscape={closeOnEscape}
          initialFocusRef={inputRef}
        >
          <div>
            <h2 id="test-dialog-title">Título do diálogo</h2>
            <p id="test-dialog-description">Descrição acessível do diálogo.</p>
            <input ref={inputRef} aria-label="Campo inicial" />
            <button type="button">Primeiro controle</button>
            <button type="button">Último controle</button>
          </div>
        </Dialog>
      )}
    </>
  );
}

describe('Dialog — foco e teclado', () => {
  it('abre pelo teclado, expõe nome/descrição e move o foco para o campo inicial', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    const trigger = screen.getByRole('button', { name: 'Abrir diálogo' });
    await user.tab();
    expect(trigger).toBe(document.activeElement);
    await user.keyboard('{Enter}');

    const dialog = screen.getByRole('dialog', { name: 'Título do diálogo' });
    expect(dialog.getAttribute('aria-modal')).toBe('true');
    expect(dialog.getAttribute('aria-describedby')).toBe('test-dialog-description');
    expect(screen.getByLabelText('Campo inicial')).toBe(document.activeElement);
  });

  it('mantém Tab e Shift+Tab dentro do diálogo', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.click(screen.getByRole('button', { name: 'Abrir diálogo' }));
    expect(screen.getByLabelText('Campo inicial')).toBe(document.activeElement);

    await user.tab();
    expect(screen.getByRole('button', { name: 'Primeiro controle' })).toBe(document.activeElement);
    await user.tab();
    expect(screen.getByRole('button', { name: 'Último controle' })).toBe(document.activeElement);
    await user.tab();
    expect(screen.getByLabelText('Campo inicial')).toBe(document.activeElement);

    await user.tab({ shift: true });
    expect(screen.getByRole('button', { name: 'Último controle' })).toBe(document.activeElement);
  });

  it('não deixa o foco ir para o conteúdo de fundo', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.click(screen.getByRole('button', { name: 'Abrir diálogo' }));
    screen.getByRole('button', { name: 'Conteúdo de fundo' }).focus();

    expect(screen.getByLabelText('Campo inicial')).toBe(document.activeElement);
  });

  it('fecha com Escape e devolve o foco ao disparador', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    const trigger = screen.getByRole('button', { name: 'Abrir diálogo' });
    await user.click(trigger);
    expect(screen.getByRole('dialog')).toBeTruthy();

    await user.keyboard('{Escape}');

    expect(screen.queryByRole('dialog')).toBeNull();
    expect(trigger).toBe(document.activeElement);
  });

  it('não fecha com Escape quando configurado como inseguro', async () => {
    const user = userEvent.setup();
    render(<Harness closeOnEscape={false} />);

    await user.click(screen.getByRole('button', { name: 'Abrir diálogo' }));
    await user.keyboard('{Escape}');

    expect(screen.getByRole('dialog')).toBeTruthy();
  });
});
