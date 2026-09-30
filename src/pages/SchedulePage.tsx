import React, { useState, useEffect } from 'react';
import { Calendar, Clock, MapPin, Radio, RefreshCw } from 'lucide-react';
import type { EventItem, Registration } from '../types';
import { getRequiredPlayerCount, isTeamRegistration } from '../utils/eventRegistration';
import { apiService, apiUrl } from '../services/apiService';
import { EventDetailsModal } from '../components/EventDetailsModal';

interface SchedulePageProps {
  events: EventItem[];
  myRegistrations: Registration[];
  onSelectEvent: (slug: string) => void;
  onRegister: (event: EventItem) => void;
  onOpenLiveScore?: (slug: string) => void;
}

export const SchedulePage: React.FC<SchedulePageProps> = ({
  events: initialEvents,
  myRegistrations,
  onSelectEvent: _onSelectEvent,
  onRegister,
  onOpenLiveScore,
}) => {
  const [dbEvents, setDbEvents] = useState<EventItem[]>(initialEvents);
  const [dbRegistrations, setDbRegistrations] = useState<Registration[]>(myRegistrations);
  const [selectedDay, setSelectedDay] = useState<number>(0); // 0 = ALL, 1 = Day 1, 2 = Day 2, 3 = Day 3
  const [typeFilter, setTypeFilter] = useState<'all' | 'sports' | 'cultural' | 'my'>('all');
  const [selectedModalEvent, setSelectedModalEvent] = useState<EventItem | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const fetchScheduleData = async () => {
    setIsLoading(true);
    try {
      const [evts, regs] = await Promise.all([
        apiService.getEvents(),
        fetch(apiUrl('/registrations')).then(r => r.ok ? r.json() : []).catch(() => []),
      ]);
      if (evts && evts.length > 0) setDbEvents(evts);
      if (regs && Array.isArray(regs)) setDbRegistrations(regs);
    } catch {
      // Fallback
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchScheduleData();
  }, []);

  const myRegisteredEventIds = new Set(myRegistrations.map(r => r.eventId));

  const filteredEvents = dbEvents.filter(evt => {
    if (selectedDay > 0 && evt.day !== selectedDay) return false;
    if (typeFilter === 'sports' && evt.type !== 'sports') return false;
    if (typeFilter === 'cultural' && evt.type !== 'cultural') return false;
    if (typeFilter === 'my' && !myRegisteredEventIds.has(evt.id)) return false;
    return true;
  });

  const getEventRegStats = (eventId: string) => {
    const eventRegs = dbRegistrations.filter(r => r.eventId === eventId);
    let totalPlayers = 0;
    eventRegs.forEach(r => {
      totalPlayers += r.members?.length || 1;
    });
    return { teamsCount: eventRegs.length, playersCount: totalPlayers };
  };

  const getStatusBadge = (evt: EventItem) => {
    if (evt.liveEnabled || evt.status === 'ongoing') {
      return (
        <span className="px-2.5 py-0.5 rounded bg-rose-600 text-white font-bold text-[10px] uppercase tracking-wider flex items-center space-x-1 animate-pulse">
          <Radio className="w-3 h-3" />
          <span>LIVE</span>
        </span>
      );
    }
    if (evt.status === 'completed') {
      return (
        <span className="px-2.5 py-1 rounded-md bg-white/10 text-slate-200 border border-white/10 font-semibold text-[10px] uppercase tracking-wider">
          Completed
        </span>
      );
    }
    if (evt.seatsTotal && evt.seatsLeft <= 0) {
      return (
        <span className="px-2.5 py-1 rounded-md bg-amber-950/70 text-amber-200 border border-amber-800/60 font-semibold text-[10px] uppercase tracking-wider">
          Registration Closed
        </span>
      );
    }
    return (
      <span className="px-2.5 py-1 rounded-md bg-emerald-950/70 text-emerald-200 border border-emerald-800/60 font-semibold text-[10px] uppercase tracking-wider">
        Registration Open
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-[#0B1226] text-slate-100 flex flex-col pb-20">

      {/* Schedule Header */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 pt-12 pb-8 w-full space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-white/15 pb-6">
          <div>
            <span className="text-[11px] font-semibold text-[#D5B66A] uppercase tracking-[0.16em] block mb-2">
              Make a day of it
            </span>
            <h1 className="festival-title-reveal font-editorial font-bold text-4xl sm:text-5xl text-[#F7F3EA]">
              Festival schedule
            </h1>
            <p className="text-sm text-slate-300/85 mt-2">Find event times, venues and registration details.</p>
          </div>

          <button
            onClick={fetchScheduleData}
            className="px-4 py-2 rounded-lg bg-white/5 border border-white/20 text-sm font-semibold text-slate-100 hover:bg-white/10 flex items-center space-x-2 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-[#B8860B] ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh Timetable</span>
          </button>
        </div>

        {/* Filter Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-[#111B34]/80 border border-white/15 p-3 rounded-xl text-xs">
          {/* Day Filters */}
          <div className="flex flex-wrap items-center gap-1.5 font-mono uppercase tracking-wider">
            {[
              { id: 0, label: 'ALL DAYS', short: 'ALL' },
              { id: 1, label: '30 SEP (DAY 1)', short: 'DAY 1' },
              { id: 2, label: '01 OCT (DAY 2)', short: 'DAY 2' },
              { id: 3, label: '02 OCT (DAY 3)', short: 'DAY 3' },
            ].map(d => (
              <button
                key={d.id}
                onClick={() => setSelectedDay(d.id)}
                className={`px-2.5 sm:px-3 py-1.5 rounded-lg transition-colors ${selectedDay === d.id
                    ? 'bg-white text-[#111827] font-bold shadow-xs'
                    : 'text-slate-300 hover:bg-white/10 hover:text-white'
                  }`}
              >
                <span className="sm:hidden">{d.short}</span>
                <span className="hidden sm:inline">{d.label}</span>
              </button>
            ))}
          </div>

          {/* Type Filters */}
          <div className="flex items-center gap-1 font-mono uppercase tracking-wider">
            <button
              onClick={() => setTypeFilter('all')}
              className={`px-3 py-1.5 rounded-lg transition-colors ${typeFilter === 'all' ? 'bg-white text-[#111827] font-bold' : 'text-slate-300 hover:text-white'}`}
            >
              ALL
            </button>
            <button
              onClick={() => setTypeFilter('sports')}
              className={`px-3 py-1.5 rounded-lg transition-colors ${typeFilter === 'sports' ? 'bg-[#806626] text-white font-bold' : 'text-slate-300 hover:text-white'}`}
            >
              SPORTS
            </button>
            <button
              onClick={() => setTypeFilter('cultural')}
              className={`px-3 py-1.5 rounded-lg transition-colors ${typeFilter === 'cultural' ? 'bg-[#76263B] text-white font-bold' : 'text-slate-300 hover:text-white'}`}
            >
              CULTURAL
            </button>
          </div>
        </div>

        {/* REAL-TIME EVENT SCHEDULE CARDS */}
        {filteredEvents.length === 0 ? (
          <div className="py-20 text-center bg-[#111B34]/75 rounded-2xl border border-dashed border-white/20 space-y-3">
            <Calendar className="w-10 h-10 text-[#D5B66A] mx-auto opacity-70" />
            <h3 className="font-editorial font-bold text-xl text-white">No events to show</h3>
            <p className="text-sm text-slate-300">Try another day or category.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 festival-stagger">
            {filteredEvents.map(evt => {
              const stats = getEventRegStats(evt.id);
              const isRegistered = myRegisteredEventIds.has(evt.id);

              return (
                <div
                  key={evt.id}
                  className="bg-[#111B34]/75 border border-white/15 rounded-2xl p-5 sm:p-6 hover:bg-[#15213E] hover:border-white/25 transition-colors space-y-4 flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-3">
                      <span className={`text-[10px] font-semibold uppercase tracking-[0.1em] px-2.5 py-1 rounded-md text-white ${evt.type === 'sports' ? 'bg-[#806626]' : 'bg-[#76263B]'
                        }`}>
                        {evt.type.toUpperCase()} · {evt.category}
                      </span>

                      <div className="flex items-center space-x-1.5">
                        {isRegistered && (
                          <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-1 rounded-md bg-sky-950/70 text-sky-200 border border-sky-800/60">
                            REGISTERED
                          </span>
                        )}
                        {getStatusBadge(evt)}
                      </div>
                    </div>

                    <div>
                      <h3
                        onClick={() => setSelectedModalEvent(evt)}
                        className="font-editorial font-bold text-xl text-[#F7F3EA] hover:text-[#E0C477] cursor-pointer transition-colors"
                      >
                        {evt.title}
                      </h3>
                      <p className="text-sm text-slate-300/85 line-clamp-2 mt-1">{evt.description}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-x-3 gap-y-2 text-xs text-slate-300 bg-white/[0.035] border border-white/10 p-3 rounded-xl [&>div>span]:!text-slate-100">
                      <div className="flex items-center space-x-1.5">
                        <Calendar className="w-3.5 h-3.5 text-[#D5B66A] shrink-0" />
                        <span className="font-semibold text-[#121212]">{evt.eventDate || evt.dateTime.split('·')[0]}</span>
                      </div>
                      <div className="flex items-center space-x-1.5">
                        <Clock className="w-3.5 h-3.5 text-[#D5B66A] shrink-0" />
                        <span className="font-semibold text-[#121212]">{evt.startTime || '10:30 AM'} - {evt.endTime || '01:30 PM'}</span>
                      </div>
                      <div className="flex items-center space-x-1.5 col-span-2">
                        <MapPin className="w-3.5 h-3.5 text-[#D5B66A] shrink-0" />
                        <span className="font-medium text-slate-100 truncate">{evt.venueName}</span>
                      </div>
                    </div>
                  </div>

                  {/* Footer Stats & Actions */}
                  <div className="pt-3 border-t border-white/15 flex items-center justify-between gap-3 text-xs">
                    <div className="space-y-0.5">
                      <span className="block font-semibold text-slate-100">
                        {stats.teamsCount} Teams ({stats.playersCount} Players)
                      </span>
                      <span className="text-[11px] text-slate-400">
                        {isTeamRegistration(evt) ? `${getRequiredPlayerCount(evt)} Players/Team` : 'Individual'}
                      </span>
                    </div>

                    <div className="flex items-center space-x-2">
                      {evt.liveEnabled && onOpenLiveScore && (
                        <button
                          onClick={() => onOpenLiveScore(evt.liveSlug || evt.slug || evt.id)}
                          className="px-3 py-1.5 bg-rose-700 hover:bg-rose-600 text-white font-semibold text-[10px] uppercase rounded-lg flex items-center space-x-1.5 transition-colors"
                        >
                          <Radio className="w-3 h-3 animate-pulse" />
                          <span>Live</span>
                        </button>
                      )}

                      <button
                        onClick={() => setSelectedModalEvent(evt)}
                        className="px-4 py-2 bg-white/10 hover:bg-white/15 border border-white/15 text-white font-semibold text-xs rounded-lg transition-colors"
                      >
                        View Details →
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Event Details Modal */}
      {selectedModalEvent && (
        <EventDetailsModal
          event={selectedModalEvent}
          onClose={() => setSelectedModalEvent(null)}
          onOpenLiveScore={onOpenLiveScore}
          onRegister={onRegister}
        />
      )}
    </div>
  );
};
