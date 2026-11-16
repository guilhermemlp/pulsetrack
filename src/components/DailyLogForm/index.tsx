import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivationSignal,
  AwarenessType,
  BehaviorCategory,
  EntryType,
  FunctionalImpactLevel,
  MoodStateId,
  PulseEntry,
  ReducedSleepNeed,
  ResistanceResult,
  SelectedBehavior,
  SleepQuality,
  StateDuration,
  ThemeMode,
} from '../../types/pulsetrack';
import { toLocalIsoDate } from '../../utils/analytics';
import { ActivationSection } from './ActivationSection';
import { BehaviorSection } from './BehaviorSection';
import { FormActions, FormHeaderActions } from './FormActions';
import { ImpactSection } from './ImpactSection';
import { MoodSection } from './MoodSection';

interface DailyLogFormProps {
  categories: BehaviorCategory[];
  editingEntry: PulseEntry | null;
  focusMode: boolean;
  onToggleFocusMode: () => void;
  onSaveEntry: (entry: PulseEntry, isEdit: boolean) => void;
  onCancelEdit: () => void;
  theme: ThemeMode;
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
 * Orquestra os 3 pilares (Estado Emocional, Estado de Ativação/Sono e Comportamento)
 * além do impacto funcional e modo de foco.
 */
export const DailyLogForm: React.FC<DailyLogFormProps> = ({
  categories,
  editingEntry,
  focusMode,
  onToggleFocusMode,
  onSaveEntry,
  onCancelEdit,
  theme,
}) => {
  const [entryType, setEntryType] = useState<EntryType>(EntryType.DAILY_CHECKIN);
  const [date, setDate] = useState<string>(getCurrentDateStr);
  const [time, setTime] = useState<string>(getCurrentTimeStr);

  // Pilar 1: Estado Emocional
  const [moods, setMoods] = useState<MoodStateId[]>([]);
  const [moodOtherText, setMoodOtherText] = useState<string>('');
  const [hadMoodSwing, setHadMoodSwing] = useState<boolean>(false);
  const [moodSwingDescription, setMoodSwingDescription] = useState<string>('');

  // Pilar 2: Estado de Ativação e Sono
  const [energyLevel, setEnergyLevel] = useState<number>(5);
  const [sleepHours, setSleepHours] = useState<number>(7);
  const [sleepQuality, setSleepQuality] = useState<SleepQuality>(SleepQuality.REGULAR);
  const [reducedSleepNeed, setReducedSleepNeed] = useState<ReducedSleepNeed>(ReducedSleepNeed.NAO);
  const [stateDuration, setStateDuration] = useState<StateDuration>(StateDuration.ESTAVEL);
  const [activationSignals, setActivationSignals] = useState<ActivationSignal[]>([]);

  // Pilar 3: Comportamento
  const [triggerContext, setTriggerContext] = useState<string>('');
  const [behaviors, setBehaviors] = useState<SelectedBehavior[]>([]);
  const [behaviorOtherText, setBehaviorOtherText] = useState<string>('');
  const [awareness, setAwareness] = useState<AwarenessType>(AwarenessType.MISTURA);
  const [resisted, setResisted] = useState<ResistanceResult>(ResistanceResult.NAO);
  const [urgeIntensity, setUrgeIntensity] = useState<number>(5);
  const [feelingDuring, setFeelingDuring] = useState<string>('');
  const [feelingAfter, setFeelingAfter] = useState<string>('');

  // Impacto Funcional & Contexto do Dia
  const [impactWork, setImpactWork] = useState<FunctionalImpactLevel>(FunctionalImpactLevel.NENHUM);
  const [impactRelationships, setImpactRelationships] = useState<FunctionalImpactLevel>(
    FunctionalImpactLevel.NENHUM
  );
  const [impactRoutine, setImpactRoutine] = useState<FunctionalImpactLevel>(
    FunctionalImpactLevel.NENHUM
  );
  const [impactNote, setImpactNote] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [dayEvents, setDayEvents] = useState<string[]>([]);
  const [dayEventsNote, setDayEventsNote] = useState<string>('');

  const [showOptionalInFocus, setShowOptionalInFocus] = useState<boolean>(false);
  const [validationMessage, setValidationMessage] = useState<string>('');

  useEffect(() => {
    if (editingEntry) {
      setEntryType(editingEntry.entryType);
      setDate(editingEntry.date);
      setTime(editingEntry.time);
      setMoods(editingEntry.moods);
      setMoodOtherText(editingEntry.moodOtherText);
      setHadMoodSwing(editingEntry.hadMoodSwing);
      setMoodSwingDescription(editingEntry.moodSwingDescription);
      setEnergyLevel(editingEntry.energyLevel);
      setSleepHours(editingEntry.sleep.hours);
      setSleepQuality(editingEntry.sleep.quality);
      setReducedSleepNeed(editingEntry.sleep.reducedNeed);
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
      setNotes(editingEntry.notes);
      setDayEvents(editingEntry.dayEvents);
      setDayEventsNote(editingEntry.dayEventsNote);
      setValidationMessage('');
    }
  }, [editingEntry]);

  const resetForm = useCallback(() => {
    setEntryType(EntryType.DAILY_CHECKIN);
    setDate(getCurrentDateStr());
    setTime(getCurrentTimeStr());
    setMoods([]);
    setMoodOtherText('');
    setHadMoodSwing(false);
    setMoodSwingDescription('');
    setEnergyLevel(5);
    setSleepHours(7);
    setSleepQuality(SleepQuality.REGULAR);
    setReducedSleepNeed(ReducedSleepNeed.NAO);
    setStateDuration(StateDuration.ESTAVEL);
    setActivationSignals([]);
    setTriggerContext('');
    setBehaviors([]);
    setBehaviorOtherText('');
    setAwareness(AwarenessType.MISTURA);
    setResisted(ResistanceResult.NAO);
    setUrgeIntensity(5);
    setFeelingDuring('');
    setFeelingAfter('');
    setImpactWork(FunctionalImpactLevel.NENHUM);
    setImpactRelationships(FunctionalImpactLevel.NENHUM);
    setImpactRoutine(FunctionalImpactLevel.NENHUM);
    setImpactNote('');
    setNotes('');
    setDayEvents([]);
    setDayEventsNote('');
    setValidationMessage('');
  }, []);

  const handleCancelEdit = useCallback(() => {
    onCancelEdit();
    resetForm();
  }, [onCancelEdit, resetForm]);

  const toggleMood = useCallback((id: MoodStateId) => {
    setMoods((prev) => (prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]));
    setValidationMessage('');
  }, []);

  const toggleActivationSignal = useCallback((sig: ActivationSignal) => {
    setActivationSignals((prev) =>
      prev.includes(sig) ? prev.filter((s) => s !== sig) : [...prev, sig]
    );
  }, []);

  const toggleBehavior = useCallback((cat: BehaviorCategory, itemId: string, itemLabel: string) => {
    setBehaviors((prev) => {
      const exists = prev.some((b) => b.itemId === itemId);
      if (exists) {
        return prev.filter((b) => b.itemId !== itemId);
      }
      return [
        ...prev,
        {
          categoryId: cat.id,
          categoryName: cat.name,
          itemId,
          itemLabel,
        },
      ];
    });
    setValidationMessage('');
  }, []);

  const toggleDayEvent = useCallback((ev: string) => {
    setDayEvents((prev) => (prev.includes(ev) ? prev.filter((e) => e !== ev) : [...prev, ev]));
  }, []);

  const handleSwitchToEpisode = useCallback(() => {
    setEntryType(EntryType.EPISODE);
    setValidationMessage('');
  }, []);

  const handleToggleOptionalInFocus = useCallback(() => {
    setShowOptionalInFocus((s) => !s);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (moods.length === 0) {
      setValidationMessage(
        'Escolha pelo menos um estado emocional (pode ser "Neutro" ou "Outro") antes de salvar.'
      );
      return;
    }

    const isEpisode = entryType === EntryType.EPISODE;
    if (isEpisode && behaviors.length === 0 && !behaviorOtherText.trim()) {
      setValidationMessage(
        'Como você escolheu "Episódio comportamental", selecione pelo menos um comportamento ou mude para "Check-in diário (sem episódio)".'
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
      moodOtherText: moodOtherText.trim(),
      hadMoodSwing,
      moodSwingDescription: hadMoodSwing ? moodSwingDescription.trim() : '',
      energyLevel,
      sleep: {
        hours: sleepHours,
        quality: sleepQuality,
        reducedNeed: reducedSleepNeed,
      },
      stateDuration,
      activationSignals,
      triggerContext: triggerContext.trim(),
      behaviors: isEpisode ? behaviors : [],
      behaviorOtherText: isEpisode ? behaviorOtherText.trim() : '',
      awareness: isEpisode ? awareness : AwarenessType.CONSCIENTE,
      resisted: isEpisode ? resisted : ResistanceResult.SIM,
      urgeIntensity: isEpisode ? urgeIntensity : 0,
      feelingDuring: isEpisode ? feelingDuring.trim() : '',
      feelingAfter: isEpisode ? feelingAfter.trim() : '',
      functionalImpact: {
        work: impactWork,
        relationships: impactRelationships,
        routine: impactRoutine,
        note: impactNote.trim(),
      },
      notes: notes.trim(),
      dayEvents,
      dayEventsNote: dayEventsNote.trim(),
    };

    onSaveEntry(finalEntry, Boolean(editingEntry));
    if (!editingEntry) {
      resetForm();
    }
  };

  const showOptionalFields = !focusMode || showOptionalInFocus;

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
          </div>
        </div>
      </section>

      <MoodSection
        moods={moods}
        moodOtherText={moodOtherText}
        hadMoodSwing={hadMoodSwing}
        moodSwingDescription={moodSwingDescription}
        theme={theme}
        onToggleMood={toggleMood}
        onChangeMoodOtherText={setMoodOtherText}
        onChangeHadMoodSwing={setHadMoodSwing}
        onChangeMoodSwingDescription={setMoodSwingDescription}
      />

      <ActivationSection
        energyLevel={energyLevel}
        sleepHours={sleepHours}
        sleepQuality={sleepQuality}
        reducedSleepNeed={reducedSleepNeed}
        stateDuration={stateDuration}
        activationSignals={activationSignals}
        onChangeEnergyLevel={setEnergyLevel}
        onChangeSleepHours={setSleepHours}
        onChangeSleepQuality={setSleepQuality}
        onChangeReducedSleepNeed={setReducedSleepNeed}
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
        showOptionalFields={showOptionalFields}
        onSwitchToEpisode={handleSwitchToEpisode}
        onChangeTriggerContext={setTriggerContext}
        onToggleBehavior={toggleBehavior}
        onChangeBehaviorOtherText={setBehaviorOtherText}
        onChangeUrgeIntensity={setUrgeIntensity}
        onChangeAwareness={setAwareness}
        onChangeResisted={setResisted}
        onChangeFeelingDuring={setFeelingDuring}
        onChangeFeelingAfter={setFeelingAfter}
      />

      {showOptionalFields && (
        <ImpactSection
          impactWork={impactWork}
          impactRelationships={impactRelationships}
          impactRoutine={impactRoutine}
          impactNote={impactNote}
          dayEvents={dayEvents}
          dayEventsNote={dayEventsNote}
          notes={notes}
          onChangeImpactWork={setImpactWork}
          onChangeImpactRelationships={setImpactRelationships}
          onChangeImpactRoutine={setImpactRoutine}
          onChangeImpactNote={setImpactNote}
          onToggleDayEvent={toggleDayEvent}
          onChangeDayEventsNote={setDayEventsNote}
          onChangeNotes={setNotes}
        />
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
