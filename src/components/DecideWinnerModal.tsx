import React, { useState, useEffect } from 'react';
import { Trophy, X, AlertCircle, Users, Plus, Trash2 } from 'lucide-react';
import confetti from 'canvas-confetti';
import type { EventItem, Registration, EventResult, ResultPodium } from '../types';

interface DecideWinnerModalProps {
  isOpen: boolean;
  event: EventItem | null;
  registrations: Registration[];
  existingResult?: EventResult | null;
  onClose: () => void;
  onPublishResult: (result: Partial<EventResult>) => Promise<void>;
  onViewResults?: () => void;
}

interface WinnerSlot {
  id: string;
  positionNumber: number;
  positionLabel: string;
  medal: 'gold' | 'silver' | 'bronze' | 'trophy' | 'certificate' | 'none';
  studentName: string;
  teamName: string;
  college: string;
  points: number;
  details?: string;
}

export const DecideWinnerModal: React.FC<DecideWinnerModalProps> = ({
  isOpen,
  event,
  registrations,
  existingResult,
  onClose,
  onPublishResult,
  onViewResults,
}) => {
  // Filter registrations belonging to this event
  const eventRegistrations = event
    ? registrations.filter(
      (r) => r.eventId === event.id || r.eventTitle.toLowerCase() === event.title.toLowerCase()
    )
    : [];

  // Toggle for points (false by default per user specification)
  const [includePoints, setIncludePoints] = useState<boolean>(false);

  const getDefaultSlot = (num: number, reg?: Registration): WinnerSlot => {
    let label = `${num}th Place`;
    let medal: WinnerSlot['medal'] = 'certificate';
    let defaultPoints = 10;
    if (num === 1) {
      label = '1st Place (Winner)';
      medal = 'gold';
      defaultPoints = 100;
    } else if (num === 2) {
      label = '2nd Place (Runner Up)';
      medal = 'silver';
      defaultPoints = 60;
    } else if (num === 3) {
      label = '3rd Place';
      medal = 'bronze';
      defaultPoints = 30;
    } else if (num === 4) {
      label = '4th Place (Consolation)';
      medal = 'trophy';
      defaultPoints = 15;
    } else if (num === 5) {
      label = '5th Place (Special Mention)';
      medal = 'certificate';
      defaultPoints = 10;
    }

    return {
      id: `slot_${num}_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      positionNumber: num,
      positionLabel: label,
      medal,
      studentName: reg?.participantName || '',
      teamName: reg?.teamName || '',
      college: reg?.collegeName || '',
      points: defaultPoints,
      details: '',
    };
  };

  // Winner slots state
  const [slots, setSlots] = useState<WinnerSlot[]>([
    getDefaultSlot(1),
    getDefaultSlot(2),
    getDefaultSlot(3),
  ]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successDeclared, setSuccessDeclared] = useState(false);
  const [formError, setFormError] = useState('');

  // Prepopulate if an existing result is passed
  useEffect(() => {
    if (!event) return;

    if (existingResult) {
      setIncludePoints(!!existingResult.includePoints);

      const existingWinners: ResultPodium[] =
        existingResult.winners && existingResult.winners.length > 0
          ? existingResult.winners
          : ([
            existingResult.podium?.first,
            existingResult.podium?.second,
            existingResult.podium?.third,
            existingResult.podium?.fourth,
            existingResult.podium?.fifth,
          ].filter(Boolean) as ResultPodium[]);

      if (existingWinners.length > 0) {
        setSlots(
          existingWinners.map((w, idx) => ({
            id: `slot_exist_${idx + 1}`,
            positionNumber: idx + 1,
            positionLabel: w.positionLabel || `${idx + 1}${idx === 0 ? 'st' : idx === 1 ? 'nd' : idx === 2 ? 'rd' : 'th'} Place`,
            medal: w.medal || (idx === 0 ? 'gold' : idx === 1 ? 'silver' : idx === 2 ? 'bronze' : 'trophy'),
            studentName: w.studentName || w.teamOrParticipant || '',
            teamName: w.teamOrParticipant || '',
            college: w.college || '',
            points: w.points || 0,
            details: w.details || '',
          }))
        );
        return;
      }
    }

    // Default: 3 prize holders auto-suggested from registration data
    setIncludePoints(false);
    const initialSlots: WinnerSlot[] = [
      getDefaultSlot(1, eventRegistrations[0]),
      getDefaultSlot(2, eventRegistrations[1]),
      getDefaultSlot(3, eventRegistrations[2]),
    ];
    setSlots(initialSlots);
  }, [event?.id, existingResult]);

  // Admin decides prize count
  const handleSetPrizeCount = (count: number) => {
    if (count < 1) return;
    setSlots((prev) => {
      if (count === prev.length) return prev;
      if (count > prev.length) {
        const newSlots = [...prev];
        for (let i = prev.length + 1; i <= count; i++) {
          newSlots.push(getDefaultSlot(i, eventRegistrations[i - 1]));
        }
        return newSlots;
      } else {
        return prev.slice(0, count);
      }
    });
  };

  const handleAddSlot = () => {
    const nextNum = slots.length + 1;
    setSlots((prev) => [...prev, getDefaultSlot(nextNum, eventRegistrations[nextNum - 1])]);
  };

  const handleRemoveSlot = (indexToRemove: number) => {
    if (slots.length <= 1) return;
    setSlots((prev) => {
      const filtered = prev.filter((_, idx) => idx !== indexToRemove);
      return filtered.map((slot, idx) => ({
        ...slot,
        positionNumber: idx + 1,
      }));
    });
  };

  const handleUpdateSlot = (index: number, updates: Partial<WinnerSlot>) => {
    setSlots((prev) =>
      prev.map((slot, idx) => (idx === index ? { ...slot, ...updates } : slot))
    );
  };

  const handleSelectRegistration = (slotIndex: number, regId: string) => {
    const reg = eventRegistrations.find((r) => r.id === regId || r.registrationId === regId);
    if (!reg) return;

    handleUpdateSlot(slotIndex, {
      studentName: reg.participantName,
      teamName: reg.teamName || '',
      college: reg.collegeName,
    });
  };

  const getMedalIcon = (medal: string) => {
    switch (medal) {
      case 'gold': return '🥇';
      case 'silver': return '🥈';
      case 'bronze': return '🥉';
      case 'trophy': return '🏆';
      case 'certificate': return '📜';
      default: return '🎖️';
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (slots.length === 0) {
      setFormError('Please configure at least 1 prize holder.');
      return;
    }

    // Validate 1st place
    if (!slots[0].studentName.trim() || !slots[0].college.trim()) {
      setFormError('1st Place winner student name and college institution are required.');
      return;
    }

    if (!event) return;

    setIsSubmitting(true);
    try {
      const eventDateStr =
        event.eventDate || (event.dateTime ? event.dateTime.split('·')[0].trim() : '30 Sep 2026');

      const buildDisplayName = (slot: WinnerSlot) => {
        if (slot.teamName && slot.teamName.trim() && slot.studentName && slot.studentName.trim()) {
          return `${slot.teamName} · ${slot.studentName}`;
        }
        return slot.studentName || slot.teamName || '';
      };

      const podiumPayload: any = {};
      const posKeys = ['first', 'second', 'third', 'fourth', 'fifth'];

      slots.forEach((s, idx) => {
        const key = posKeys[idx] || `place_${idx + 1}`;
        podiumPayload[key] = {
          position: idx + 1,
          positionLabel: s.positionLabel,
          medal: s.medal,
          studentName: s.studentName.trim(),
          teamOrParticipant: buildDisplayName(s),
          college: s.college.trim(),
          points: includePoints ? Number(s.points) || 0 : 0,
          details: s.details?.trim() || '',
        };
      });

      const winnersArray: ResultPodium[] = slots.map((s, idx) => ({
        position: idx + 1,
        positionLabel: s.positionLabel,
        medal: s.medal,
        studentName: s.studentName.trim(),
        teamOrParticipant: buildDisplayName(s),
        college: s.college.trim(),
        points: includePoints ? Number(s.points) || 0 : 0,
        details: s.details?.trim() || '',
      }));

      await onPublishResult({
        eventId: event.id,
        eventTitle: event.title,
        eventType: event.type,
        category: event.category,
        date: eventDateStr,
        includePoints: includePoints,
        prizeCount: slots.length,
        podium: podiumPayload,
        winners: winnersArray,
      });

      // Confetti celebration
      try {
        confetti({
          particleCount: 120,
          spread: 80,
          origin: { y: 0.6 },
          colors: ['#B8860B', '#FFD700', '#C5A059', '#1C1917', '#800020'],
        });
      } catch { }

      setSuccessDeclared(true);
    } catch (err: any) {
      setFormError(err.message || 'Failed to publish event winners');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen || !event) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 text-[#121212]">
      <div className="bg-white border border-[#E5E2DC] rounded-3xl w-full max-w-4xl overflow-hidden shadow-2xl relative max-h-[92vh] flex flex-col animate-in fade-in duration-200">

        {/* Header */}
        <div className="px-6 py-5 border-b border-[#E5E2DC] flex items-center justify-between bg-[#FAF9F6]">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-[#B8860B]/30 flex items-center justify-center text-xl shadow-xs">
              🏆
            </div>
            <div>
              <span className="text-[10px] font-mono font-bold text-[#B8860B] uppercase tracking-wider block">
                ADMIN CONSOLE · PRIZE DISTRIBUTION
              </span>
              <h2 className="font-editorial font-bold text-xl sm:text-2xl text-[#121212]">
                Decide Prize Holders &amp; Declare Winners
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-white border border-[#E5E2DC] flex items-center justify-center hover:bg-gray-100 transition-colors"
          >
            <X className="w-4 h-4 text-[#666461]" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">

          {/* Success Screen */}
          {successDeclared ? (
            <div className="py-12 px-4 text-center space-y-5 animate-in zoom-in-95">
              <div className="w-20 h-20 rounded-full bg-amber-50 border-2 border-[#B8860B] flex items-center justify-center mx-auto text-4xl shadow-md">
                🎉
              </div>
              <div className="space-y-1.5">
                <span className="text-xs font-mono font-bold text-[#B8860B] uppercase tracking-widest block">
                  PRIZES DISTRIBUTED SUCCESSFULLY
                </span>
                <h3 className="font-editorial font-bold text-3xl text-[#121212]">
                  {slots.length} Prize {slots.length === 1 ? 'Holder' : 'Holders'} Official for {event.title}!
                </h3>
                <p className="text-xs text-[#666461] max-w-md mx-auto">
                  The event podium and results have been published live for all participants and public viewers.
                </p>
              </div>

              {/* Summary Cards */}
              <div className="max-w-xl mx-auto space-y-2 pt-2">
                {slots.map((s, idx) => (
                  <div
                    key={s.id || idx}
                    className="p-3 bg-[#FAF9F6] border border-[#E5E2DC] rounded-xl flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center space-x-2">
                      <span className="text-xl">{getMedalIcon(s.medal)}</span>
                      <div className="text-left">
                        <span className="text-[10px] font-mono text-[#B8860B] font-bold block">
                          {s.positionLabel}
                        </span>
                        <strong className="text-[#121212] font-editorial text-sm block">
                          {s.studentName} {s.teamName ? `(${s.teamName})` : ''}
                        </strong>
                        <span className="text-[11px] text-[#666461]">{s.college}</span>
                      </div>
                    </div>
                    {includePoints && s.points > 0 ? (
                      <span className="font-mono font-bold text-xs text-[#B8860B] bg-white px-2 py-0.5 rounded border border-amber-200">
                        +{s.points} PTS
                      </span>
                    ) : null}
                  </div>
                ))}
              </div>

              <div className="pt-4 flex items-center justify-center space-x-3">
                {onViewResults && (
                  <button
                    onClick={() => {
                      onClose();
                      onViewResults();
                    }}
                    className="px-5 py-2.5 bg-[#B8860B] hover:bg-[#966D09] text-white text-xs font-bold uppercase rounded-xl shadow-md transition-all"
                  >
                    View on Event Results Page →
                  </button>
                )}
                <button
                  onClick={onClose}
                  className="px-5 py-2.5 bg-[#121212] hover:bg-[#2A2A2A] text-white text-xs font-bold uppercase rounded-xl transition-all"
                >
                  Close &amp; Return to Dashboard
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Event Info Header Card */}
              <div className="bg-[#FAF9F6] border border-[#E5E2DC] rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center space-x-2 mb-1">
                    <span className="text-[10px] font-mono font-bold uppercase tracking-widest px-2.5 py-0.5 rounded bg-[#121212] text-white">
                      {event.type.toUpperCase()} · {event.category}
                    </span>
                    <span className="text-[10px] font-mono font-bold uppercase tracking-widest px-2.5 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-300">
                      EVENT COMPLETED
                    </span>
                  </div>
                  <h3 className="font-editorial font-bold text-xl text-[#121212]">{event.title}</h3>
                  <p className="text-xs text-[#666461] mt-0.5">
                    Venue: {event.venueName} · Date: {event.eventDate || event.dateTime}
                  </p>
                </div>

                <div className="flex items-center space-x-2 bg-white border border-[#E5E2DC] px-3.5 py-2 rounded-xl text-xs font-mono shadow-xs">
                  <Users className="w-4 h-4 text-[#B8860B]" />
                  <span className="font-bold text-[#121212]">{eventRegistrations.length}</span>
                  <span className="text-[#666461]">Registrations</span>
                </div>
              </div>

              {/* STEP 1: ADMIN DECIDES NUMBER OF PRIZE HOLDERS */}
              <div className="bg-gradient-to-r from-amber-500/10 via-amber-100/30 to-transparent border-2 border-[#B8860B] rounded-2xl p-5 shadow-sm space-y-3">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div>
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#B8860B] block">
                      STEP 1 · ADMIN PRIZE ALLOCATION
                    </span>
                    <h4 className="font-editorial font-bold text-lg text-[#121212]">
                      How Many Prize Holders for this Event?
                    </h4>
                    <p className="text-xs text-[#666461] mt-0.5">
                      Only the admin decides the number of winners before distributing prizes.
                    </p>
                  </div>

                  {/* Selector Pills */}
                  <div className="flex flex-wrap items-center gap-1.5 bg-white border border-[#E5E2DC] p-1.5 rounded-xl shadow-xs">
                    {[1, 2, 3, 4, 5].map((cnt) => (
                      <button
                        key={cnt}
                        type="button"
                        onClick={() => handleSetPrizeCount(cnt)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold font-mono transition-all ${slots.length === cnt
                            ? 'bg-[#B8860B] text-white shadow-xs'
                            : 'text-[#666461] hover:text-[#121212] hover:bg-gray-100'
                          }`}
                      >
                        {cnt} {cnt === 1 ? 'Prize' : 'Prizes'}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={handleAddSlot}
                      title="Add another prize holder"
                      className="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-[#FAF9F6] border border-[#E5E2DC] hover:bg-[#121212] hover:text-white transition-all text-[#121212] flex items-center space-x-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add</span>
                    </button>
                  </div>
                </div>

                <div className="text-xs text-[#666461] flex items-center space-x-2 pt-1 border-t border-amber-200/60 font-mono">
                  <span>Current allocation:</span>
                  <span className="font-bold text-[#121212]">
                    {slots.length} Prize {slots.length === 1 ? 'Holder' : 'Holders'}
                  </span>
                  <span>({slots.map((s) => s.positionLabel).join(', ')})</span>
                </div>
              </div>

              {/* STEP 2: REGISTRATION DATA QUICK-PICK LIST */}
              {eventRegistrations.length > 0 ? (
                <div className="bg-white border border-[#E5E2DC] rounded-2xl p-5 shadow-sm space-y-3">
                  <div className="flex items-center justify-between border-b border-[#E5E2DC] pb-3">
                    <div>
                      <span className="text-[10px] font-mono uppercase font-bold text-[#B8860B] tracking-wider block">
                        STEP 2 · QUICK-PICK FROM REGISTRATION DATA
                      </span>
                      <h4 className="font-editorial font-bold text-base text-[#121212]">
                        Assign Registered Students to Decided Prize Slots
                      </h4>
                    </div>
                    <span className="text-[11px] text-[#666461] hidden sm:block">
                      Click any prize button to assign immediately
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 max-h-48 overflow-y-auto pr-1">
                    {eventRegistrations.map((reg, idx) => {
                      const student = reg.participantName;
                      const college = reg.collegeName;
                      const team = reg.teamName;

                      // Check if already assigned to any slot
                      const assignedSlotIndex = slots.findIndex(
                        (s) => s.studentName === student || (team && s.teamName === team)
                      );

                      return (
                        <div
                          key={reg.id || reg.registrationId || idx}
                          className={`p-3 rounded-xl border transition-all flex items-center justify-between gap-2 text-xs ${assignedSlotIndex >= 0
                              ? 'bg-amber-50/80 border-[#B8860B] ring-1 ring-[#B8860B]'
                              : 'bg-[#FAF9F6] border-[#E5E2DC] hover:border-gray-400'
                            }`}
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center space-x-1.5">
                              <span className="font-mono text-[10px] text-[#666461] font-bold">
                                #{idx + 1}
                              </span>
                              {/* Student Name */}
                              <strong className="text-[#121212] font-semibold truncate block text-xs">
                                {student} {team && <span className="font-normal text-[#666461]">({team})</span>}
                              </strong>
                            </div>
                            {/* Small font: College Name */}
                            <p className="text-[11px] text-[#666461] truncate mt-0.5 font-normal">
                              {college}
                            </p>
                          </div>

                          {/* Quick assign buttons for each decided prize slot */}
                          <div className="flex items-center space-x-1 flex-shrink-0 flex-wrap justify-end">
                            {slots.map((s, slotIdx) => {
                              const isThisSlot = assignedSlotIndex === slotIdx;
                              return (
                                <button
                                  key={s.id || slotIdx}
                                  type="button"
                                  onClick={() => handleSelectRegistration(slotIdx, reg.id || reg.registrationId)}
                                  title={`Assign to ${s.positionLabel}`}
                                  className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-all ${isThisSlot
                                      ? 'bg-[#B8860B] text-white shadow-xs'
                                      : 'bg-white border border-[#E5E2DC] hover:bg-amber-100 text-[#121212]'
                                    }`}
                                >
                                  {getMedalIcon(s.medal)} #{slotIdx + 1}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-xs text-amber-900 flex items-center space-x-3">
                  <AlertCircle className="w-5 h-5 flex-shrink-0 text-amber-700" />
                  <p>
                    No prior online registration records found. You can enter the student name and college manually below.
                  </p>
                </div>
              )}

              {/* STEP 3: OPTIONAL POINTS TOGGLE */}
              <div className="bg-white border border-[#E5E2DC] rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h4 className="font-editorial font-bold text-sm text-[#121212]">
                    Award Event Points? (Optional)
                  </h4>
                  <p className="text-xs text-[#666461] mt-0.5">
                    Points are <strong>disabled by default</strong>. You can enable them whenever you want to include numerical points on this event's podium.
                  </p>
                </div>

                <label className="flex items-center space-x-2.5 cursor-pointer bg-[#FAF9F6] border border-[#E5E2DC] hover:border-[#121212] px-3.5 py-2 rounded-xl transition-all flex-shrink-0 select-none">
                  <input
                    type="checkbox"
                    checked={includePoints}
                    onChange={(e) => setIncludePoints(e.target.checked)}
                    className="w-4 h-4 text-[#B8860B] rounded focus:ring-0 accent-[#B8860B] cursor-pointer"
                  />
                  <span className="text-xs font-bold text-[#121212]">
                    {includePoints ? 'Points Enabled ✅' : 'Enable Points'}
                  </span>
                </label>
              </div>

              {formError && (
                <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-center space-x-2 text-rose-700 text-xs font-semibold">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* STEP 4: PRIZE HOLDER DETAILS & EDITING */}
              <form onSubmit={handleFormSubmit} className="space-y-4">
                <div className="flex items-center justify-between pt-1">
                  <h4 className="font-editorial font-bold text-lg text-[#121212]">
                    Prize Holders Details ({slots.length} Total)
                  </h4>
                  <button
                    type="button"
                    onClick={handleAddSlot}
                    className="px-3 py-1.5 rounded-xl bg-white border border-[#E5E2DC] hover:border-[#121212] text-xs font-bold text-[#121212] flex items-center space-x-1.5 transition-all shadow-xs"
                  >
                    <Plus className="w-3.5 h-3.5 text-[#B8860B]" />
                    <span>Add Another Prize Slot</span>
                  </button>
                </div>

                <div className="space-y-4">
                  {slots.map((slot, index) => {
                    const is1st = index === 0;

                    return (
                      <div
                        key={slot.id || index}
                        className={`bg-white rounded-2xl p-5 shadow-sm space-y-3 transition-all ${is1st ? 'border-2 border-[#B8860B]' : 'border border-[#E5E2DC]'
                          }`}
                      >
                        {/* Slot Header */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#E5E2DC] pb-2.5">
                          <div className="flex items-center space-x-2">
                            <span className="text-2xl">{getMedalIcon(slot.medal)}</span>
                            <div>
                              <span className="text-[10px] font-mono font-bold text-[#B8860B] uppercase tracking-wider block">
                                PRIZE HOLDER #{index + 1}
                              </span>
                              <h4 className="font-editorial font-bold text-base text-[#121212]">
                                {slot.positionLabel}
                              </h4>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            {/* Position Label Customizer */}
                            <select
                              value={slot.positionLabel}
                              onChange={(e) => handleUpdateSlot(index, { positionLabel: e.target.value })}
                              className="text-xs bg-[#FAF9F6] border border-[#E5E2DC] rounded-xl px-2.5 py-1.5 font-medium outline-none"
                            >
                              <option value="1st Place (Winner)">1st Place (Winner)</option>
                              <option value="Champion">Champion</option>
                              <option value="Gold Medalist">Gold Medalist</option>
                              <option value="2nd Place (Runner Up)">2nd Place (Runner Up)</option>
                              <option value="Silver Medalist">Silver Medalist</option>
                              <option value="3rd Place">3rd Place</option>
                              <option value="Bronze Medalist">Bronze Medalist</option>
                              <option value="4th Place (Consolation)">4th Place (Consolation)</option>
                              <option value="5th Place (Special Mention)">5th Place (Special Mention)</option>
                              <option value="Consolation Prize">Consolation Prize</option>
                              <option value="Special Award">Special Award</option>
                              <option value="Finalist">Finalist</option>
                            </select>

                            {/* Medal Selector */}
                            <select
                              value={slot.medal}
                              onChange={(e) => handleUpdateSlot(index, { medal: e.target.value as any })}
                              className="text-xs bg-[#FAF9F6] border border-[#E5E2DC] rounded-xl px-2.5 py-1.5 font-medium outline-none"
                            >
                              <option value="gold">🥇 Gold Medal</option>
                              <option value="silver">🥈 Silver Medal</option>
                              <option value="bronze">🥉 Bronze Medal</option>
                              <option value="trophy">🏆 Trophy</option>
                              <option value="certificate">📜 Certificate</option>
                              <option value="none">No Medal</option>
                            </select>

                            {/* Remove Slot (allowed if slots > 1) */}
                            {slots.length > 1 && (
                              <button
                                type="button"
                                onClick={() => handleRemoveSlot(index)}
                                title="Remove this prize holder slot"
                                className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 hover:bg-rose-100 flex items-center justify-center transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Slot Inputs */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                          {/* Student Name */}
                          <div>
                            <label className="block font-bold text-[#121212] mb-1">
                              Student / Participant Name {index === 0 ? '*' : ''}
                            </label>
                            <input
                              type="text"
                              required={index === 0}
                              value={slot.studentName}
                              onChange={(e) => handleUpdateSlot(index, { studentName: e.target.value })}
                              placeholder="e.g. Aditya Ram"
                              className="w-full px-3 py-2 rounded-xl bg-[#FAF9F6] border border-[#E5E2DC] focus:border-[#B8860B] outline-none font-semibold text-[#121212]"
                            />
                          </div>

                          {/* Team Name */}
                          <div>
                            <label className="block font-medium text-[#666461] mb-1">
                              Team Name (Optional)
                            </label>
                            <input
                              type="text"
                              value={slot.teamName}
                              onChange={(e) => handleUpdateSlot(index, { teamName: e.target.value })}
                              placeholder="e.g. VRJC Strikers"
                              className="w-full px-3 py-2 rounded-xl bg-[#FAF9F6] border border-[#E5E2DC] focus:border-[#B8860B] outline-none font-medium text-[#121212]"
                            />
                          </div>

                          {/* College Name */}
                          <div>
                            <label className="block font-bold text-[#121212] mb-1">
                              College Institution {index === 0 ? '*' : ''}{' '}
                              <span className="text-[10px] text-[#666461] font-normal">(small font)</span>
                            </label>
                            <input
                              type="text"
                              required={index === 0}
                              value={slot.college}
                              onChange={(e) => handleUpdateSlot(index, { college: e.target.value })}
                              placeholder="e.g. R.V.R. & J.C. College of Engineering"
                              className="w-full px-3 py-2 rounded-xl bg-[#FAF9F6] border border-[#E5E2DC] focus:border-[#B8860B] outline-none font-medium text-[#121212]"
                            />
                          </div>

                          {/* Points (Only if enabled) */}
                          {includePoints && (
                            <div className="sm:col-span-1 animate-in fade-in">
                              <label className="block font-bold text-[#B8860B] mb-1">Award Points</label>
                              <input
                                type="number"
                                min="0"
                                max="1000"
                                value={slot.points}
                                onChange={(e) =>
                                  handleUpdateSlot(index, { points: Number(e.target.value) || 0 })
                                }
                                className="w-full px-3 py-2 rounded-xl bg-[#FAF9F6] border border-[#B8860B] outline-none font-bold text-[#B8860B]"
                              />
                            </div>
                          )}

                          <div className={includePoints ? 'sm:col-span-2' : 'sm:col-span-3'}>
                            <label className="block font-medium text-[#666461] mb-1">
                              Remark / Score Highlight (Optional)
                            </label>
                            <input
                              type="text"
                              value={slot.details}
                              onChange={(e) => handleUpdateSlot(index, { details: e.target.value })}
                              placeholder="e.g. Won 3-1 / Score 98.5 / Outstanding Performance"
                              className="w-full px-3 py-2 rounded-xl bg-[#FAF9F6] border border-[#E5E2DC] outline-none text-xs text-[#666461]"
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Submit Action Bar */}
                <div className="pt-4 border-t border-[#E5E2DC] flex items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-5 py-2.5 rounded-xl border border-[#E5E2DC] hover:bg-gray-100 text-xs font-bold uppercase transition-all"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-6 py-2.5 rounded-xl bg-[#B8860B] hover:bg-[#966D09] text-white text-xs font-bold uppercase tracking-wider shadow-md hover:shadow-lg transition-all flex items-center space-x-2 disabled:opacity-50"
                  >
                    <Trophy className="w-4 h-4" />
                    <span>
                      {isSubmitting
                        ? 'Publishing Prizes...'
                        : `Distribute Prizes (${slots.length} Winners) →`}
                    </span>
                  </button>
                </div>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default DecideWinnerModal;
