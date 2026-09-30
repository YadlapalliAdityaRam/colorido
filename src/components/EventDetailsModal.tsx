import React, { useState, useEffect } from 'react';
import {
  X, Users, Radio, Phone, Trophy
} from 'lucide-react';
import type { EventItem, Registration, EventResult, ResultPodium } from '../types';
import { TeamDetailsModal } from './TeamDetailsModal';
import { apiService, apiUrl } from '../services/apiService';
import { getEventBanner, isGlobalProfile } from '../utils/imageHelpers';
import { getRequiredPlayerCount, isTeamRegistration } from '../utils/eventRegistration';

interface EventDetailsModalProps {
  event: EventItem;
  onClose: () => void;
  onOpenLiveScore?: (slug: string) => void;
  onRegister?: (event: EventItem) => void;
}

export const EventDetailsModal: React.FC<EventDetailsModalProps> = ({
  event,
  onClose,
  onOpenLiveScore,
  onRegister,
}) => {
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<Registration | null>(null);
  const [eventResult, setEventResult] = useState<EventResult | null>(null);

  useEffect(() => {
    fetch(apiUrl('/registrations'))
      .then(r => r.ok ? r.json() : [])
      .then((data: Registration[]) => {
        if (Array.isArray(data)) {
          const eventRegs = data.filter(r => r.eventId === event.id || r.eventTitle === event.title);
          setRegistrations(eventRegs);
        }
      })
      .catch(() => { });

    // Fetch official event winners / podium
    apiService.getResults().then(results => {
      const match = results.find(r => r.eventId === event.id || r.eventTitle.toLowerCase() === event.title.toLowerCase());
      if (match) setEventResult(match);
    }).catch(() => { });
  }, [event]);

  const getMedalEmoji = (medal?: string, pos?: number) => {
    if (medal === 'gold' || (!medal && pos === 1)) return '🥇';
    if (medal === 'silver' || (!medal && pos === 2)) return '🥈';
    if (medal === 'bronze' || (!medal && pos === 3)) return '🥉';
    if (medal === 'trophy') return '🏆';
    if (medal === 'certificate') return '📜';
    return '🎖️';
  };

  let totalPlayersCount = 0;
  registrations.forEach((r: Registration) => {
    totalPlayersCount += r.members?.length || 1;
  });

  return (
    <div className="nf-modal-layer fixed inset-0 z-[100] overflow-y-auto bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 text-[#121212]">
      <div className="bg-white border border-[#E2E8F0] rounded-lg w-full max-w-3xl overflow-hidden shadow-xl relative space-y-6 p-4 sm:p-6 max-h-[92dvh] overflow-y-auto">

        {/* Event Header Banner Image */}
        {(() => {
          const banner = getEventBanner(event);
          const isGlobal = isGlobalProfile(banner);
          return (
            <div className={`relative h-44 sm:h-56 -mx-4 -mt-4 sm:-mx-6 sm:-mt-6 overflow-hidden border-b border-[#E2E8F0] flex items-center justify-center shrink-0 ${
              isGlobal ? 'bg-white p-4' : 'bg-[#0F172A]'
            }`}>
              <img
                src={banner}
                alt={event.title}
                onError={(e) => {
                  (e.target as HTMLImageElement).src = event?.type === 'cultural'
                    ? '/cultural_global_profile_photo.jpeg'
                    : '/global_sports_profile.jpeg';
                }}
                className={isGlobal ? 'max-h-full max-w-full object-contain' : 'w-full h-full object-cover'}
              />
              {!isGlobal && <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent pointer-events-none" />}
            </div>
          );
        })()}

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 text-white hover:text-white bg-black/60 border border-white/20 rounded-md transition-colors z-20 cursor-pointer"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>

        {/* 1. EVENT HEADER */}
        <div className="space-y-4 border-b border-[#E5E2DC] pb-6">
          <div className="flex items-center space-x-2">
            <span className={`text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-md text-white ${event.type === 'sports' ? 'bg-[#B8860B]' : 'bg-[#8B263E]'
              }`}>
              {event.type.toUpperCase()} · {event.category}
            </span>

            <span className="text-xs font-bold uppercase tracking-wider text-emerald-800 bg-emerald-100 border border-emerald-300 px-2.5 py-0.5 rounded-md">
              {event.status?.toUpperCase() || 'REGISTRATION OPEN'}
            </span>
          </div>

          <h1 className="font-editorial font-bold text-3xl sm:text-4xl text-[#121212]">
            {event.title}
          </h1>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs text-[#666461] bg-[#FAF9F6] border border-[#E5E2DC] p-4 rounded-2xl">
            <div>
              <span className="block text-[10px] text-[#666461] uppercase font-bold">Date</span>
              <strong className="text-[#121212]">{event.eventDate || event.dateTime.split('·')[0]}</strong>
            </div>
            <div>
              <span className="block text-[10px] text-[#666461] uppercase font-bold">Time</span>
              <strong className="text-[#121212]">{event.startTime || '10:30 AM'} - {event.endTime || '01:30 PM'}</strong>
            </div>
            <div>
              <span className="block text-[10px] text-[#666461] uppercase font-bold">Venue</span>
              <strong className="text-[#121212]">{event.venueName}</strong>
            </div>
            <div>
              <span className="block text-[10px] text-[#666461] uppercase font-bold">Format</span>
              <strong className="text-[#121212] uppercase">{isTeamRegistration(event) ? `${getRequiredPlayerCount(event)} Players / Team` : 'Individual'}</strong>
            </div>
          </div>

          {/* Header Action Buttons */}
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <a
              href="#registered-teams"
              className="px-4 py-2 rounded-xl bg-[#FAF9F6] border border-[#E5E2DC] text-xs font-bold text-[#121212] hover:bg-[#E5E2DC] flex items-center space-x-1.5 transition-all"
            >
              <Users className="w-3.5 h-3.5 text-[#B8860B]" />
              <span>View Registered Teams ({registrations.length})</span>
            </a>

            {event.liveEnabled && onOpenLiveScore && (
              <button
                onClick={() => onOpenLiveScore(event.liveSlug || event.slug || event.id)}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold uppercase tracking-wider flex items-center space-x-1.5 shadow-sm transition-all animate-pulse"
              >
                <Radio className="w-3.5 h-3.5" />
                <span>Live Scorecard & Match Coverage →</span>
              </button>
            )}

            {onRegister && event.status !== 'completed' && (
              <button
                onClick={() => onRegister(event)}
                className="px-5 py-2 rounded-xl bg-[#121212] hover:bg-[#2A2A2A] text-white text-xs font-bold uppercase tracking-wider shadow-sm ml-auto"
              >
                Register Team / Player →
              </button>
            )}
          </div>
        </div>

        {/* EVENT-WISE LEADERBOARD / WINNER DETAILS */}
        {eventResult && eventResult.podium && (
          <div className="p-6 rounded-3xl bg-amber-50/70 border-2 border-[#B8860B] space-y-4 shadow-sm animate-in fade-in">
            <div className="flex items-center justify-between border-b border-amber-200 pb-3">
              <div className="flex items-center space-x-2">
                <Trophy className="w-5 h-5 text-[#B8860B]" />
                <div>
                  <span className="text-[10px] font-mono font-bold text-[#B8860B] uppercase tracking-wider block">
                    EVENT LEADERBOARD · OFFICIAL PODIUM
                  </span>
                  <h3 className="font-editorial font-bold text-xl text-[#121212]">
                    Event Winners &amp; Medalists
                  </h3>
                </div>
              </div>
              <span className="text-[10px] font-mono font-bold bg-[#B8860B] text-white px-2.5 py-1 rounded-full uppercase tracking-wider shadow-xs">
                Official Result
              </span>
            </div>

            {(() => {
              const winnerList: ResultPodium[] =
                eventResult.winners && eventResult.winners.length > 0
                  ? eventResult.winners
                  : ([
                    eventResult.podium?.first,
                    eventResult.podium?.second,
                    eventResult.podium?.third,
                    eventResult.podium?.fourth,
                    eventResult.podium?.fifth,
                  ].filter(Boolean) as ResultPodium[]);

              const gridCols =
                winnerList.length === 1
                  ? 'grid-cols-1 max-w-md mx-auto'
                  : winnerList.length === 2
                    ? 'grid-cols-1 sm:grid-cols-2'
                    : 'grid-cols-1 sm:grid-cols-3';

              return (
                <div className={`grid ${gridCols} gap-3`}>
                  {winnerList.map((winner, idx) => {
                    const is1st = (winner.position || idx + 1) === 1;

                    return (
                      <div
                        key={idx}
                        className={`p-4 rounded-2xl bg-white shadow-sm space-y-1 relative ${is1st ? 'border-2 border-[#B8860B]' : 'border border-[#E5E2DC]'
                          }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-2xl">
                            {getMedalEmoji(winner.medal, winner.position || idx + 1)}
                          </span>
                          {eventResult.includePoints && winner.points && winner.points > 0 ? (
                            <span className="font-mono font-bold text-xs text-[#B8860B] bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                              +{winner.points} PTS
                            </span>
                          ) : null}
                        </div>
                        <span
                          className={`text-[10px] font-mono font-bold uppercase tracking-wider block pt-1 ${is1st ? 'text-[#B8860B]' : 'text-[#666461]'
                            }`}
                        >
                          {winner.positionLabel ||
                            `${idx + 1}${idx === 0 ? 'st' : idx === 1 ? 'nd' : idx === 2 ? 'rd' : 'th'} Place`}
                        </span>
                        {/* Student Name */}
                        <h4 className="font-editorial font-bold text-base text-[#121212] leading-tight">
                          {winner.studentName || winner.teamOrParticipant}
                        </h4>
                        {/* Small font college name */}
                        <span className="text-xs text-[#666461] block leading-snug">
                          {winner.college}
                        </span>
                        {winner.details && (
                          <span className="text-[11px] text-[#B8860B] italic block pt-1">
                            {winner.details}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>
        )}

        {/* QR CODE REGISTRATION BOX */}
        {(event as any).qrEnabled && (event as any).qrImage && (
          <div className="p-5 bg-violet-50 border-2 border-violet-300 rounded-2xl flex flex-col sm:flex-row items-center gap-5 shadow-sm">
            <div className="bg-white border-2 border-violet-400 rounded-2xl p-3 shadow-lg flex-shrink-0">
              <img
                src={(event as any).qrImage}
                alt="QR Code - Scan to Register"
                className="w-36 h-36 object-contain"
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
              />
            </div>
            <div className="text-center sm:text-left space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-widest text-violet-700 block">
                📲 QR REGISTRATION
              </span>
              <h4 className="font-editorial font-bold text-lg text-[#121212]">
                Scan to Register for {event.title}
              </h4>
              <p className="text-xs text-[#666461] leading-relaxed">
                Open your phone camera or any QR scanner app, point it at this code, and follow the link to complete your registration instantly.
              </p>
              <div className="flex items-center gap-2 pt-1 flex-wrap justify-center sm:justify-start">
                <span className="px-3 py-1.5 rounded-full bg-violet-600 text-white text-[10px] font-bold uppercase tracking-wider shadow-sm">
                  Scan with Camera
                </span>
                <span className="text-[10px] text-[#666461]">— works with any QR scanner app</span>
              </div>
            </div>
          </div>
        )}

        {/* 2. EVENT DESCRIPTION */}
        <div className="space-y-2 border-b border-[#E5E2DC] pb-6">
          <h3 className="font-editorial font-bold text-lg text-[#121212]">EVENT DESCRIPTION & GUIDELINES</h3>
          <p className="text-xs leading-relaxed text-[#666461]">{event.description}</p>

          {event.rules && event.rules.length > 0 && (
            <div className="pt-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#121212] block mb-1">Official Competition Rules:</span>
              <ul className="list-disc list-inside text-xs text-[#666461] space-y-1">
                {event.rules.map((rule, i) => (
                  <li key={i}>{rule}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* 3. EVENT INFORMATION MATRIX */}
        <div className="space-y-3 border-b border-[#E5E2DC] pb-6">
          <h3 className="font-editorial font-bold text-lg text-[#121212]">EVENT INFORMATION</h3>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="p-3 bg-[#FAF9F6] border border-[#E5E2DC] rounded-xl space-y-0.5">
              <span className="text-[10px] text-[#666461] uppercase font-bold block">Event Date</span>
              <strong className="text-[#121212] block">{event.eventDate || '30 Sep 2026'}</strong>
            </div>

            <div className="p-3 bg-[#FAF9F6] border border-[#E5E2DC] rounded-xl space-y-0.5">
              <span className="text-[10px] text-[#666461] uppercase font-bold block">Start Time</span>
              <strong className="text-[#121212] block">{event.startTime || '10:30 AM'}</strong>
            </div>

            <div className="p-3 bg-[#FAF9F6] border border-[#E5E2DC] rounded-xl space-y-0.5">
              <span className="text-[10px] text-[#666461] uppercase font-bold block">End Time</span>
              <strong className="text-[#121212] block">{event.endTime || '01:30 PM'}</strong>
            </div>

            <div className="p-3 bg-[#FAF9F6] border border-[#E5E2DC] rounded-xl space-y-0.5">
              <span className="text-[10px] text-[#666461] uppercase font-bold block">Venue Location</span>
              <strong className="text-[#121212] block">{event.venueName}</strong>
            </div>

            <div className="p-3 bg-[#FAF9F6] border border-[#E5E2DC] rounded-xl space-y-0.5">
              <span className="text-[10px] text-[#666461] uppercase font-bold block">Category</span>
              <strong className="text-[#121212] block">{event.category}</strong>
            </div>

            <div className="p-3 bg-[#FAF9F6] border border-[#E5E2DC] rounded-xl space-y-0.5">
              <span className="text-[10px] text-[#666461] uppercase font-bold block">Reg Status</span>
              <strong className="text-emerald-700 font-bold block uppercase">{event.seatsTotal ? `${registrations.length}/${event.seatsTotal} Slots` : 'Open / Unlimited'}</strong>
            </div>

            <div className="p-3 bg-[#FAF9F6] border border-[#E5E2DC] rounded-xl space-y-0.5">
              <span className="text-[10px] text-[#666461] uppercase font-bold block">Total Teams</span>
              <strong className="text-[#121212] block">{registrations.length} Teams Registered</strong>
            </div>

            <div className="p-3 bg-[#FAF9F6] border border-[#E5E2DC] rounded-xl space-y-0.5">
              <span className="text-[10px] text-[#666461] uppercase font-bold block">Total Players</span>
              <strong className="text-[#121212] block">{totalPlayersCount} Players Count</strong>
            </div>
          </div>
        </div>

        {/* 4. REGISTERED TEAMS LIST */}
        <div id="registered-teams" className="space-y-4">
          <div className="flex items-center justify-between border-b border-[#E5E2DC] pb-2">
            <h3 className="font-editorial font-bold text-lg text-[#121212]">REGISTERED TEAMS</h3>
            <span className="text-xs font-bold text-[#666461]">{registrations.length} Teams from Database</span>
          </div>

          {registrations.length === 0 ? (
            <div className="py-8 text-center text-xs text-[#666461] font-mono bg-[#FAF9F6] rounded-2xl border border-dashed border-[#E5E2DC]">
              No registered teams yet for this event.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {registrations.map((reg: Registration, idx: number) => (
                <div
                  key={reg.id || idx}
                  className="p-4 bg-[#FAF9F6] border border-[#E5E2DC] rounded-2xl flex items-center justify-between hover:border-[#121212] transition-colors"
                >
                  <div className="space-y-0.5">
                    <h4 className="font-editorial font-bold text-base text-[#121212]">
                      {reg.teamName || reg.participantName}
                    </h4>
                    <p className="text-xs text-[#666461] font-medium">{reg.collegeName}</p>
                    <span className="text-[10px] text-[#666461] block font-mono">
                      {reg.members?.length || 1} Players · Capt. {reg.participantName}
                    </span>
                  </div>

                  <button
                    onClick={() => setSelectedTeam(reg)}
                    className="px-3.5 py-1.5 bg-[#121212] hover:bg-[#2A2A2A] text-white text-xs font-bold uppercase rounded-xl transition-colors shadow-sm"
                  >
                    View Team
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
        {/* 5. EVENT COORDINATORS */}
        {(event as any).eventCoordinators && (event as any).eventCoordinators.length > 0 && (
          <div className="space-y-3 border-t border-[#E5E2DC] pt-5">
            <h3 className="font-editorial font-bold text-lg text-[#121212]">EVENT COORDINATORS</h3>
            <p className="text-[11px] text-[#666461]">Contact the coordinators below for queries, rules clarification, or registration help.</p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {((event as any).eventCoordinators as Array<{ name: string; phone: string; role: string }>).map((coord, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between bg-sky-50 border border-sky-200 rounded-2xl p-4 hover:border-sky-400 transition-all"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-full bg-sky-600 text-white flex items-center justify-center font-editorial font-bold text-base flex-shrink-0">
                      {coord.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <span className="font-editorial font-bold text-sm text-[#121212] block">{coord.name}</span>
                      <span className="text-[10px] text-sky-700 font-bold uppercase tracking-wider">{coord.role || 'Coordinator'}</span>
                    </div>
                  </div>

                  <a
                    href={`tel:${coord.phone}`}
                    className="flex items-center space-x-2 px-3 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold transition-all shadow-sm"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Phone className="w-3.5 h-3.5" />
                    <span>{coord.phone}</span>
                  </a>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>

      {/* Team Details Modal */}
      {selectedTeam && (
        <TeamDetailsModal
          registration={selectedTeam}
          onClose={() => setSelectedTeam(null)}
        />
      )}
    </div>
  );
};
