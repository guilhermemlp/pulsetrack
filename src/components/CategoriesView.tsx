import React, { useEffect, useRef, useState } from 'react';
import { Download, Plus, RotateCcw, Trash2, Upload } from 'lucide-react';
import {
  BehaviorCategory,
  Experiment,
  FocusArea,
  PulseEntry,
  RecordLevel,
  UserPreferences,
} from '../types/pulsetrack';
import { FOCUS_AREA_OPTIONS } from '../data/defaults';
import { toLocalIsoDate } from '../utils/analytics';
import { downloadJson } from '../utils/download';
import {
  deleteCategory,
  deleteItem,
  renameCategory,
  renameItem,
  restoreCategory,
  restoreItem,
} from '../utils/categories';
import {
  BackupPayload,
  BackupValidationError,
  buildBackupJson,
  validateBackupJson,
} from '../utils/storage';

interface CategoriesViewProps {
  categories: BehaviorCategory[];
  entries: PulseEntry[];
  experiments: Experiment[];
  preferences: UserPreferences;
  onChangePreferences: (patch: Partial<UserPreferences>) => void;
  onUpdateCategories: (next: BehaviorCategory[]) => void;
  onResetDefaultCategories: () => void;
  /** Só é chamado depois da confirmação; devolve se a gravação foi concluída. */
  onImportBackup: (backup: BackupPayload) => boolean;
  onLoadSampleData: () => void;
  onClearAllEntries: () => void;
  onToggleFocusModeDefault: () => void;
  onToggleShowSexualCategory: () => void;
  onToggleTrackCycle: () => void;
  /** Reabre o onboarding manualmente — ele nunca abre sozinho de novo. */
  onRestartOnboarding: () => void;
  onFeedback: (msg: string) => void;
}

const COLOR_SWATCHES = ['#3B6F8F', '#5B8260', '#C85E42', '#B8893A', '#7B6F94', '#5D7A8C'];

const RECORD_LEVEL_OPTIONS: Array<{ id: RecordLevel; label: string }> = [
  { id: 'rapido', label: 'Rápido' },
  { id: 'padrao', label: 'Padrão' },
  { id: 'completo', label: 'Completo' },
];

export const CategoriesView: React.FC<CategoriesViewProps> = ({
  categories,
  entries,
  experiments,
  preferences,
  onChangePreferences,
  onUpdateCategories,
  onResetDefaultCategories,
  onImportBackup,
  onLoadSampleData,
  onClearAllEntries,
  onToggleFocusModeDefault,
  onToggleShowSexualCategory,
  onToggleTrackCycle,
  onRestartOnboarding,
  onFeedback,
}) => {
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryColor, setNewCategoryColor] = useState(COLOR_SWATCHES[0]);
  const [newSubItemText, setNewSubItemText] = useState<Record<string, string>>({});
  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const [editingCatName, setEditingCatName] = useState('');
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editingItemLabel, setEditingItemLabel] = useState('');
  const [confirmResetCats, setConfirmResetCats] = useState(false);
  const [confirmClearEntries, setConfirmClearEntries] = useState(false);
  const [pendingImport, setPendingImport] = useState<BackupPayload | null>(null);
  const [importError, setImportError] = useState('');
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const importTriggerRef = useRef<HTMLButtonElement>(null);
  const importConfirmTitleRef = useRef<HTMLHeadingElement>(null);
  const clearTriggerRef = useRef<HTMLButtonElement>(null);
  const clearCancelRef = useRef<HTMLButtonElement>(null);
  const returnClearFocus = useRef(false);

  useEffect(() => {
    if (pendingImport) {
      importConfirmTitleRef.current?.focus();
    }
  }, [pendingImport]);

  useEffect(() => {
    if (confirmClearEntries) {
      clearCancelRef.current?.focus();
      return;
    }
    if (returnClearFocus.current) {
      clearTriggerRef.current?.focus();
      returnClearFocus.current = false;
    }
  }, [confirmClearEntries]);

  const toggleFocusArea = (area: FocusArea) => {
    const next = preferences.focusAreas.includes(area)
      ? preferences.focusAreas.filter((item) => item !== area)
      : [...preferences.focusAreas, area];
    onChangePreferences({ focusAreas: next });
  };

  const handleAddCategory = (e: React.FormEvent) => {
    e.preventDefault();
    const name = newCategoryName.trim();
    if (!name) return;
    const newCat: BehaviorCategory = {
      id: `cat_${Date.now()}`,
      name,
      color: newCategoryColor,
      active: true,
      items: [],
      version: 2,
      updatedAt: new Date().toISOString(),
    };
    onUpdateCategories([...categories, newCat]);
    setNewCategoryName('');
    onFeedback(`Categoria "${name}" adicionada.`);
  };

  const handleToggleCategory = (catId: string) => {
    onUpdateCategories(
      categories.map((c) => (c.id === catId ? { ...c, active: !c.active } : c))
    );
    onFeedback('Visibilidade da categoria atualizada.');
  };

  const handleDeleteCategory = (catId: string, catName: string) => {
    const result = deleteCategory(categories, catId, entries);
    onUpdateCategories(result.categories);
    onFeedback(
      result.archived
        ? `Categoria "${catName}" arquivada: ela tem registros no histórico e não pode ser apagada. Você pode restaurá-la depois.`
        : `Categoria "${catName}" removida (não havia registros usando seus itens).`
    );
  };

  const handleSaveCategoryName = (catId: string) => {
    const trimmed = editingCatName.trim();
    if (!trimmed) return;
    onUpdateCategories(renameCategory(categories, catId, trimmed));
    setEditingCatId(null);
    onFeedback('Nome da categoria atualizado.');
  };

  const handleAddSubItem = (catId: string) => {
    const label = (newSubItemText[catId] ?? '').trim();
    if (!label) return;
    onUpdateCategories(
      categories.map((c) =>
        c.id === catId
          ? {
              ...c,
              version: 2,
              updatedAt: new Date().toISOString(),
              items: [
                ...c.items,
                {
                  id: `item_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
                  label,
                  active: true,
                  createdAt: new Date().toISOString(),
                },
              ],
            }
          : c
      )
    );
    setNewSubItemText((prev) => ({ ...prev, [catId]: '' }));
    onFeedback(`Item "${label}" adicionado.`);
  };

  const handleToggleSubItem = (catId: string, itemId: string) => {
    onUpdateCategories(
      categories.map((c) =>
        c.id === catId
          ? {
              ...c,
              version: 2,
              updatedAt: new Date().toISOString(),
              items: c.items.map((item) =>
                item.id === itemId ? { ...item, active: !item.active } : item
              ),
            }
          : c
      )
    );
  };

  const handleSaveSubItem = (catId: string, itemId: string) => {
    const trimmed = editingItemLabel.trim();
    if (!trimmed) return;
    onUpdateCategories(renameItem(categories, catId, itemId, trimmed));
    setEditingItemId(null);
    onFeedback(
      'Item renomeado. O histórico anterior continua ligado ao mesmo item (o nome antigo fica como alias).'
    );
  };

  const handleDeleteSubItem = (catId: string, itemId: string, label: string) => {
    const result = deleteItem(categories, catId, itemId, entries);
    onUpdateCategories(result.categories);
    onFeedback(
      result.archived
        ? `"${label}" arquivado: já aparece em registros antigos, então não é apagado. Você pode restaurá-lo depois.`
        : `"${label}" removido (nenhum registro usava este item).`
    );
  };

  const handleExportJson = () => {
    const content = buildBackupJson(entries, categories, preferences, experiments);
    const ok = downloadJson(content, `PulseTrack_Backup_${toLocalIsoDate()}.json`);
    onFeedback(
      ok
        ? 'Backup JSON exportado com sucesso.'
        : 'Não foi possível gerar o arquivo de backup neste navegador.'
    );
  };

  const importErrorMessage = (error: BackupValidationError): string => {
    switch (error) {
      case 'invalid_json':
        return 'O arquivo selecionado não é um JSON válido. Nada foi alterado.';
      case 'not_pulsetrack':
        return 'Este arquivo não é um backup do PulseTrack. Nada foi alterado.';
      case 'unsupported_version':
        return 'Este backup foi gerado por uma versão mais nova do PulseTrack e não pode ser importado com segurança. Nada foi alterado.';
      case 'missing_data':
        return 'O backup está incompleto: faltam registros ou categorias. Nada foi alterado.';
      case 'invalid_data':
        return 'O backup contém dados incompatíveis com esta versão. Nada foi alterado.';
      default:
        return 'Não foi possível ler o backup. Nada foi alterado.';
    }
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportError('');
    const reader = new FileReader();
    reader.onload = () => {
      const text = typeof reader.result === 'string' ? reader.result : '';
      const result = validateBackupJson(text);
      if (!result.backup) {
        setPendingImport(null);
        setImportError(importErrorMessage(result.error ?? 'invalid_json'));
        return;
      }
      // Nada é gravado aqui: o arquivo só fica em memória até a confirmação.
      setPendingImport(result.backup);
      setImportError('');
    };
    reader.onerror = () => {
      setPendingImport(null);
      setImportError('Não foi possível ler o arquivo selecionado. Nada foi alterado.');
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleDownloadCurrentBackup = () => {
    const content = buildBackupJson(entries, categories, preferences, experiments);
    const ok = downloadJson(
      content,
      `PulseTrack_Backup_Antes_da_Importacao_${toLocalIsoDate()}.json`
    );
    if (!ok) {
      setImportError(
        'Não foi possível gerar a cópia dos dados atuais neste navegador. A importação não será feita sem essa proteção.'
      );
      return;
    }
    setImportError('');
    onFeedback('Cópia dos dados atuais baixada antes da importação.');
  };

  const plural = (count: number, singular: string, pluralForm: string) =>
    `${count} ${count === 1 ? singular : pluralForm}`;

  const formatBackupDate = (iso: string): string => {
    if (!iso) return 'data não informada';
    const date = new Date(iso);
    return Number.isNaN(date.getTime()) ? 'data não informada' : date.toLocaleString('pt-BR');
  };

  const handleConfirmImport = () => {
    if (!pendingImport) return;

    // Cópia de segurança do estado atual antes de qualquer substituição.
    const currentBackup = buildBackupJson(entries, categories, preferences, experiments);
    const downloaded = downloadJson(
      currentBackup,
      `PulseTrack_Backup_Antes_da_Importacao_${toLocalIsoDate()}.json`
    );
    if (!downloaded) {
      setImportError(
        'Não foi possível gerar a cópia dos dados atuais neste navegador. A importação não foi feita e nada foi alterado.'
      );
      return;
    }

    if (!onImportBackup(pendingImport)) {
      setImportError(
        'Não foi possível gravar o backup no armazenamento local. Nada foi alterado; os dados atuais continuam salvos.'
      );
      return;
    }

    setPendingImport(null);
    setImportError('');
    importTriggerRef.current?.focus();
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight" style={{ color: 'var(--text-primary)' }}>
            Personalizar categorias e dados
          </h1>
          <p className="text-base mt-1" style={{ color: 'var(--text-secondary)' }}>
            Adapte categorias e comportamentos à sua realidade. Alterações são salvas automaticamente neste navegador.
          </p>
        </div>

        {!confirmResetCats ? (
          <button
            type="button"
            onClick={() => setConfirmResetCats(true)}
            className="min-h-[48px] px-4 py-2 rounded-xl border text-sm font-medium inline-flex items-center gap-2 self-start cursor-pointer"
            style={{
              backgroundColor: 'var(--bg-surface)',
              borderColor: 'var(--border-hairline)',
              color: 'var(--text-secondary)',
            }}
          >
            <RotateCcw className="w-4 h-4" aria-hidden="true" />
            <span>Restaurar categorias padrão</span>
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                onResetDefaultCategories();
                setConfirmResetCats(false);
              }}
              className="min-h-[48px] px-4 py-2 rounded-xl text-sm font-semibold cursor-pointer"
              style={{ backgroundColor: 'var(--color-primary-strong)', color: 'var(--color-primary-ink)' }}
            >
              Confirmar restauração
            </button>
            <button
              type="button"
              onClick={() => setConfirmResetCats(false)}
              className="min-h-[48px] px-4 py-2 rounded-xl border text-sm cursor-pointer"
              style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-hairline)', color: 'var(--text-secondary)' }}
            >
              Cancelar
            </button>
          </div>
        )}
      </div>

      {/* Criar nova categoria */}
      <form
        onSubmit={handleAddCategory}
        className="rounded-2xl border p-5 sm:p-6 space-y-4"
        style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-hairline)' }}
      >
        <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
          Adicionar nova categoria
        </h2>
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            value={newCategoryName}
            onChange={(e) => setNewCategoryName(e.target.value)}
            placeholder="Nome da categoria (ex.: Trabalho / Hiperfoco, Uso de substâncias...)"
            aria-label="Nome da nova categoria"
            className="flex-1 min-h-[48px] px-4 rounded-xl border text-base"
            style={{
              backgroundColor: 'var(--bg-elevated)',
              borderColor: 'var(--border-strong)',
              color: 'var(--text-primary)',
            }}
          />
          <div className="flex items-center gap-2" role="group" aria-label="Cor da categoria">
            {COLOR_SWATCHES.map((swatch) => (
              <button
                key={swatch}
                type="button"
                onClick={() => setNewCategoryColor(swatch)}
                aria-label={`Selecionar cor ${swatch}`}
                aria-pressed={newCategoryColor === swatch}
                className="w-12 h-12 rounded-xl border flex items-center justify-center cursor-pointer"
                style={{
                  backgroundColor: swatch,
                  borderColor: newCategoryColor === swatch ? 'var(--text-primary)' : 'transparent',
                  borderWidth: newCategoryColor === swatch ? '3px' : '1px',
                }}
              />
            ))}
          </div>
          <button
            type="submit"
            className="min-h-[48px] px-5 py-2.5 rounded-xl text-base font-semibold inline-flex items-center justify-center gap-2 shrink-0 cursor-pointer"
            style={{ backgroundColor: 'var(--color-primary-strong)', color: 'var(--color-primary-ink)' }}
          >
            <Plus className="w-5 h-5" aria-hidden="true" />
            <span>Adicionar</span>
          </button>
        </div>
      </form>

      {/* Lista de categorias editáveis */}
      <div className="space-y-5">
        {categories.filter((cat) => !cat.archived).map((cat) => (
          <section
            key={cat.id}
            className="rounded-2xl border p-5 sm:p-6 space-y-4"
            style={{
              backgroundColor: 'var(--bg-surface)',
              borderColor: 'var(--border-hairline)',
              opacity: cat.active ? 1 : 0.72,
            }}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b" style={{ borderColor: 'var(--border-hairline)' }}>
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <span
                  className="w-4 h-4 rounded-sm shrink-0"
                  style={{ backgroundColor: cat.color }}
                  aria-hidden="true"
                />
                {editingCatId === cat.id ? (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleSaveCategoryName(cat.id);
                    }}
                    className="flex flex-wrap items-center gap-2 flex-1"
                  >
                    <input
                      type="text"
                      value={editingCatName}
                      onChange={(e) => setEditingCatName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Escape') setEditingCatId(null);
                      }}
                      aria-label="Editar nome da categoria"
                      className="flex-1 min-w-[180px] min-h-[48px] px-3 rounded-xl border text-base"
                      style={{
                        backgroundColor: 'var(--bg-elevated)',
                        borderColor: 'var(--border-strong)',
                        color: 'var(--text-primary)',
                      }}
                    />
                    <button
                      type="submit"
                      className="min-h-[48px] px-4 rounded-xl text-sm font-semibold cursor-pointer"
                      style={{ backgroundColor: 'var(--color-primary-strong)', color: 'var(--color-primary-ink)' }}
                    >
                      Salvar
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingCatId(null)}
                      className="min-h-[48px] px-3.5 rounded-xl border text-sm cursor-pointer"
                      style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-hairline)', color: 'var(--text-secondary)' }}
                    >
                      Cancelar
                    </button>
                  </form>
                ) : (
                  <h2 className="text-lg font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
                    {cat.name}
                    {!cat.active && (
                      <span className="text-xs font-normal ml-2" style={{ color: 'var(--text-muted)' }}>
                        (Desativada)
                      </span>
                    )}
                  </h2>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setEditingCatId(cat.id);
                    setEditingCatName(cat.name);
                  }}
                  className="min-h-[48px] px-3.5 rounded-xl border text-sm font-medium cursor-pointer"
                  style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-hairline)', color: 'var(--text-primary)' }}
                >
                  Renomear
                </button>
                <button
                  type="button"
                  onClick={() => handleToggleCategory(cat.id)}
                  className="min-h-[48px] px-3.5 rounded-xl border text-sm font-medium cursor-pointer"
                  style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-hairline)', color: 'var(--text-secondary)' }}
                >
                  {cat.active ? 'Desativar' : 'Ativar'}
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteCategory(cat.id, cat.name)}
                  aria-label={`Excluir categoria ${cat.name}`}
                  className="min-h-[48px] min-w-[48px] px-3 rounded-xl border inline-flex items-center justify-center cursor-pointer"
                  style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-hairline)', color: 'var(--text-secondary)' }}
                >
                  <Trash2 className="w-4 h-4" aria-hidden="true" />
                </button>
              </div>
            </div>

            {/* Subitens */}
            <ul className="divide-y" style={{ borderColor: 'var(--border-hairline)' }}>
              {cat.items.filter((item) => !item.archived).map((item) => (
                <li
                  key={item.id}
                  className="py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5"
                  style={{ borderColor: 'var(--border-hairline)' }}
                >
                  {editingItemId === item.id ? (
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        handleSaveSubItem(cat.id, item.id);
                      }}
                      className="flex flex-wrap items-center gap-2 flex-1"
                    >
                      <input
                        type="text"
                        value={editingItemLabel}
                        onChange={(e) => setEditingItemLabel(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Escape') setEditingItemId(null);
                        }}
                        aria-label="Editar texto do subitem"
                        className="flex-1 min-w-[200px] min-h-[48px] px-3 rounded-xl border text-base"
                        style={{
                          backgroundColor: 'var(--bg-elevated)',
                          borderColor: 'var(--border-strong)',
                          color: 'var(--text-primary)',
                        }}
                      />
                      <button
                        type="submit"
                        className="min-h-[48px] px-4 rounded-xl text-sm font-semibold cursor-pointer"
                        style={{ backgroundColor: 'var(--color-primary-strong)', color: 'var(--color-primary-ink)' }}
                      >
                        Salvar
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingItemId(null)}
                        className="min-h-[48px] px-3.5 rounded-xl border text-sm cursor-pointer"
                        style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-hairline)', color: 'var(--text-secondary)' }}
                      >
                        Cancelar
                      </button>
                    </form>
                  ) : (
                    <>
                      <span
                        className="text-base"
                        style={{
                          color: item.active ? 'var(--text-primary)' : 'var(--text-muted)',
                          textDecoration: item.active ? 'none' : 'line-through',
                        }}
                      >
                        {item.label}
                      </span>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingItemId(item.id);
                            setEditingItemLabel(item.label);
                          }}
                          className="min-h-[48px] px-3.5 rounded-lg border text-xs font-medium cursor-pointer"
                          style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-hairline)', color: 'var(--text-primary)' }}
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          onClick={() => handleToggleSubItem(cat.id, item.id)}
                          className="min-h-[48px] px-3.5 rounded-lg border text-xs font-medium cursor-pointer"
                          style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-hairline)', color: 'var(--text-secondary)' }}
                        >
                          {item.active ? 'Desativar' : 'Ativar'}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteSubItem(cat.id, item.id, item.label)}
                          aria-label={`Remover ${item.label}`}
                          className="min-h-[48px] min-w-[48px] rounded-lg border inline-flex items-center justify-center cursor-pointer"
                          style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-hairline)', color: 'var(--text-secondary)' }}
                        >
                          <Trash2 className="w-4 h-4" aria-hidden="true" />
                        </button>
                      </div>
                    </>
                  )}
                </li>
              ))}
            </ul>

            {cat.items.some((item) => item.archived) && (
              <div className="pt-2 space-y-2">
                <p className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
                  Itens arquivados — usados em registros antigos, fora do formulário
                </p>
                <ul className="space-y-1.5">
                  {cat.items
                    .filter((item) => item.archived)
                    .map((item) => (
                      <li
                        key={item.id}
                        className="flex items-center justify-between gap-3 text-sm"
                        style={{ color: 'var(--text-secondary)' }}
                      >
                        <span className="line-through">{item.label}</span>
                        <button
                          type="button"
                          onClick={() => {
                            onUpdateCategories(restoreItem(categories, cat.id, item.id));
                            onFeedback(`"${item.label}" restaurado no formulário.`);
                          }}
                          className="min-h-[48px] px-3.5 rounded-lg border text-xs font-medium cursor-pointer shrink-0"
                          style={{
                            backgroundColor: 'var(--bg-elevated)',
                            borderColor: 'var(--border-hairline)',
                            color: 'var(--text-primary)',
                          }}
                        >
                          Restaurar
                        </button>
                      </li>
                    ))}
                </ul>
              </div>
            )}

            {/* Adicionar subitem */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleAddSubItem(cat.id);
              }}
              className="flex flex-col sm:flex-row gap-2.5 pt-2"
            >
              <input
                type="text"
                value={newSubItemText[cat.id] ?? ''}
                onChange={(e) => setNewSubItemText((prev) => ({ ...prev, [cat.id]: e.target.value }))}
                placeholder={`Novo comportamento em "${cat.name}"...`}
                aria-label={`Novo comportamento em ${cat.name}`}
                className="flex-1 min-h-[48px] px-4 rounded-xl border text-base"
                style={{
                  backgroundColor: 'var(--bg-elevated)',
                  borderColor: 'var(--border-strong)',
                  color: 'var(--text-primary)',
                }}
              />
              <button
                type="submit"
                className="min-h-[48px] px-5 rounded-xl border text-sm font-semibold inline-flex items-center justify-center gap-1.5 shrink-0 cursor-pointer"
                style={{
                  backgroundColor: 'var(--color-primary-soft)',
                  borderColor: 'var(--color-primary)',
                  color: 'var(--color-primary-strong)',
                }}
              >
                <Plus className="w-4 h-4" aria-hidden="true" />
                <span>Adicionar item</span>
              </button>
            </form>
          </section>
        ))}
      </div>

      {categories.some((cat) => cat.archived) && (
        <section
          className="rounded-2xl border p-5 sm:p-6 space-y-3"
          style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-hairline)' }}
        >
          <h2 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
            Categorias arquivadas
          </h2>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            Categorias com registros no histórico não são apagadas — ficam fora do formulário e
            preservam a série antiga. Restaure quando quiser voltar a usá-las.
          </p>
          <ul className="space-y-1.5">
            {categories
              .filter((cat) => cat.archived)
              .map((cat) => (
                <li
                  key={cat.id}
                  className="flex items-center justify-between gap-3 text-sm"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  <span className="inline-flex items-center gap-2">
                    <span
                      className="w-3 h-3 rounded-sm"
                      style={{ backgroundColor: cat.color }}
                      aria-hidden="true"
                    />
                    {cat.name}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      onUpdateCategories(restoreCategory(categories, cat.id));
                      onFeedback(`Categoria "${cat.name}" restaurada.`);
                    }}
                    className="min-h-[48px] px-3.5 rounded-lg border text-xs font-medium cursor-pointer"
                    style={{
                      backgroundColor: 'var(--bg-elevated)',
                      borderColor: 'var(--border-hairline)',
                      color: 'var(--text-primary)',
                    }}
                  >
                    Restaurar
                  </button>
                </li>
              ))}
          </ul>
        </section>
      )}

      {/* Backup, Preferências e Dados Locais */}
      <section
        className="rounded-2xl border p-6 space-y-5"
        style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-hairline)' }}
      >
        <div>
          <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
            Preferências de registro, cópia de segurança e dados locais
          </h2>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
            Todos os seus registros ficam apenas no seu navegador (localStorage). Você pode exportar ou restaurar um backup em JSON quando quiser.
          </p>
        </div>

        <div>
          <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
            Áreas de foco
          </p>
          <p className="text-xs mt-1 mb-2" style={{ color: 'var(--text-secondary)' }}>
            Elas aparecem em destaque no início do registro. Nenhum pilar é escondido.
          </p>
          <div className="flex flex-wrap gap-2">
            {FOCUS_AREA_OPTIONS.map((option) => {
              const active = preferences.focusAreas.includes(option.id);
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => toggleFocusArea(option.id)}
                  aria-pressed={active}
                  className="min-h-[44px] px-3 rounded-lg border text-xs font-medium cursor-pointer"
                  style={{
                    backgroundColor: active ? 'var(--color-primary-soft)' : 'var(--bg-elevated)',
                    borderColor: active ? 'var(--color-primary-strong)' : 'var(--border-hairline)',
                    color: active ? 'var(--color-primary-strong)' : 'var(--text-primary)',
                  }}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
            Profundidade inicial do novo registro
          </p>
          <p className="text-xs mt-1 mb-2" style={{ color: 'var(--text-secondary)' }}>
            Vale para registros novos; um registro em edição mantém a própria profundidade.
          </p>
          <div className="flex flex-wrap gap-2">
            {RECORD_LEVEL_OPTIONS.map((option) => {
              const active = preferences.defaultRecordLevel === option.id;
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => onChangePreferences({ defaultRecordLevel: option.id })}
                  aria-pressed={active}
                  className="min-h-[44px] px-4 rounded-lg border text-sm font-medium cursor-pointer"
                  style={{
                    backgroundColor: active ? 'var(--color-primary-soft)' : 'var(--bg-elevated)',
                    borderColor: active ? 'var(--color-primary-strong)' : 'var(--border-hairline)',
                    color: active ? 'var(--color-primary-strong)' : 'var(--text-primary)',
                  }}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="rounded-xl border p-4" style={{ borderColor: 'var(--border-hairline)' }}>
          <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
            Lembretes automáticos
          </p>
          <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
            Não disponíveis nesta versão. O PulseTrack não envia notificações e preferências
            antigas de lembrete ficam inativas.
          </p>
        </div>

        <div className="pt-1">
          <button
            type="button"
            onClick={onToggleFocusModeDefault}
            aria-pressed={preferences.focusModeDefault}
            className="min-h-[48px] px-4 py-2.5 rounded-xl border text-sm font-medium inline-flex items-center gap-2 cursor-pointer"
            style={{
              backgroundColor: preferences.focusModeDefault ? 'var(--color-primary-soft)' : 'var(--bg-elevated)',
              borderColor: preferences.focusModeDefault ? 'var(--color-primary-strong)' : 'var(--border-hairline)',
              color: preferences.focusModeDefault ? 'var(--color-primary-strong)' : 'var(--text-primary)',
            }}
          >
            <span>
              {preferences.focusModeDefault
                ? 'Modo de foco padrão ao abrir: Ativado'
                : 'Iniciar a aba Registrar em Modo de foco por padrão'}
            </span>
          </button>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onRestartOnboarding}
            className="min-h-[48px] px-4 py-2.5 rounded-xl border text-sm font-medium inline-flex items-center gap-2 cursor-pointer"
            style={{
              backgroundColor: 'var(--bg-elevated)',
              borderColor: 'var(--border-hairline)',
              color: 'var(--text-primary)',
            }}
          >
            Rever apresentação inicial (3 telas)
          </button>

          <button
            type="button"
            onClick={onToggleShowSexualCategory}
            aria-pressed={preferences.showSexualCategory}
            className="min-h-[48px] px-4 py-2.5 rounded-xl border text-sm font-medium inline-flex items-center gap-2 cursor-pointer"
            style={{
              backgroundColor: preferences.showSexualCategory
                ? 'var(--color-primary-soft)'
                : 'var(--bg-elevated)',
              borderColor: preferences.showSexualCategory
                ? 'var(--color-primary-strong)'
                : 'var(--border-hairline)',
              color: preferences.showSexualCategory
                ? 'var(--color-primary-strong)'
                : 'var(--text-primary)',
            }}
          >
            <span>
              {preferences.showSexualCategory
                ? 'Bloco Sexual / Intensidade no formulário: Ativado'
                : 'Mostrar bloco Sexual / Intensidade no formulário (oculto por padrão)'}
            </span>
          </button>

          <button
            type="button"
            onClick={onToggleTrackCycle}
            aria-pressed={preferences.trackCycle}
            className="min-h-[48px] px-4 py-2.5 rounded-xl border text-sm font-medium inline-flex items-center gap-2 cursor-pointer"
            style={{
              backgroundColor: preferences.trackCycle
                ? 'var(--color-secondary-soft)'
                : 'var(--bg-elevated)',
              borderColor: preferences.trackCycle
                ? 'var(--color-secondary)'
                : 'var(--border-hairline)',
              color: 'var(--text-primary)',
            }}
          >
            <span>
              {preferences.trackCycle
                ? 'Acompanhar fase do ciclo menstrual: Ativado'
                : 'Acompanhar fase do ciclo menstrual (opcional)'}
            </span>
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handleExportJson}
            className="min-h-[48px] px-4 py-2.5 rounded-xl border text-sm font-medium inline-flex items-center gap-2 cursor-pointer"
            style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-strong)', color: 'var(--text-primary)' }}
          >
            <Download className="w-4 h-4" aria-hidden="true" />
            <span>Exportar backup JSON</span>
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept="application/json,.json"
            onChange={handleImportFile}
            aria-label="Selecionar arquivo de backup JSON"
            className="hidden"
          />
          <button
            ref={importTriggerRef}
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="min-h-[48px] px-4 py-2.5 rounded-xl border text-sm font-medium inline-flex items-center gap-2 cursor-pointer"
            style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-strong)', color: 'var(--text-primary)' }}
          >
            <Upload className="w-4 h-4" aria-hidden="true" />
            <span>Importar backup JSON</span>
          </button>

          <button
            type="button"
            onClick={onLoadSampleData}
            className="min-h-[48px] px-4 py-2.5 rounded-xl border text-sm font-medium cursor-pointer"
            style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-hairline)', color: 'var(--text-secondary)' }}
          >
            Carregar exemplo ilustrativo (14 dias)
          </button>

          {entries.length > 0 && (
            !confirmClearEntries ? (
              <button
                ref={clearTriggerRef}
                type="button"
                onClick={() => setConfirmClearEntries(true)}
                className="min-h-[48px] px-4 py-2.5 rounded-xl border text-sm font-medium cursor-pointer"
                style={{ backgroundColor: 'var(--color-accent-soft)', borderColor: 'var(--color-accent)', color: 'var(--text-primary)' }}
              >
                Apagar todos os registros
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    onClearAllEntries();
                    setConfirmClearEntries(false);
                  }}
                  className="min-h-[48px] px-4 py-2.5 rounded-xl text-sm font-semibold cursor-pointer"
                  style={{ backgroundColor: 'var(--color-accent)', color: 'var(--color-accent-ink)' }}
                >
                  Confirmar limpeza total
                </button>
                <button
                  ref={clearCancelRef}
                  type="button"
                  onClick={() => {
                    returnClearFocus.current = true;
                    setConfirmClearEntries(false);
                  }}
                  className="min-h-[48px] px-3 py-2.5 rounded-xl border text-sm cursor-pointer"
                  style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-hairline)', color: 'var(--text-secondary)' }}
                >
                  Cancelar
                </button>
              </div>
            )
          )}
        </div>

        {importError && (
          <p
            role="alert"
            className="text-sm rounded-xl border p-3"
            style={{
              backgroundColor: 'var(--color-accent-soft)',
              borderColor: 'var(--color-accent)',
              color: 'var(--text-primary)',
            }}
          >
            {importError}
          </p>
        )}

        {pendingImport && (
          <div
            role="region"
            aria-label="Confirmação de importação de backup"
            className="rounded-xl border p-4 sm:p-5 space-y-3"
            style={{
              backgroundColor: 'var(--bg-elevated)',
              borderColor: 'var(--color-accent)',
              borderWidth: '2px',
            }}
          >
            <h3
              ref={importConfirmTitleRef}
              tabIndex={-1}
              className="text-base font-semibold"
              style={{ color: 'var(--text-primary)' }}
            >
              Confirmar substituição dos dados
            </h3>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              Este backup contém {plural(pendingImport.entries.length, 'registro', 'registros')},{' '}
              {plural(pendingImport.categories.length, 'categoria', 'categorias')} e{' '}
              {plural(pendingImport.experiments.length, 'experimento', 'experimentos')}. A
              importação substituirá os dados atualmente salvos neste navegador.
            </p>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              Versão {pendingImport.version} do backup · Exportado em{' '}
              {formatBackupDate(pendingImport.exportedAt)}
            </p>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              Antes de substituir, baixaremos uma cópia dos dados atuais. Nenhuma alteração é
              feita antes da confirmação.
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleDownloadCurrentBackup}
                className="min-h-[48px] px-4 py-2.5 rounded-xl border text-sm font-medium cursor-pointer"
                style={{
                  backgroundColor: 'var(--bg-surface)',
                  borderColor: 'var(--border-strong)',
                  color: 'var(--text-primary)',
                }}
              >
                Baixar cópia dos dados atuais
              </button>
              <button
                type="button"
                onClick={handleConfirmImport}
                className="min-h-[48px] px-4 py-2.5 rounded-xl text-sm font-semibold cursor-pointer"
                style={{
                  backgroundColor: 'var(--color-accent)',
                  color: 'var(--color-accent-ink)',
                }}
              >
                Substituir dados pelo backup
              </button>
              <button
                type="button"
                onClick={() => {
                  setPendingImport(null);
                  setImportError('');
                  importTriggerRef.current?.focus();
                }}
                className="min-h-[48px] px-4 py-2.5 rounded-xl border text-sm cursor-pointer"
                style={{
                  backgroundColor: 'var(--bg-surface)',
                  borderColor: 'var(--border-hairline)',
                  color: 'var(--text-secondary)',
                }}
              >
                Cancelar importação
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
};
