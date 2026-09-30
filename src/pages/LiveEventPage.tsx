import React, { useState, useEffect } from 'react';
import {
  Radio, ArrowLeft, RefreshCw, Copy
} from 'lucide-react';
import type { EventItem, Registration } from '../types';
import { apiService, apiUrl } from '../services/apiService';
import { TeamDetailsModal } from '../components/TeamDetailsModal';

interface LiveEventPageProps {
  slug: string;
  onBack: () => void;
}

export const LiveEventPage: React.FC<LiveEventPageProps> = ({ slug, onBack }) => {
  const [event, setEvent] = useState<EventItem | null>(null);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTeam, setSelectedTeam] = useState<Registration | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  const fetchLiveEventData = async () => {
    try {
      const [evt, regs] = await Promise.all([
        apiService.getLiveEvent(slug),
        fetch(apiUrl('/registrations')).then(r => r.ok ? r.json() : []).catch(() => []),
      ]);
      if (evt) setEvent(evt);
      if (regs && Array.isArray(regs)) {
        const eventRegs = regs.filter((r: Registration) => r.eventId === evt?.id || r.eventTitle === evt?.title);
        setRegistrations(eventRegs);
      }
    } catch {
      // Fallback
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLiveEventData();
    // Auto-poll live score every 5 seconds for real-time updates
    const interval = setInterval(fetchLiveEventData, 5000);
    return () => clearInterval(interval);
  }, [slug]);

  const handleCopyLink = () => {
    const liveUrl = `${window.location.origin}/live/${slug}`;
    navigator.clipboard.writeText(liveUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#FAF9F6] flex items-center justify-center p-6 text-[#121212]">
        <div className="text-center space-y-3">
          <RefreshCw className="w-8 h-8 text-[#B8860B] animate-spin mx-auto" />
          <p className="text-xs font-mono font-bold uppercase tracking-widest text-[#666461]">Loading Live Event Coverage...</p>
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-[#FAF9F6] flex items-center justify-center p-6 text-[#121212]">
        <div className="bg-white border border-[#E5E2DC] rounded-3xl p-8 max-w-md text-center space-y-4 shadow-lg">
          <Radio className="w-12 h-12 text-[#666461] mx-auto opacity-40" />
          <h2 className="font-editorial font-bold text-2xl text-[#121212]">Event Coverage Not Found</h2>
          <p className="text-xs text-[#666461]">The requested live event link is unavailable or has not been published yet.</p>
          <button
            onClick={onBack}
            className="px-6 py-2.5 rounded-xl bg-[#121212] text-white font-bold text-xs uppercase tracking-wider"
          >
            ← Back to Events
          </button>
        </div>
      </div>
    );
  }

  const liveMatch = event.liveMatch || {
    teamA: registrations[0]?.teamName || registrations[0]?.collegeName || 'Team A',
    teamB: registrations[1]?.teamName || registrations[1]?.collegeName || 'Team B',
    scoreA: 0,
    scoreB: 0,
    status: 'LIVE',
    lastUpdated: 'Just now',
  };

  return (
    <div className="min-h-screen bg-[#FAF9F6] text-[#121212] font-sans antialiased flex flex-col pb-20">

      {/* Top Banner Navigation */}
      <header className="bg-white border-b border-[#E5E2DC] sticky top-0 z-40 px-3 sm:px-6 py-3 sm:py-4 flex items-center justify-between shadow-sm gap-2">
        <button
          onClick={onBack}
          className="px-3 sm:px-4 py-2 rounded-xl bg-[#FAF9F6] border border-[#E5E2DC] text-xs font-bold text-[#121212] hover:bg-[#E5E2DC] flex items-center space-x-1.5 sm:space-x-2 transition-all shrink-0"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="hidden sm:inline">← Back to Fest</span>
          <span className="sm:hidden">Back</span>
        </button>

        <div className="flex items-center space-x-2 sm:space-x-3 shrink-0">
          <span className="flex items-center space-x-1 sm:space-x-1.5 px-2.5 sm:px-3 py-1 bg-rose-600 text-white rounded-full text-[10px] sm:text-xs font-bold uppercase tracking-wider animate-pulse shadow-sm">
            <Radio className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
            <span className="hidden sm:inline">LIVE COVERAGE</span>
            <span className="sm:hidden">LIVE</span>
          </span>

          <button
            onClick={handleCopyLink}
            className="px-2.5 sm:px-3.5 py-1.5 rounded-xl bg-[#FAF9F6] border border-[#E5E2DC] text-xs font-bold text-[#121212] hover:bg-[#E5E2DC] flex items-center space-x-1 sm:space-x-1.5 transition-colors"
          >
            <Copy className="w-3.5 h-3.5 text-[#B8860B]" />
            <span className="hidden sm:inline">{copiedLink ? 'Copied!' : 'Copy Live Link'}</span>
            <span className="sm:hidden">{copiedLink ? 'Copied!' : 'Share'}</span>
          </button>
        </div>
      </header>

      {/* Main Live Page Container */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-8">

        {/* Header Title Section */}
        <div className="bg-white border border-[#E5E2DC] rounded-3xl p-6 sm:p-8 shadow-md space-y-4 text-center sm:text-left flex flex-col sm:flex-row justify-between items-center">
          <div className="space-y-2">
            <div className="flex items-center justify-center sm:justify-start space-x-2">
              <span className="text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded bg-[#B8860B] text-white">
                {event.type.toUpperCase()} · {event.category}
              </span>
              <span className="text-xs font-bold uppercase tracking-wider text-[#666461] bg-[#FAF9F6] border border-[#E5E2DC] px-2.5 py-0.5 rounded">
                {event.venueName}
              </span>
            </div>

            <h1 className="font-editorial font-bold text-3xl sm:text-4xl text-[#121212]">{event.title}</h1>
            <p className="text-xs text-[#666461]">{event.description}</p>
          </div>

          <div className="w-full sm:w-auto bg-[#FAF9F6] border border-[#E5E2DC] p-4 rounded-2xl text-center space-y-1 sm:min-w-[160px]">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#666461] block">CURRENT STATUS</span>
            <span className="text-sm font-bold uppercase text-emerald-700 block">{liveMatch.status || 'LIVE'}</span>
            <span className="text-[10px] text-[#666461] block font-mono">{event.dateTime}</span>
          </div>
        </div>

        {/* ----------------------------------------------------
            LIVE SCORECARD SECTION
           ---------------------------------------------------- */}
        <div className="bg-white border-2 border-[#121212] rounded-3xl overflow-hidden shadow-2xl p-6 sm:p-8 space-y-6">
          <div className="flex items-center justify-between border-b border-[#E5E2DC] pb-4">
            <div className="flex items-center space-x-2">
              <span className="w-3 h-3 rounded-full bg-rose-600 animate-ping" />
              <h2 className="font-editorial font-bold text-2xl text-[#121212]">LIVE SCORE</h2>
            </div>
            <span className="text-xs font-mono text-[#666461]">
              Updated: {liveMatch.lastUpdated ? new Date(liveMatch.lastUpdated).toLocaleTimeString() : 'Just now'}
            </span>
          </div>

          {/* Teams Scoreboard Box */}
          <div className="bg-[#121212] text-white rounded-2xl p-4 sm:p-8 flex items-center justify-around gap-1 sm:gap-4 shadow-inner">
            {/* Team A */}
            <div className="text-center space-y-2 flex-1 min-w-0">
              <span className="text-xs font-mono text-[#B8860B] uppercase tracking-wider block font-bold">HOME TEAM</span>
              <h3 className="font-editorial font-bold text-base sm:text-2xl text-white break-words">{liveMatch.teamA}</h3>
              <div className="font-editorial font-black text-4xl sm:text-6xl text-[#B8860B]">{liveMatch.scoreA}</div>
            </div>

            {/* VS Divider */}
            <div className="text-center px-1 sm:px-4 font-editorial font-bold text-xl sm:text-2xl text-[#666461]">VS</div>

            {/* Team B */}
            <div className="text-center space-y-2 flex-1 min-w-0">
              <span className="text-xs font-mono text-[#B8860B] uppercase tracking-wider block font-bold">AWAY TEAM</span>
              <h3 className="font-editorial font-bold text-base sm:text-2xl text-white break-words">{liveMatch.teamB}</h3>
              <div className="font-editorial font-black text-4xl sm:text-6xl text-[#B8860B]">{liveMatch.scoreB}</div>
            </div>
          </div>

          {liveMatch.remarks && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-center text-xs font-semibold text-amber-900">
              📌 {liveMatch.remarks}
            </div>
          )}
        </div>

        {/* ----------------------------------------------------
            MATCH / EVENT INFORMATION
           ---------------------------------------------------- */}
        <div className="bg-white border border-[#E5E2DC] rounded-3xl p-6 shadow-sm space-y-4">
          <h3 className="font-editorial font-bold text-xl text-[#121212] border-b border-[#E5E2DC] pb-3">
            MATCH & VENUE INFORMATION
          </h3>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
            <div className="p-3 bg-[#FAF9F6] border border-[#E5E2DC] rounded-xl space-y-0.5">
              <span className="text-[10px] text-[#666461] uppercase font-bold block">Current Match</span>
              <strong className="text-[#121212] block truncate">{liveMatch.teamA} vs {liveMatch.teamB}</strong>
            </div>

            <div className="p-3 bg-[#FAF9F6] border border-[#E5E2DC] rounded-xl space-y-0.5">
              <span className="text-[10px] text-[#666461] uppercase font-bold block">Start Time</span>
              <strong className="text-[#121212] block">{event.startTime || '10:30 AM'}</strong>
            </div>

            <div className="p-3 bg-[#FAF9F6] border border-[#E5E2DC] rounded-xl space-y-0.5">
              <span className="text-[10px] text-[#666461] uppercase font-bold block">Venue Location</span>
              <strong className="text-[#121212] block">{event.venueName}</strong>
            </div>

            <div className="p-3 bg-[#FAF9F6] border border-[#E5E2DC] rounded-xl space-y-0.5">
              <span className="text-[10px] text-[#666461] uppercase font-bold block">Match Status</span>
              <strong className="text-emerald-700 uppercase block font-bold">{liveMatch.status || 'LIVE'}</strong>
            </div>
          </div>
        </div>

        {/* ----------------------------------------------------
            REGISTERED TEAMS SECTION
           ---------------------------------------------------- */}
        <div className="bg-white border border-[#E5E2DC] rounded-3xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-[#E5E2DC] pb-3">
            <div>
              <h3 className="font-editorial font-bold text-xl text-[#121212]">REGISTERED TEAMS & ROSTERS</h3>
              <p className="text-xs text-[#666461]">Real-time database teams competing in this event</p>
            </div>
            <span className="text-xs font-bold bg-[#FAF9F6] border border-[#E5E2DC] px-3 py-1 rounded-full text-[#121212]">
              {registrations.length} Verified Teams
            </span>
          </div>

          {registrations.length === 0 ? (
            <div className="py-8 text-center text-xs text-[#666461] font-mono">
              No registered teams found for this event in database.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {registrations.map((reg, idx) => (
                <div
                  key={reg.id || idx}
                  className="bg-[#FAF9F6] border border-[#E5E2DC] rounded-2xl p-5 hover:border-[#121212] transition-all flex flex-col justify-between space-y-3"
                >
                  <div className="space-y-1">
                    <span className="font-mono text-[10px] font-bold text-[#666461] uppercase tracking-wider block">
                      #{String(idx + 1).padStart(2, '0')} · {reg.registrationId}
                    </span>
                    <h4 className="font-editorial font-bold text-lg text-[#121212]">
                      {reg.teamName || reg.participantName}
                    </h4>
                    <p className="text-xs text-[#666461] font-medium">{reg.collegeName}</p>
                  </div>

                  <div className="pt-3 border-t border-[#E5E2DC] flex items-center justify-between text-xs">
                    <span className="font-semibold text-[#121212]">
                      {reg.members?.length || 1} Registered Players
                    </span>

                    <button
                      onClick={() => setSelectedTeam(reg)}
                      className="px-4 py-1.5 rounded-xl bg-[#121212] hover:bg-[#2A2A2A] text-white text-xs font-bold uppercase tracking-wider shadow-sm transition-all"
                    >
                      View Team →
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </main>

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
