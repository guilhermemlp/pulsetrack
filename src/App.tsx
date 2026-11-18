import { useEffect, useMemo, useState } from 'react';
import {
  BarChart3,
  CheckCircle2,
  ClipboardPlus,
  Clock,
  FileText,
  FlaskConical,
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
import { SampleDataConfirm } from './components/SampleDataConfirm';
import {
  createDefaultCategories,
  createSampleEntries,
  isSampleEntry,
} from './data/defaults';
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
import { downloadJson } from './utils/download';
import {
  applyBackup,
  BackupPayload,
  buildBackupJson,
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

const PRIMARY_NAV_ITEMS: Array<{ id: AppTab; label: string; icon: any }> = [
  { id: 'registrar', label: 'Registrar', icon: ClipboardPlus },
  { id: 'visao', label: 'Visão geral', icon: BarChart3 },
  { id: 'diario', label: 'Diário', icon: Clock },
  { id: 'analises', label: 'Análises', icon: Lightbulb },
  { id: 'ajustes', label: 'Ajustes', icon: SlidersHorizontal },
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
  const [analysisView, setAnalysisView] = useState<'insights' | 'relatorios'>('insights');
  const [period, setPeriod] = useState<PeriodFilter>('14');
  /** Filtros compartilhados do ambiente de Análises. */
  const [analysisCategories, setAnalysisCategories] = useState<string[]>([]);
  const [analysisEntryTypes, setAnalysisEntryTypes] = useState<EntryType[]>([]);
  const [editingEntry, setEditingEntry] = useState<PulseEntry | null>(null);
  /** Nível em que o registro reabre ao "salvar e completar depois". */
  const [reopenLevel, setReopenLevel] = useState<RecordLevel | null>(null);
  const [focusMode, setFocusMode] = useState<boolean>(() => preferences.focusModeDefault);
  const [feedbackMessage, setFeedbackMessage] = useState<string>('');
  /** Confirmação pendente para substituir registros reais pelos exemplos. */
  const [sampleRequest, setSampleRequest] = useState<{
    entriesCount: number;
    sampleCount: number;
  } | null>(null);
  const [sampleError, setSampleError] = useState('');
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
    // Usa o estado anterior: dois cliques seguidos não podem perder o primeiro pacote.
    setPreferences((prev) => ({
      ...prev,
      packageIds: Array.from(new Set([...prev.packageIds, ...ids])),
    }));
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
      version: 2,
      status: 'in_progress',
      step: 0,
      skippedSteps: [],
      completedAt: null,
      lastSeenAt: new Date().toISOString(),
    });
    window.scrollTo({ top: 0, behavior: 'auto' });
  };

  const analytics = useMemo(
    () => computeAnalytics(entries, categories, period),
    [entries, categories, period]
  );

  const analysisFilters = useMemo(
    () => ({ categoryIds: analysisCategories, entryTypes: analysisEntryTypes }),
    [analysisCategories, analysisEntryTypes]
  );
  const analysisAnalytics = useMemo(
    () => computeAnalytics(entries, categories, period, analysisFilters),
    [entries, categories, period, analysisFilters]
  );
  const analysisFilteredEntries = useMemo(() => {
    let base = filterEntriesByPeriod(entries, period);
    if (analysisEntryTypes.length) {
      base = base.filter((entry) => analysisEntryTypes.includes(entry.entryType));
    }
    if (analysisCategories.length) {
      base = base.filter((entry) =>
        entry.behaviors.some((behavior) => analysisCategories.includes(behavior.categoryId))
      );
    }
    return base;
  }, [entries, period, analysisEntryTypes, analysisCategories]);

  const handleNavigate = (tab: AppTab) => {
    setActiveTab(tab);
    setEditingEntry(null);
    if (tab === 'analises') setAnalysisView('insights');
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

  /**
   * Grava de forma síncrona antes de limpar o rascunho: se o armazenamento local
   * recusar (quota, modo privado), a pessoa não perde o que respondeu.
   */
  const persistEntriesOrWarn = (next: PulseEntry[]): boolean => {
    if (!saveEntries(next)) {
      showFeedback(
        'Não foi possível gravar no armazenamento local. Suas respostas continuam na tela — libere espaço e tente novamente.'
      );
      return false;
    }
    setEntries(next);
    return true;
  };

  const handleSaveEntry = (entry: PulseEntry, isEdit: boolean): boolean => {
    setReopenLevel(null);
    const next = isEdit
      ? entries.map((item) => (item.id === entry.id ? entry : item))
      : [entry, ...entries];
    if (!persistEntriesOrWarn(next)) return false;

    if (isEdit) {
      setEditingEntry(null);
      showFeedback('Registro atualizado e salvo localmente.');
      setActiveTab('diario');
    } else {
      showFeedback(
        entry.entryType === EntryType.DAILY_CHECKIN
          ? 'Check-in diário salvo com segurança.'
          : 'Registro de comportamento salvo localmente.'
      );
    }
    return true;
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
  ): boolean => {
    const next = isEdit
      ? entries.map((item) => (item.id === entry.id ? entry : item))
      : [entry, ...entries];
    if (!persistEntriesOrWarn(next)) return false;

    setEditingEntry(entry);
    setReopenLevel(nextLevel);
    setActiveTab('registrar');
    showFeedback('Registro salvo. Complete o que fizer sentido — o que já foi dito está guardado.');
    window.scrollTo({ top: 0, behavior: preferences.reduceMotion ? 'auto' : 'smooth' });
    return true;
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

  /** Grava os exemplos de forma síncrona; devolve `false` sem alterar o estado em falha. */
  const loadSampleEntries = (): boolean => {
    const sample = createSampleEntries();
    if (!persistEntriesOrWarn(sample)) return false;
    setPeriod('14');
    showFeedback(
      'Dados de exemplo carregados: 14 registros ilustrativos identificados no topo do app. Você pode removê-los sem apagar registros reais.'
    );
    if (activeTab === 'registrar') {
      setActiveTab('visao');
    }
    return true;
  };

  /**
   * Com registros existentes, nunca substitui direto: abre confirmação com contagens.
   * Sem registros, a ação explícita já é segura e carrega os exemplos imediatamente.
   */
  const handleRequestLoadSampleData = () => {
    if (entries.length === 0) {
      loadSampleEntries();
      return;
    }
    setSampleError('');
    setSampleRequest({
      entriesCount: entries.length,
      sampleCount: createSampleEntries().length,
    });
  };

  const handleDownloadSampleBackup = () => {
    const content = buildBackupJson(entries, categories, preferences, experiments);
    const ok = downloadJson(
      content,
      `PulseTrack_Backup_Antes_dos_Exemplos_${toLocalIsoDate()}.json`
    );
    if (!ok) {
      setSampleError(
        'Não foi possível gerar a cópia dos dados atuais neste navegador. Nada foi alterado.'
      );
      return;
    }
    setSampleError('');
    showFeedback('Cópia dos dados atuais baixada antes de carregar os exemplos.');
  };

  const handleConfirmLoadSampleData = () => {
    const content = buildBackupJson(entries, categories, preferences, experiments);
    const downloaded = downloadJson(
      content,
      `PulseTrack_Backup_Antes_dos_Exemplos_${toLocalIsoDate()}.json`
    );
    if (!downloaded) {
      setSampleError(
        'Não foi possível gerar a cópia dos dados atuais. Os exemplos não foram carregados e nada foi alterado.'
      );
      return;
    }
    if (!loadSampleEntries()) {
      setSampleError(
        'Não foi possível gravar os registros de exemplo. Seus dados atuais continuam salvos e nada foi alterado.'
      );
      return;
    }
    setSampleRequest(null);
    setSampleError('');
  };

  /** Remove apenas os registros ilustrativos, preservando qualquer registro real. */
  const handleRemoveSampleEntries = () => {
    const next = entries.filter((entry) => !isSampleEntry(entry));
    if (next.length === entries.length) return;
    if (!persistEntriesOrWarn(next)) return;
    if (editingEntry && isSampleEntry(editingEntry)) setEditingEntry(null);
    const removed = entries.length - next.length;
    showFeedback(
      `${removed} registro(s) de exemplo removido(s). Seus registros reais foram mantidos.`
    );
  };

  const handleClearAllEntries = () => {
    setEntries([]);
    showFeedback('Todos os registros foram apagados deste navegador.');
  };

  const handleResetDefaultCategories = () => {
    setCategories(createDefaultCategories());
    showFeedback('Categorias e comportamentos padrão restaurados.');
  };

  /**
   * Aplica o backup somente depois da confirmação. A gravação é síncrona e atômica:
   * se qualquer chave falhar, `applyBackup` restaura o conteúdo anterior e o estado
   * do React não é alterado.
   */
  const handleImportBackup = (backup: BackupPayload): boolean => {
    if (!applyBackup(backup)) {
      showFeedback(
        'Não foi possível gravar o backup. Nada foi alterado; os dados atuais continuam salvos.'
      );
      return false;
    }

    setEntries(backup.entries);
    setCategories(backup.categories);
    setExperiments(backup.experiments);
    setPreferences(backup.preferences);
    showFeedback(
      `Backup importado: ${backup.entries.length} registro(s), ${backup.categories.length} categoria(s) e ${backup.experiments.length} experimento(s) substituíram os dados anteriores.`
    );
    return true;
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
  const sampleEntryCount = entries.filter(isSampleEntry).length;

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
            'Tudo pronto. Ajuste foco e profundidade em Categorias; tema e movimento ficam no topo do app.'
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
      <a
        href="#inicio"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 min-h-[44px] px-4 py-2 rounded-lg font-medium"
        style={{
          backgroundColor: 'var(--color-primary-strong)',
          color: 'var(--color-primary-ink)',
        }}
      >
        Pular para o conteúdo principal
      </a>
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

            {/* Navegação principal migrou para a barra lateral no desktop. */}

            {/* Zona 3: 1 ação primária */}
            <div className="flex items-center shrink-0">
              <button
                type="button"
                onClick={() => {
                  handleNavigate('analises');
                  setAnalysisView('relatorios');
                }}
                className="min-h-[44px] px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap shrink-0 cursor-pointer"
                style={{
                  backgroundColor:
                    activeTab === 'analises' && analysisView === 'relatorios'
                      ? 'var(--color-accent)'
                      : 'var(--color-primary-strong)',
                  color:
                    activeTab === 'analises' && analysisView === 'relatorios'
                      ? 'var(--color-accent-ink)'
                      : 'var(--color-primary-ink)',
                }}
              >
                Relatórios
              </button>
            </div>
          </div>
        </header>
      )}

      <div className="flex flex-1 w-full">
        {!isFocusLayout && (
          <aside
            aria-label="Navegação principal"
            className="hidden md:flex w-64 shrink-0 flex-col border-r"
            style={{
              backgroundColor: 'var(--bg-surface)',
              borderColor: 'var(--border-hairline)',
            }}
          >
            <div className="px-4 py-4 border-b" style={{ borderColor: 'var(--border-hairline)' }}>
              <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
                PulseTrack
              </p>
              <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
                Observação pessoal
              </p>
            </div>
            <nav className="flex flex-col gap-1 p-3" aria-label="Áreas principais">
              {PRIMARY_NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                const active = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleNavigate(item.id)}
                    aria-current={active ? 'page' : undefined}
                    className="min-h-[44px] px-3 rounded-xl flex items-center gap-3 text-sm font-medium cursor-pointer"
                    style={{
                      backgroundColor: active ? 'var(--color-primary-soft)' : 'transparent',
                      color: active ? 'var(--color-primary-strong)' : 'var(--text-secondary)',
                    }}
                  >
                    <Icon className="w-5 h-5" aria-hidden="true" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>
            <div className="mt-auto p-3">
              <button
                type="button"
                onClick={() => {
                  handleNavigate('analises');
                  setAnalysisView('relatorios');
                }}
                className="min-h-[44px] w-full px-3 rounded-xl flex items-center gap-3 text-sm font-medium cursor-pointer"
                style={{
                  backgroundColor:
                    activeTab === 'analises' && analysisView === 'relatorios'
                      ? 'var(--color-accent)'
                      : 'var(--bg-elevated)',
                  color:
                    activeTab === 'analises' && analysisView === 'relatorios'
                      ? 'var(--color-accent-ink)'
                      : 'var(--text-primary)',
                }}
              >
                <FileText className="w-5 h-5" aria-hidden="true" />
                <span>Relatórios</span>
              </button>
            </div>
          </aside>
        )}
        <div className="flex-1 min-w-0 flex flex-col">
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
                onClick={() => handleNavigate('ajustes')}
                className="md:hidden min-h-[44px] px-3.5 py-1.5 rounded-lg border text-xs font-medium inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
                style={{
                  backgroundColor: activeTab === 'ajustes' ? 'var(--color-primary-soft)' : 'var(--bg-surface)',
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

      {/* Dados ilustrativos ficam identificados e podem ser removidos sem tocar nos reais. */}
      {!isFocusLayout && sampleEntryCount > 0 && (
        <div className="max-w-6xl w-full mx-auto px-4 sm:px-6">
          <div
            role="status"
            className="mt-4 rounded-xl border px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
            style={{
              backgroundColor: 'var(--color-primary-soft)',
              borderColor: 'var(--color-primary)',
              color: 'var(--text-primary)',
            }}
          >
            <div className="flex items-start gap-2.5">
              <FlaskConical
                className="w-5 h-5 shrink-0 mt-0.5"
                style={{ color: 'var(--color-primary-strong)' }}
                aria-hidden="true"
              />
              <div className="space-y-0.5">
                <p className="text-sm font-semibold">Dados de exemplo em uso</p>
                <p className="text-xs sm:text-sm" style={{ color: 'var(--text-secondary)' }}>
                  {sampleEntryCount === entries.length
                    ? `Todos os ${entries.length} registros são ilustrativos. Relatórios e métricas refletem apenas o exemplo.`
                    : `${sampleEntryCount} de ${entries.length} registros são ilustrativos. Relatórios e métricas incluem esses exemplos.`}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleRemoveSampleEntries}
              className="min-h-[48px] px-4 py-2 rounded-xl border text-sm font-medium shrink-0 cursor-pointer"
              style={{
                backgroundColor: 'var(--bg-surface)',
                borderColor: 'var(--color-primary)',
                color: 'var(--text-primary)',
              }}
            >
              Remover dados de exemplo
            </button>
          </div>
        </div>
      )}

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
            focusAreas={preferences.focusAreas}
            reduceMotion={preferences.reduceMotion}
            reopenLevel={reopenLevel}
            onCreateBehaviorItem={handleCreateBehaviorItem}
            onSaveAndCompleteLater={handleSaveAndCompleteLater}
            onDraftChange={(next) => {
              setDraft(next);
            }}
          />
        )}

        {activeTab === 'analises' && (
          <section
            className="mb-6 rounded-2xl border p-4 sm:p-5 space-y-4"
            style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-hairline)' }}
            aria-label="Filtros compartilhados das análises"
          >
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <h2 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
                Filtros compartilhados
              </h2>
              <button
                type="button"
                onClick={() => {
                  setAnalysisCategories([]);
                  setAnalysisEntryTypes([]);
                }}
                className="min-h-[40px] px-3 py-1.5 rounded-lg border text-sm font-medium cursor-pointer"
                style={{
                  backgroundColor: 'var(--bg-elevated)',
                  borderColor: 'var(--border-hairline)',
                  color: 'var(--text-secondary)',
                }}
              >
                Limpar filtros
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <fieldset className="space-y-2">
                <legend className="text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
                  Categorias de comportamento
                </legend>
                <div className="flex flex-wrap gap-2">
                  {categories.map((category) => {
                    const active = analysisCategories.includes(category.id);
                    return (
                      <label
                        key={category.id}
                        className="inline-flex items-center gap-2 min-h-[40px] px-3 rounded-lg border cursor-pointer text-sm"
                        style={{
                          backgroundColor: active ? 'var(--color-primary-soft)' : 'var(--bg-elevated)',
                          borderColor: active ? 'var(--color-primary-strong)' : 'var(--border-hairline)',
                          color: 'var(--text-primary)',
                        }}
                      >
                        <input
                          type="checkbox"
                          className="sr-only"
                          checked={active}
                          onChange={() =>
                            setAnalysisCategories((prev) =>
                              active
                                ? prev.filter((id) => id !== category.id)
                                : [...prev, category.id]
                            )
                          }
                        />
                        {category.name}
                      </label>
                    );
                  })}
                </div>
              </fieldset>

              <fieldset className="space-y-2">
                <legend className="text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
                  Tipo de registro
                </legend>
                <div className="flex flex-wrap gap-2">
                  {(
                    [
                      { id: EntryType.DAILY_CHECKIN, label: 'Check-in diário' },
                      { id: EntryType.EPISODE, label: 'Registro de comportamento' },
                    ] as const
                  ).map((type) => {
                    const active = analysisEntryTypes.includes(type.id);
                    return (
                      <label
                        key={type.id}
                        className="inline-flex items-center gap-2 min-h-[40px] px-3 rounded-lg border cursor-pointer text-sm"
                        style={{
                          backgroundColor: active ? 'var(--color-primary-soft)' : 'var(--bg-elevated)',
                          borderColor: active ? 'var(--color-primary-strong)' : 'var(--border-hairline)',
                          color: 'var(--text-primary)',
                        }}
                      >
                        <input
                          type="checkbox"
                          className="sr-only"
                          checked={active}
                          onChange={() =>
                            setAnalysisEntryTypes((prev) =>
                              active
                                ? prev.filter((id) => id !== type.id)
                                : [...prev, type.id]
                            )
                          }
                        />
                        {type.label}
                      </label>
                    );
                  })}
                </div>
              </fieldset>
            </div>
          </section>
        )}

        {activeTab === 'analises' && (
          <div className="mb-6 flex flex-wrap gap-2" role="tablist" aria-label="Subáreas de Análises">
            {[
              { id: 'insights' as const, label: 'Insights e tendências' },
              { id: 'relatorios' as const, label: 'Relatórios e exportação' },
            ].map((item) => {
              const active = analysisView === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setAnalysisView(item.id)}
                  className="min-h-[44px] px-4 py-2 rounded-xl border text-sm font-medium cursor-pointer"
                  style={{
                    backgroundColor: active ? 'var(--color-primary-soft)' : 'var(--bg-surface)',
                    borderColor: active ? 'var(--color-primary-strong)' : 'var(--border-hairline)',
                    color: active ? 'var(--color-primary-strong)' : 'var(--text-secondary)',
                  }}
                >
                  {item.label}
                </button>
              );
            })}
          </div>
        )}

        {activeTab === 'visao' && (
          <DashboardView
            analytics={analytics}
            totalAllEntries={entries.length}
            period={period}
            onChangePeriod={setPeriod}
            onNavigate={handleNavigate}
            onLoadSampleData={handleRequestLoadSampleData}
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

        {activeTab === 'analises' && analysisView === 'insights' && (
          <InsightsView
            analytics={analysisAnalytics}
            totalAllEntries={analysisFilteredEntries.length}
            period={period}
            onChangePeriod={setPeriod}
            onNavigate={handleNavigate}
            onCreateExperiment={handleCreateExperiment}
          />
        )}

        {activeTab === 'diario' && (
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

        {activeTab === 'ajustes' && (
          <CategoriesView
            categories={categories}
            entries={entries}
            experiments={experiments}
            preferences={preferences}
            onChangePreferences={patchPreferences}
            onUpdateCategories={setCategories}
            onResetDefaultCategories={handleResetDefaultCategories}
            onImportBackup={handleImportBackup}
            onLoadSampleData={handleRequestLoadSampleData}
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

        {activeTab === 'analises' && analysisView === 'relatorios' && (
          <ReportsView
            filteredEntries={analysisFilteredEntries}
            analytics={analysisAnalytics}
            totalAllEntries={analysisFilteredEntries.length}
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

        </div>
      </div>

      {/* Rodapé discreto (Desktop) */}
      {!isFocusLayout && (
        <footer
          className="hidden md:block border-t py-6 text-sm"
          style={{ borderColor: 'var(--border-hairline)', color: 'var(--text-muted)' }}
        >
          <div className="max-w-6xl mx-auto px-6 flex flex-wrap items-center justify-between gap-4">
            <span>PulseTrack · Espaço seguro de auto-observação (dados salvos apenas neste navegador).</span>
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
              { id: 'visao' as AppTab, label: 'Visão', icon: BarChart3 },
              { id: 'diario' as AppTab, label: 'Diário', icon: Clock },
              { id: 'analises' as AppTab, label: 'Análises', icon: Lightbulb },
              { id: 'ajustes' as AppTab, label: 'Ajustes', icon: SlidersHorizontal },
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

      {sampleRequest && (
        <SampleDataConfirm
          entriesCount={sampleRequest.entriesCount}
          sampleCount={sampleRequest.sampleCount}
          categoriesCount={categories.length}
          experimentsCount={experiments.length}
          error={sampleError}
          onDownloadBackup={handleDownloadSampleBackup}
          onConfirm={handleConfirmLoadSampleData}
          onCancel={() => {
            setSampleRequest(null);
            setSampleError('');
          }}
        />
      )}
    </div>
  );
}
