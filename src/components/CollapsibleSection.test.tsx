import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CollapsibleSection } from './CollapsibleSection';

function Section({ defaultOpen = true }: { defaultOpen?: boolean }) {
  return (
    <CollapsibleSection
      title="Pilar 1 · Estado emocional"
      summaryChips={['Ansioso', 'Valência 4/10']}
      answered={2}
      total={3}
      reduceMotion
      defaultOpen={defaultOpen}
    >
      <label htmlFor="mood-note">Nota</label>
      <input id="mood-note" />
    </CollapsibleSection>
  );
}

afterEach(cleanup);

describe('CollapsibleSection', () => {
  it('mostra o resumo em chips e a contagem de respostas', () => {
    render(<Section />);

    expect(screen.getByText('2 de 3 campos respondidos')).toBeTruthy();
    expect(screen.getByRole('button', { name: /Pilar 1/ }).getAttribute('aria-expanded')).toBe(
      'true'
    );
    expect(screen.getByLabelText('Nota')).toBeTruthy();
  });

  it('recolhe ao clique e mantém conteúdo fora da árvore acessível', async () => {
    const user = userEvent.setup();
    render(<Section />);

    await user.click(screen.getByRole('button', { name: /Pilar 1/ }));

    expect(screen.getByRole('button', { name: /Pilar 1/ }).getAttribute('aria-expanded')).toBe(
      'false'
    );
    expect(screen.getByLabelText('Resumo de Pilar 1 · Estado emocional').textContent).toContain(
      'Ansioso'
    );
    expect(screen.queryByLabelText('Nota')).toBeNull();
  });

  it('não recolhe uma seção com foco dentro, mesmo se o pai pedir', async () => {
    const user = userEvent.setup();
    const { rerender } = render(<Section />);

    await user.click(screen.getByLabelText('Nota'));
    rerender(<Section defaultOpen={false} />);

    expect(screen.getByRole('button', { name: /Pilar 1/ }).getAttribute('aria-expanded')).toBe(
      'true'
    );
  });
});
