import React, { useRef } from 'react';
import { Download, FlaskConical } from 'lucide-react';
import { Dialog } from './Dialog';

interface SampleDataConfirmProps {
  entriesCount: number;
  sampleCount: number;
  categoriesCount: number;
  experimentsCount: number;
  error: string;
  onDownloadBackup: () => void;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Confirmação obrigatória antes de trocar registros reais pelo conjunto ilustrativo.
 * A cópia de segurança é baixada pela ação de confirmação; se ela falhar, nada muda.
 */
export const SampleDataConfirm: React.FC<SampleDataConfirmProps> = ({
  entriesCount,
  sampleCount,
  categoriesCount,
  experimentsCount,
  error,
  onDownloadBackup,
  onConfirm,
  onCancel,
}) => {
  const cancelRef = useRef<HTMLButtonElement>(null);
  const plural = (count: number, singular: string, pluralForm: string) =>
    `${count} ${count === 1 ? singular : pluralForm}`;

  return (
    <Dialog
      labelledBy="sample-data-title"
      describedBy="sample-data-description"
      onClose={onCancel}
      initialFocusRef={cancelRef}
    >
      <div
        className="w-full max-w-xl rounded-2xl border p-5 sm:p-6 space-y-4 max-h-[90vh] overflow-y-auto"
        style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-hairline)' }}
      >
        <div className="flex items-start gap-3">
          <FlaskConical
            className="w-5 h-5 shrink-0 mt-0.5"
            style={{ color: 'var(--color-primary-strong)' }}
            aria-hidden="true"
          />
          <div className="space-y-1">
            <h2
              id="sample-data-title"
              className="text-lg font-semibold"
              style={{ color: 'var(--text-primary)' }}
            >
              Substituir seus registros pelos exemplos?
            </h2>
            <p
              id="sample-data-description"
              className="text-sm"
              style={{ color: 'var(--text-secondary)' }}
            >
              Você tem {plural(entriesCount, 'registro salvo', 'registros salvos')}. Os{' '}
              {sampleCount} registros ilustrativos substituirão <strong>todos</strong> os
              registros atuais. Categorias, preferências e experimentos serão mantidos.
            </p>
          </div>
        </div>

        <div
          className="grid grid-cols-2 gap-2 rounded-xl border p-3 text-sm"
          style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-hairline)' }}
        >
          <div>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              Registros atuais
            </p>
            <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>
              {entriesCount}
            </p>
          </div>
          <div>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              Registros de exemplo
            </p>
            <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>
              {sampleCount}
            </p>
          </div>
          <div>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              Categorias preservadas
            </p>
            <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>
              {categoriesCount}
            </p>
          </div>
          <div>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              Experimentos preservados
            </p>
            <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>
              {experimentsCount}
            </p>
          </div>
        </div>

        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          Antes de substituir, baixaremos uma cópia dos dados atuais. Nenhuma alteração é feita
          antes da confirmação. Os exemplos ficam identificados no topo do app e podem ser
          removidos sem apagar registros reais.
        </p>

        {error && (
          <p
            role="alert"
            className="text-sm rounded-xl border p-3"
            style={{
              backgroundColor: 'var(--color-accent-soft)',
              borderColor: 'var(--color-accent)',
              color: 'var(--text-primary)',
            }}
          >
            {error}
          </p>
        )}

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onDownloadBackup}
            className="min-h-[48px] px-4 py-2.5 rounded-xl border text-sm font-medium inline-flex items-center gap-2 cursor-pointer"
            style={{
              backgroundColor: 'var(--bg-elevated)',
              borderColor: 'var(--border-strong)',
              color: 'var(--text-primary)',
            }}
          >
            <Download className="w-4 h-4" aria-hidden="true" />
            <span>Baixar cópia dos dados atuais</span>
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="min-h-[48px] px-4 py-2.5 rounded-xl text-sm font-semibold cursor-pointer"
            style={{ backgroundColor: 'var(--color-accent)', color: 'var(--color-accent-ink)' }}
          >
            Substituir registros pelos exemplos
          </button>
          <button
            ref={cancelRef}
            type="button"
            onClick={onCancel}
            className="min-h-[48px] px-4 py-2.5 rounded-xl border text-sm cursor-pointer"
            style={{
              backgroundColor: 'var(--bg-surface)',
              borderColor: 'var(--border-hairline)',
              color: 'var(--text-secondary)',
            }}
          >
            Cancelar
          </button>
        </div>
      </div>
    </Dialog>
  );
};
