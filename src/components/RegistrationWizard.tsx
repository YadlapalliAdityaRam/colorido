import React, { useState, useEffect } from 'react';
import {
  X, CheckCircle, ArrowRight, ArrowLeft, Download, Calendar, Users, AlertCircle, Copy,
  Activity, Music, Search, MapPin
} from 'lucide-react';
import type { EventItem, Registration, UserProfile, TeamMember } from '../types';
import { apiService } from '../services/apiService';
import { generateTicketPDF } from '../services/pdfGenerator';
import { downloadCalendarICS } from '../utils/calendar';
import { getRequiredPlayerCount, isTeamRegistration } from '../utils/eventRegistration';

interface RegistrationWizardProps {
  isOpen: boolean;
  onClose: () => void;
  preSelectedEvent: EventItem | null;
  allEvents: EventItem[];
  user: UserProfile;
  onRegistrationComplete: (reg: Registration) => void;
}

export const RegistrationWizard: React.FC<RegistrationWizardProps> = ({
  isOpen,
  onClose,
  preSelectedEvent,
  allEvents,
  user,
  onRegistrationComplete,
}) => {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(preSelectedEvent ? 2 : 1);
  const [selectedEvent, setSelectedEvent] = useState<EventItem | null>(preSelectedEvent);
  const [selectedCategoryType, setSelectedCategoryType] = useState<'sports' | 'cultural' | null>(
    preSelectedEvent ? (preSelectedEvent.type.toLowerCase() === 'cultural' ? 'cultural' : 'sports') : null
  );
  const [eventSearchTerm, setEventSearchTerm] = useState('');
  const [subCategoryFilter, setSubCategoryFilter] = useState('ALL');

  const [participantName, setParticipantName] = useState(user.name);
  const [participantEmail, setParticipantEmail] = useState(user.email);
  const [participantPhone, setParticipantPhone] = useState(user.phone);
  const [collegeName, setCollegeName] = useState(user.college);
  const [studentId, setStudentId] = useState(user.studentId);
  const [teamName, setTeamName] = useState('');

  // Target player count decided by admin
  const targetPlayerLimit = getRequiredPlayerCount(selectedEvent);
  const isTeam = isTeamRegistration(selectedEvent);

  const [members, setMembers] = useState<TeamMember[]>([
    {
      name: user.name,
      email: user.email,
      phone: user.phone,
      studentId: user.studentId,
      rollNumber: user.studentId,
      college: user.college,
      role: 'Captain / Team Lead',
    }
  ]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmedReg, setConfirmedReg] = useState<Registration | null>(null);

  // Sync selectedEvent when preSelectedEvent or isOpen changes
  useEffect(() => {
    if (preSelectedEvent) {
      setSelectedEvent(preSelectedEvent);
      setSelectedCategoryType(preSelectedEvent.type.toLowerCase() === 'cultural' ? 'cultural' : 'sports');
      setStep(2);
    } else {
      setSelectedEvent(null);
      setSelectedCategoryType(null);
      setStep(1);
    }
    setEventSearchTerm('');
    setSubCategoryFilter('ALL');
    setConfirmedReg(null);
  }, [preSelectedEvent, isOpen]);

  // Sync with current user profile
  useEffect(() => {
    setParticipantName(user.name);
    setParticipantEmail(user.email);
    setParticipantPhone(user.phone);
    setCollegeName(user.college);
    setStudentId(user.studentId);
  }, [user]);

  // Whenever selectedEvent or targetPlayerLimit changes, ensure members array has exact required slots
  useEffect(() => {
    if (!selectedEvent) return;

    const count = targetPlayerLimit;
    setMembers((prevMembers) => {
      const updated: TeamMember[] = [];
      for (let i = 0; i < count; i++) {
        if (i === 0) {
          updated.push({
            name: participantName || user.name || '',
            email: participantEmail || user.email || '',
            phone: participantPhone || user.phone || '',
            studentId: studentId || user.studentId || '',
            rollNumber: studentId || user.studentId || '',
            college: collegeName || user.college || '',
            role: 'Captain / Team Lead',
          });
        } else {
          const prev = prevMembers[i];
          updated.push({
            name: prev?.name || '',
            email: prev?.email || '',
            phone: prev?.phone || '',
            studentId: prev?.studentId || prev?.rollNumber || '',
            rollNumber: prev?.rollNumber || prev?.studentId || '',
            college: prev?.college || collegeName || user.college || '',
            role: `Player #${i + 1}`,
          });
        }
      }
      return updated;
    });
  }, [selectedEvent?.id, targetPlayerLimit]);

  // Keep member[0] in sync with participant details
  useEffect(() => {
    setMembers((prev) => {
      if (!prev || prev.length === 0) return prev;
      const updated = [...prev];
      updated[0] = {
        ...updated[0],
        name: participantName,
        email: participantEmail,
        phone: participantPhone,
        college: collegeName,
        studentId: studentId,
        rollNumber: studentId,
      };
      return updated;
    });
  }, [participantName, participantEmail, participantPhone, collegeName, studentId]);

  if (!isOpen) return null;

  const handleMemberChange = (idx: number, field: keyof TeamMember, value: string) => {
    setMembers((prev) => {
      const updated = [...prev];
      if (!updated[idx]) {
        updated[idx] = {
          name: '',
          email: '',
          phone: '',
          studentId: '',
          rollNumber: '',
          college: collegeName,
          role: `Player #${idx + 1}`,
        };
      }
      updated[idx] = { ...updated[idx], [field]: value };
      if (field === 'rollNumber' && !updated[idx].studentId) {
        updated[idx].studentId = value;
      } else if (field === 'studentId' && !updated[idx].rollNumber) {
        updated[idx].rollNumber = value;
      }
      return updated;
    });
  };

  const handleCopyCollegeToAll = () => {
    if (!collegeName.trim()) return;
    setMembers((prev) =>
      prev.map((m) => ({
        ...m,
        college: collegeName,
      }))
    );
  };

  // Helper validation for each player
  const isPlayerComplete = (idx: number): boolean => {
    if (idx === 0) {
      return Boolean(participantName.trim() && studentId.trim() && collegeName.trim());
    }
    const m = members[idx];
    if (!m) return false;
    const name = m.name?.trim();
    const roll = (m.rollNumber || m.studentId || '').trim();
    const col = (m.college || '').trim();
    return Boolean(name && roll && col);
  };

  const completedPlayersCount = isTeam
    ? Array.from({ length: targetPlayerLimit }).filter((_, i) => isPlayerComplete(i)).length
    : (participantName.trim() && studentId.trim() && collegeName.trim() ? 1 : 0);

  const isStep2Valid = Boolean(
    participantName.trim() &&
    participantEmail.trim() &&
    participantPhone.trim() &&
    collegeName.trim() &&
    studentId.trim() &&
    (!isTeam || (teamName.trim() && completedPlayersCount === targetPlayerLimit))
  );

  const handleSubmitRegistration = async () => {
    if (!selectedEvent) return;
    setIsSubmitting(true);

    try {
      const finalMembers: TeamMember[] = isTeam
        ? Array.from({ length: targetPlayerLimit }).map((_, idx) => {
            if (idx === 0) {
              return {
                name: participantName.trim(),
                rollNumber: studentId.trim(),
                studentId: studentId.trim(),
                college: collegeName.trim(),
                email: participantEmail.trim(),
                phone: participantPhone.trim(),
                role: 'Captain / Team Lead',
              };
            }
            const m = members[idx] || { name: '', studentId: '', rollNumber: '', college: '' };
            const roll = (m.rollNumber || m.studentId || '').trim();
            return {
              name: m.name.trim(),
              rollNumber: roll,
              studentId: roll,
              college: (m.college || collegeName).trim(),
              email: m.email?.trim() || '',
              phone: m.phone?.trim() || '',
              role: `Player #${idx + 1}`,
            };
          })
        : [
            {
              name: participantName.trim(),
              rollNumber: studentId.trim(),
              studentId: studentId.trim(),
              college: collegeName.trim(),
              email: participantEmail.trim(),
              phone: participantPhone.trim(),
              role: 'Solo Competitor',
            },
          ];

      const reg = await apiService.createRegistration({
        eventId: selectedEvent.id,
        participantName,
        participantEmail,
        participantPhone,
        collegeName,
        studentId,
        format: isTeam ? 'team' : 'solo',
        teamName: isTeam ? (teamName.trim() || `${participantName}'s Team`) : undefined,
        members: finalMembers,
      });

      setConfirmedReg(reg);
      setStep(4);
      onRegistrationComplete(reg);
    } catch {
      // Error handling
    } finally {
      setIsSubmitting(false);
    }
  };

  const evtType = selectedEvent?.type?.toLowerCase() || selectedCategoryType || '';
  const isCultural = evtType === 'cultural';
  const isSports = evtType === 'sports';
  const hasDarkCustomBg = isCultural;

  const filteredCategoryEvents = allEvents.filter((evt) => {
    if (!selectedCategoryType) return true;
    if (evt.type.toLowerCase() !== selectedCategoryType.toLowerCase()) return false;
    if (subCategoryFilter !== 'ALL' && evt.category.toUpperCase() !== subCategoryFilter.toUpperCase()) {
      return false;
    }
    if (eventSearchTerm.trim()) {
      const q = eventSearchTerm.toLowerCase();
      const match =
        evt.title.toLowerCase().includes(q) ||
        evt.category.toLowerCase().includes(q) ||
        (evt.venueName && evt.venueName.toLowerCase().includes(q));
      if (!match) return false;
    }
    return true;
  });

  const subCategories = ['ALL', ...Array.from(
    new Set(allEvents.filter(e => e.type.toLowerCase() === selectedCategoryType?.toLowerCase()).map(e => e.category))
  )];

  return (
    <div className="nf-modal-layer nf-registration-wizard fixed inset-0 z-[100] overflow-y-auto bg-black/60 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
      {/* Modal Surface Container */}
      <div
        className={`rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col relative transition-all duration-300 ${
          hasDarkCustomBg
            ? 'border border-white/20 text-white'
            : isSports
              ? 'border border-[#E5E2DC] text-[#121212]'
              : 'bg-white border border-[#E5E2DC] text-[#121212]'
        }`}
        style={
          isCultural
            ? {
                backgroundImage:
                  "linear-gradient(to bottom, rgba(14, 10, 16, 0.52), rgba(8, 6, 12, 0.70)), url('/cultural_bG.jpg')",
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              }
            : isSports
              ? {
                  backgroundImage:
                    "linear-gradient(to bottom, rgba(255, 255, 255, 0.88), rgba(250, 250, 245, 0.97)), url('/sports_reg_bg.jpg')",
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                }
              : {}
        }
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className={`p-5 flex items-center justify-between border-b ${
            hasDarkCustomBg
              ? 'border-white/10 bg-black/40 backdrop-blur-md'
              : isSports
                ? 'border-black/10 bg-white/60 backdrop-blur-md'
                : 'border-[#E5E2DC] bg-[#FAF9F6]'
          }`}
        >
          <div>
            <span
              className={`text-[10px] font-bold tracking-widest uppercase block ${
                isCultural ? 'text-amber-400' : isSports ? 'text-emerald-700' : 'text-[#800020]'
              }`}
            >
              COLORIDO 2K26 {isCultural ? '· CULTURAL FESTIVAL' : isSports ? '· SPORTS CHAMPIONSHIP' : '· NATIONAL FESTIVAL'}
            </span>
            <h3 className={`font-editorial font-bold text-lg ${hasDarkCustomBg ? 'text-white' : 'text-[#121212]'}`}>
              {step === 1 && !selectedCategoryType
                ? 'SELECT FESTIVAL CATEGORY'
                : step === 1
                ? `SELECT ${selectedCategoryType === 'sports' ? 'SPORTS' : 'CULTURAL'} EVENT`
                : 'REGISTER FOR COMPETITION'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className={`p-2 rounded-lg transition-colors cursor-pointer ${
              hasDarkCustomBg
                ? 'text-white/70 hover:text-white bg-white/10'
                : 'text-[#666461] hover:text-[#121212] bg-black/5 hover:bg-black/10'
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step Indicator */}
        <div
          className={`px-6 py-3 flex items-center justify-between text-[11px] font-semibold border-b ${
            hasDarkCustomBg
              ? 'border-white/10 bg-black/30 text-white/60'
              : isSports
                ? 'border-black/10 bg-white/40 text-black/60'
                : 'border-[#E5E2DC] bg-[#FAF9F6] text-[#666461]'
          }`}
        >
          {[
            { num: 1, label: selectedCategoryType ? `01 ${selectedCategoryType.toUpperCase()}` : '01 CATEGORY' },
            { num: 2, label: '02 DETAILS & SQUAD' },
            { num: 3, label: '03 REVIEW' },
            { num: 4, label: '04 CONFIRM' },
          ].map((s) => (
            <span
              key={s.num}
              className={
                step === s.num
                  ? isCultural
                    ? 'text-amber-400 font-bold border-b-2 border-amber-400 pb-0.5'
                    : isSports
                      ? 'text-emerald-700 font-bold border-b-2 border-emerald-700 pb-0.5'
                      : 'text-[#800020] font-bold border-b-2 border-[#800020] pb-0.5'
                  : ''
              }
            >
              {s.label}
            </span>
          ))}
        </div>

        {/* Wizard Body */}
        <div
          className={`p-6 overflow-y-auto max-h-[72vh] space-y-4 ${
            hasDarkCustomBg ? 'bg-black/20' : isSports ? 'bg-white/20' : 'bg-white'
          }`}
        >
          {/* STEP 1: CATEGORY CHOICE FIRST -> THEN EVENT SELECTION */}
          {step === 1 && (
            <div>
              {!selectedCategoryType ? (
                /* STEP 1A: CHOOSE SPORTS OR CULTURALS FIRST */
                <div className="space-y-4 py-1">
                  <div className="text-center space-y-1">
                    <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-[#800020]">
                      STEP 1 OF 4 · SELECT CATEGORY
                    </span>
                    <h4 className="font-editorial font-bold text-xl text-[#121212]">
                      What would you like to register for?
                    </h4>
                    <p className="text-xs text-[#666461] max-w-md mx-auto">
                      Choose whether you want to participate in a Sports Championship or a Cultural Showcase event.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                    {/* 1. SPORTS CHAMPIONSHIPS CARD */}
                    <div
                      onClick={() => {
                        setSelectedCategoryType('sports');
                        setEventSearchTerm('');
                        setSubCategoryFilter('ALL');
                      }}
                      className="group cursor-pointer rounded-2xl border-2 border-[#E5E2DC] hover:border-[#800020] bg-gradient-to-b from-white to-[#FAF6F6] p-5 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between relative overflow-hidden text-left"
                    >
                      <div className="absolute top-0 right-0 w-28 h-28 bg-[#800020]/5 rounded-bl-full pointer-events-none group-hover:scale-110 transition-transform" />

                      <div className="space-y-3 relative z-10">
                        <div className="flex items-center justify-between">
                          <div className="w-12 h-12 rounded-xl bg-[#800020] text-white flex items-center justify-center shadow-md group-hover:scale-110 transition-transform">
                            <Activity className="w-6 h-6" />
                          </div>
                          <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-mono font-bold">
                            {allEvents.filter(e => e.type.toLowerCase() === 'sports').length} Tournaments
                          </span>
                        </div>

                        <div>
                          <h5 className="font-editorial font-bold text-lg text-[#121212] group-hover:text-[#800020] transition-colors">
                            SPORTS
                          </h5>
                          <span className="text-[10px] font-mono font-bold text-[#800020] uppercase tracking-wider block">
                            Inter-College Tournaments
                          </span>
                          <p className="text-xs text-[#666461] mt-1.5 leading-relaxed">
                            Cricket, Football, Kabaddi, Basketball, Volleyball, Badminton, Athletics &amp; team championships.
                          </p>
                        </div>
                      </div>

                      <div className="pt-4 mt-3 border-t border-[#E5E2DC] flex items-center justify-between text-xs font-bold text-[#800020] relative z-10">
                        <span>Select Sports &amp; Choose Event</span>
                        <div className="w-7 h-7 rounded-full bg-[#800020] text-white flex items-center justify-center group-hover:translate-x-1 transition-transform">
                          <ArrowRight className="w-4 h-4" />
                        </div>
                      </div>
                    </div>

                    {/* 2. CULTURAL SHOWCASES CARD */}
                    <div
                      onClick={() => {
                        setSelectedCategoryType('cultural');
                        setEventSearchTerm('');
                        setSubCategoryFilter('ALL');
                      }}
                      className="group cursor-pointer rounded-2xl border-2 border-[#E5E2DC] hover:border-[#C5A059] bg-gradient-to-b from-white to-[#FAF6EE] p-5 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between relative overflow-hidden text-left"
                    >
                      <div className="absolute top-0 right-0 w-28 h-28 bg-[#C5A059]/10 rounded-bl-full pointer-events-none group-hover:scale-110 transition-transform" />

                      <div className="space-y-3 relative z-10">
                        <div className="flex items-center justify-between">
                          <div className="w-12 h-12 rounded-xl bg-[#C5A059] text-white flex items-center justify-center shadow-md group-hover:scale-110 transition-transform">
                            <Music className="w-6 h-6" />
                          </div>
                          <span className="px-2.5 py-1 rounded-full bg-amber-50 text-amber-900 border border-amber-200 text-[10px] font-mono font-bold">
                            {allEvents.filter(e => e.type.toLowerCase() === 'cultural').length} Competitions
                          </span>
                        </div>

                        <div>
                          <h5 className="font-editorial font-bold text-lg text-[#121212] group-hover:text-[#800020] transition-colors">
                            CULTURALS
                          </h5>
                          <span className="text-[10px] font-mono font-bold text-[#C5A059] uppercase tracking-wider block">
                            Artistic &amp; Performing Arts
                          </span>
                          <p className="text-xs text-[#666461] mt-1.5 leading-relaxed">
                            Classical &amp; Western Dance, Singing, Battle of Bands, Theatre, and Fine Arts.
                          </p>
                        </div>
                      </div>

                      <div className="pt-4 mt-3 border-t border-[#E5E2DC] flex items-center justify-between text-xs font-bold text-[#800020] relative z-10">
                        <span>Select Culturals &amp; Choose Event</span>
                        <div className="w-7 h-7 rounded-full bg-[#C5A059] text-white flex items-center justify-center group-hover:translate-x-1 transition-transform">
                          <ArrowRight className="w-4 h-4" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                /* STEP 1B: LIST EVENTS UNDER CHOSEN CATEGORY */
                <div className="space-y-3">
                  {/* Category Switch Header */}
                  <div className={`flex items-center justify-between pb-2 border-b ${hasDarkCustomBg ? 'border-white/10' : 'border-[#E5E2DC]'}`}>
                    <button
                      type="button"
                      onClick={() => setSelectedCategoryType(null)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center space-x-1.5 transition-colors cursor-pointer ${
                        hasDarkCustomBg
                          ? 'bg-white/10 hover:bg-white/20 text-white'
                          : 'bg-stone-100 hover:bg-stone-200 text-[#121212]'
                      }`}
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      <span>← Switch to {selectedCategoryType === 'sports' ? 'Culturals' : 'Sports'}</span>
                    </button>

                    <div className="flex items-center space-x-1.5">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase shadow-xs ${
                        selectedCategoryType === 'sports'
                          ? 'bg-[#800020] text-white'
                          : 'bg-[#C5A059] text-white'
                      }`}>
                        {selectedCategoryType === 'sports' ? '⚽ SPORTS CHAMPIONSHIPS' : '🎭 CULTURAL SHOWCASE'}
                      </span>
                      <span className={`text-[11px] font-mono ${hasDarkCustomBg ? 'text-white/60' : 'text-[#666461]'}`}>
                        ({filteredCategoryEvents.length} events)
                      </span>
                    </div>
                  </div>

                  {/* Search & Sub-category Filter Toolbar */}
                  <div className="flex flex-col sm:flex-row gap-2">
                    <div className="relative flex-1">
                      <Search className={`w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 ${hasDarkCustomBg ? 'text-white/50' : 'text-[#666461]'}`} />
                      <input
                        type="text"
                        value={eventSearchTerm}
                        onChange={(e) => setEventSearchTerm(e.target.value)}
                        placeholder={`Search ${selectedCategoryType === 'sports' ? 'sports (e.g. Football, Cricket)' : 'cultural (e.g. Dance, Singing)'}...`}
                        className={`w-full pl-8 pr-3 py-2 rounded-xl text-xs outline-none ${
                          hasDarkCustomBg
                            ? 'bg-black/50 border border-white/20 text-white placeholder-white/40 focus:border-amber-400'
                            : 'bg-[#FAF9F6] border border-[#E5E2DC] text-[#121212] focus:border-[#800020]'
                        }`}
                      />
                      {eventSearchTerm && (
                        <button
                          onClick={() => setEventSearchTerm('')}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 text-xs cursor-pointer"
                        >
                          ×
                        </button>
                      )}
                    </div>

                    {/* Subcategory Filter Pills */}
                    {subCategories.length > 2 && (
                      <div className="flex items-center space-x-1 overflow-x-auto scrollbar-none py-0.5">
                        {subCategories.map((sub) => (
                          <button
                            key={sub}
                            type="button"
                            onClick={() => setSubCategoryFilter(sub)}
                            className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold uppercase whitespace-nowrap transition-colors cursor-pointer ${
                              subCategoryFilter === sub
                                ? hasDarkCustomBg
                                  ? 'bg-amber-400 text-black font-extrabold'
                                  : 'bg-[#121212] text-white'
                                : hasDarkCustomBg
                                  ? 'bg-white/10 text-white/70 hover:text-white'
                                  : 'bg-stone-100 text-[#666461] hover:text-[#121212]'
                            }`}
                          >
                            {sub}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Filtered Event Cards List */}
                  <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                    {filteredCategoryEvents.length === 0 ? (
                      <div className={`p-8 text-center rounded-xl border space-y-1 ${
                        hasDarkCustomBg ? 'bg-black/30 border-white/15' : 'bg-stone-50 border-stone-200'
                      }`}>
                        <AlertCircle className="w-6 h-6 mx-auto opacity-40" />
                        <p className="text-xs font-bold">No matching {selectedCategoryType} events found</p>
                        <p className="text-[11px] opacity-70">Try clearing your search query or reset filter.</p>
                      </div>
                    ) : (
                      filteredCategoryEvents.map((evt) => {
                        const isSelected = selectedEvent?.id === evt.id;
                        const reqSquad = getRequiredPlayerCount(evt);
                        const isTeamEvt = isTeamRegistration(evt);

                        return (
                          <div
                            key={evt.id}
                            onClick={() => {
                              setSelectedEvent(evt);
                              setStep(2);
                            }}
                            className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between group ${
                              isSelected
                                ? isCultural
                                  ? 'bg-amber-500/25 border-amber-400 text-white shadow-md'
                                  : 'bg-[#800020] text-white border-[#800020] shadow-md'
                                : hasDarkCustomBg
                                  ? 'bg-black/40 border-white/15 text-white hover:border-amber-400 hover:bg-black/60'
                                  : 'bg-white hover:bg-[#FAF9F6] border-[#E5E2DC] hover:border-[#800020] text-[#121212] shadow-xs hover:shadow-sm'
                            }`}
                          >
                            <div className="space-y-1 min-w-0 pr-3">
                              <div className="flex items-center space-x-2">
                                <span className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold uppercase ${
                                  isSelected
                                    ? 'bg-white/20 text-white'
                                    : hasDarkCustomBg
                                    ? 'bg-amber-400/20 text-amber-300 border border-amber-400/30'
                                    : selectedCategoryType === 'sports'
                                    ? 'bg-rose-50 text-rose-800 border border-rose-200'
                                    : 'bg-amber-50 text-amber-900 border border-amber-200'
                                }`}>
                                  {evt.category}
                                </span>
                                <span className={`text-[10px] font-mono ${isSelected || hasDarkCustomBg ? 'text-white/80' : 'text-[#666461]'}`}>
                                  {isTeamEvt ? `👥 Team (${reqSquad} Players)` : '👤 Solo Event'}
                                </span>
                              </div>

                              <h5 className="font-bold text-xs sm:text-sm truncate">
                                {evt.title}
                              </h5>

                              <div className={`flex items-center space-x-3 text-[11px] ${isSelected || hasDarkCustomBg ? 'text-white/80' : 'text-[#666461]'}`}>
                                <span className="flex items-center space-x-1">
                                  <Calendar className="w-3 h-3 text-[#C5A059]" />
                                  <span>{evt.eventDate || evt.dateTime?.split('·')[0]?.trim() || '30 Sep'}</span>
                                </span>
                                <span className="flex items-center space-x-1">
                                  <MapPin className="w-3 h-3 text-[#800020]" />
                                  <span className="truncate max-w-[140px]">{evt.venueName}</span>
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center space-x-2 shrink-0">
                              <span className={`text-[11px] font-bold hidden sm:inline ${
                                isSelected
                                  ? 'text-white'
                                  : hasDarkCustomBg
                                  ? 'text-amber-300 group-hover:translate-x-0.5'
                                  : 'text-[#800020] group-hover:translate-x-0.5'
                              }`}>
                                Select Event →
                              </span>
                              <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                                isSelected
                                  ? 'bg-white text-[#800020]'
                                  : hasDarkCustomBg
                                  ? 'bg-white/10 group-hover:bg-amber-400 group-hover:text-black text-white'
                                  : 'bg-stone-100 group-hover:bg-[#800020] group-hover:text-white text-stone-600'
                              }`}>
                                <ArrowRight className="w-4 h-4" />
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP 2: PARTICIPANT & SQUAD ROSTER */}
          {step === 2 && selectedEvent && (
            <div className="space-y-4 text-xs">
              {/* Event Header Summary Badge */}
              <div
                className={`p-3.5 rounded-xl border flex justify-between items-center ${
                  isCultural
                    ? 'bg-black/40 border-amber-500/30'
                    : isSports
                      ? 'bg-white/70 border-emerald-500/30'
                      : 'bg-[#FAF9F6] border-[#E5E2DC]'
                }`}
              >
                <div>
                  <div className="flex items-center space-x-2">
                    <span
                      className={`text-[10px] font-bold uppercase ${
                        isCultural ? 'text-amber-400' : isSports ? 'text-emerald-700' : 'text-[#666461]'
                      }`}
                    >
                      {selectedEvent.type}
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-black/5 font-bold">
                      {isTeam ? `Squad: ${targetPlayerLimit} Players` : 'Solo Participation'}
                    </span>
                  </div>
                  <h4 className={`font-bold text-sm mt-0.5 ${hasDarkCustomBg ? 'text-white' : 'text-[#121212]'}`}>
                    {selectedEvent.title}
                  </h4>
                </div>
                <button
                  onClick={() => setStep(1)}
                  className={`text-[11px] font-medium underline ${
                    isCultural ? 'text-amber-300 hover:text-white' : isSports ? 'text-emerald-700 hover:text-black' : 'text-[#666461] hover:text-[#121212]'
                  }`}
                >
                  Change Event
                </button>
              </div>

              {/* Team Information if Team Event */}
              {isTeam && (
                <div
                  className={`p-3.5 rounded-xl border space-y-2 ${
                    hasDarkCustomBg ? 'bg-black/30 border-white/15' : 'bg-[#FAF9F6] border-[#E5E2DC]'
                  }`}
                >
                  <label className={`block font-bold text-xs uppercase tracking-wider ${hasDarkCustomBg ? 'text-white' : 'text-[#121212]'}`}>
                    Team / Squad Name *
                  </label>
                  <input
                    type="text"
                    value={teamName}
                    onChange={(e) => setTeamName(e.target.value)}
                    placeholder={isSports ? 'e.g. Apex Strikers / Warriors' : 'e.g. Rhythm Ensemble / Symphonics'}
                    className={`w-full px-3.5 py-2.5 rounded-lg text-xs outline-none font-medium ${
                      isCultural
                        ? 'bg-black/50 border border-white/20 text-white focus:border-amber-400'
                        : isSports
                          ? 'bg-white border border-black/15 text-[#121212] focus:border-emerald-600'
                          : 'bg-white border border-[#E5E2DC] focus:border-[#121212]'
                    }`}
                    required
                  />
                </div>
              )}

              {/* Team Captain / Lead Registrant Details */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4
                    className={`font-bold text-xs uppercase tracking-wider ${
                      isCultural ? 'text-amber-300' : isSports ? 'text-emerald-700' : 'text-[#121212]'
                    }`}
                  >
                    {isTeam ? 'Team Captain / Lead Participant Details' : 'Participant Details'}
                  </h4>
                  <span className="text-[10px] font-mono opacity-70">
                    {isTeam ? 'Player #1 of ' + targetPlayerLimit : 'Individual Entry'}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className={`block font-semibold mb-1 ${hasDarkCustomBg ? 'text-white/90' : 'text-[#121212]'}`}>
                      Captain Full Name *
                    </label>
                    <input
                      type="text"
                      value={participantName}
                      onChange={(e) => setParticipantName(e.target.value)}
                      placeholder="e.g. Aditya Ram"
                      className={`w-full px-3.5 py-2.5 rounded-lg text-xs outline-none ${
                        isCultural
                          ? 'bg-black/50 border border-white/20 text-white focus:border-amber-400'
                          : isSports
                            ? 'bg-white/80 border border-black/15 text-[#121212] focus:border-emerald-600'
                            : 'bg-[#FAF9F6] border border-[#E5E2DC] focus:border-[#121212]'
                      }`}
                      required
                    />
                  </div>

                  <div>
                    <label className={`block font-semibold mb-1 ${hasDarkCustomBg ? 'text-white/90' : 'text-[#121212]'}`}>
                      Captain Roll No / Student ID *
                    </label>
                    <input
                      type="text"
                      value={studentId}
                      onChange={(e) => setStudentId(e.target.value)}
                      placeholder="e.g. 21CS089"
                      className={`w-full px-3.5 py-2.5 rounded-lg text-xs outline-none ${
                        isCultural
                          ? 'bg-black/50 border border-white/20 text-white focus:border-amber-400'
                          : isSports
                            ? 'bg-white/80 border border-black/15 text-[#121212] focus:border-emerald-600'
                            : 'bg-[#FAF9F6] border border-[#E5E2DC] focus:border-[#121212]'
                      }`}
                      required
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className={`block font-semibold mb-1 ${hasDarkCustomBg ? 'text-white/90' : 'text-[#121212]'}`}>
                      College / Institution Name *
                    </label>
                    <input
                      type="text"
                      value={collegeName}
                      onChange={(e) => setCollegeName(e.target.value)}
                      placeholder="e.g. R.V.R. & J.C. College of Engineering"
                      className={`w-full px-3.5 py-2.5 rounded-lg text-xs outline-none ${
                        isCultural
                          ? 'bg-black/50 border border-white/20 text-white focus:border-amber-400'
                          : isSports
                            ? 'bg-white/80 border border-black/15 text-[#121212] focus:border-emerald-600'
                            : 'bg-[#FAF9F6] border border-[#E5E2DC] focus:border-[#121212]'
                      }`}
                      required
                    />
                  </div>

                  <div>
                    <label className={`block font-semibold mb-1 ${hasDarkCustomBg ? 'text-white/90' : 'text-[#121212]'}`}>
                      Email Address *
                    </label>
                    <input
                      type="email"
                      value={participantEmail}
                      onChange={(e) => setParticipantEmail(e.target.value)}
                      placeholder="aditya@example.edu"
                      className={`w-full px-3.5 py-2.5 rounded-lg text-xs outline-none ${
                        isCultural
                          ? 'bg-black/50 border border-white/20 text-white focus:border-amber-400'
                          : isSports
                            ? 'bg-white/80 border border-black/15 text-[#121212] focus:border-emerald-600'
                            : 'bg-[#FAF9F6] border border-[#E5E2DC] focus:border-[#121212]'
                      }`}
                      required
                    />
                  </div>

                  <div>
                    <label className={`block font-semibold mb-1 ${hasDarkCustomBg ? 'text-white/90' : 'text-[#121212]'}`}>
                      Phone Number *
                    </label>
                    <input
                      type="tel"
                      value={participantPhone}
                      onChange={(e) => setParticipantPhone(e.target.value)}
                      placeholder="+91 98765 43210"
                      className={`w-full px-3.5 py-2.5 rounded-lg text-xs outline-none ${
                        isCultural
                          ? 'bg-black/50 border border-white/20 text-white focus:border-amber-400'
                          : isSports
                            ? 'bg-white/80 border border-black/15 text-[#121212] focus:border-emerald-600'
                            : 'bg-[#FAF9F6] border border-[#E5E2DC] focus:border-[#121212]'
                      }`}
                      required
                    />
                  </div>
                </div>
              </div>

              {/* TEAM PLAYERS ROSTER (Admin Limit Enforced) */}
              {isTeam && (
                <div
                  className={`pt-4 border-t space-y-3 ${
                    hasDarkCustomBg ? 'border-white/10' : 'border-[#E5E2DC]'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 pb-1">
                    <div>
                      <div className="flex items-center space-x-2">
                        <Users className="w-4 h-4 text-[#B8860B]" />
                        <h4
                          className={`font-bold text-xs uppercase tracking-wider ${
                            isCultural ? 'text-amber-300' : isSports ? 'text-emerald-700' : 'text-[#121212]'
                          }`}
                        >
                          Team Players Roster ({targetPlayerLimit} Required)
                        </h4>
                      </div>
                      <p className="text-[11px] opacity-75 mt-0.5">
                        Admin limit for this competition is <strong>{targetPlayerLimit} players</strong>. Please provide Name, Roll No, and College for all squad members.
                      </p>
                    </div>

                    {collegeName.trim() && (
                      <button
                        type="button"
                        onClick={handleCopyCollegeToAll}
                        className={`text-[11px] font-semibold flex items-center space-x-1 px-2.5 py-1 rounded-md border transition-colors cursor-pointer self-start sm:self-auto ${
                          hasDarkCustomBg
                            ? 'border-white/20 bg-white/10 hover:bg-white/20 text-white'
                            : 'border-[#E5E2DC] bg-white hover:bg-[#FAF9F6] text-[#121212]'
                        }`}
                      >
                        <Copy className="w-3 h-3 text-[#B8860B]" />
                        <span>Same College for All</span>
                      </button>
                    )}
                  </div>

                  {/* Player Cards List (Slots 1 to N) */}
                  <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                    {Array.from({ length: targetPlayerLimit }).map((_, idx) => {
                      if (idx === 0) {
                        // Slot 1: Team Captain (auto-synced with above inputs)
                        return (
                          <div
                            key={0}
                            className={`p-3.5 rounded-xl border flex items-center justify-between ${
                              hasDarkCustomBg
                                ? 'bg-amber-400/10 border-amber-400/30'
                                : 'bg-emerald-50/80 border-emerald-200'
                            }`}
                          >
                            <div className="space-y-0.5">
                              <div className="flex items-center space-x-2">
                                <span className="font-mono text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-black/10">
                                  Player #1 · Team Captain
                                </span>
                                <span className="text-[10px] text-emerald-700 font-bold">✓ Complete</span>
                              </div>
                              <h5 className="font-bold text-xs text-[#121212] pt-1">
                                {participantName || '(Enter Captain Name above)'}
                              </h5>
                              <p className="text-[11px] text-[#666461]">
                                Roll No: <strong className="font-mono">{studentId || '—'}</strong> · College: {collegeName || '—'}
                              </p>
                            </div>
                          </div>
                        );
                      }

                      // Slots 2 to N: Teammates
                      const m = members[idx] || { name: '', studentId: '', rollNumber: '', college: '' };
                      const isComplete = isPlayerComplete(idx);

                      return (
                        <div
                          key={idx}
                          className={`p-3.5 rounded-xl border space-y-2.5 transition-all ${
                            isComplete
                              ? hasDarkCustomBg
                                ? 'bg-black/40 border-white/25'
                                : 'bg-[#FAF9F6] border-[#E5E2DC]'
                              : hasDarkCustomBg
                                ? 'bg-rose-950/20 border-rose-500/30'
                                : 'bg-amber-50/50 border-amber-200'
                          }`}
                        >
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="font-bold font-mono uppercase tracking-wider text-[#666461]">
                              Player #{idx + 1}
                            </span>
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                                isComplete
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-amber-100 text-amber-800'
                              }`}
                            >
                              {isComplete ? '✓ Filled' : 'Required'}
                            </span>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                            <div>
                              <label className="block text-[10px] font-bold uppercase mb-1 opacity-75">
                                Player Name *
                              </label>
                              <input
                                type="text"
                                value={m.name || ''}
                                onChange={(e) => handleMemberChange(idx, 'name', e.target.value)}
                                placeholder="Full Name"
                                className={`w-full px-3 py-1.5 rounded-lg text-xs outline-none ${
                                  hasDarkCustomBg
                                    ? 'bg-black/60 border border-white/20 text-white'
                                    : 'border border-[#E5E2DC] bg-white text-[#121212] focus:border-[#121212]'
                                }`}
                                required
                              />
                            </div>

                            <div>
                              <label className="block text-[10px] font-bold uppercase mb-1 opacity-75">
                                Roll No / Student ID *
                              </label>
                              <input
                                type="text"
                                value={m.rollNumber || m.studentId || ''}
                                onChange={(e) => handleMemberChange(idx, 'rollNumber', e.target.value)}
                                placeholder="e.g. 21CS090"
                                className={`w-full px-3 py-1.5 rounded-lg text-xs outline-none font-mono ${
                                  hasDarkCustomBg
                                    ? 'bg-black/60 border border-white/20 text-white'
                                    : 'border border-[#E5E2DC] bg-white text-[#121212] focus:border-[#121212]'
                                }`}
                                required
                              />
                            </div>

                            <div>
                              <label className="block text-[10px] font-bold uppercase mb-1 opacity-75">
                                College *
                              </label>
                              <input
                                type="text"
                                value={m.college || ''}
                                onChange={(e) => handleMemberChange(idx, 'college', e.target.value)}
                                placeholder="College Name"
                                className={`w-full px-3 py-1.5 rounded-lg text-xs outline-none ${
                                  hasDarkCustomBg
                                    ? 'bg-black/60 border border-white/20 text-white'
                                    : 'border border-[#E5E2DC] bg-white text-[#121212] focus:border-[#121212]'
                                }`}
                                required
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Roster Progress Status Bar */}
                  <div
                    className={`p-2.5 rounded-lg flex items-center justify-between text-xs ${
                      completedPlayersCount === targetPlayerLimit
                        ? 'bg-emerald-100/70 text-emerald-900 border border-emerald-300'
                        : 'bg-amber-100/70 text-amber-900 border border-amber-300'
                    }`}
                  >
                    <div className="flex items-center space-x-1.5">
                      <AlertCircle className="w-4 h-4 flex-shrink-0" />
                      <span className="font-semibold text-[11px]">
                        {completedPlayersCount === targetPlayerLimit
                          ? `All ${targetPlayerLimit} players complete and verified.`
                          : `Please fill Name, Roll No, and College for all ${targetPlayerLimit} players.`}
                      </span>
                    </div>
                    <span className="font-mono font-bold text-xs">
                      {completedPlayersCount}/{targetPlayerLimit} Players
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP 3: REVIEW SUMMARY */}
          {step === 3 && selectedEvent && (
            <div className="space-y-4 text-xs">
              <h4
                className={`font-bold uppercase tracking-wider ${
                  isCultural ? 'text-amber-300' : isSports ? 'text-emerald-700' : 'text-[#121212]'
                }`}
              >
                Review Registration Details
              </h4>

              <div
                className={`p-4 rounded-xl space-y-2.5 border ${
                  isCultural
                    ? 'bg-black/50 border-amber-500/30 text-white'
                    : isSports
                      ? 'bg-white/80 border-emerald-500/30 text-[#121212]'
                      : 'bg-[#FAF9F6] border-[#E5E2DC] text-[#121212]'
                }`}
              >
                <div className={`flex justify-between border-b pb-1.5 ${hasDarkCustomBg ? 'border-white/10' : 'border-[#E5E2DC]'}`}>
                  <span className={hasDarkCustomBg ? 'text-white/60' : 'text-[#666461]'}>Event:</span>
                  <span className="font-bold">{selectedEvent.title}</span>
                </div>
                <div className={`flex justify-between border-b pb-1.5 ${hasDarkCustomBg ? 'border-white/10' : 'border-[#E5E2DC]'}`}>
                  <span className={hasDarkCustomBg ? 'text-white/60' : 'text-[#666461]'}>Category & Format:</span>
                  <span className="font-medium">
                    {selectedEvent.category} · {isTeam ? `Team Squad (${targetPlayerLimit} Players)` : 'Solo'}
                  </span>
                </div>
                <div className={`flex justify-between border-b pb-1.5 ${hasDarkCustomBg ? 'border-white/10' : 'border-[#E5E2DC]'}`}>
                  <span className={hasDarkCustomBg ? 'text-white/60' : 'text-[#666461]'}>Date & Venue:</span>
                  <span>{selectedEvent.dateTime} · {selectedEvent.venueName}</span>
                </div>
                {isTeam && (
                  <div className={`flex justify-between border-b pb-1.5 ${hasDarkCustomBg ? 'border-white/10' : 'border-[#E5E2DC]'}`}>
                    <span className={hasDarkCustomBg ? 'text-white/60' : 'text-[#666461]'}>Team Name:</span>
                    <strong className="font-bold">{teamName || `${participantName}'s Team`}</strong>
                  </div>
                )}
                <div className={`flex justify-between border-b pb-1.5 ${hasDarkCustomBg ? 'border-white/10' : 'border-[#E5E2DC]'}`}>
                  <span className={hasDarkCustomBg ? 'text-white/60' : 'text-[#666461]'}>Captain / Lead:</span>
                  <span>{participantName} ({participantEmail} · {participantPhone})</span>
                </div>
                <div className="flex justify-between">
                  <span className={hasDarkCustomBg ? 'text-white/60' : 'text-[#666461]'}>Primary College:</span>
                  <span>{collegeName}</span>
                </div>
              </div>

              {/* Roster Table in Review */}
              {isTeam && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className={`font-bold uppercase tracking-wider text-[11px] ${hasDarkCustomBg ? 'text-white' : 'text-[#121212]'}`}>
                      Squad Roster ({targetPlayerLimit} Registered Players)
                    </span>
                    <span className="text-[10px] font-mono text-emerald-700 font-bold">
                      ✓ All details verified
                    </span>
                  </div>

                  <div className="overflow-x-auto border border-[#E5E2DC] rounded-xl bg-white">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-[#FAF9F6] border-b border-[#E5E2DC] text-[10px] font-bold text-[#666461] uppercase tracking-wider">
                          <th className="p-2.5 w-10">#</th>
                          <th className="p-2.5">Player Name</th>
                          <th className="p-2.5">Roll No / ID</th>
                          <th className="p-2.5">College</th>
                          <th className="p-2.5">Role</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#E5E2DC] text-[#121212]">
                        {Array.from({ length: targetPlayerLimit }).map((_, idx) => {
                          const isLead = idx === 0;
                          const name = isLead ? participantName : members[idx]?.name;
                          const roll = isLead ? studentId : (members[idx]?.rollNumber || members[idx]?.studentId);
                          const col = isLead ? collegeName : members[idx]?.college;

                          return (
                            <tr key={idx} className="hover:bg-[#FAF9F6]">
                              <td className="p-2.5 font-mono font-bold text-[#666461]">{idx + 1}</td>
                              <td className="p-2.5 font-bold">{name}</td>
                              <td className="p-2.5 font-mono text-[#666461]">{roll}</td>
                              <td className="p-2.5 text-[#666461]">{col}</td>
                              <td className="p-2.5">
                                <span
                                  className={`text-[9px] font-mono font-bold uppercase px-1.5 py-0.5 rounded ${
                                    isLead
                                      ? 'bg-[#121212] text-white'
                                      : 'bg-[#FAF9F6] border border-[#E5E2DC] text-[#666461]'
                                  }`}
                                >
                                  {isLead ? 'Captain' : `Player #${idx + 1}`}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP 4: CONFIRMATION */}
          {step === 4 && confirmedReg && (
            <div className="text-center py-6 space-y-4 animate-in zoom-in-95 duration-300">
              <div
                className={`w-14 h-14 rounded-full flex items-center justify-center mx-auto ${
                  isCultural ? 'bg-amber-400 text-black' : isSports ? 'bg-emerald-600 text-white' : 'bg-[#121212] text-white'
                }`}
              >
                <CheckCircle className="w-8 h-8" />
              </div>

              <div>
                <span
                  className={`text-[10px] font-bold uppercase tracking-widest block ${
                    isCultural ? 'text-amber-300' : isSports ? 'text-emerald-700' : 'text-[#666461]'
                  }`}
                >
                  REGISTRATION CONFIRMED
                </span>
                <h3 className={`font-editorial font-bold text-xl mt-1 ${hasDarkCustomBg ? 'text-white' : 'text-[#121212]'}`}>
                  COLORIDO 2K26 OFFICIAL PASS
                </h3>
              </div>

              <div
                className={`p-4 rounded-xl max-w-xs mx-auto shadow-sm border ${
                  isCultural
                    ? 'bg-black/60 border-amber-400/50 text-white'
                    : isSports
                      ? 'bg-white border-emerald-500 text-[#121212]'
                      : 'bg-[#FAF9F6] border-[#121212] text-[#121212]'
                }`}
              >
                <span
                  className={`text-[10px] font-bold uppercase block ${
                    isCultural ? 'text-amber-300' : isSports ? 'text-emerald-700' : 'text-[#666461]'
                  }`}
                >
                  Registration ID
                </span>
                <span
                  className={`font-mono font-black text-2xl block mt-0.5 ${
                    isCultural ? 'text-amber-400' : isSports ? 'text-emerald-700' : 'text-[#121212]'
                  }`}
                >
                  {confirmedReg.registrationId}
                </span>
                <span className={`text-xs block mt-1 font-semibold ${hasDarkCustomBg ? 'text-white/80' : 'text-[#666461]'}`}>
                  {confirmedReg.eventTitle}
                </span>
                {confirmedReg.teamName && (
                  <span className="text-[11px] block mt-0.5 text-stone-500 font-mono">
                    Team: {confirmedReg.teamName} ({confirmedReg.members?.length || targetPlayerLimit} Players)
                  </span>
                )}
              </div>

              <div className="flex justify-center space-x-3 pt-2">
                <button
                  onClick={() => generateTicketPDF(confirmedReg)}
                  className={`px-5 py-2.5 rounded-lg font-bold text-xs uppercase tracking-wider flex items-center space-x-1.5 shadow-md cursor-pointer ${
                    isCultural
                      ? 'bg-amber-400 text-black hover:bg-amber-300'
                      : isSports
                        ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                        : 'bg-[#121212] text-white hover:bg-[#2A2A2A]'
                  }`}
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Pass PDF</span>
                </button>
                {selectedEvent && (
                  <button
                    onClick={() => downloadCalendarICS(selectedEvent)}
                    className={`px-4 py-2.5 rounded-lg font-bold text-xs uppercase tracking-wider flex items-center space-x-1.5 shadow-sm border cursor-pointer ${
                      hasDarkCustomBg
                        ? 'bg-white/10 text-white border-white/20 hover:bg-white/20'
                        : 'bg-white text-[#121212] border-[#E5E2DC] hover:bg-[#FAF9F6]'
                    }`}
                  >
                    <Calendar className="w-3.5 h-3.5 text-[#B8860B]" />
                    <span>iCal</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer Navigation */}
        <div className="p-4 sm:p-5 flex justify-between items-center border-t border-[#E5E2DC] bg-[#FAF9F6]">
          {step > 1 && step < 4 && (
            <button
              onClick={() => setStep((step - 1) as 1 | 2 | 3 | 4)}
              className="px-4 py-2 text-xs font-semibold flex items-center space-x-1.5 text-stone-600 hover:text-stone-900 border border-stone-300 bg-white rounded-md transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" /> <span>Back</span>
            </button>
          )}

          {step < 3 && (
            <div className="ml-auto flex items-center space-x-3">
              {step === 2 && !isStep2Valid && (
                <span className="text-[11px] text-amber-700 font-semibold hidden sm:inline">
                  {isTeam
                    ? `Fill all ${targetPlayerLimit} players (${completedPlayersCount}/${targetPlayerLimit})`
                    : 'Fill required participant details'}
                </span>
              )}
              <button
                disabled={step === 2 && !isStep2Valid}
                onClick={() => setStep((step + 1) as 1 | 2 | 3 | 4)}
                className="px-5 py-2 rounded-md text-xs font-bold uppercase tracking-wider flex items-center space-x-1.5 bg-[#800020] hover:bg-[#660019] text-white shadow-xs disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
              >
                <span>Continue</span> <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {step === 3 && (
            <button
              onClick={handleSubmitRegistration}
              disabled={isSubmitting}
              className="ml-auto px-6 py-2 rounded-md text-xs font-bold uppercase tracking-wider flex items-center space-x-1.5 bg-[#800020] hover:bg-[#660019] text-white shadow-xs disabled:opacity-50 transition-colors cursor-pointer"
            >
              <span>{isSubmitting ? 'Confirming...' : 'Confirm Registration'}</span>
            </button>
          )}

          {step === 4 && (
            <button
              onClick={onClose}
              className="w-full py-2.5 rounded-md text-xs font-bold uppercase tracking-wider bg-stone-900 text-white hover:bg-stone-800 transition-colors cursor-pointer"
            >
              Close &amp; Return to Portal
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default RegistrationWizard;
