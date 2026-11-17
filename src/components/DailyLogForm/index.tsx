import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Zap } from 'lucide-react';
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
  ReducedSleepNeed,
  ResistanceResult,
  SafetyConcern,
  SelectedBehavior,
  SleepQuality,
  StateDuration,
  ThemeMode,
} from '../../types/pulsetrack';
import { toLocalIsoDate } from '../../utils/analytics';
import {
  clearFormDraft,
  loadFormDraft,
  saveFormDraft,
} from '../../utils/storage';
import { ActivationSection } from './ActivationSection';
import { BehaviorSection } from './BehaviorSection';
import { FormActions, FormHeaderActions } from './FormActions';
import { ImpactSection } from './ImpactSection';
import { MoodSection } from './MoodSection';
import { SafetySection } from './SafetySection';

interface DailyLogFormProps {
  categories: BehaviorCategory[];
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
  editingEntry,
  focusMode,
  onToggleFocusMode,
  onSaveEntry,
  onCancelEdit,
  theme,
  showSexualCategory,
  trackCycle,
}) => {
  const draft = useMemo(() => (editingEntry ? null : loadFormDraft()), [editingEntry]);
  const draftPayload = draft?.payload;

  const [draftRestored, setDraftRestored] = useState<boolean>(Boolean(draft));
  const [quickMode, setQuickMode] = useState<boolean>(true);

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
      setQuickMode(false);
    }
  }, [editingEntry]);

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
      return;
    }
    saveFormDraft(draftSnapshot as unknown as Record<string, unknown>);
  }, [draftSnapshot, editingEntry]);

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
    setDraftRestored(false);
    clearFormDraft();
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
  }, []);

  const changeMoodIntensity = useCallback((id: MoodStateId, value: number) => {
    setMoodIntensity((prev) => ({ ...prev, [id]: value }));
  }, []);

  const toggleActivationSignal = useCallback((sig: ActivationSignal) => {
    setActivationSignals((prev) =>
      prev.includes(sig) ? prev.filter((s) => s !== sig) : [...prev, sig]
    );
  }, []);

  /** Seleciona o item (padrão: "fiz") ou alterna o modo do item já selecionado. */
  const toggleBehavior = useCallback(
    (cat: BehaviorCategory, itemId: string, itemLabel: string, mode?: BehaviorMode) => {
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
              mode: mode ?? BehaviorMode.FEITO,
              harm: false,
            },
          ];
        }
        if (mode && existing.mode !== mode) {
          return prev.map((b) => (b.itemId === itemId ? { ...b, mode } : b));
        }
        if (!mode) {
          return prev.filter((b) => b.itemId !== itemId);
        }
        return prev;
      });
      setValidationMessage('');
    },
    []
  );

  const setBehaviorHarm = useCallback((itemId: string, harm: boolean) => {
    setBehaviors((prev) => prev.map((b) => (b.itemId === itemId ? { ...b, harm } : b)));
  }, []);

  const toggleDayEvent = useCallback((ev: string) => {
    setDayEvents((prev) => (prev.includes(ev) ? prev.filter((e) => e !== ev) : [...prev, ev]));
  }, []);

  const handleSwitchToEpisode = useCallback(() => {
    setEntryType(EntryType.EPISODE);
    setQuickMode(false);
    setValidationMessage('');
  }, []);

  const handleToggleOptionalInFocus = useCallback(() => {
    setShowOptionalInFocus((s) => !s);
  }, []);

  const isEpisode = entryType === EntryType.EPISODE;
  const showFull = !quickMode || isEpisode;
  const showOptionalFields = showFull && (!focusMode || showOptionalInFocus);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (moods.length === 0) {
      setValidationMessage(
        'Escolha pelo menos um estado emocional (pode ser "Neutro" ou "Outro") antes de salvar.'
      );
      return;
    }

    if (isEpisode && behaviors.length === 0 && !behaviorOtherText.trim()) {
      setValidationMessage(
        'Como você escolheu "Episódio comportamental", selecione pelo menos um comportamento (mesmo que tenha ficado só no impulso) ou mude para "Check-in diário (sem episódio)".'
      );
      return;
    }

    const finalEntry: PulseEntry = {
      id: editingEntry
        ? editingEntry.id
        : `entry_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      entryType,
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
      behaviors: isEpisode ? behaviors : [],
      behaviorOtherText: isEpisode ? behaviorOtherText.trim() : '',
      // Sem episódio não há "consciência" nem "resistência" a atribuir: fica não informado.
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

    onSaveEntry(finalEntry, Boolean(editingEntry));
    if (!editingEntry) {
      resetForm();
      clearFormDraft();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8 max-w-4xl mx-auto">
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

      {draftRestored && (
        <div
          role="status"
          className="rounded-xl border px-4 py-3 text-sm"
          style={{
            backgroundColor: 'var(--color-secondary-soft)',
            borderColor: 'var(--color-secondary)',
            color: 'var(--text-primary)',
          }}
        >
          Rascunho do seu último registro foi restaurado. Nada foi salvo ainda — revise e clique em salvar.
        </div>
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
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => {
              setEntryType(EntryType.DAILY_CHECKIN);
              setValidationMessage('');
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

        {/* Profundidade do check-in: rápido (menos de 1 minuto) ou completo */}
        {!isEpisode && (
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <span className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
              Profundidade:
            </span>
            <button
              type="button"
              onClick={() => setQuickMode(true)}
              aria-pressed={quickMode}
              className="min-h-[44px] px-3.5 rounded-lg border text-xs font-medium inline-flex items-center gap-1.5 cursor-pointer"
              style={{
                backgroundColor: quickMode ? 'var(--color-primary-soft)' : 'var(--bg-elevated)',
                borderColor: quickMode ? 'var(--color-primary-strong)' : 'var(--border-hairline)',
                color: 'var(--text-primary)',
              }}
            >
              <Zap className="w-3.5 h-3.5" aria-hidden="true" />
              Check-in rápido
            </button>
            <button
              type="button"
              onClick={() => setQuickMode(false)}
              aria-pressed={!quickMode}
              className="min-h-[44px] px-3.5 rounded-lg border text-xs font-medium cursor-pointer"
              style={{
                backgroundColor: !quickMode ? 'var(--color-primary-soft)' : 'var(--bg-elevated)',
                borderColor: !quickMode ? 'var(--color-primary-strong)' : 'var(--border-hairline)',
                color: 'var(--text-primary)',
              }}
            >
              Detalhado
            </button>
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
              {quickMode
                ? 'Só o essencial: humor, valência, energia e sono.'
                : 'Inclui sinais, duração, medicação e contexto.'}
            </span>
          </div>
        )}

        {/* Data e Hora */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3">
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
            <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
              Pode registrar mais de uma vez no dia: oscilações ao longo do dia não se recuperam de memória.
            </p>
          </div>
        </div>
      </section>

      <MoodSection
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
        onToggleMood={toggleMood}
        onChangeMoodIntensity={changeMoodIntensity}
        onChangeMoodOtherText={setMoodOtherText}
        onChangeValence={setValence}
        onChangeHadMoodSwing={setHadMoodSwing}
        onChangeMoodSwingDirection={setMoodSwingDirection}
        onChangeMoodSwingWindow={setMoodSwingWindow}
        onChangeMoodSwingDescription={setMoodSwingDescription}
      />

      <ActivationSection
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
        compact={!showFull}
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

      <BehaviorSection
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
        onSwitchToEpisode={handleSwitchToEpisode}
        onChangeTriggerContext={setTriggerContext}
        onToggleBehavior={toggleBehavior}
        onChangeBehaviorHarm={setBehaviorHarm}
        onChangeBehaviorOtherText={setBehaviorOtherText}
        onChangeUrgeIntensity={setUrgeIntensity}
        onChangeAwareness={setAwareness}
        onChangeResisted={setResisted}
        onChangeFeelingDuring={setFeelingDuring}
        onChangeFeelingAfter={setFeelingAfter}
      />

      <SafetySection concern={safetyConcern} onChange={setSafetyConcern} />

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

      {quickMode && !isEpisode && (
        <div className="flex justify-center">
          <button
            type="button"
            onClick={() => setQuickMode(false)}
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
        focusMode={focusMode}
        showOptionalInFocus={showOptionalInFocus}
        validationMessage={validationMessage}
        onToggleOptionalInFocus={handleToggleOptionalInFocus}
        onResetForm={resetForm}
      />
    </form>
  );
};
