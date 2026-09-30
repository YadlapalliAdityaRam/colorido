import React, { useState, useMemo } from 'react';
import { Medal, Search, Calendar, Shield } from 'lucide-react';
import type { EventResult, EventItem } from '../types';
import { FestivalPassResult } from '../components/festivalPass/FestivalPass';

interface ResultsPageProps {
  results: EventResult[];
  leaderboard?: any[];
  events?: EventItem[];
  onSelectEvent?: (slug: string) => void;
}

export const ResultsPage: React.FC<ResultsPageProps> = ({
  results = [],
  events = [],
  onSelectEvent,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [eventTypeFilter, setEventTypeFilter] = useState<'all' | 'sports' | 'cultural'>('all');
  const [selectedEventTitle, setSelectedEventTitle] = useState<string>('all');

  // Unique event titles for quick dropdown
  const uniqueEventTitles = useMemo(() => {
    return Array.from(new Set(results.map(r => r.eventTitle))).filter(Boolean);
  }, [results]);

  const sportsCount = useMemo(() => results.filter(r => r.eventType === 'sports').length, [results]);
  const culturalCount = useMemo(() => results.filter(r => r.eventType === 'cultural').length, [results]);

  // Filtered event results
  const filteredResults = useMemo(() => {
    return results.filter(res => {
      if (eventTypeFilter !== 'all' && res.eventType !== eventTypeFilter) return false;
      if (selectedEventTitle !== 'all' && res.eventTitle.toLowerCase() !== selectedEventTitle.toLowerCase()) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = res.eventTitle.toLowerCase().includes(q);
        const matchCategory = res.category?.toLowerCase().includes(q);
        const match1 =
          res.podium?.first?.studentName?.toLowerCase().includes(q) ||
          res.podium?.first?.teamOrParticipant?.toLowerCase().includes(q) ||
          res.podium?.first?.college?.toLowerCase().includes(q);
        const match2 =
          res.podium?.second?.studentName?.toLowerCase().includes(q) ||
          res.podium?.second?.teamOrParticipant?.toLowerCase().includes(q) ||
          res.podium?.second?.college?.toLowerCase().includes(q);
        const match3 =
          res.podium?.third?.studentName?.toLowerCase().includes(q) ||
          res.podium?.third?.teamOrParticipant?.toLowerCase().includes(q) ||
          res.podium?.third?.college?.toLowerCase().includes(q);
        if (!matchTitle && !matchCategory && !match1 && !match2 && !match3) return false;
      }
      return true;
    });
  }, [results, eventTypeFilter, selectedEventTitle, searchQuery]);

  const getMedalEmoji = (medal?: string, fallback = '🎖️') => {
    if (medal === 'gold') return '🥇';
    if (medal === 'silver') return '🥈';
    if (medal === 'bronze') return '🥉';
    if (medal === 'trophy') return '🏆';
    if (medal === 'certificate') return '📜';
    return fallback;
  };

  return (
    <div className="min-h-screen bg-[#FAF9F6] text-[#121212] flex flex-col pb-24 font-sans selection:bg-[#121212] selection:text-white">
      {/* Event-Wise Leaderboard Header */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 pt-16 pb-8 w-full space-y-6">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-[#E5E2DC] pb-6">
          <div className="space-y-1">
            <span className="text-xs font-mono text-[#B8860B] font-bold uppercase tracking-widest block">
              EVENT-WISE LEADERBOARD &amp; OFFICIAL PODIUMS
            </span>
            <h1 className="festival-title-reveal font-editorial font-bold text-4xl sm:text-5xl text-[#121212] tracking-tight">
              EVENT RESULTS &amp; WINNERS
            </h1>
            <p className="text-xs text-[#666461] max-w-xl">
              Official verified winners, medalists, and podium standings organized event-wise for COLORIDO 2K26.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <FestivalPassResult results={results} />
            <div className="px-3.5 py-1.5 rounded-full bg-white border border-[#E5E2DC] text-xs font-mono text-[#666461] flex items-center space-x-2 shadow-sm">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>{results.length} EVENTS DECLARED</span>
            </div>
          </div>
        </div>

        {/* Filter Bar: Category Tabs & Search */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E5E2DC] pb-4">
          <div className="flex flex-wrap items-center gap-2 text-xs font-mono uppercase tracking-widest">
            <button
              onClick={() => {
                setEventTypeFilter('all');
                setSelectedEventTitle('all');
              }}
              className={`px-3 py-2 rounded-xl transition-all ${eventTypeFilter === 'all'
                  ? 'bg-[#121212] text-white font-bold shadow-sm'
                  : 'bg-white border border-[#E5E2DC] text-[#666461] hover:text-[#121212]'
                }`}
            >
              All Events ({results.length})
            </button>
            <button
              onClick={() => {
                setEventTypeFilter('sports');
                setSelectedEventTitle('all');
              }}
              className={`px-3 py-2 rounded-xl transition-all ${eventTypeFilter === 'sports'
                  ? 'bg-[#B8860B] text-white font-bold shadow-sm'
                  : 'bg-white border border-[#E5E2DC] text-[#666461] hover:text-[#121212]'
                }`}
            >
              Sports ({sportsCount})
            </button>
            <button
              onClick={() => {
                setEventTypeFilter('cultural');
                setSelectedEventTitle('all');
              }}
              className={`px-3 py-2 rounded-xl transition-all ${eventTypeFilter === 'cultural'
                  ? 'bg-[#8B263E] text-white font-bold shadow-sm'
                  : 'bg-white border border-[#E5E2DC] text-[#666461] hover:text-[#121212]'
                }`}
            >
              Cultural ({culturalCount})
            </button>
          </div>

          {/* Quick Search & Event Title Dropdown */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
            <div className="relative w-full sm:w-56">
              <Search className="w-3.5 h-3.5 text-[#666461] absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search event, student, college..."
                className="w-full pl-8 pr-3 py-2 rounded-xl bg-white border border-[#E5E2DC] text-xs font-medium focus:border-[#121212] outline-none shadow-sm"
              />
            </div>

            {uniqueEventTitles.length > 0 && (
              <select
                value={selectedEventTitle}
                onChange={(e) => setSelectedEventTitle(e.target.value)}
                className="w-full sm:w-auto px-3 py-2 rounded-xl bg-white border border-[#E5E2DC] text-xs font-bold text-[#121212] focus:border-[#121212] outline-none shadow-sm max-w-full sm:max-w-[200px] truncate"
              >
                <option value="all">Filter By Event (All)</option>
                {uniqueEventTitles.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

        {/* EVENT-WISE RESULTS LIST */}
        <div className="space-y-6 pt-2 animate-in fade-in duration-300">
          {filteredResults.length === 0 ? (
            <div className="p-16 text-center bg-white border border-dashed border-[#E5E2DC] rounded-3xl space-y-3">
              <Medal className="w-10 h-10 text-[#666461] mx-auto opacity-40" />
              <h3 className="font-editorial font-bold text-xl text-[#121212]">
                No Event Results Found
              </h3>
              <p className="text-xs text-[#666461] max-w-md mx-auto">
                {results.length === 0
                  ? 'No official event winners have been declared yet. Once events are marked completed and winners are decided by the Secretariat, event podiums will appear here.'
                  : 'No events matched your search or category filter.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 festival-stagger">
              {filteredResults.map((res) => {
                const p = res.podium || ({} as any);

                return (
                  <div
                    key={res.id}
                    className="bg-white border border-[#E5E2DC] p-6 rounded-3xl space-y-4 font-mono text-xs shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
                  >
                    {/* Event Header */}
                    <div className="space-y-2 border-b border-[#E5E2DC] pb-4">
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className={`text-[9px] font-bold uppercase tracking-widest px-2.5 py-0.5 rounded ${res.eventType === 'sports'
                              ? 'bg-[#B8860B] text-white'
                              : 'bg-[#8B263E] text-white'
                            }`}
                        >
                          {res.eventType.toUpperCase()} · {res.category}
                        </span>
                        <span className="text-[11px] text-[#666461] flex items-center space-x-1">
                          <Calendar className="w-3 h-3 text-[#B8860B]" />
                          <span>{res.date}</span>
                        </span>
                      </div>
                      <h3 className="font-editorial font-bold text-2xl text-[#121212] tracking-tight leading-snug">
                        {res.eventTitle}
                      </h3>
                    </div>

                    {/* Dynamic Prize Holders / Podium Places: Student name prominent + College name in small font */}
                    <div className="space-y-2.5 flex-1 font-sans">
                      {(() => {
                        const winnerList =
                          res.winners && res.winners.length > 0
                            ? res.winners
                            : ([
                              p.first,
                              p.second,
                              p.third,
                              p.fourth,
                              p.fifth,
                            ].filter(Boolean) as any[]);

                        return winnerList.map((winner: any, idx: number) => {
                          const is1st = (winner.position || idx + 1) === 1;

                          return (
                            <div
                              key={idx}
                              className={`p-3.5 rounded-2xl space-y-1 transition-all ${is1st
                                  ? 'bg-amber-300/[0.10] border border-amber-300/35 shadow-[inset_3px_0_0_rgba(216,184,107,.72)]'
                                  : (winner.position || idx + 1) === 2
                                    ? 'bg-slate-900/55 border border-white/10'
                                    : 'bg-[#0b1430]/65 border border-white/10'
                                }`}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-2.5">
                                  <span className="text-2xl">
                                    {getMedalEmoji(
                                      winner.medal,
                                      (winner.position || idx + 1) === 1
                                        ? '🥇'
                                        : (winner.position || idx + 1) === 2
                                          ? '🥈'
                                          : '🥉'
                                    )}
                                  </span>
                                  <div>
                                    <span
                                      className={`text-[10px] font-mono font-bold uppercase tracking-wider block ${is1st
                                          ? 'text-amber-200'
                                          : (winner.position || idx + 1) === 2
                                            ? 'text-slate-300'
                                          : 'text-slate-300'
                                        }`}
                                    >
                                      {winner.positionLabel ||
                                        `${idx + 1}${idx === 0 ? 'st' : idx === 1 ? 'nd' : idx === 2 ? 'rd' : 'th'} Place`}
                                    </span>
                                    {/* Student Name */}
                                    <strong className="font-editorial font-bold text-base text-[#fffaf0] block">
                                      {winner.studentName || winner.teamOrParticipant}
                                    </strong>
                                    {/* Small font college name */}
                                    <span className="text-xs text-slate-300 block leading-snug mt-0.5">
                                      {winner.college}
                                    </span>
                                  </div>
                                </div>
                                {res.includePoints && winner.points && winner.points > 0 ? (
                                  <span className="font-mono font-bold text-xs text-amber-200 bg-slate-950/60 px-2 py-0.5 rounded-lg border border-amber-200/25 shadow-xs">
                                    +{winner.points} PTS
                                  </span>
                                ) : null}
                              </div>
                              {winner.details && (
                                <div className="text-[11px] text-slate-300 pl-9 pt-0.5 italic">
                                  {winner.details}
                                </div>
                              )}
                            </div>
                          );
                        });
                      })()}
                    </div>

                    {/* Official Stamp & Details Action Footer */}
                    <div className="pt-3 border-t border-[#E5E2DC] flex items-center justify-between text-[10px] text-[#666461] gap-2">
                      <span className="flex items-center space-x-1">
                        <Shield className="w-3 h-3 text-[#B8860B]" />
                        <span>Secretariat Certified</span>
                      </span>

                      <div className="flex items-center space-x-2">
                        {onSelectEvent && (
                          <button
                            onClick={() => {
                              const matchingEvt = events?.find(
                                (e) =>
                                  e.id === res.eventId ||
                                  e.title.toLowerCase() === res.eventTitle.toLowerCase()
                              );
                              if (matchingEvt) {
                                onSelectEvent(matchingEvt.slug || matchingEvt.id);
                              } else if (res.eventId) {
                                onSelectEvent(res.eventId);
                              }
                            }}
                            className="px-3 py-1.5 rounded-xl bg-[#121212] text-white hover:bg-[#2A2A2A] font-bold uppercase transition-all shadow-xs"
                          >
                            View Details →
                          </button>
                        )}
                        <span className="font-bold text-[#B8860B] hidden sm:inline">VERIFIED PODIUM</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

export default ResultsPage;
