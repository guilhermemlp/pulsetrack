import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivationSignal,
  AwarenessType,
  BehaviorCategory,
  BehaviorMode,
  CyclePhase,
  EntryType,
  FocusArea,
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
import { ACTIVATION_SIGNAL_OPTIONS, FOCUS_AREA_OPTIONS, MOOD_DEFINITIONS } from '../../data/defaults';
import { toLocalIsoDate } from '../../utils/analytics';
import {
  clearFormDraft,
  FormDraft,
  loadFormDraft,
  saveFormDraft,
} from '../../utils/storage';
import {
  DailyLogDraft,
  DRAFT_VERSION,
  draftHasContent,
  formatDraftTime,
  parseFormDraft,
  QuickImpulseAnswer,
} from '../../utils/draft';
import { describeBehaviorMode, getRecentBehaviors } from '../../utils/recentBehaviors';
import { ActivationSection } from './ActivationSection';
import { BehaviorSection, CreatedBehaviorItem } from './BehaviorSection';
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
  /** Devolve `false` se a persistência falhar: nesse caso o rascunho é mantido. */
  onSaveEntry: (entry: PulseEntry, isEdit: boolean) => boolean | void;
  onCancelEdit: () => void;
  theme: ThemeMode;
  /** Bloco de comportamentos sexuais só aparece se ativado nas preferências. */
  showSexualCategory: boolean;
  /** Fase do ciclo só aparece se o acompanhamento estiver ativado. */
  trackCycle: boolean;
  /** Profundidade inicial (preferência), usada quando não se está editando um registro. */
  defaultRecordLevel: RecordLevel;
  /** Áreas escolhidas no onboarding: destacadas no início, sem esconder pilares. */
  focusAreas: FocusArea[];
  reduceMotion: boolean;
  /** Nível em que um registro salvo para "completar depois" deve reabrir. */
  reopenLevel?: RecordLevel | null;
  /** Cria um subitem na categoria e devolve o item persistido. */
  onCreateBehaviorItem: (categoryId: string, label: string) => CreatedBehaviorItem | null;
  /** Salva agora e reabre o registro em edição para completar depois. */
  onSaveAndCompleteLater: (
    entry: PulseEntry,
    isEdit: boolean,
    nextLevel: RecordLevel
  ) => boolean | void;
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
  focusAreas,
  reduceMotion,
  reopenLevel = null,
  onCreateBehaviorItem,
  onSaveAndCompleteLater,
  onDraftChange,
}) => {
  const draft = useMemo(() => (editingEntry ? null : loadFormDraft()), [editingEntry]);
  const draftPayload = draft?.payload;
  // Um único ponto de leitura: o mesmo tipo usado para gravar reconstrói o formulário.
  const restored = useMemo(
    () =>
      parseFormDraft(draftPayload, {
        date: getCurrentDateStr(),
        time: getCurrentTimeStr(),
        level: defaultRecordLevel,
        entryType: EntryType.DAILY_CHECKIN,
      }),
    [draftPayload, defaultRecordLevel]
  );

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
    () => editingEntry?.depth ?? restored.level
  );
  const [quickImpulseAnswer, setQuickImpulseAnswer] = useState<QuickImpulseAnswer>(
    restored.quickImpulseAnswer
  );
  const [moodError, setMoodError] = useState<string | null>(null);

  const [entryType, setEntryType] = useState<EntryType>(restored.entryType);
  const [date, setDate] = useState<string>(restored.date);
  const [time, setTime] = useState<string>(restored.time);

  // Pilar 1: Estado Emocional
  const [moods, setMoods] = useState<MoodStateId[]>(restored.moods);
  const [moodIntensity, setMoodIntensity] = useState<Record<string, number>>(
    restored.moodIntensity
  );
  const [moodOtherText, setMoodOtherText] = useState<string>(restored.moodOtherText);
  const [valence, setValence] = useState<number | null>(restored.valence);
  const [hadMoodSwing, setHadMoodSwing] = useState<boolean>(restored.hadMoodSwing);
  const [moodSwingDirection, setMoodSwingDirection] = useState<MoodSwingDirection | null>(
    restored.moodSwingDirection
  );
  const [moodSwingWindow, setMoodSwingWindow] = useState<MoodSwingWindow | null>(
    restored.moodSwingWindow
  );
  const [moodSwingDescription, setMoodSwingDescription] = useState<string>(
    restored.moodSwingDescription
  );

  // Pilar 2: Estado de Ativação e Sono
  const [energyLevel, setEnergyLevel] = useState<number | null>(restored.energyLevel);
  const [sleepHours, setSleepHours] = useState<number | null>(restored.sleepHours);
  const [sleepQuality, setSleepQuality] = useState<SleepQuality | null>(
    restored.sleepQuality
  );
  const [reducedSleepNeed, setReducedSleepNeed] = useState<ReducedSleepNeed | null>(
    restored.reducedSleepNeed
  );
  const [noFatigueAfterShortSleep, setNoFatigueAfterShortSleep] = useState<boolean | null>(
    restored.noFatigueAfterShortSleep
  );
  const [bedTime, setBedTime] = useState<string>(restored.bedTime);
  const [wakeTime, setWakeTime] = useState<string>(restored.wakeTime);
  const [latencyMinutes, setLatencyMinutes] = useState<number | null>(
    restored.latencyMinutes
  );
  const [awakenings, setAwakenings] = useState<number | null>(restored.awakenings);
  const [stateDuration, setStateDuration] = useState<StateDuration | null>(
    restored.stateDuration
  );
  const [activationSignals, setActivationSignals] = useState<ActivationSignal[]>(
    restored.activationSignals
  );

  // Pilar 3: Comportamento
  const [triggerContext, setTriggerContext] = useState<string>(restored.triggerContext);
  const [behaviors, setBehaviors] = useState<SelectedBehavior[]>(restored.behaviors);
  const [behaviorOtherText, setBehaviorOtherText] = useState<string>(
    restored.behaviorOtherText
  );
  const [awareness, setAwareness] = useState<AwarenessType | null>(restored.awareness);
  const [resisted, setResisted] = useState<ResistanceResult | null>(restored.resisted);
  const [urgeIntensity, setUrgeIntensity] = useState<number | null>(restored.urgeIntensity);
  const [feelingDuring, setFeelingDuring] = useState<string>(restored.feelingDuring);
  const [feelingAfter, setFeelingAfter] = useState<string>(restored.feelingAfter);

  // Impacto Funcional & Contexto do Dia
  const [impactWork, setImpactWork] = useState<FunctionalImpactLevel | null>(
    restored.impactWork
  );
  const [impactRelationships, setImpactRelationships] = useState<FunctionalImpactLevel | null>(
    restored.impactRelationships
  );
  const [impactRoutine, setImpactRoutine] = useState<FunctionalImpactLevel | null>(
    restored.impactRoutine
  );
  const [impactNote, setImpactNote] = useState<string>(restored.impactNote);
  const [medicationStatus, setMedicationStatus] = useState<MedicationStatus | null>(
    restored.medicationStatus
  );
  const [medicationEffects, setMedicationEffects] = useState<string>(
    restored.medicationEffects
  );
  const [cyclePhase, setCyclePhase] = useState<CyclePhase | null>(restored.cyclePhase);
  const [notes, setNotes] = useState<string>(restored.notes);
  const [dayEvents, setDayEvents] = useState<string[]>(restored.dayEvents);
  const [dayEventsNote, setDayEventsNote] = useState<string>(restored.dayEventsNote);
  const [safetyConcern, setSafetyConcern] = useState<SafetyConcern | null>(
    restored.safetyConcern
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

  const draftSnapshot = useMemo<DailyLogDraft>(
    () => ({
      version: DRAFT_VERSION,
      entryType,
      level,
      quickImpulseAnswer,
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
      entryType,
      level,
      quickImpulseAnswer,
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
    if (!draftHasContent(draftSnapshot)) {
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
    ...behaviors
      .slice(0, 3)
      .map((b) => `${b.itemLabel} · ${describeBehaviorMode(b.mode)}`),
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
    // Humor é opcional: ausência de resposta nunca vira "Neutro" nem impede salvar.
    setMoodError(null);

    if (isEpisode && behaviors.length === 0 && !behaviorOtherText.trim()) {
      setValidationMessage(
        'Como você escolheu registrar um comportamento, selecione pelo menos um comportamento (mesmo que tenha ficado só no impulso) ou volte para "Check-in diário".'
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
    const saved = onSaveEntry(entry, Boolean(editingEntry));
    // Falha de persistência: o formulário e o rascunho continuam intactos.
    if (saved === false) return;
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

  const focusLabels = FOCUS_AREA_OPTIONS.filter((option) =>
    focusAreas.includes(option.id)
  ).map((option) => option.label);

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

      {!editingEntry && focusLabels.length > 0 && (
        <section
          aria-labelledby="focus-areas-title"
          className="rounded-xl border px-4 py-3"
          style={{
            backgroundColor: 'var(--color-primary-soft)',
            borderColor: 'var(--color-primary)',
            color: 'var(--text-primary)',
          }}
        >
          <p id="focus-areas-title" className="text-sm font-semibold">
            Seu foco inicial
          </p>
          <ul className="mt-1.5 flex flex-wrap gap-1.5" aria-label="Áreas escolhidas no onboarding">
            {focusLabels.map((label) => (
              <li
                key={label}
                className="text-xs font-medium px-2.5 py-1 rounded-full border"
                style={{
                  backgroundColor: 'var(--bg-surface)',
                  borderColor: 'var(--color-primary)',
                }}
              >
                {label}
              </li>
            ))}
          </ul>
          <p className="text-xs mt-2" style={{ color: 'var(--text-secondary)' }}>
            As áreas acima ficam em destaque, mas nenhum pilar foi escondido. Ajuste a qualquer
            momento em Categorias.
          </p>
        </section>
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
              Comportamento (ação ou impulso)
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
              Check-in diário (sem comportamento registrado)
            </span>
            <span className="block text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>
              Acompanhe humor, energia, sono, sinais e rotina — inclusive impulsos contidos.
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
              Comportamento: ação ou impulso
            </span>
            <span className="block text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>
              Registre uma ação efetivamente realizada e/ou um impulso que ficou só na
              vontade. Só a ação conta como episódio realizado.
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
