import React, { useEffect, useRef } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { EntryType } from '../../types/pulsetrack';

interface FormHeaderActionsProps {
  isEditing: boolean;
  focusMode: boolean;
  onToggleFocusMode: () => void;
  onCancelEdit: () => void;
}

/**
 * Controles de topo do formulário: Modo de Foco e Cancelar edição.
 */
export const FormHeaderActions: React.FC<FormHeaderActionsProps> = React.memo(
  ({ isEditing, focusMode, onToggleFocusMode, onCancelEdit }) => {
    return (
      <div className="flex flex-wrap items-center gap-3 shrink-0">
        <button
          type="button"
          onClick={onToggleFocusMode}
          className="min-h-[48px] px-4 py-2.5 rounded-xl border text-sm font-medium inline-flex items-center gap-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          style={{
            backgroundColor: focusMode ? 'var(--color-primary-soft)' : 'var(--bg-surface)',
            borderColor: focusMode ? 'var(--color-primary)' : 'var(--border-hairline)',
            color: focusMode ? 'var(--color-primary-strong)' : 'var(--text-primary)',
          }}
          aria-pressed={focusMode}
        >
          {focusMode ? (
            <EyeOff className="w-4 h-4" aria-hidden="true" />
          ) : (
            <Eye className="w-4 h-4" aria-hidden="true" />
          )}
          <span>{focusMode ? 'Sair do modo de foco' : 'Modo de foco'}</span>
        </button>

        {isEditing && (
          <button
            type="button"
            onClick={onCancelEdit}
            className="min-h-[48px] px-4 py-2.5 rounded-xl border text-sm font-medium whitespace-nowrap shrink-0 cursor-pointer"
            style={{
              backgroundColor: 'var(--bg-surface)',
              borderColor: 'var(--border-hairline)',
              color: 'var(--text-secondary)',
            }}
          >
            Cancelar edição
          </button>
        )}
      </div>
    );
  }
);

FormHeaderActions.displayName = 'FormHeaderActions';

interface FormActionsProps {
  isEditing: boolean;
  entryType: EntryType;
  focusMode: boolean;
  showOptionalInFocus: boolean;
  validationMessage: string;
  onToggleOptionalInFocus: () => void;
  onResetForm: () => void;
}

/**
 * Ações finais do formulário: expandir opcionais no Modo de Foco, alerta de validação, limpar e salvar.
 */
export const FormActions: React.FC<FormActionsProps> = React.memo(
  ({
    isEditing,
    entryType,
    focusMode,
    showOptionalInFocus,
    validationMessage,
    onToggleOptionalInFocus,
    onResetForm,
  }) => {
    const alertRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
      if (validationMessage && alertRef.current) {
        alertRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }, [validationMessage]);

    return (
      <>
        {focusMode && (
          <div className="flex justify-center">
            <button
              type="button"
              onClick={onToggleOptionalInFocus}
              className="min-h-[48px] px-5 py-2.5 rounded-xl border text-sm font-medium cursor-pointer"
              style={{
                backgroundColor: 'var(--bg-surface)',
                borderColor: 'var(--border-hairline)',
                color: 'var(--text-secondary)',
              }}
            >
              {showOptionalInFocus
                ? 'Ocultar impacto funcional e eventos do dia'
                : 'Adicionar impacto funcional, eventos do dia e observações (opcional)'}
            </button>
          </div>
        )}

        {validationMessage && (
          <div
            ref={alertRef}
            role="alert"
            className="rounded-xl border p-4 text-base font-medium"
            style={{
              backgroundColor: 'var(--color-accent-soft)',
              borderColor: 'var(--color-accent)',
              color: 'var(--text-primary)',
            }}
          >
            {validationMessage}
          </div>
        )}

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-3 pb-6">
          <button
            type="button"
            onClick={onResetForm}
            className="min-h-[48px] px-6 py-3 rounded-xl border text-base font-medium cursor-pointer"
            style={{
              backgroundColor: 'var(--bg-surface)',
              borderColor: 'var(--border-hairline)',
              color: 'var(--text-secondary)',
            }}
          >
            Limpar formulário
          </button>
          <button
            type="submit"
            className="min-h-[52px] px-8 py-3 rounded-xl text-base font-semibold transition-opacity hover:opacity-95 cursor-pointer"
            style={{
              backgroundColor: 'var(--color-primary-strong)',
              color: 'var(--color-primary-ink)',
            }}
          >
            {isEditing
              ? 'Salvar alterações'
              : entryType === EntryType.DAILY_CHECKIN
              ? 'Salvar check-in diário'
              : 'Salvar episódio'}
          </button>
        </div>
      </>
    );
  }
);

FormActions.displayName = 'FormActions';
