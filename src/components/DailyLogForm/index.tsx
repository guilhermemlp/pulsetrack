import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivationSignal,
  AwarenessType,
  BehaviorCategory,
  BehaviorMode,
  CyclePhase,
  EntryType,
  FunctionalImpactLevel,
  MedicationStatus,
  MoodStateId,
  MoodSwingDirection,
  MoodSwingWindow,
  PulseEntry,
  RecordLevel,
  ReducedSleepNeed,
  ResistanceResult,
  SafetyConcern,
  SelectedBehavior,
  SleepQuality,
  StateDuration,
  ThemeMode,
} from '../../types/pulsetrack';
import { ACTIVATION_SIGNAL_OPTIONS, MOOD_DEFINITIONS } from '../../data/defaults';
import { toLocalIsoDate } from '../../utils/analytics';
import {
  clearFormDraft,
  FormDraft,
  loadFormDraft,
  saveFormDraft,
} from '../../utils/storage';
import { formatDraftTime } from '../../utils/draft';
import { getRecentBehaviors } from '../../utils/recentBehaviors';
import { ActivationSection } from './ActivationSection';
import {
  BehaviorSection,
  CreatedBehaviorItem,
  QuickImpulseAnswer,
} from './BehaviorSection';
import { CollapsibleSection } from '../CollapsibleSection';
import { DepthSwitch } from './DepthSwitch';
import { FormActions, FormHeaderActions } from './FormActions';
import { ImpactSection } from './ImpactSection';
import { MoodSection } from './MoodSection';
import { SafetySection } from './SafetySection';

interface DailyLogFormProps {
  categories: BehaviorCategory[];
  /** Registros já salvos: alimentam a faixa "Últimos usados" do Pilar 3. */
  entries: PulseEntry[];
  editingEntry: PulseEntry | null;
  focusMode: boolean;
  onToggleFocusMode: () => void;
  onSaveEntry: (entry: PulseEntry, isEdit: boolean) => void;
  onCancelEdit: () => void;
  theme: ThemeMode;
  /** Bloco de comportamentos sexuais só aparece se ativado nas preferências. */
  showSexualCategory: boolean;
  /** Fase do ciclo só aparece se o acompanhamento estiver ativado. */
  trackCycle: boolean;
  /** Profundidade inicial (preferência), usada quando não se está editando um registro. */
  defaultRecordLevel: RecordLevel;
  reduceMotion: boolean;
  /** Nível em que um registro salvo para "completar depois" deve reabrir. */
  reopenLevel?: RecordLevel | null;
  /** Cria um subitem na categoria e devolve o item persistido. */
  onCreateBehaviorItem: (categoryId: string, label: string) => CreatedBehaviorItem | null;
  /** Salva agora e reabre o registro em edição para completar depois. */
  onSaveAndCompleteLater: (entry: PulseEntry, isEdit: boolean, nextLevel: RecordLevel) => void;
  /** Avisa o app quando o rascunho muda (para os cards de "Continuar registro"). */
  onDraftChange: (draft: FormDraft | null) => void;
}

function getCurrentDateStr(): string {
  return toLocalIsoDate(new Date());
}

function getCurrentTimeStr(): string {
  const now = new Date();
  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}

/** Lê um valor do rascunho apenas se for do tipo esperado. */
function readDraft<T>(payload: Record<string, unknown> | undefined, key: string, fallback: T): T {
  if (!payload || !(key in payload)) return fallback;
  const value = payload[key];
  if (value === null) return null as unknown as T;
  if (Array.isArray(fallback)) return (Array.isArray(value) ? value : fallback) as T;
  if (typeof fallback === 'number') return (typeof value === 'number' ? value : fallback) as T;
  if (typeof fallback === 'string') return (typeof value === 'string' ? value : fallback) as T;
  if (typeof fallback === 'boolean') return (typeof value === 'boolean' ? value : fallback) as T;
  return (typeof value === 'string' ? value : fallback) as T;
}

/**
 * Componente principal do registro diário.
 * Orquestra os 3 pilares (Estado Emocional, Estado de Ativação/Sono e Comportamento),
 * o item de segurança, o impacto funcional e o modo de foco / check-in rápido.
 *
 * Nenhum campo começa com valor assumido: o que não for respondido fica `null`.
 */
export const DailyLogForm: React.FC<DailyLogFormProps> = ({
  categories,
  entries,
  editingEntry,
  focusMode,
  onToggleFocusMode,
  onSaveEntry,
  onCancelEdit,
  theme,
  showSexualCategory,
  trackCycle,
  defaultRecordLevel,
  reduceMotion,
  reopenLevel = null,
  onCreateBehaviorItem,
  onSaveAndCompleteLater,
  onDraftChange,
}) => {
  const draft = useMemo(() => (editingEntry ? null : loadFormDraft()), [editingEntry]);
  const draftPayload = draft?.payload;

  const [draftRestored, setDraftRestored] = useState<boolean>(Boolean(draft));
  /** Momento do último salvamento automático (ISO) — mostrado como "rascunho salvo às HH:mm". */
  const [draftSavedAt, setDraftSavedAt] = useState<string | null>(draft?.savedAt ?? null);
  /** Valor exibido: atualizado a cada 30 s ou ao sair do formulário, não a cada tecla. */
  const [shownDraftSavedAt, setShownDraftSavedAt] = useState<string | null>(
    draft?.savedAt ?? null
  );
  const draftSavedAtRef = useRef<string | null>(draft?.savedAt ?? null);
  const onDraftChangeRef = useRef(onDraftChange);
  onDraftChangeRef.current = onDraftChange;

  const syncDraftTimestamp = useCallback(() => {
    setShownDraftSavedAt(draftSavedAtRef.current);
  }, []);

  // O texto é atualizado em intervalos (e no blur) para a região viva não anunciar cada tecla.
  useEffect(() => {
    if (!draftSavedAt) return;
    const timer = window.setInterval(syncDraftTimestamp, 30000);
    return () => window.clearInterval(timer);
  }, [draftSavedAt, syncDraftTimestamp]);
  /** Profundidade escolhida: nunca é inferida dos campos preenchidos. */
  const [level, setLevel] = useState<RecordLevel>(
    () => editingEntry?.depth ?? defaultRecordLevel
  );
  const [quickImpulseAnswer, setQuickImpulseAnswer] = useState<QuickImpulseAnswer>(null);
  const [moodError, setMoodError] = useState<string | null>(null);

  const [entryType, setEntryType] = useState<EntryType>(EntryType.DAILY_CHECKIN);
  const [date, setDate] = useState<string>(() => readDraft<string>(draftPayload, 'date', getCurrentDateStr()));
  const [time, setTime] = useState<string>(() => readDraft<string>(draftPayload, 'time', getCurrentTimeStr()));

  // Pilar 1: Estado Emocional
  const [moods, setMoods] = useState<MoodStateId[]>(() => readDraft<MoodStateId[]>(draftPayload, 'moods', []));
  const [moodIntensity, setMoodIntensity] = useState<Record<string, number>>(() =>
    readDraft<Record<string, number>>(draftPayload, 'moodIntensity', {})
  );
  const [moodOtherText, setMoodOtherText] = useState<string>(() =>
    readDraft<string>(draftPayload, 'moodOtherText', '')
  );
  const [valence, setValence] = useState<number | null>(() => readDraft<number | null>(draftPayload, 'valence', null));
  const [hadMoodSwing, setHadMoodSwing] = useState<boolean>(() =>
    readDraft<boolean>(draftPayload, 'hadMoodSwing', false)
  );
  const [moodSwingDirection, setMoodSwingDirection] = useState<MoodSwingDirection | null>(() =>
    readDraft<MoodSwingDirection | null>(draftPayload, 'moodSwingDirection', null)
  );
  const [moodSwingWindow, setMoodSwingWindow] = useState<MoodSwingWindow | null>(() =>
    readDraft<MoodSwingWindow | null>(draftPayload, 'moodSwingWindow', null)
  );
  const [moodSwingDescription, setMoodSwingDescription] = useState<string>(() =>
    readDraft<string>(draftPayload, 'moodSwingDescription', '')
  );

  // Pilar 2: Estado de Ativação e Sono
  const [energyLevel, setEnergyLevel] = useState<number | null>(() =>
    readDraft<number | null>(draftPayload, 'energyLevel', null)
  );
  const [sleepHours, setSleepHours] = useState<number | null>(() =>
    readDraft<number | null>(draftPayload, 'sleepHours', null)
  );
  const [sleepQuality, setSleepQuality] = useState<SleepQuality | null>(() =>
    readDraft<SleepQuality | null>(draftPayload, 'sleepQuality', null)
  );
  const [reducedSleepNeed, setReducedSleepNeed] = useState<ReducedSleepNeed | null>(() =>
    readDraft<ReducedSleepNeed | null>(draftPayload, 'reducedSleepNeed', null)
  );
  const [noFatigueAfterShortSleep, setNoFatigueAfterShortSleep] = useState<boolean | null>(() =>
    readDraft<boolean | null>(draftPayload, 'noFatigueAfterShortSleep', null)
  );
  const [bedTime, setBedTime] = useState<string>(() => readDraft<string>(draftPayload, 'bedTime', ''));
  const [wakeTime, setWakeTime] = useState<string>(() => readDraft<string>(draftPayload, 'wakeTime', ''));
  const [latencyMinutes, setLatencyMinutes] = useState<number | null>(() =>
    readDraft<number | null>(draftPayload, 'latencyMinutes', null)
  );
  const [awakenings, setAwakenings] = useState<number | null>(() =>
    readDraft<number | null>(draftPayload, 'awakenings', null)
  );
  const [stateDuration, setStateDuration] = useState<StateDuration | null>(() =>
    readDraft<StateDuration | null>(draftPayload, 'stateDuration', null)
  );
  const [activationSignals, setActivationSignals] = useState<ActivationSignal[]>(() =>
    readDraft<ActivationSignal[]>(draftPayload, 'activationSignals', [])
  );

  // Pilar 3: Comportamento
  const [triggerContext, setTriggerContext] = useState<string>(() =>
    readDraft<string>(draftPayload, 'triggerContext', '')
  );
  const [behaviors, setBehaviors] = useState<SelectedBehavior[]>(() =>
    readDraft<SelectedBehavior[]>(draftPayload, 'behaviors', [])
  );
  const [behaviorOtherText, setBehaviorOtherText] = useState<string>(() =>
    readDraft<string>(draftPayload, 'behaviorOtherText', '')
  );
  const [awareness, setAwareness] = useState<AwarenessType | null>(() =>
    readDraft<AwarenessType | null>(draftPayload, 'awareness', null)
  );
  const [resisted, setResisted] = useState<ResistanceResult | null>(() =>
    readDraft<ResistanceResult | null>(draftPayload, 'resisted', null)
  );
  const [urgeIntensity, setUrgeIntensity] = useState<number | null>(() =>
    readDraft<number | null>(draftPayload, 'urgeIntensity', null)
  );
  const [feelingDuring, setFeelingDuring] = useState<string>(() =>
    readDraft<string>(draftPayload, 'feelingDuring', '')
  );
  const [feelingAfter, setFeelingAfter] = useState<string>(() =>
    readDraft<string>(draftPayload, 'feelingAfter', '')
  );

  // Impacto Funcional & Contexto do Dia
  const [impactWork, setImpactWork] = useState<FunctionalImpactLevel | null>(() =>
    readDraft<FunctionalImpactLevel | null>(draftPayload, 'impactWork', null)
  );
  const [impactRelationships, setImpactRelationships] = useState<FunctionalImpactLevel | null>(() =>
    readDraft<FunctionalImpactLevel | null>(draftPayload, 'impactRelationships', null)
  );
  const [impactRoutine, setImpactRoutine] = useState<FunctionalImpactLevel | null>(() =>
    readDraft<FunctionalImpactLevel | null>(draftPayload, 'impactRoutine', null)
  );
  const [impactNote, setImpactNote] = useState<string>(() => readDraft<string>(draftPayload, 'impactNote', ''));
  const [medicationStatus, setMedicationStatus] = useState<MedicationStatus | null>(() =>
    readDraft<MedicationStatus | null>(draftPayload, 'medicationStatus', null)
  );
  const [medicationEffects, setMedicationEffects] = useState<string>(() =>
    readDraft<string>(draftPayload, 'medicationEffects', '')
  );
  const [cyclePhase, setCyclePhase] = useState<CyclePhase | null>(() =>
    readDraft<CyclePhase | null>(draftPayload, 'cyclePhase', null)
  );
  const [notes, setNotes] = useState<string>(() => readDraft<string>(draftPayload, 'notes', ''));
  const [dayEvents, setDayEvents] = useState<string[]>(() => readDraft<string[]>(draftPayload, 'dayEvents', []));
  const [dayEventsNote, setDayEventsNote] = useState<string>(() =>
    readDraft<string>(draftPayload, 'dayEventsNote', '')
  );
  const [safetyConcern, setSafetyConcern] = useState<SafetyConcern | null>(() =>
    readDraft<SafetyConcern | null>(draftPayload, 'safetyConcern', null)
  );

  const [showOptionalInFocus, setShowOptionalInFocus] = useState<boolean>(false);
  const [validationMessage, setValidationMessage] = useState<string>('');

  useEffect(() => {
    if (editingEntry) {
      setEntryType(editingEntry.entryType);
      setDate(editingEntry.date);
      setTime(editingEntry.time);
      setMoods(editingEntry.moods);
      setMoodIntensity(editingEntry.moodIntensity ?? {});
      setMoodOtherText(editingEntry.moodOtherText);
      setValence(editingEntry.valence);
      setHadMoodSwing(editingEntry.hadMoodSwing);
      setMoodSwingDirection(editingEntry.moodSwingDirection ?? null);
      setMoodSwingWindow(editingEntry.moodSwingWindow ?? null);
      setMoodSwingDescription(editingEntry.moodSwingDescription);
      setEnergyLevel(editingEntry.energyLevel);
      setSleepHours(editingEntry.sleep.hours);
      setSleepQuality(editingEntry.sleep.quality);
      setReducedSleepNeed(editingEntry.sleep.reducedNeed);
      setNoFatigueAfterShortSleep(editingEntry.sleep.noFatigueAfterShortSleep ?? null);
      setBedTime(editingEntry.sleep.bedTime ?? '');
      setWakeTime(editingEntry.sleep.wakeTime ?? '');
      setLatencyMinutes(editingEntry.sleep.latencyMinutes ?? null);
      setAwakenings(editingEntry.sleep.awakenings ?? null);
      setStateDuration(editingEntry.stateDuration);
      setActivationSignals(editingEntry.activationSignals);
      setTriggerContext(editingEntry.triggerContext);
      setBehaviors(editingEntry.behaviors);
      setBehaviorOtherText(editingEntry.behaviorOtherText);
      setAwareness(editingEntry.awareness);
      setResisted(editingEntry.resisted);
      setUrgeIntensity(editingEntry.urgeIntensity);
      setFeelingDuring(editingEntry.feelingDuring);
      setFeelingAfter(editingEntry.feelingAfter);
      setImpactWork(editingEntry.functionalImpact.work);
      setImpactRelationships(editingEntry.functionalImpact.relationships);
      setImpactRoutine(editingEntry.functionalImpact.routine);
      setImpactNote(editingEntry.functionalImpact.note);
      setMedicationStatus(editingEntry.medication?.status ?? null);
      setMedicationEffects(editingEntry.medication?.effects ?? '');
      setCyclePhase(editingEntry.cyclePhase ?? null);
      setNotes(editingEntry.notes);
      setDayEvents(editingEntry.dayEvents);
      setDayEventsNote(editingEntry.dayEventsNote);
      setSafetyConcern(editingEntry.safetyConcern ?? null);
      setValidationMessage('');
      // Editar não força o formulário completo: respeita a profundidade em que foi salvo
      // (ou a que o usuário pediu ao clicar em "salvar e completar depois").
      setLevel(reopenLevel ?? editingEntry.depth ?? 'padrao');
      setQuickImpulseAnswer(
        editingEntry.behaviors.length > 0 || editingEntry.urgeIntensity !== null ? 'sim' : null
      );
    }
  }, [editingEntry, reopenLevel]);

  const draftSnapshot = useMemo(
    () => ({
      date,
      time,
      moods,
      moodIntensity,
      moodOtherText,
      valence,
      hadMoodSwing,
      moodSwingDirection,
      moodSwingWindow,
      moodSwingDescription,
      energyLevel,
      sleepHours,
      sleepQuality,
      reducedSleepNeed,
      noFatigueAfterShortSleep,
      bedTime,
      wakeTime,
      latencyMinutes,
      awakenings,
      stateDuration,
      activationSignals,
      triggerContext,
      behaviors,
      behaviorOtherText,
      awareness,
      resisted,
      urgeIntensity,
      feelingDuring,
      feelingAfter,
      impactWork,
      impactRelationships,
      impactRoutine,
      impactNote,
      medicationStatus,
      medicationEffects,
      cyclePhase,
      notes,
      dayEvents,
      dayEventsNote,
      safetyConcern,
    }),
    [
      date,
      time,
      moods,
      moodIntensity,
      moodOtherText,
      valence,
      hadMoodSwing,
      moodSwingDirection,
      moodSwingWindow,
      moodSwingDescription,
      energyLevel,
      sleepHours,
      sleepQuality,
      reducedSleepNeed,
      noFatigueAfterShortSleep,
      bedTime,
      wakeTime,
      latencyMinutes,
      awakenings,
      stateDuration,
      activationSignals,
      triggerContext,
      behaviors,
      behaviorOtherText,
      awareness,
      resisted,
      urgeIntensity,
      feelingDuring,
      feelingAfter,
      impactWork,
      impactRelationships,
      impactRoutine,
      impactNote,
      medicationStatus,
      medicationEffects,
      cyclePhase,
      notes,
      dayEvents,
      dayEventsNote,
      safetyConcern,
    ]
  );

  // Rascunho automático: fechar a aba não pode custar o registro inteiro.
  // Só grava quando há algo respondido, para não restaurar um formulário vazio.
  useEffect(() => {
    if (editingEntry) return;
    const hasContent =
      draftSnapshot.moods.length > 0 ||
      Boolean(draftSnapshot.moodOtherText) ||
      Boolean(draftSnapshot.behaviorOtherText) ||
      Boolean(draftSnapshot.triggerContext) ||
      Boolean(draftSnapshot.notes) ||
      draftSnapshot.dayEvents.length > 0 ||
      draftSnapshot.valence !== null ||
      draftSnapshot.energyLevel !== null ||
      draftSnapshot.sleepHours !== null ||
      draftSnapshot.urgeIntensity !== null ||
      draftSnapshot.safetyConcern !== null;

    if (!hasContent) {
      clearFormDraft();
      setDraftSavedAt(null);
      draftSavedAtRef.current = null;
      setShownDraftSavedAt(null);
      onDraftChangeRef.current(null);
      return;
    }
    const saved = saveFormDraft(draftSnapshot as unknown as Record<string, unknown>);
    setDraftSavedAt(saved.savedAt);
    draftSavedAtRef.current = saved.savedAt;
    // Primeira gravação aparece na hora; as seguintes só a cada 30 s ou no blur.
    setShownDraftSavedAt((prev) => prev ?? saved.savedAt);
    onDraftChangeRef.current(saved);
  }, [draftSnapshot, editingEntry]);

  const recentBehaviors = useMemo(
    () => (editingEntry ? [] : getRecentBehaviors(entries, categories)),
    [entries, categories, editingEntry]
  );

  const resetForm = useCallback(() => {
    setEntryType(EntryType.DAILY_CHECKIN);
    setDate(getCurrentDateStr());
    setTime(getCurrentTimeStr());
    setMoods([]);
    setMoodIntensity({});
    setMoodOtherText('');
    setValence(null);
    setHadMoodSwing(false);
    setMoodSwingDirection(null);
    setMoodSwingWindow(null);
    setMoodSwingDescription('');
    setEnergyLevel(null);
    setSleepHours(null);
    setSleepQuality(null);
    setReducedSleepNeed(null);
    setNoFatigueAfterShortSleep(null);
    setBedTime('');
    setWakeTime('');
    setLatencyMinutes(null);
    setAwakenings(null);
    setStateDuration(null);
    setActivationSignals([]);
    setTriggerContext('');
    setBehaviors([]);
    setBehaviorOtherText('');
    setAwareness(null);
    setResisted(null);
    setUrgeIntensity(null);
    setFeelingDuring('');
    setFeelingAfter('');
    setImpactWork(null);
    setImpactRelationships(null);
    setImpactRoutine(null);
    setImpactNote('');
    setMedicationStatus(null);
    setMedicationEffects('');
    setCyclePhase(null);
    setNotes('');
    setDayEvents([]);
    setDayEventsNote('');
    setSafetyConcern(null);
    setValidationMessage('');
    setMoodError(null);
    setQuickImpulseAnswer(null);
    setDraftRestored(false);
    setDraftSavedAt(null);
    draftSavedAtRef.current = null;
    setShownDraftSavedAt(null);
    clearFormDraft();
    onDraftChangeRef.current(null);
  }, []);

  const handleCancelEdit = useCallback(() => {
    onCancelEdit();
    resetForm();
  }, [onCancelEdit, resetForm]);

  const toggleMood = useCallback((id: MoodStateId) => {
    setMoods((prev) => {
      const next = prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id];
      setMoodIntensity((current) => {
        if (next.includes(id)) {
          return { ...current, [id]: current[id] ?? 5 };
        }
        const { [id]: _removed, ...rest } = current;
        return rest;
      });
      return next;
    });
    setValidationMessage('');
    setMoodError(null);
  }, []);

  const changeMoodIntensity = useCallback((id: MoodStateId, value: number) => {
    setMoodIntensity((prev) => ({ ...prev, [id]: value }));
  }, []);

  const toggleActivationSignal = useCallback((sig: ActivationSignal) => {
    setActivationSignals((prev) =>
      prev.includes(sig) ? prev.filter((s) => s !== sig) : [...prev, sig]
    );
  }, []);

  /**
   * Só a escolha explícita do modo adiciona o item ao registro.
   * Escolher o mesmo modo de novo remove (toggle); trocar o modo atualiza e zera o prejuízo
   * quando o item passa a ser apenas impulso.
   */
  const setBehaviorMode = useCallback(
    (cat: BehaviorCategory, itemId: string, itemLabel: string, mode: BehaviorMode) => {
      setBehaviors((prev) => {
        const existing = prev.find((b) => b.itemId === itemId);
        if (!existing) {
          return [
            ...prev,
            {
              categoryId: cat.id,
              categoryName: cat.name,
              itemId,
              itemLabel,
              mode,
              harm: false,
            },
          ];
        }
        if (existing.mode === mode) {
          return prev.filter((b) => b.itemId !== itemId);
        }
        return prev.map((b) =>
          b.itemId === itemId
            ? { ...b, mode, harm: mode === BehaviorMode.IMPULSO ? false : b.harm }
            : b
        );
      });
      setQuickImpulseAnswer('sim');
      setValidationMessage('');
    },
    []
  );

  const removeBehavior = useCallback((itemId: string) => {
    setBehaviors((prev) => prev.filter((b) => b.itemId !== itemId));
  }, []);

  const setBehaviorHarm = useCallback((itemId: string, harm: boolean) => {
    setBehaviors((prev) => prev.map((b) => (b.itemId === itemId ? { ...b, harm } : b)));
  }, []);

  const toggleDayEvent = useCallback((ev: string) => {
    setDayEvents((prev) => (prev.includes(ev) ? prev.filter((e) => e !== ev) : [...prev, ev]));
  }, []);

  const handleSwitchToEpisode = useCallback(() => {
    setEntryType(EntryType.EPISODE);
    // Episódio precisa do Pilar 3 completo: sobe o nível sem tocar no que já foi respondido.
    setLevel((prev) => (prev === 'rapido' ? 'padrao' : prev));
    setValidationMessage('');
  }, []);

  const handleToggleOptionalInFocus = useCallback(() => {
    setShowOptionalInFocus((s) => !s);
  }, []);

  const isEpisode = entryType === EntryType.EPISODE;
  const isRapido = level === 'rapido' && !isEpisode;
  const showFull = level !== 'rapido' || isEpisode;
  const showOptionalFields = showFull && (!focusMode || showOptionalInFocus);

  /**
   * Padrão/Completo mostram os pilares como seções recolhíveis. No Rápido os mesmos
   * pilares ficam compactos, sem controle de recolher — o objetivo ali é terminar logo.
   */
  const wrapPillars = level !== 'rapido';

  const moodChips = [
    ...moods
      .slice(0, 3)
      .map((id) => MOOD_DEFINITIONS.find((m) => m.id === id)?.label ?? id),
    ...(moods.length > 3 ? [`+${moods.length - 3} humores`] : []),
    ...(valence !== null ? [`Valência ${valence}/10`] : []),
    ...(hadMoodSwing ? ['Oscilação de humor'] : []),
  ];
  const moodAnswered =
    (moods.length > 0 ? 1 : 0) + (valence !== null ? 1 : 0) + (hadMoodSwing ? 1 : 0);

  const sleepChips = [
    ...(energyLevel !== null ? [`Energia ${energyLevel}/10`] : []),
    ...(sleepHours !== null ? [`Sono ${sleepHours}h`] : []),
    ...(sleepQuality ? ['Qualidade do sono'] : []),
    ...(stateDuration ? ['Duração do estado'] : []),
    ...(activationSignals.length > 0
      ? [
          `${activationSignals.length} sinal(is): ${activationSignals
            .slice(0, 2)
            .map((s) => ACTIVATION_SIGNAL_OPTIONS.find((o) => o.id === s)?.label ?? s)
            .join(', ')}`,
        ]
      : []),
  ];
  const sleepAnswered =
    (energyLevel !== null ? 1 : 0) +
    (sleepHours !== null ? 1 : 0) +
    (sleepQuality !== null ? 1 : 0) +
    (stateDuration !== null ? 1 : 0) +
    (activationSignals.length > 0 ? 1 : 0);

  const behaviorChips = [
    ...behaviors.slice(0, 3).map((b) => `${b.itemLabel} · ${b.mode === BehaviorMode.IMPULSO ? 'impulso' : 'fiz'}`),
    ...(behaviors.length > 3 ? [`+${behaviors.length - 3}`] : []),
    ...(behaviors.length === 0 && behaviorOtherText.trim() ? [behaviorOtherText.trim()] : []),
    ...(urgeIntensity !== null ? [`Vontade ${urgeIntensity}/10`] : []),
  ];
  const behaviorAnswered =
    (behaviors.length > 0 || behaviorOtherText.trim() ? 1 : 0) +
    (urgeIntensity !== null ? 1 : 0) +
    (isEpisode && awareness ? 1 : 0);

  /** Monta o registro já validado, ou devolve null com o erro no campo correspondente. */
  const buildEntry = (): PulseEntry | null => {
    if (moods.length === 0) {
      // O erro aparece dentro do Pilar 1, onde a decisão acontece (com foco no primeiro chip).
      setMoodError(
        'Escolha pelo menos um estado emocional (pode ser "Neutro" ou "Outro") antes de salvar.'
      );
      setValidationMessage('');
      return null;
    }
    setMoodError(null);

    if (isEpisode && behaviors.length === 0 && !behaviorOtherText.trim()) {
      setValidationMessage(
        'Como você escolheu "Episódio comportamental", selecione pelo menos um comportamento (mesmo que tenha ficado só no impulso) ou mude para "Check-in diário (sem episódio)".'
      );
      return null;
    }

    const finalEntry: PulseEntry = {
      id: editingEntry
        ? editingEntry.id
        : `entry_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      entryType,
      depth: level,
      date,
      time,
      createdAt: editingEntry ? editingEntry.createdAt : new Date().toISOString(),
      moods,
      moodIntensity: Object.fromEntries(
        moods.map((m) => [m, moodIntensity[m] ?? 5])
      ),
      moodOtherText: moodOtherText.trim(),
      valence,
      hadMoodSwing,
      moodSwingDirection: hadMoodSwing ? moodSwingDirection : null,
      moodSwingWindow: hadMoodSwing ? moodSwingWindow : null,
      moodSwingDescription: hadMoodSwing ? moodSwingDescription.trim() : '',
      energyLevel,
      sleep: {
        hours: sleepHours,
        quality: sleepQuality,
        reducedNeed: reducedSleepNeed,
        bedTime: bedTime || null,
        wakeTime: wakeTime || null,
        latencyMinutes,
        awakenings,
        noFatigueAfterShortSleep,
      },
      stateDuration,
      activationSignals,
      triggerContext: triggerContext.trim(),
      // Impulso contido também é comportamento: em check-in ele mantém o item e o modo.
      behaviors,
      behaviorOtherText: isEpisode ? behaviorOtherText.trim() : '',
      // Sem episódio os campos ficam ocultos, então o valor é null (nunca herdado).
      awareness: isEpisode ? awareness : null,
      resisted: isEpisode ? resisted : null,
      urgeIntensity,
      feelingDuring: isEpisode ? feelingDuring.trim() : '',
      feelingAfter: isEpisode ? feelingAfter.trim() : '',
      functionalImpact: {
        work: impactWork,
        relationships: impactRelationships,
        routine: impactRoutine,
        note: impactNote.trim(),
      },
      medication: {
        status: medicationStatus,
        effects: medicationEffects.trim(),
      },
      cyclePhase: trackCycle ? cyclePhase : null,
      safetyConcern,
      notes: notes.trim(),
      dayEvents,
      dayEventsNote: dayEventsNote.trim(),
    };

    return finalEntry;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const entry = buildEntry();
    if (!entry) return;
    onSaveEntry(entry, Boolean(editingEntry));
    if (!editingEntry) {
      resetForm();
    }
  };

  /** Salva e reabre o mesmo registro em edição para completar depois. */
  const handleCompleteLater = () => {
    const entry = buildEntry();
    if (!entry) return;
    // Reabre um nível acima: do rápido para o padrão, do padrão para o completo.
    const nextLevel: RecordLevel = level === 'rapido' ? 'padrao' : 'completo';
    onSaveAndCompleteLater(entry, Boolean(editingEntry), nextLevel);
  };

  // Data/hora: no check-in rápido ficam dentro de "Quando?" (recolhido).
  const scheduleFields = (
    <>
      <div>
        <label
          htmlFor="entry-date"
          className="block text-sm font-medium mb-1.5"
          style={{ color: 'var(--text-primary)' }}
        >
          Data
        </label>
        <input
          id="entry-date"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="w-full min-h-[48px] px-4 rounded-xl border text-base font-mono tabular-nums"
          style={{
            backgroundColor: 'var(--bg-elevated)',
            borderColor: 'var(--border-strong)',
            color: 'var(--text-primary)',
          }}
          required
        />
      </div>
      <div>
        <label
          htmlFor="entry-time"
          className="block text-sm font-medium mb-1.5"
          style={{ color: 'var(--text-primary)' }}
        >
          Horário
        </label>
        <input
          id="entry-time"
          type="time"
          value={time}
          onChange={(e) => setTime(e.target.value)}
          className="w-full min-h-[48px] px-4 rounded-xl border text-base font-mono tabular-nums"
          style={{
            backgroundColor: 'var(--bg-elevated)',
            borderColor: 'var(--border-strong)',
            color: 'var(--text-primary)',
          }}
          required
        />
      </div>
    </>
  );

  const withCollapse = (
    id: string,
    title: string,
    chips: string[],
    answered: number,
    total: number,
    node: React.ReactNode
  ) =>
    wrapPillars ? (
      <CollapsibleSection
        id={id}
        title={title}
        summaryChips={chips}
        answered={answered}
        total={total}
        reduceMotion={reduceMotion}
      >
        {node}
      </CollapsibleSection>
    ) : (
      node
    );

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-8 max-w-4xl mx-auto"
      onBlur={(e) => {
        // Ao sair do formulário, o horário do rascunho é atualizado na região viva.
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) syncDraftTimestamp();
      }}
    >
      {/* Cabeçalho com Modo de Foco */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1
            className="text-2xl sm:text-3xl font-semibold tracking-tight"
            style={{ color: 'var(--text-primary)' }}
          >
            {editingEntry ? 'Editar registro' : 'Acompanhamento diário'}
          </h1>
          <p className="text-base mt-1" style={{ color: 'var(--text-secondary)' }}>
            Registre seu estado emocional, ativação/sono e, quando houver, comportamentos específicos.
          </p>
        </div>

        <FormHeaderActions
          isEditing={Boolean(editingEntry)}
          focusMode={focusMode}
          onToggleFocusMode={onToggleFocusMode}
          onCancelEdit={handleCancelEdit}
        />
      </div>

      <DepthSwitch
        level={level}
        onChange={setLevel}
        minLevel={isEpisode ? 'padrao' : 'rapido'}
        reduceMotion={reduceMotion}
        focusMode={focusMode}
      />

      {draftRestored && (
        <div
          className="rounded-xl border px-4 py-3 text-sm"
          style={{
            backgroundColor: 'var(--color-secondary-soft)',
            borderColor: 'var(--color-secondary)',
            color: 'var(--text-primary)',
          }}
        >
          Rascunho do seu último registro foi restaurado. Nada foi salvo ainda — revise e clique em
          salvar.
        </div>
      )}

      {shownDraftSavedAt && (
        <p className="text-sm" aria-live="polite" style={{ color: 'var(--text-secondary)' }}>
          Rascunho salvo às {formatDraftTime(shownDraftSavedAt)} · fica neste dispositivo até você
          salvar o registro.
        </p>
      )}

      {/* Seletor de tipo de registro: Check-in independente vs Episódio */}
      <section
        aria-label="Tipo de registro"
        className="rounded-2xl border p-5 sm:p-6 space-y-3"
        style={{
          backgroundColor: 'var(--bg-surface)',
          borderColor: 'var(--border-hairline)',
          boxShadow: 'var(--shadow-soft)',
        }}
      >
        <p className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
          O que você deseja registrar agora?
        </p>
        {isRapido ? (
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setEntryType(EntryType.DAILY_CHECKIN);
                setValidationMessage('');
                setMoodError(null);
              }}
              aria-pressed={entryType === EntryType.DAILY_CHECKIN}
              className="min-h-[44px] px-3.5 rounded-lg border text-sm font-medium cursor-pointer"
              style={{
                backgroundColor:
                  entryType === EntryType.DAILY_CHECKIN
                    ? 'var(--color-secondary-soft)'
                    : 'var(--bg-elevated)',
                borderColor:
                  entryType === EntryType.DAILY_CHECKIN
                    ? 'var(--color-secondary)'
                    : 'var(--border-hairline)',
                color: 'var(--text-primary)',
              }}
            >
              Check-in diário
            </button>
            <button
              type="button"
              onClick={handleSwitchToEpisode}
              aria-pressed={false}
              className="min-h-[44px] px-3.5 rounded-lg border text-sm font-medium cursor-pointer"
              style={{
                backgroundColor: 'var(--bg-elevated)',
                borderColor: 'var(--border-hairline)',
                color: 'var(--text-primary)',
              }}
            >
              Episódio comportamental
            </button>
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
              Comece pelo essencial — dá para aprofundar depois.
            </span>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => {
              setEntryType(EntryType.DAILY_CHECKIN);
              setValidationMessage('');
              setMoodError(null);
            }}
            aria-pressed={entryType === EntryType.DAILY_CHECKIN}
            className="min-h-[60px] p-4 rounded-xl border text-left transition-colors cursor-pointer"
            style={{
              backgroundColor:
                entryType === EntryType.DAILY_CHECKIN
                  ? 'var(--color-secondary-soft)'
                  : 'var(--bg-elevated)',
              borderColor:
                entryType === EntryType.DAILY_CHECKIN
                  ? 'var(--color-secondary)'
                  : 'var(--border-hairline)',
              borderWidth: entryType === EntryType.DAILY_CHECKIN ? '2px' : '1px',
            }}
          >
            <span className="block text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
              Check-in diário (sem episódio compulsivo)
            </span>
            <span className="block text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>
              Acompanhe humor, energia, sono, sinais e rotina mesmo em dias calmos.
            </span>
          </button>

          <button
            type="button"
            onClick={handleSwitchToEpisode}
            aria-pressed={entryType === EntryType.EPISODE}
            className="min-h-[60px] p-4 rounded-xl border text-left transition-colors cursor-pointer"
            style={{
              backgroundColor:
                entryType === EntryType.EPISODE ? 'var(--color-primary-soft)' : 'var(--bg-elevated)',
              borderColor:
                entryType === EntryType.EPISODE
                  ? 'var(--color-primary-strong)'
                  : 'var(--border-hairline)',
              borderWidth: entryType === EntryType.EPISODE ? '2px' : '1px',
            }}
          >
            <span className="block text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
              Episódio comportamental
            </span>
            <span className="block text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>
              Registre humor, ativação/sono e o comportamento impulsivo ou compulsivo ocorrido.
            </span>
          </button>
          </div>
        )}

        {/* Data e Hora — no check-in rápido fica recolhida em "Quando?" */}
        {isRapido ? (
          <details className="pt-1">
            <summary
              className="min-h-[44px] inline-flex items-center text-sm font-medium cursor-pointer select-none"
              style={{ color: 'var(--text-secondary)' }}
            >
              Quando? {date} às {time}
            </summary>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3">{scheduleFields}</div>
            <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
              Pode registrar mais de uma vez no dia: oscilações ao longo do dia não se recuperam de
              memória.
            </p>
          </details>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3">{scheduleFields}</div>
        )}
      </section>

      {withCollapse(
        'pilar-emocional',
        'Pilar 1 · Estado emocional',
        moodChips,
        moodAnswered,
        3,
        <MoodSection
        embedded={wrapPillars}
        moods={moods}
        moodIntensity={moodIntensity}
        moodOtherText={moodOtherText}
        valence={valence}
        hadMoodSwing={hadMoodSwing}
        moodSwingDirection={moodSwingDirection}
        moodSwingWindow={moodSwingWindow}
        moodSwingDescription={moodSwingDescription}
        theme={theme}
        compact={!showFull}
        error={moodError}
        reduceMotion={reduceMotion}
        onToggleMood={toggleMood}
        onChangeMoodIntensity={changeMoodIntensity}
        onChangeMoodOtherText={setMoodOtherText}
        onChangeValence={setValence}
        onChangeHadMoodSwing={setHadMoodSwing}
        onChangeMoodSwingDirection={setMoodSwingDirection}
        onChangeMoodSwingWindow={setMoodSwingWindow}
        onChangeMoodSwingDescription={setMoodSwingDescription}
      />
      )}

      {withCollapse(
        'pilar-ativacao',
        'Pilar 2 · Estado de ativação e sono',
        sleepChips,
        sleepAnswered,
        5,
        <ActivationSection
        embedded={wrapPillars}
        energyLevel={energyLevel}
        sleepHours={sleepHours}
        sleepQuality={sleepQuality}
        reducedSleepNeed={reducedSleepNeed}
        noFatigueAfterShortSleep={noFatigueAfterShortSleep}
        bedTime={bedTime}
        wakeTime={wakeTime}
        latencyMinutes={latencyMinutes}
        awakenings={awakenings}
        stateDuration={stateDuration}
        activationSignals={activationSignals}
        compact={isRapido}
        onChangeEnergyLevel={setEnergyLevel}
        onChangeSleepHours={setSleepHours}
        onChangeSleepQuality={setSleepQuality}
        onChangeReducedSleepNeed={setReducedSleepNeed}
        onChangeNoFatigueAfterShortSleep={setNoFatigueAfterShortSleep}
        onChangeBedTime={setBedTime}
        onChangeWakeTime={setWakeTime}
        onChangeLatencyMinutes={setLatencyMinutes}
        onChangeAwakenings={setAwakenings}
        onChangeStateDuration={setStateDuration}
        onToggleActivationSignal={toggleActivationSignal}
      />
      )}

      {withCollapse(
        'pilar-comportamento',
        'Pilar 3 · Comportamento',
        behaviorChips,
        behaviorAnswered,
        3,
        <BehaviorSection
        embedded={wrapPillars}
        entryType={entryType}
        categories={categories}
        triggerContext={triggerContext}
        behaviors={behaviors}
        behaviorOtherText={behaviorOtherText}
        awareness={awareness}
        resisted={resisted}
        urgeIntensity={urgeIntensity}
        feelingDuring={feelingDuring}
        feelingAfter={feelingAfter}
        showSexualCategory={showSexualCategory}
        showOptionalFields={showOptionalFields}
        quickCompact={isRapido}
        quickImpulseAnswer={quickImpulseAnswer}
        onAnswerQuickImpulse={(answer) => {
          setQuickImpulseAnswer(answer);
          if (answer === 'nao') {
            setBehaviors([]);
            setUrgeIntensity(null);
          }
        }}
        onSwitchToEpisode={handleSwitchToEpisode}
        onChangeTriggerContext={setTriggerContext}
        onSetBehaviorMode={setBehaviorMode}
        onRemoveBehavior={removeBehavior}
        onCreateItem={onCreateBehaviorItem}
        recentBehaviors={recentBehaviors}
        onChangeBehaviorHarm={setBehaviorHarm}
        onChangeBehaviorOtherText={setBehaviorOtherText}
        onChangeUrgeIntensity={setUrgeIntensity}
        onChangeAwareness={setAwareness}
        onChangeResisted={setResisted}
        onChangeFeelingDuring={setFeelingDuring}
        onChangeFeelingAfter={setFeelingAfter}
      />
      )}

      <SafetySection concern={safetyConcern} onChange={setSafetyConcern} compact={isRapido} />

      {showOptionalFields && (
        <ImpactSection
          impactWork={impactWork}
          impactRelationships={impactRelationships}
          impactRoutine={impactRoutine}
          impactNote={impactNote}
          medicationStatus={medicationStatus}
          medicationEffects={medicationEffects}
          cyclePhase={cyclePhase}
          trackCycle={trackCycle}
          dayEvents={dayEvents}
          dayEventsNote={dayEventsNote}
          notes={notes}
          onChangeImpactWork={setImpactWork}
          onChangeImpactRelationships={setImpactRelationships}
          onChangeImpactRoutine={setImpactRoutine}
          onChangeImpactNote={setImpactNote}
          onChangeMedicationStatus={setMedicationStatus}
          onChangeMedicationEffects={setMedicationEffects}
          onChangeCyclePhase={setCyclePhase}
          onToggleDayEvent={toggleDayEvent}
          onChangeDayEventsNote={setDayEventsNote}
          onChangeNotes={setNotes}
        />
      )}

      {level === 'rapido' && !isEpisode && (
        <div className="flex justify-center">
          <button
            type="button"
            onClick={() => setLevel('padrao')}
            className="min-h-[48px] px-5 py-2.5 rounded-xl border text-sm font-medium cursor-pointer"
            style={{
              backgroundColor: 'var(--bg-surface)',
              borderColor: 'var(--border-hairline)',
              color: 'var(--text-secondary)',
            }}
          >
            Adicionar detalhes (sinais, duração, medicação, impacto e contexto)
          </button>
        </div>
      )}

      <FormActions
        isEditing={Boolean(editingEntry)}
        entryType={entryType}
        level={level}
        focusMode={focusMode}
        showOptionalInFocus={showOptionalInFocus}
        validationMessage={validationMessage}
        onToggleOptionalInFocus={handleToggleOptionalInFocus}
        onResetForm={resetForm}
        onCompleteLater={handleCompleteLater}
      />
    </form>
  );
};
