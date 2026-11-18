import { useEffect, useMemo, useState } from 'react';
import {
  BarChart3,
  CheckCircle2,
  ClipboardPlus,
  Clock,
  FileText,
  Lightbulb,
  SlidersHorizontal,
  X,
} from 'lucide-react';
import { CategoriesView } from './components/CategoriesView';
import { DailyLogForm } from './components/DailyLogForm';
import { DashboardView } from './components/DashboardView';
import { HistoryView } from './components/HistoryView';
import { InsightsView } from './components/InsightsView';
import { Onboarding } from './components/Onboarding';
import { ReportsView } from './components/ReportsView';
import { createDefaultCategories, createSampleEntries } from './data/defaults';
import { applyPackages, CATEGORY_PACKAGES } from './data/packages';
import {
  AppTab,
  BehaviorCategory,
  BehaviorSubItem,
  EntryType,
  Experiment,
  ExperimentResult,
  OnboardingProgress,
  PackageId,
  PeriodFilter,
  PulseEntry,
  RecordLevel,
  ThemeMode,
  UserPreferences,
} from './types/pulsetrack';
import { computeAnalytics, filterEntriesByPeriod, toLocalIsoDate } from './utils/analytics';
import {
  clearFormDraft,
  FormDraft,
  loadCategories,
  loadEntries,
  loadExperiments,
  loadFormDraft,
  loadOnboardingProgress,
  loadPreferences,
  saveCategories,
  saveEntries,
  saveExperiments,
  saveFormDraft,
  saveOnboardingProgress,
  savePreferences,
} from './utils/storage';

const DESKTOP_NAV_ITEMS: Array<{ id: AppTab; label: string }> = [
  { id: 'registrar', label: 'Registrar' },
  { id: 'painel', label: 'Painel' },
  { id: 'insights', label: 'Insights' },
  { id: 'historico', label: 'Histórico' },
  { id: 'categorias', label: 'Categorias' },
];

export default function App() {
  const [entries, setEntries] = useState<PulseEntry[]>(() => loadEntries());
  const [categories, setCategories] = useState<BehaviorCategory[]>(() => loadCategories());
  const [preferences, setPreferences] = useState<UserPreferences>(() => loadPreferences());
  /** Onboarding: só aparece enquanto não estiver concluído (nunca reabre sozinho). */
  const [onboarding, setOnboarding] = useState<OnboardingProgress>(() => loadOnboardingProgress());
  /** Hipóteses locais: nunca saem do aparelho e nunca recebem veredito automático. */
  const [experiments, setExperiments] = useState<Experiment[]>(() => loadExperiments());

  const [activeTab, setActiveTab] = useState<AppTab>('registrar');
  const [period, setPeriod] = useState<PeriodFilter>('14');
  const [editingEntry, setEditingEntry] = useState<PulseEntry | null>(null);
  /** Nível em que o registro reabre ao "salvar e completar depois". */
  const [reopenLevel, setReopenLevel] = useState<RecordLevel | null>(null);
  const [focusMode, setFocusMode] = useState<boolean>(() => preferences.focusModeDefault);
  const [feedbackMessage, setFeedbackMessage] = useState<string>('');
  /** Rascunho em andamento (para o card "Continuar registro" no Painel e no Histórico). */
  const [draft, setDraft] = useState<FormDraft | null>(() => loadFormDraft());

  // Sincroniza tema e preferência de redução de movimento no documento HTML
  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('dark', 'high-contrast');
    if (preferences.theme === ThemeMode.DARK) {
      root.classList.add('dark');
    } else if (preferences.theme === ThemeMode.HIGH_CONTRAST) {
      root.classList.add('high-contrast');
    }
    root.setAttribute('data-reduce-motion', preferences.reduceMotion ? 'true' : 'false');
    savePreferences(preferences);
  }, [preferences]);

  useEffect(() => {
    saveEntries(entries);
  }, [entries]);

  useEffect(() => {
    saveCategories(categories);
  }, [categories]);

  useEffect(() => {
    saveExperiments(experiments);
  }, [experiments]);

  // Limpa feedback automaticamente após alguns segundos (mantendo acesso via live region)
  useEffect(() => {
    if (!feedbackMessage) return;
    const timer = window.setTimeout(() => setFeedbackMessage(''), 5500);
    return () => window.clearTimeout(timer);
  }, [feedbackMessage]);

  const showFeedback = (msg: string) => {
    setFeedbackMessage(msg);
  };

  const patchPreferences = (patch: Partial<UserPreferences>) => {
    setPreferences((prev) => ({ ...prev, ...patch }));
  };

  const persistOnboarding = (progress: OnboardingProgress) => {
    saveOnboardingProgress(progress);
    setOnboarding(progress);
  };

  const handleApplyPackages = (ids: PackageId[]) => {
    setCategories((prev) => applyPackages(prev, ids));
    patchPreferences({
      packageIds: Array.from(new Set([...preferences.packageIds, ...ids])),
    });
    showFeedback(
      ids.length === 1
        ? 'Pacote adicionado ao seu catálogo. Nada do que já existia foi removido.'
        : `${ids.length} pacotes adicionados ao seu catálogo. Nada do que já existia foi removido.`
    );
  };

  const handleCreateExperiment = (experiment: Experiment) => {
    setExperiments((prev) => [experiment, ...prev]);
    showFeedback(
      'Observação criada. Ela aparece no Painel enquanto a janela estiver aberta — nada é enviado para fora do aparelho.'
    );
  };

  const handleCloseExperiment = (id: string, result: ExperimentResult, note: string) => {
    const now = new Date().toISOString();
    setExperiments((prev) =>
      prev.map((experiment) =>
        experiment.id === id
          ? {
              ...experiment,
              status: 'finished',
              result,
              resultNote: note.trim(),
              closedAt: now,
              updatedAt: now,
            }
          : experiment
      )
    );
    showFeedback('Conclusão registrada. A observação fica no histórico do Painel e no PDF.');
  };

  const handleRestartOnboarding = () => {
    persistOnboarding({
      status: 'in_progress',
      step: 0,
      skippedSteps: [],
      completedAt: null,
      lastSeenAt: new Date().toISOString(),
    });
    window.scrollTo({ top: 0, behavior: 'auto' });
  };

  const filteredEntries = useMemo(() => filterEntriesByPeriod(entries, period), [entries, period]);
  const analytics = useMemo(
    () => computeAnalytics(entries, categories, period),
    [entries, categories, period]
  );

  const handleNavigate = (tab: AppTab) => {
    setActiveTab(tab);
    setEditingEntry(null);
    if (tab !== 'registrar') {
      setFocusMode(false);
    }
    // Mudar de tela é um bom momento para reler o rascunho (outra aba pode tê-lo alterado).
    setDraft(loadFormDraft());
    window.scrollTo({ top: 0, behavior: preferences.reduceMotion ? 'auto' : 'smooth' });
  };

  const handleContinueDraft = () => {
    setEditingEntry(null);
    setReopenLevel(null);
    setActiveTab('registrar');
    window.scrollTo({ top: 0, behavior: preferences.reduceMotion ? 'auto' : 'smooth' });
  };

  /** Rascunho de ontem não pode ser salvo com a data errada por distração. */
  const handleMoveDraftToToday = () => {
    const current = loadFormDraft();
    if (!current) {
      setDraft(null);
      return;
    }
    const now = new Date();
    const moved = saveFormDraft({
      ...current.payload,
      date: toLocalIsoDate(now),
      time: `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`,
    });
    setDraft(moved);
    handleContinueDraft();
    showFeedback('Rascunho movido para hoje. Confira o que já estava respondido antes de salvar.');
  };

  const handleDiscardDraft = () => {
    clearFormDraft();
    setDraft(null);
    showFeedback('Rascunho descartado. Nenhum registro foi alterado.');
  };

  const handleSaveEntry = (entry: PulseEntry, isEdit: boolean) => {
    setReopenLevel(null);
    if (isEdit) {
      setEntries((prev) => prev.map((item) => (item.id === entry.id ? entry : item)));
      setEditingEntry(null);
      showFeedback('Registro atualizado e salvo localmente.');
      setActiveTab('historico');
    } else {
      setEntries((prev) => [entry, ...prev]);
      showFeedback(
        entry.entryType === EntryType.DAILY_CHECKIN
          ? 'Check-in diário salvo com segurança.'
          : 'Episódio registrado e salvo localmente.'
      );
    }
  };

  const handleEditEntry = (entry: PulseEntry) => {
    setEditingEntry(entry);
    setReopenLevel(null);
    setActiveTab('registrar');
    window.scrollTo({ top: 0, behavior: preferences.reduceMotion ? 'auto' : 'smooth' });
  };

  /**
   * Salva o registro e o reabre em edição no nível seguinte, para completar sem perder
   * o que já foi respondido. Não é um formulário novo: é o mesmo registro em aberto.
   */
  const handleSaveAndCompleteLater = (
    entry: PulseEntry,
    isEdit: boolean,
    nextLevel: RecordLevel
  ) => {
    if (isEdit) {
      setEntries((prev) => prev.map((item) => (item.id === entry.id ? entry : item)));
    } else {
      setEntries((prev) => [entry, ...prev]);
    }
    setEditingEntry(entry);
    setReopenLevel(nextLevel);
    setActiveTab('registrar');
    showFeedback('Registro salvo. Complete o que fizer sentido — o que já foi dito está guardado.');
    window.scrollTo({ top: 0, behavior: preferences.reduceMotion ? 'auto' : 'smooth' });
  };

  /** Cria um subitem direto do formulário e devolve o item persistido. */
  const handleCreateBehaviorItem = (
    categoryId: string,
    label: string
  ): { id: string; label: string } | null => {
    const trimmed = label.trim();
    if (!trimmed) return null;
    const category = categories.find((c) => c.id === categoryId);
    if (!category) return null;

    const normalize = (value: string) => value.trim().toLocaleLowerCase('pt-BR');
    const existing = category.items.find((item) => normalize(item.label) === normalize(trimmed));
    if (existing) {
      // Item existente mas desativado volta a ficar visível; nenhum id muda.
      if (!existing.active) {
        setCategories((prev) =>
          prev.map((c) =>
            c.id === categoryId
              ? {
                  ...c,
                  items: c.items.map((item) =>
                    item.id === existing.id ? { ...item, active: true } : item
                  ),
                }
              : c
          )
        );
      }
      return { id: existing.id, label: existing.label };
    }

    const newItem: BehaviorSubItem = {
      id: `item_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
      label: trimmed,
      active: true,
      // Item criado agora: a data é conhecida e registrada.
      createdAt: new Date().toISOString(),
    };
    setCategories((prev) =>
      prev.map((c) =>
        c.id === categoryId
          ? {
              ...c,
              items: [...c.items, newItem],
              version: 2,
              updatedAt: newItem.createdAt,
            }
          : c
      )
    );
    return { id: newItem.id, label: newItem.label };
  };

  const handleDeleteEntry = (id: string) => {
    setEntries((prev) => prev.filter((item) => item.id !== id));
    showFeedback('Registro removido do histórico.');
  };

  const handleLoadSampleData = () => {
    const sample = createSampleEntries();
    setEntries(sample);
    setPeriod('14');
    showFeedback('Exemplo ilustrativo de 14 dias carregado. Você pode editar ou limpar quando quiser.');
    if (activeTab === 'registrar') {
      setActiveTab('painel');
    }
  };

  const handleClearAllEntries = () => {
    setEntries([]);
    showFeedback('Todos os registros foram apagados deste navegador.');
  };

  const handleResetDefaultCategories = () => {
    setCategories(createDefaultCategories());
    showFeedback('Categorias e comportamentos padrão restaurados.');
  };

  const handleImportBackup = (
    importedEntries: PulseEntry[],
    importedCategories: BehaviorCategory[],
    importedPrefs?: UserPreferences,
    importedExperiments?: Experiment[]
  ) => {
    setEntries(importedEntries);
    setCategories(importedCategories);
    if (importedExperiments) setExperiments(importedExperiments);
    if (importedPrefs) {
      setPreferences((prev) => ({ ...prev, ...importedPrefs }));
    }
    showFeedback(`Backup restaurado com ${importedEntries.length} registro(s).`);
  };

  const setTheme = (theme: ThemeMode) => {
    setPreferences((prev) => ({ ...prev, theme }));
    const labels: Record<ThemeMode, string> = {
      [ThemeMode.LIGHT]: 'Tema claro ativado.',
      [ThemeMode.DARK]: 'Tema escuro ativado.',
      [ThemeMode.HIGH_CONTRAST]: 'Modo de alto contraste ativado.',
    };
    showFeedback(labels[theme]);
  };

  const toggleReduceMotion = () => {
    setPreferences((prev) => {
      const next = !prev.reduceMotion;
      showFeedback(next ? 'Animações reduzidas ativadas.' : 'Transições suaves restauradas.');
      return { ...prev, reduceMotion: next };
    });
  };

  const isFocusLayout = focusMode && activeTab === 'registrar';

  if (onboarding.status !== 'completed') {
    return (
      <Onboarding
        progress={onboarding}
        preferences={preferences}
        availablePackageIds={CATEGORY_PACKAGES.map((pkg) => pkg.id).filter(
          (id) => !preferences.packageIds.includes(id)
        )}
        onSaveProgress={persistOnboarding}
        onChangePreferences={patchPreferences}
        onApplyPackages={handleApplyPackages}
        onFinish={() => {
          setActiveTab('registrar');
          showFeedback(
            'Tudo pronto. Você pode ajustar qualquer escolha depois em Categorias — nada aqui é diagnóstico.'
          );
        }}
      />
    );
  }

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ backgroundColor: 'var(--bg-canvas)', color: 'var(--text-primary)' }}
    >
      {/* Barra superior contratual de 3 zonas (oculta no Modo de Foco para evitar distrações) */}
      {!isFocusLayout && (
        <header
          className="sticky top-0 z-30 border-b backdrop-blur-md"
          style={{
            backgroundColor: 'color-mix(in srgb, var(--bg-surface) 92%, transparent)',
            borderColor: 'var(--border-hairline)',
          }}
        >
          <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-8">
            {/* Zona 1: Marca (1 linha apenas) */}
            <a
              href="#inicio"
              onClick={(e) => {
                e.preventDefault();
                handleNavigate('registrar');
              }}
              className="text-xl font-bold tracking-tight whitespace-nowrap shrink-0 font-display"
              style={{ color: 'var(--color-primary-strong)' }}
            >
              PulseTrack
            </a>

            {/* Zona 2: Links de navegação limpos (Desktop) */}
            <nav aria-label="Navegação principal" className="hidden md:flex items-center gap-6">
              {DESKTOP_NAV_ITEMS.map((item) => {
                const active = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleNavigate(item.id)}
                    aria-current={active ? 'page' : undefined}
                    className="py-2 text-sm font-medium whitespace-nowrap shrink-0 border-b-2 transition-colors cursor-pointer"
                    style={{
                      color: active ? 'var(--color-primary-strong)' : 'var(--text-secondary)',
                      borderColor: active ? 'var(--color-primary-strong)' : 'transparent',
                    }}
                  >
                    {item.label}
                  </button>
                );
              })}
            </nav>

            {/* Zona 3: 1 ação primária */}
            <div className="flex items-center shrink-0">
              <button
                type="button"
                onClick={() => handleNavigate('relatorios')}
                className="min-h-[44px] px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap shrink-0 cursor-pointer"
                style={{
                  backgroundColor:
                    activeTab === 'relatorios' ? 'var(--color-accent)' : 'var(--color-primary-strong)',
                  color: activeTab === 'relatorios' ? 'var(--color-accent-ink)' : 'var(--color-primary-ink)',
                }}
              >
                Relatórios
              </button>
            </div>
          </div>
        </header>
      )}

      {/* Faixa de acessibilidade e conforto sensorial (abaixo do cabeçalho) */}
      {!isFocusLayout && (
        <div
          className="border-b"
          style={{
            backgroundColor: 'var(--bg-elevated)',
            borderColor: 'var(--border-hairline)',
          }}
        >
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-2.5 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Escolha de tema visual">
              <span className="text-xs font-medium mr-1" style={{ color: 'var(--text-muted)' }}>
                Aparência:
              </span>
              {[
                { id: ThemeMode.LIGHT, label: 'Claro' },
                { id: ThemeMode.DARK, label: 'Escuro' },
                { id: ThemeMode.HIGH_CONTRAST, label: 'Alto contraste' },
              ].map((t) => {
                const active = preferences.theme === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setTheme(t.id)}
                    aria-pressed={active}
                    className="min-h-[44px] px-3.5 py-1.5 rounded-lg border text-xs font-medium whitespace-nowrap shrink-0 cursor-pointer"
                    style={{
                      backgroundColor: active ? 'var(--color-primary-soft)' : 'var(--bg-surface)',
                      borderColor: active ? 'var(--color-primary-strong)' : 'var(--border-hairline)',
                      color: active ? 'var(--color-primary-strong)' : 'var(--text-secondary)',
                    }}
                  >
                    {t.label}
                  </button>
                );
              })}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={toggleReduceMotion}
                aria-pressed={preferences.reduceMotion}
                className="min-h-[44px] px-3.5 py-1.5 rounded-lg border text-xs font-medium whitespace-nowrap shrink-0 cursor-pointer"
                style={{
                  backgroundColor: preferences.reduceMotion ? 'var(--color-secondary-soft)' : 'var(--bg-surface)',
                  borderColor: preferences.reduceMotion ? 'var(--color-secondary)' : 'var(--border-hairline)',
                  color: preferences.reduceMotion ? 'var(--color-secondary-ink)' : 'var(--text-secondary)',
                }}
              >
                {preferences.reduceMotion ? 'Movimento reduzido: Ativo' : 'Reduzir movimento'}
              </button>

              <button
                type="button"
                onClick={() => handleNavigate('categorias')}
                className="md:hidden min-h-[44px] px-3.5 py-1.5 rounded-lg border text-xs font-medium inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
                style={{
                  backgroundColor: activeTab === 'categorias' ? 'var(--color-primary-soft)' : 'var(--bg-surface)',
                  borderColor: 'var(--border-hairline)',
                  color: 'var(--text-primary)',
                }}
              >
                <SlidersHorizontal className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Categorias</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Feedback visual e textual claro após ações */}
      <div aria-live="polite" className="max-w-6xl w-full mx-auto px-4 sm:px-6">
        {feedbackMessage && (
          <div
            className="mt-4 rounded-xl border px-4 py-3 flex items-center justify-between gap-3"
            style={{
              backgroundColor: 'var(--color-secondary-soft)',
              borderColor: 'var(--color-secondary)',
              color: 'var(--text-primary)',
            }}
          >
            <div className="flex items-center gap-2.5 text-sm sm:text-base font-medium">
              <CheckCircle2 className="w-5 h-5 shrink-0" style={{ color: 'var(--color-secondary)' }} aria-hidden="true" />
              <span>{feedbackMessage}</span>
            </div>
            <button
              type="button"
              onClick={() => setFeedbackMessage('')}
              aria-label="Fechar aviso"
              className="min-h-[48px] min-w-[48px] rounded-lg flex items-center justify-center cursor-pointer"
              style={{ color: 'var(--text-secondary)' }}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Área principal de conteúdo */}
      <main id="inicio" className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8 pb-24 md:pb-12">
        {activeTab === 'registrar' && (
          <DailyLogForm
            key={editingEntry?.id ?? 'new'}
            categories={categories}
            editingEntry={editingEntry}
            focusMode={focusMode}
            onToggleFocusMode={() => {
              setFocusMode((f) => {
                const next = !f;
                showFeedback(
                  next
                    ? 'Modo de foco ativado: distrações ocultadas.'
                    : 'Modo de foco desativado.'
                );
                return next;
              });
            }}
            entries={entries}
            onSaveEntry={handleSaveEntry}
            onCancelEdit={() => {
              setEditingEntry(null);
              showFeedback('Edição cancelada.');
            }}
            theme={preferences.theme}
            showSexualCategory={preferences.showSexualCategory}
            trackCycle={preferences.trackCycle}
            defaultRecordLevel={preferences.defaultRecordLevel}
            reduceMotion={preferences.reduceMotion}
            reopenLevel={reopenLevel}
            onCreateBehaviorItem={handleCreateBehaviorItem}
            onSaveAndCompleteLater={handleSaveAndCompleteLater}
            onDraftChange={(next) => {
              setDraft(next);
            }}
          />
        )}

        {activeTab === 'painel' && (
          <DashboardView
            analytics={analytics}
            totalAllEntries={entries.length}
            period={period}
            onChangePeriod={setPeriod}
            onNavigate={handleNavigate}
            onLoadSampleData={handleLoadSampleData}
            theme={preferences.theme}
            draft={draft}
            onContinueDraft={handleContinueDraft}
            onMoveDraftToToday={handleMoveDraftToToday}
            onDiscardDraft={handleDiscardDraft}
            experiments={experiments}
            entries={entries}
            onCloseExperiment={handleCloseExperiment}
          />
        )}

        {activeTab === 'insights' && (
          <InsightsView
            analytics={analytics}
            totalAllEntries={entries.length}
            period={period}
            onChangePeriod={setPeriod}
            onNavigate={handleNavigate}
            onCreateExperiment={handleCreateExperiment}
          />
        )}

        {activeTab === 'historico' && (
          <HistoryView
            entries={entries}
            categories={categories}
            onEditEntry={handleEditEntry}
            onDeleteEntry={handleDeleteEntry}
            onNavigate={handleNavigate}
            draft={draft}
            onContinueDraft={handleContinueDraft}
            onMoveDraftToToday={handleMoveDraftToToday}
            onDiscardDraft={handleDiscardDraft}
          />
        )}

        {activeTab === 'categorias' && (
          <CategoriesView
            categories={categories}
            entries={entries}
            experiments={experiments}
            preferences={preferences}
            onUpdateCategories={setCategories}
            onResetDefaultCategories={handleResetDefaultCategories}
            onImportBackup={handleImportBackup}
            onLoadSampleData={handleLoadSampleData}
            onClearAllEntries={handleClearAllEntries}
            onToggleFocusModeDefault={() => {
              setPreferences((prev) => {
                const next = !prev.focusModeDefault;
                setFocusMode(next);
                showFeedback(
                  next
                    ? 'A aba Registrar iniciará em Modo de Foco por padrão.'
                    : 'A aba Registrar iniciará com visualização completa por padrão.'
                );
                return { ...prev, focusModeDefault: next };
              });
            }}
            onToggleShowSexualCategory={() => {
              setPreferences((prev) => {
                const next = !prev.showSexualCategory;
                showFeedback(
                  next
                    ? 'Bloco de comportamentos sexuais agora aparece no formulário.'
                    : 'Bloco de comportamentos sexuais ocultado do formulário.'
                );
                return { ...prev, showSexualCategory: next };
              });
            }}
            onToggleTrackCycle={() => {
              setPreferences((prev) => {
                const next = !prev.trackCycle;
                showFeedback(
                  next
                    ? 'Acompanhamento de fase do ciclo ativado no formulário.'
                    : 'Acompanhamento de fase do ciclo desativado.'
                );
                return { ...prev, trackCycle: next };
              });
            }}
            onRestartOnboarding={handleRestartOnboarding}
            onFeedback={showFeedback}
          />
        )}

        {activeTab === 'relatorios' && (
          <ReportsView
            filteredEntries={filteredEntries}
            analytics={analytics}
            totalAllEntries={entries.length}
            period={period}
            onChangePeriod={setPeriod}
            reportLabel={preferences.reportLabel}
            onChangeReportLabel={(val) => setPreferences((prev) => ({ ...prev, reportLabel: val }))}
            onNavigate={handleNavigate}
            onFeedback={showFeedback}
            experiments={experiments}
          />
        )}
      </main>

      {/* Rodapé discreto (Desktop) */}
      {!isFocusLayout && (
        <footer
          className="hidden md:block border-t py-6 text-sm"
          style={{ borderColor: 'var(--border-hairline)', color: 'var(--text-muted)' }}
        >
          <div className="max-w-6xl mx-auto px-6 flex flex-wrap items-center justify-between gap-4">
            <span>PulseTrack · Espaço seguro de auto-observação offline (dados salvos apenas no seu dispositivo).</span>
            <span>Ferramenta de apoio pessoal — não substitui avaliação médica ou psicológica.</span>
          </div>
        </footer>
      )}

      {/* Navegação inferior ergonômica para celular (<= 64px de altura, zona natural do polegar) */}
      {!isFocusLayout && (
        <nav
          aria-label="Navegação mobile"
          className="md:hidden fixed bottom-0 left-0 right-0 z-40 border-t backdrop-blur-md"
          style={{
            backgroundColor: 'color-mix(in srgb, var(--bg-surface) 95%, transparent)',
            borderColor: 'var(--border-hairline)',
          }}
        >
          <div className="grid grid-cols-5 h-16">
            {[
              { id: 'registrar' as AppTab, label: 'Registrar', icon: ClipboardPlus },
              { id: 'painel' as AppTab, label: 'Painel', icon: BarChart3 },
              { id: 'insights' as AppTab, label: 'Insights', icon: Lightbulb },
              { id: 'historico' as AppTab, label: 'Histórico', icon: Clock },
              { id: 'relatorios' as AppTab, label: 'PDF/CSV', icon: FileText },
            ].map((item) => {
              const Icon = item.icon;
              const active = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleNavigate(item.id)}
                  aria-current={active ? 'page' : undefined}
                  className="flex flex-col items-center justify-center gap-0.5 px-1 cursor-pointer"
                  style={{
                    color: active ? 'var(--color-primary-strong)' : 'var(--text-secondary)',
                  }}
                >
                  <Icon className="w-5 h-5" aria-hidden="true" />
                  <span className="text-[11px] font-medium whitespace-nowrap">{item.label}</span>
                </button>
              );
            })}
          </div>
        </nav>
      )}
    </div>
  );
}
