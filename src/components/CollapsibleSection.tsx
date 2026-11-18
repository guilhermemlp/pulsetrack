import React, { useEffect, useId, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';

interface CollapsibleSectionProps {
  title: string;
  /** Linha curta que explica o que há dentro (lida apenas quando expandida). */
  description?: string;
  /** Chips de resumo exibidos quando recolhida: o conteúdo continua reconhecível. */
  summaryChips: string[];
  /** Contagem de respostas dadas / campos que a seção oferece. */
  answered: number;
  total: number;
  /** Estado inicial. Recolher é sempre escolha explícita da pessoa. */
  defaultOpen?: boolean;
  reduceMotion: boolean;
  /** Título/id da região para testes e para o aria-controls. */
  id?: string;
  children: React.ReactNode;
}

/**
 * Seção recolhível usada pelos pilares nos níveis Padrão e Completo.
 *
 * Regras de comportamento:
 * - recolher nunca descarta resposta: o resumo em chips continua visível;
 * - uma seção com foco dentro nunca é recolhida automaticamente (nem por mudança de
 *   profundidade nem por perda de estado do pai);
 * - com `reduceMotion`, a transição é desligada.
 */
export const CollapsibleSection: React.FC<CollapsibleSectionProps> = ({
  title,
  description,
  summaryChips,
  answered,
  total,
  defaultOpen = true,
  reduceMotion,
  id,
  children,
}) => {
  const [open, setOpen] = useState(defaultOpen);
  const sectionRef = useRef<HTMLElement | null>(null);
  const generatedId = useId();
  const contentId = `collapsible-${id ?? generatedId}`;

  // Mudança pedida pelo pai. Recolher com foco dentro é ignorado: quem está digitando
  // ali não pode perder o lugar no meio da frase.
  useEffect(() => {
    if (!defaultOpen && sectionRef.current?.contains(document.activeElement)) return;
    setOpen(defaultOpen);
  }, [defaultOpen]);

  return (
    <section
      ref={sectionRef}
      aria-labelledby={`${contentId}-title`}
      className="rounded-2xl border"
      style={{
        backgroundColor: 'var(--bg-surface)',
        borderColor: 'var(--border-hairline)',
        boxShadow: 'var(--shadow-soft)',
      }}
    >
      <h2 className="m-0">
        <button
          type="button"
          onClick={() => setOpen((prev) => !prev)}
          aria-expanded={open}
          aria-controls={contentId}
          id={`${contentId}-title`}
          className="w-full min-h-[60px] px-4 sm:px-5 py-3 flex items-start justify-between gap-3 text-left cursor-pointer rounded-2xl"
          style={{ color: 'var(--text-primary)' }}
        >
          <span className="min-w-0">
            <span className="block text-base font-semibold">{title}</span>
            <span className="block text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
              {answered} de {total} campos respondidos
            </span>
          </span>
          <ChevronDown
            aria-hidden="true"
            className="w-5 h-5 shrink-0 mt-0.5"
            style={{
              color: 'var(--text-secondary)',
              transform: open ? 'rotate(180deg)' : 'none',
              transition: reduceMotion ? 'none' : 'transform 180ms ease',
            }}
          />
        </button>
      </h2>

      {!open && (
        <div className="px-4 sm:px-5 pb-3.5">
          {summaryChips.length > 0 ? (
            <ul className="flex flex-wrap gap-1.5" aria-label={`Resumo de ${title}`}>
              {summaryChips.map((chip) => (
                <li
                  key={chip}
                  className="text-xs px-2 py-1 rounded-full border max-w-full truncate"
                  style={{
                    backgroundColor: 'var(--bg-elevated)',
                    borderColor: 'var(--border-hairline)',
                    color: 'var(--text-secondary)',
                  }}
                >
                  {chip}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              Nada respondido nesta parte ainda.
            </p>
          )}
        </div>
      )}

      <div id={contentId} hidden={!open} className="px-4 sm:px-5 pb-5 pt-0">
        {open && description && (
          <p className="text-sm mb-3" style={{ color: 'var(--text-secondary)' }}>
            {description}
          </p>
        )}
        {open && children}
      </div>
    </section>
  );
};
