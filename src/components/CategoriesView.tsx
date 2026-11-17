import React, { useRef, useState } from 'react';
import { Download, Plus, RotateCcw, Trash2, Upload } from 'lucide-react';
import { BehaviorCategory, PulseEntry, UserPreferences } from '../types/pulsetrack';
import { toLocalIsoDate } from '../utils/analytics';
import { buildBackupJson, parseBackupJson } from '../utils/storage';

interface CategoriesViewProps {
  categories: BehaviorCategory[];
  entries: PulseEntry[];
  preferences: UserPreferences;
  onUpdateCategories: (next: BehaviorCategory[]) => void;
  onResetDefaultCategories: () => void;
  onImportBackup: (entries: PulseEntry[], categories: BehaviorCategory[], prefs?: UserPreferences) => void;
  onLoadSampleData: () => void;
  onClearAllEntries: () => void;
  onToggleFocusModeDefault: () => void;
  onToggleShowSexualCategory: () => void;
  onToggleTrackCycle: () => void;
  onFeedback: (msg: string) => void;
}

const COLOR_SWATCHES = ['#3B6F8F', '#5B8260', '#C85E42', '#B8893A', '#7B6F94', '#5D7A8C'];

export const CategoriesView: React.FC<CategoriesViewProps> = ({
  categories,
  entries,
  preferences,
  onUpdateCategories,
  onResetDefaultCategories,
  onImportBackup,
  onLoadSampleData,
  onClearAllEntries,
  onToggleFocusModeDefault,
  onToggleShowSexualCategory,
  onToggleTrackCycle,
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
  const fileInputRef = useRef<HTMLInputElement | null>(null);

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
    onUpdateCategories(categories.filter((c) => c.id !== catId));
    onFeedback(`Categoria "${catName}" removida (registros antigos permanecem no histórico).`);
  };

  const handleSaveCategoryName = (catId: string) => {
    const trimmed = editingCatName.trim();
    if (!trimmed) return;
    onUpdateCategories(categories.map((c) => (c.id === catId ? { ...c, name: trimmed } : c)));
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
              items: [...c.items, { id: `item_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`, label, active: true }],
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
              items: c.items.map((item) => (item.id === itemId ? { ...item, active: !item.active } : item)),
            }
          : c
      )
    );
  };

  const handleSaveSubItem = (catId: string, itemId: string) => {
    const trimmed = editingItemLabel.trim();
    if (!trimmed) return;
    onUpdateCategories(
      categories.map((c) =>
        c.id === catId
          ? {
              ...c,
              items: c.items.map((item) => (item.id === itemId ? { ...item, label: trimmed } : item)),
            }
          : c
      )
    );
    setEditingItemId(null);
    onFeedback('Subitem atualizado.');
  };

  const handleDeleteSubItem = (catId: string, itemId: string) => {
    onUpdateCategories(
      categories.map((c) =>
        c.id === catId
          ? { ...c, items: c.items.filter((item) => item.id !== itemId) }
          : c
      )
    );
    onFeedback('Subitem removido.');
  };

  const handleExportJson = () => {
    const content = buildBackupJson(entries, categories, preferences);
    const blob = new Blob([content], { type: 'application/json;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `PulseTrack_Backup_${toLocalIsoDate()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    onFeedback('Backup JSON exportado com sucesso.');
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? parseBackupJson(reader.result) : null;
      if (!result) {
        onFeedback('Arquivo inválido. Selecione um backup JSON gerado pelo PulseTrack.');
        return;
      }
      onImportBackup(result.entries, result.categories, result.preferences);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight" style={{ color: 'var(--text-primary)' }}>
            Personalizar categorias e dados
          </h1>
          <p className="text-base mt-1" style={{ color: 'var(--text-secondary)' }}>
            Adapte categorias e comportamentos à sua realidade. Alterações são salvas automaticamente offline.
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
        {categories.map((cat) => (
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
              {cat.items.map((item) => (
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
                          onClick={() => handleDeleteSubItem(cat.id, item.id)}
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

      {/* Backup, Preferências e Dados Locais */}
      <section
        className="rounded-2xl border p-6 space-y-5"
        style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-hairline)' }}
      >
        <div>
          <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
            Preferências de registro, cópia de segurança e dados offline
          </h2>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
            Todos os seus registros ficam apenas no seu navegador (localStorage). Você pode exportar ou restaurar um backup em JSON quando quiser.
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
            className="hidden"
          />
          <button
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
                  type="button"
                  onClick={() => setConfirmClearEntries(false)}
                  className="min-h-[48px] px-3 py-2.5 rounded-xl border text-sm cursor-pointer"
                  style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-hairline)', color: 'var(--text-secondary)' }}
                >
                  Cancelar
                </button>
              </div>
            )
          )}
        </div>
      </section>
    </div>
  );
};
