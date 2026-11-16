import React, { useEffect, useState } from 'react';
import { Check, Eye, EyeOff, Minus, Plus } from 'lucide-react';
import {
  ACTIVATION_SIGNAL_OPTIONS,
  DEFAULT_DAY_EVENTS,
  FUNCTIONAL_IMPACT_OPTIONS,
  MOOD_DEFINITIONS,
  REDUCED_SLEEP_NEED_OPTIONS,
  SLEEP_QUALITY_OPTIONS,
  STATE_DURATION_OPTIONS,
} from '../data/defaults';
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
} from '../types/pulsetrack';

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
  const now = new Date();
  const offset = now.getTimezoneOffset();
  const local = new Date(now.getTime() - offset * 60000);
  return local.toISOString().slice(0, 10);
}

function getCurrentTimeStr(): string {
  const now = new Date();
  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}

function describeEnergy(val: number): string {
  if (val <= 2) return 'Muito baixa / exaustão';
  if (val <= 4) return 'Baixa';
  if (val <= 6) return 'Moderada';
  if (val <= 8) return 'Alta / ativada';
  return 'Muito alta / acelerada';
}

function describeUrge(val: number): string {
  if (val <= 2) return 'Leve';
  if (val <= 5) return 'Moderada';
  if (val <= 7) return 'Forte';
  return 'Muito intensa / urgente';
}

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

  const resetForm = () => {
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
  };

  const toggleMood = (id: MoodStateId) => {
    setMoods((prev) => (prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]));
    setValidationMessage('');
  };

  const toggleActivationSignal = (sig: ActivationSignal) => {
    setActivationSignals((prev) =>
      prev.includes(sig) ? prev.filter((s) => s !== sig) : [...prev, sig]
    );
  };

  const toggleBehavior = (cat: BehaviorCategory, itemId: string, itemLabel: string) => {
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
  };

  const toggleDayEvent = (ev: string) => {
    setDayEvents((prev) => (prev.includes(ev) ? prev.filter((e) => e !== ev) : [...prev, ev]));
  };

  const hasFreeBehaviorSelected = behaviors.some((b) => b.itemId === 'out_livre');

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

  const activeCategories = categories.filter((c) => c.active && c.items.some((i) => i.active));
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

          {editingEntry && (
            <button
              type="button"
              onClick={() => {
                onCancelEdit();
                resetForm();
              }}
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
            onClick={() => {
              setEntryType(EntryType.EPISODE);
              setValidationMessage('');
            }}
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

      {/* PILAR 1: Estado Emocional */}
      <section
        aria-labelledby="sec-emotional"
        className="rounded-2xl border p-5 sm:p-7 space-y-6"
        style={{
          backgroundColor: 'var(--bg-surface)',
          borderColor: 'var(--border-hairline)',
          boxShadow: 'var(--shadow-soft)',
        }}
      >
        <div>
          <p className="text-xs font-medium" style={{ color: 'var(--color-primary-strong)' }}>
            Pilar 1 · Estado emocional
          </p>
          <h2 id="sec-emotional" className="text-xl font-semibold mt-0.5" style={{ color: 'var(--text-primary)' }}>
            Como você estava se sentindo?
          </h2>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
            Diferencie o sentimento emocional da sua energia física ou ação. Pode marcar mais de uma opção.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
          {MOOD_DEFINITIONS.map((mood) => {
            const selected = moods.includes(mood.id);
            const dotColor =
              theme === ThemeMode.DARK
                ? mood.colorDark
                : theme === ThemeMode.HIGH_CONTRAST
                ? mood.colorHighContrast
                : mood.colorLight;

            return (
              <button
                key={mood.id}
                type="button"
                onClick={() => toggleMood(mood.id)}
                aria-pressed={selected}
                className="min-h-[52px] px-3.5 py-2.5 rounded-xl border text-left flex items-center justify-between gap-2 transition-colors cursor-pointer"
                style={{
                  backgroundColor: selected ? 'var(--color-primary-soft)' : 'var(--bg-elevated)',
                  borderColor: selected ? 'var(--color-primary-strong)' : 'var(--border-hairline)',
                  borderWidth: selected ? '2px' : '1px',
                  color: 'var(--text-primary)',
                }}
              >
                <span className="flex items-center gap-2.5 min-w-0">
                  <span
                    className="w-3.5 h-3.5 rounded-sm shrink-0"
                    style={{ backgroundColor: dotColor }}
                    aria-hidden="true"
                  />
                  <span className="text-sm sm:text-base font-medium leading-tight">{mood.label}</span>
                </span>
                {selected && (
                  <Check
                    className="w-4 h-4 shrink-0"
                    style={{ color: 'var(--color-primary-strong)' }}
                    aria-hidden="true"
                  />
                )}
              </button>
            );
          })}
        </div>

        {(moods.includes(MoodStateId.OUTRO) || moodOtherText.trim().length > 0) && (
          <div>
            <label
              htmlFor="mood-other"
              className="block text-sm font-medium mb-1.5"
              style={{ color: 'var(--text-primary)' }}
            >
              Descreva o estado emocional (campo livre)
            </label>
            <input
              id="mood-other"
              type="text"
              value={moodOtherText}
              onChange={(e) => setMoodOtherText(e.target.value)}
              placeholder="Ex.: inquieto por dentro, frustrado, sensível..."
              className="w-full min-h-[48px] px-4 rounded-xl border text-base"
              style={{
                backgroundColor: 'var(--bg-elevated)',
                borderColor: 'var(--border-strong)',
                color: 'var(--text-primary)',
              }}
            />
          </div>
        )}

        {/* Oscilação de humor */}
        <div className="pt-4 border-t" style={{ borderColor: 'var(--border-hairline)' }}>
          <p className="text-base font-medium mb-3" style={{ color: 'var(--text-primary)' }}>
            Houve oscilação de humor significativa nas últimas horas?
          </p>
          <div className="grid grid-cols-2 gap-3 max-w-md">
            <button
              type="button"
              onClick={() => setHadMoodSwing(true)}
              aria-pressed={hadMoodSwing}
              className="min-h-[48px] px-4 rounded-xl border text-base font-medium cursor-pointer"
              style={{
                backgroundColor: hadMoodSwing ? 'var(--color-accent-soft)' : 'var(--bg-elevated)',
                borderColor: hadMoodSwing ? 'var(--color-accent)' : 'var(--border-hairline)',
                borderWidth: hadMoodSwing ? '2px' : '1px',
                color: 'var(--text-primary)',
              }}
            >
              Sim, houve oscilação
            </button>
            <button
              type="button"
              onClick={() => setHadMoodSwing(false)}
              aria-pressed={!hadMoodSwing}
              className="min-h-[48px] px-4 rounded-xl border text-base font-medium cursor-pointer"
              style={{
                backgroundColor: !hadMoodSwing ? 'var(--color-secondary-soft)' : 'var(--bg-elevated)',
                borderColor: !hadMoodSwing ? 'var(--color-secondary)' : 'var(--border-hairline)',
                borderWidth: !hadMoodSwing ? '2px' : '1px',
                color: 'var(--text-primary)',
              }}
            >
              Não percebi
            </button>
          </div>

          {hadMoodSwing && (
            <div className="mt-3">
              <label
                htmlFor="swing-desc"
                className="block text-sm font-medium mb-1.5"
                style={{ color: 'var(--text-primary)' }}
              >
                Como foi essa oscilação?
              </label>
              <input
                id="swing-desc"
                type="text"
                value={moodSwingDescription}
                onChange={(e) => setMoodSwingDescription(e.target.value)}
                placeholder="Ex.: passei de apatia pela tarde para agitação intensa à noite"
                className="w-full min-h-[48px] px-4 rounded-xl border text-base"
                style={{
                  backgroundColor: 'var(--bg-elevated)',
                  borderColor: 'var(--border-strong)',
                  color: 'var(--text-primary)',
                }}
              />
            </div>
          )}
        </div>
      </section>

      {/* PILAR 2: Estado de Ativação, Sono, Duração e Sinais */}
      <section
        aria-labelledby="sec-activation"
        className="rounded-2xl border p-5 sm:p-7 space-y-7"
        style={{
          backgroundColor: 'var(--bg-surface)',
          borderColor: 'var(--border-hairline)',
          boxShadow: 'var(--shadow-soft)',
        }}
      >
        <div>
          <p className="text-xs font-medium" style={{ color: 'var(--color-primary-strong)' }}>
            Pilar 2 · Estado de ativação e sono
          </p>
          <h2 id="sec-activation" className="text-xl font-semibold mt-0.5" style={{ color: 'var(--text-primary)' }}>
            Como estavam sua energia, sono e ritmo mental?
          </h2>
        </div>

        {/* Nível de energia 0-10 */}
        <div>
          <div className="flex flex-wrap items-baseline justify-between gap-2 mb-2">
            <label
              htmlFor="energy-slider"
              className="text-base font-medium"
              style={{ color: 'var(--text-primary)' }}
            >
              Nível de energia física e mental (0 a 10)
            </label>
            <span
              className="text-sm font-medium font-mono tabular-nums"
              style={{ color: 'var(--color-primary-strong)' }}
            >
              {energyLevel}/10 · {describeEnergy(energyLevel)}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setEnergyLevel((v) => Math.max(0, v - 1))}
              aria-label="Diminuir nível de energia"
              className="min-h-[48px] min-w-[48px] rounded-xl border flex items-center justify-center shrink-0 cursor-pointer"
              style={{
                backgroundColor: 'var(--bg-elevated)',
                borderColor: 'var(--border-strong)',
                color: 'var(--text-primary)',
              }}
            >
              <Minus className="w-5 h-5" />
            </button>
            <input
              id="energy-slider"
              type="range"
              min={0}
              max={10}
              step={1}
              value={energyLevel}
              onChange={(e) => setEnergyLevel(Number(e.target.value))}
              className="pt-slider w-full"
            />
            <button
              type="button"
              onClick={() => setEnergyLevel((v) => Math.min(10, v + 1))}
              aria-label="Aumentar nível de energia"
              className="min-h-[48px] min-w-[48px] rounded-xl border flex items-center justify-center shrink-0 cursor-pointer"
              style={{
                backgroundColor: 'var(--bg-elevated)',
                borderColor: 'var(--border-strong)',
                color: 'var(--text-primary)',
              }}
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Monitoramento do Sono */}
        <div className="pt-4 border-t space-y-5" style={{ borderColor: 'var(--border-hairline)' }}>
          <h3 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
            Sono da última noite
          </h3>

          {/* Horas dormidas */}
          <div>
            <div className="flex flex-wrap items-baseline justify-between gap-2 mb-2">
              <label
                htmlFor="sleep-hours"
                className="text-sm sm:text-base font-medium"
                style={{ color: 'var(--text-primary)' }}
              >
                Horas dormidas (aproximadamente)
              </label>
              <span
                className="text-base font-semibold font-mono tabular-nums"
                style={{ color: 'var(--color-primary-strong)' }}
              >
                {sleepHours.toFixed(1).replace('.0', '')}h
              </span>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setSleepHours((v) => Math.max(0, Number((v - 0.5).toFixed(1))))}
                aria-label="Diminuir horas de sono"
                className="min-h-[48px] min-w-[48px] rounded-xl border flex items-center justify-center shrink-0 cursor-pointer"
                style={{
                  backgroundColor: 'var(--bg-elevated)',
                  borderColor: 'var(--border-strong)',
                  color: 'var(--text-primary)',
                }}
              >
                <Minus className="w-5 h-5" />
              </button>
              <input
                id="sleep-hours"
                type="range"
                min={0}
                max={14}
                step={0.5}
                value={sleepHours}
                onChange={(e) => setSleepHours(Number(e.target.value))}
                className="pt-slider w-full"
              />
              <button
                type="button"
                onClick={() => setSleepHours((v) => Math.min(14, Number((v + 0.5).toFixed(1))))}
                aria-label="Aumentar horas de sono"
                className="min-h-[48px] min-w-[48px] rounded-xl border flex items-center justify-center shrink-0 cursor-pointer"
                style={{
                  backgroundColor: 'var(--bg-elevated)',
                  borderColor: 'var(--border-strong)',
                  color: 'var(--text-primary)',
                }}
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Qualidade do sono */}
          <div>
            <p className="text-sm sm:text-base font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
              Qualidade do sono
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {SLEEP_QUALITY_OPTIONS.map((opt) => {
                const active = sleepQuality === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setSleepQuality(opt.id)}
                    aria-pressed={active}
                    className="min-h-[48px] px-3 py-2 rounded-xl border text-sm font-medium cursor-pointer"
                    style={{
                      backgroundColor: active ? 'var(--color-primary-soft)' : 'var(--bg-elevated)',
                      borderColor: active ? 'var(--color-primary-strong)' : 'var(--border-hairline)',
                      borderWidth: active ? '2px' : '1px',
                      color: 'var(--text-primary)',
                    }}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Redução da necessidade de sono */}
          <div>
            <p className="text-sm sm:text-base font-medium mb-1" style={{ color: 'var(--text-primary)' }}>
              Notou redução da necessidade de sono?
            </p>
            <p className="text-xs sm:text-sm mb-2.5" style={{ color: 'var(--text-secondary)' }}>
              Ex.: dormir poucas horas e mesmo assim sentir-se acelerado ou sem cansaço.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {REDUCED_SLEEP_NEED_OPTIONS.map((opt) => {
                const active = reducedSleepNeed === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setReducedSleepNeed(opt.id)}
                    aria-pressed={active}
                    className="min-h-[54px] p-3 rounded-xl border text-left cursor-pointer"
                    style={{
                      backgroundColor: active
                        ? opt.id === ReducedSleepNeed.MARCANTE
                          ? 'var(--color-accent-soft)'
                          : 'var(--color-primary-soft)'
                        : 'var(--bg-elevated)',
                      borderColor: active
                        ? opt.id === ReducedSleepNeed.MARCANTE
                          ? 'var(--color-accent)'
                          : 'var(--color-primary-strong)'
                        : 'var(--border-hairline)',
                      borderWidth: active ? '2px' : '1px',
                    }}
                  >
                    <span className="block text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                      {opt.label}
                    </span>
                    <span className="block text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                      {opt.hint}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Duração dos estados */}
        <div className="pt-4 border-t" style={{ borderColor: 'var(--border-hairline)' }}>
          <p className="text-base font-medium mb-1" style={{ color: 'var(--text-primary)' }}>
            Há quanto tempo esse estado de humor/energia está durando?
          </p>
          <p className="text-sm mb-3" style={{ color: 'var(--text-secondary)' }}>
            Ajuda a distinguir oscilações breves de períodos mantidos por vários dias ou semanas.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-2">
            {STATE_DURATION_OPTIONS.map((opt) => {
              const active = stateDuration === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setStateDuration(opt.id)}
                  aria-pressed={active}
                  className="min-h-[48px] px-3 py-2 rounded-xl border text-sm font-medium text-center cursor-pointer"
                  style={{
                    backgroundColor: active ? 'var(--color-primary-soft)' : 'var(--bg-elevated)',
                    borderColor: active ? 'var(--color-primary-strong)' : 'var(--border-hairline)',
                    borderWidth: active ? '2px' : '1px',
                    color: 'var(--text-primary)',
                  }}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Sinais associados de ativação */}
        <div className="pt-4 border-t" style={{ borderColor: 'var(--border-hairline)' }}>
          <p className="text-base font-medium mb-1" style={{ color: 'var(--text-primary)' }}>
            Sinais associados de ativação (se houver)
          </p>
          <p className="text-sm mb-3" style={{ color: 'var(--text-secondary)' }}>
            Marque apenas o que estiver presente hoje.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {ACTIVATION_SIGNAL_OPTIONS.map((sig) => {
              const selected = activationSignals.includes(sig.id);
              return (
                <button
                  key={sig.id}
                  type="button"
                  onClick={() => toggleActivationSignal(sig.id)}
                  aria-pressed={selected}
                  className="min-h-[56px] p-3.5 rounded-xl border text-left flex items-start justify-between gap-3 cursor-pointer"
                  style={{
                    backgroundColor: selected ? 'var(--color-accent-soft)' : 'var(--bg-elevated)',
                    borderColor: selected ? 'var(--color-accent)' : 'var(--border-hairline)',
                    borderWidth: selected ? '2px' : '1px',
                  }}
                >
                  <div>
                    <span className="block text-sm sm:text-base font-medium" style={{ color: 'var(--text-primary)' }}>
                      {sig.label}
                    </span>
                    <span className="block text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                      {sig.description}
                    </span>
                  </div>
                  {selected && (
                    <Check
                      className="w-5 h-5 shrink-0 mt-0.5"
                      style={{ color: 'var(--color-accent)' }}
                      aria-hidden="true"
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* PILAR 3: Comportamento (apenas quando Episódio comportamental está ativo) */}
      {entryType === EntryType.EPISODE ? (
        <section
          aria-labelledby="sec-behavior-pillar"
          className="rounded-2xl border p-5 sm:p-7 space-y-6"
          style={{
            backgroundColor: 'var(--bg-surface)',
            borderColor: 'var(--border-hairline)',
            boxShadow: 'var(--shadow-soft)',
          }}
        >
          <div>
            <p className="text-xs font-medium" style={{ color: 'var(--color-primary-strong)' }}>
              Pilar 3 · Comportamento
            </p>
            <h2
              id="sec-behavior-pillar"
              className="text-xl font-semibold mt-0.5"
              style={{ color: 'var(--text-primary)' }}
            >
              O que você efetivamente fez ou sentiu impulso de fazer?
            </h2>
          </div>

          {/* Gatilho */}
          <div>
            <label
              htmlFor="trigger-context"
              className="block text-base font-medium mb-1.5"
              style={{ color: 'var(--text-primary)' }}
            >
              Gatilho ou contexto
            </label>
            <input
              id="trigger-context"
              type="text"
              value={triggerContext}
              onChange={(e) => setTriggerContext(e.target.value)}
              placeholder="O que aconteceu antes? (ex.: solidão, tédio, crítica, excesso de tarefas...)"
              className="w-full min-h-[48px] px-4 rounded-xl border text-base"
              style={{
                backgroundColor: 'var(--bg-elevated)',
                borderColor: 'var(--border-strong)',
                color: 'var(--text-primary)',
              }}
            />
          </div>

          {/* Categorias e subitens */}
          <div className="space-y-6">
            {activeCategories.map((cat) => {
              const activeItems = cat.items.filter((i) => i.active);
              return (
                <div
                  key={cat.id}
                  className="pt-4 border-t first:pt-0 first:border-t-0"
                  style={{ borderColor: 'var(--border-hairline)' }}
                >
                  <h3 className="text-base font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>
                    {cat.name}
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {activeItems.map((item) => {
                      const checked = behaviors.some((b) => b.itemId === item.id);
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => toggleBehavior(cat, item.id, item.label)}
                          aria-pressed={checked}
                          className="min-h-[50px] px-4 py-2.5 rounded-xl border text-left flex items-center justify-between gap-3 transition-colors cursor-pointer"
                          style={{
                            backgroundColor: checked
                              ? 'var(--color-primary-soft)'
                              : 'var(--bg-elevated)',
                            borderColor: checked
                              ? 'var(--color-primary-strong)'
                              : 'var(--border-hairline)',
                            borderWidth: checked ? '2px' : '1px',
                            color: 'var(--text-primary)',
                          }}
                        >
                          <span className="text-sm sm:text-base leading-snug">{item.label}</span>
                          {checked && (
                            <Check
                              className="w-5 h-5 shrink-0"
                              style={{ color: 'var(--color-primary-strong)' }}
                              aria-hidden="true"
                            />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {(hasFreeBehaviorSelected || behaviorOtherText.trim().length > 0) && (
            <div>
              <label
                htmlFor="behavior-other"
                className="block text-sm font-medium mb-1.5"
                style={{ color: 'var(--text-primary)' }}
              >
                Outro comportamento (campo livre)
              </label>
              <input
                id="behavior-other"
                type="text"
                value={behaviorOtherText}
                onChange={(e) => setBehaviorOtherText(e.target.value)}
                placeholder="Descreva com suas palavras"
                className="w-full min-h-[48px] px-4 rounded-xl border text-base"
                style={{
                  backgroundColor: 'var(--bg-elevated)',
                  borderColor: 'var(--border-strong)',
                  color: 'var(--text-primary)',
                }}
              />
            </div>
          )}

          {/* Intensidade da vontade */}
          <div className="pt-4 border-t" style={{ borderColor: 'var(--border-hairline)' }}>
            <div className="flex flex-wrap items-baseline justify-between gap-2 mb-2">
              <label
                htmlFor="urge-slider"
                className="text-base font-medium"
                style={{ color: 'var(--text-primary)' }}
              >
                Intensidade da vontade / impulso (0 a 10)
              </label>
              <span
                className="text-sm font-medium font-mono tabular-nums"
                style={{ color: 'var(--color-accent)' }}
              >
                {urgeIntensity}/10 · {describeUrge(urgeIntensity)}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setUrgeIntensity((v) => Math.max(0, v - 1))}
                aria-label="Diminuir intensidade da vontade"
                className="min-h-[48px] min-w-[48px] rounded-xl border flex items-center justify-center shrink-0 cursor-pointer"
                style={{
                  backgroundColor: 'var(--bg-elevated)',
                  borderColor: 'var(--border-strong)',
                  color: 'var(--text-primary)',
                }}
              >
                <Minus className="w-5 h-5" />
              </button>
              <input
                id="urge-slider"
                type="range"
                min={0}
                max={10}
                step={1}
                value={urgeIntensity}
                onChange={(e) => setUrgeIntensity(Number(e.target.value))}
                className="pt-slider w-full"
              />
              <button
                type="button"
                onClick={() => setUrgeIntensity((v) => Math.min(10, v + 1))}
                aria-label="Aumentar intensidade da vontade"
                className="min-h-[48px] min-w-[48px] rounded-xl border flex items-center justify-center shrink-0 cursor-pointer"
                style={{
                  backgroundColor: 'var(--bg-elevated)',
                  borderColor: 'var(--border-strong)',
                  color: 'var(--text-primary)',
                }}
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Consciência e interrupção */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <p className="text-base font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
                O comportamento foi:
              </p>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: AwarenessType.CONSCIENTE, label: 'Consciente' },
                  { id: AwarenessType.AUTOMATICO, label: 'Automático' },
                  { id: AwarenessType.MISTURA, label: 'Mistura' },
                ].map((opt) => {
                  const active = awareness === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setAwareness(opt.id)}
                      aria-pressed={active}
                      className="min-h-[48px] px-2.5 rounded-xl border text-sm font-medium cursor-pointer"
                      style={{
                        backgroundColor: active
                          ? 'var(--color-primary-soft)'
                          : 'var(--bg-elevated)',
                        borderColor: active
                          ? 'var(--color-primary-strong)'
                          : 'var(--border-hairline)',
                        borderWidth: active ? '2px' : '1px',
                        color: 'var(--text-primary)',
                      }}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <p className="text-base font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
                Conseguiu interromper ou resistir?
              </p>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: ResistanceResult.SIM, label: 'Sim' },
                  { id: ResistanceResult.PARCIALMENTE, label: 'Parcial' },
                  { id: ResistanceResult.NAO, label: 'Não' },
                ].map((opt) => {
                  const active = resisted === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setResisted(opt.id)}
                      aria-pressed={active}
                      className="min-h-[48px] px-2.5 rounded-xl border text-sm font-medium cursor-pointer"
                      style={{
                        backgroundColor: active
                          ? 'var(--color-primary-soft)'
                          : 'var(--bg-elevated)',
                        borderColor: active
                          ? 'var(--color-primary-strong)'
                          : 'var(--border-hairline)',
                        borderWidth: active ? '2px' : '1px',
                        color: 'var(--text-primary)',
                      }}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {showOptionalFields && (
            <div
              className="pt-4 border-t grid grid-cols-1 md:grid-cols-2 gap-5"
              style={{ borderColor: 'var(--border-hairline)' }}
            >
              <div>
                <label
                  htmlFor="feeling-during"
                  className="block text-sm font-medium mb-1.5"
                  style={{ color: 'var(--text-primary)' }}
                >
                  Sensação durante (opcional)
                </label>
                <textarea
                  id="feeling-during"
                  rows={2}
                  value={feelingDuring}
                  onChange={(e) => setFeelingDuring(e.target.value)}
                  placeholder="Ex.: euforia na expectativa, piloto automático, alívio..."
                  className="w-full p-3.5 rounded-xl border text-base"
                  style={{
                    backgroundColor: 'var(--bg-elevated)',
                    borderColor: 'var(--border-strong)',
                    color: 'var(--text-primary)',
                  }}
                />
              </div>

              <div>
                <label
                  htmlFor="feeling-after"
                  className="block text-sm font-medium mb-1.5"
                  style={{ color: 'var(--text-primary)' }}
                >
                  Sensação / consequência depois (opcional)
                </label>
                <textarea
                  id="feeling-after"
                  rows={2}
                  value={feelingAfter}
                  onChange={(e) => setFeelingAfter(e.target.value)}
                  placeholder="Ex.: queda brusca de interesse, cansaço, calma..."
                  className="w-full p-3.5 rounded-xl border text-base"
                  style={{
                    backgroundColor: 'var(--bg-elevated)',
                    borderColor: 'var(--border-strong)',
                    color: 'var(--text-primary)',
                  }}
                />
              </div>
            </div>
          )}
        </section>
      ) : (
        <div
          className="rounded-2xl border p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
          style={{
            backgroundColor: 'var(--bg-elevated)',
            borderColor: 'var(--border-hairline)',
          }}
        >
          <div>
            <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
              Pilar 3 · Comportamento: sem episódio compulsivo neste registro
            </p>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              Ótimo — registrar dias tranquilos é essencial para comparar sono e humor ao longo do tempo.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setEntryType(EntryType.EPISODE)}
            className="min-h-[44px] px-4 rounded-xl border text-sm font-medium whitespace-nowrap shrink-0 cursor-pointer"
            style={{
              backgroundColor: 'var(--bg-surface)',
              borderColor: 'var(--border-strong)',
              color: 'var(--color-primary-strong)',
            }}
          >
            Adicionar comportamento
          </button>
        </div>
      )}

      {/* Botão para expandir detalhes opcionais no Modo de Foco */}
      {focusMode && (
        <div className="flex justify-center">
          <button
            type="button"
            onClick={() => setShowOptionalInFocus((s) => !s)}
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

      {/* Bloco 4: Impacto Funcional, Eventos do Dia e Observações */}
      {showOptionalFields && (
        <section
          aria-labelledby="sec-impact-context"
          className="rounded-2xl border p-5 sm:p-7 space-y-6"
          style={{
            backgroundColor: 'var(--bg-surface)',
            borderColor: 'var(--border-hairline)',
            boxShadow: 'var(--shadow-soft)',
          }}
        >
          <div>
            <h2 id="sec-impact-context" className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>
              Impacto funcional e contexto do dia (opcional)
            </h2>
            <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
              Como o seu estado emocional, sono ou comportamento afetou sua vida hoje?
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {[
              { label: 'Trabalho / Estudos', value: impactWork, setter: setImpactWork },
              { label: 'Relacionamentos', value: impactRelationships, setter: setImpactRelationships },
              { label: 'Rotina / Autocuidado', value: impactRoutine, setter: setImpactRoutine },
            ].map((domain) => (
              <div key={domain.label} className="space-y-2">
                <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                  {domain.label}
                </p>
                <div className="grid grid-cols-2 gap-1.5">
                  {FUNCTIONAL_IMPACT_OPTIONS.map((lvl) => {
                    const active = domain.value === lvl.id;
                    return (
                      <button
                        key={lvl.id}
                        type="button"
                        onClick={() => domain.setter(lvl.id)}
                        aria-pressed={active}
                        className="min-h-[44px] px-2.5 rounded-lg border text-xs sm:text-sm font-medium cursor-pointer"
                        style={{
                          backgroundColor: active
                            ? lvl.id === FunctionalImpactLevel.MODERADO ||
                              lvl.id === FunctionalImpactLevel.INTENSO
                              ? 'var(--color-accent-soft)'
                              : 'var(--color-primary-soft)'
                            : 'var(--bg-elevated)',
                          borderColor: active
                            ? lvl.id === FunctionalImpactLevel.MODERADO ||
                              lvl.id === FunctionalImpactLevel.INTENSO
                              ? 'var(--color-accent)'
                              : 'var(--color-primary-strong)'
                            : 'var(--border-hairline)',
                          color: 'var(--text-primary)',
                        }}
                      >
                        {lvl.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          <div>
            <label
              htmlFor="impact-note"
              className="block text-sm font-medium mb-1.5"
              style={{ color: 'var(--text-primary)' }}
            >
              Detalhe do impacto funcional (opcional)
            </label>
            <input
              id="impact-note"
              type="text"
              value={impactNote}
              onChange={(e) => setImpactNote(e.target.value)}
              placeholder="Ex.: atrasei entregas, discuti por impaciência, pulei refeições..."
              className="w-full min-h-[48px] px-4 rounded-xl border text-base"
              style={{
                backgroundColor: 'var(--bg-elevated)',
                borderColor: 'var(--border-strong)',
                color: 'var(--text-primary)',
              }}
            />
          </div>

          {/* Eventos do dia */}
          <div className="pt-4 border-t" style={{ borderColor: 'var(--border-hairline)' }}>
            <p className="text-base font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
              Eventos do dia relacionados
            </p>
            <div className="flex flex-wrap gap-2.5">
              {DEFAULT_DAY_EVENTS.map((ev) => {
                const selected = dayEvents.includes(ev);
                return (
                  <button
                    key={ev}
                    type="button"
                    onClick={() => toggleDayEvent(ev)}
                    aria-pressed={selected}
                    className="min-h-[48px] px-4 py-2 rounded-xl border text-sm font-medium transition-colors cursor-pointer"
                    style={{
                      backgroundColor: selected
                        ? 'var(--color-secondary-soft)'
                        : 'var(--bg-elevated)',
                      borderColor: selected ? 'var(--color-secondary)' : 'var(--border-hairline)',
                      borderWidth: selected ? '2px' : '1px',
                      color: 'var(--text-primary)',
                    }}
                  >
                    {ev}
                  </button>
                );
              })}
            </div>
            <input
              type="text"
              value={dayEventsNote}
              onChange={(e) => setDayEventsNote(e.target.value)}
              placeholder="Outro evento do dia (ex.: esqueci medicação da manhã, viagem, consulta...)"
              aria-label="Outro evento do dia"
              className="w-full min-h-[48px] px-4 rounded-xl border text-base mt-3"
              style={{
                backgroundColor: 'var(--bg-elevated)',
                borderColor: 'var(--border-strong)',
                color: 'var(--text-primary)',
              }}
            />
          </div>

          <div>
            <label
              htmlFor="extra-notes"
              className="block text-sm font-medium mb-1.5"
              style={{ color: 'var(--text-primary)' }}
            >
              Observações extras
            </label>
            <textarea
              id="extra-notes"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Qualquer detalhe que ajude você ou seu profissional a entender esse dia"
              className="w-full p-3.5 rounded-xl border text-base"
              style={{
                backgroundColor: 'var(--bg-elevated)',
                borderColor: 'var(--border-strong)',
                color: 'var(--text-primary)',
              }}
            />
          </div>
        </section>
      )}

      {validationMessage && (
        <div
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
          onClick={resetForm}
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
          {editingEntry
            ? 'Salvar alterações'
            : entryType === EntryType.DAILY_CHECKIN
            ? 'Salvar check-in diário'
            : 'Salvar episódio'}
        </button>
      </div>
    </form>
  );
};
