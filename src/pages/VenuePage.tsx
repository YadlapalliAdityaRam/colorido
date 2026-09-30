import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Building2, Clock3, MapPin, RefreshCw } from 'lucide-react';
import type { EventItem, Venue } from '../types';
import { apiService } from '../services/apiService';
import { FestivalPassVenue } from '../components/festivalPass/FestivalPass';

interface VenuePageProps {
  onSelectEvent: (slug: string) => void;
}

type VenueCategory = 'all' | 'cultural' | 'sports';
interface ScheduledVenue extends Venue { events: EventItem[] }

const formatCapacity = (capacity?: number | string) => {
  if (typeof capacity === 'number' && Number.isFinite(capacity)) return `${capacity.toLocaleString()} people`;
  return typeof capacity === 'string' && capacity.trim() ? capacity : null;
};

export const VenuePage: React.FC<VenuePageProps> = ({ onSelectEvent }) => {
  const [venues, setVenues] = useState<Venue[]>([]);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [activeVenueId, setActiveVenueId] = useState<string | null>(null);
  const [category, setCategory] = useState<VenueCategory>('all');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const inFlight = useRef<AbortSignal | null>(null);

  const refreshLiveData = useCallback(async (signal?: AbortSignal) => {
    if (inFlight.current && !inFlight.current.aborted) return;
    inFlight.current = signal || null;
    setRefreshing(true);
    try {
      const [venueResult, eventResult] = await Promise.allSettled([
        apiService.getLiveVenues(signal),
        apiService.getLiveEvents(signal),
      ]);
      if (signal?.aborted) return;
      if (eventResult.status === 'rejected') throw eventResult.reason;
      const liveVenues = venueResult.status === 'fulfilled' ? venueResult.value : [];
      const liveEvents = eventResult.value;
      setVenues(liveVenues);
      setEvents(liveEvents);
      setActiveVenueId(current => current && liveVenues.some(venue => venue.id === current) ? current : null);
      setLastUpdated(new Date());
      setError(venueResult.status === 'rejected' ? 'Venue details are temporarily unavailable; locations below come from live event schedules.' : '');
    } catch (cause) {
      if (signal?.aborted) return;
      setVenues([]);
      setEvents([]);
      setActiveVenueId(null);
      setLastUpdated(null);
      setError(cause instanceof Error ? cause.message : 'Unable to refresh venue information.');
    } finally {
      if (inFlight.current === (signal || null)) {
        inFlight.current = null;
        if (!signal?.aborted) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void refreshLiveData(controller.signal);
    const interval = window.setInterval(() => {
      if (document.visibilityState === 'visible') void refreshLiveData(controller.signal);
    }, 30_000);
    const onVisibility = () => {
      if (document.visibilityState === 'visible') void refreshLiveData(controller.signal);
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      controller.abort();
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [refreshLiveData]);

  const scheduledVenues = useMemo(() => {
    const byVenue = new Map<string, ScheduledVenue>();
    events.forEach(event => {
      if (event.type !== 'sports' && event.type !== 'cultural') return;
      const status = String(event.status || '').toLowerCase();
      if (status === 'cancelled' || status === 'archived') return;
      const storedVenue = venues.find(venue => (event.venueId && venue.id === event.venueId) ||
        (event.venueName && venue.name.trim().toLocaleLowerCase() === event.venueName.trim().toLocaleLowerCase()));
      if (storedVenue?.isDisabled) return;
      const name = event.venueName?.trim() || storedVenue?.name;
      if (!name) return;
      const id = storedVenue?.id || event.venueId || `event-venue:${name.toLocaleLowerCase()}`;
      const entry = byVenue.get(id) || { ...(storedVenue || {}), id, name, events: [] } as ScheduledVenue;
      entry.events.push(event);
      byVenue.set(id, entry);
    });
    return [...byVenue.values()].sort((a, b) => a.name.localeCompare(b.name));
  }, [events, venues]);
  const visibleVenues = category === 'all' ? scheduledVenues : scheduledVenues.filter(venue => venue.events.some(event => event.type === category));
  const activeVenue = visibleVenues.find(venue => venue.id === activeVenueId) || visibleVenues[0] || null;
  const venueEvents = activeVenue ? activeVenue.events.filter(event => category === 'all' || event.type === category) : [];

  return (
    <div className="min-h-screen bg-[#FAF9F6] text-[#121212] flex flex-col pb-20">
      <section className="max-w-7xl mx-auto px-6 pt-16 pb-8 w-full space-y-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <span className="text-xs font-mono text-[#666461] uppercase tracking-widest block mb-1">CAMPUS WAYFINDING &amp; ARENAS</span>
            <h1 className="font-editorial font-bold text-4xl sm:text-5xl text-[#121212]">VENUES</h1>
            <p className="mt-2 text-sm text-[#666461]">Venue and schedule information from the live festival records.</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-2 text-xs font-mono text-[#666461]" aria-live="polite">
              <span className={`h-2 w-2 rounded-full ${error ? 'bg-amber-500' : 'bg-emerald-500'}`} />
              {error && !events.length ? 'Live data unavailable' : error ? 'Partial live data' : refreshing ? 'Updating live data…' : 'Live data'}
              {lastUpdated && !error && <span>· Updated {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>}
            </span>
            <button type="button" onClick={() => void refreshLiveData()} disabled={refreshing} className="inline-flex min-h-10 items-center gap-2 rounded-md border border-[#C5A059]/60 px-3 text-xs font-semibold text-white disabled:opacity-60" aria-label="Refresh live venue information">
              <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} /> Refresh
            </button>
          </div>
        </div>
      </section>

      {error && <div role="status" className="mx-auto mb-5 w-full max-w-7xl px-6"><p className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">{events.length ? error : <>Could not retrieve live event schedules. Check that the festival service is running, then retry. {error}</>}</p></div>}

      {loading ? (
        <section className="max-w-7xl mx-auto px-6 w-full py-5" aria-live="polite"><div className="rounded-2xl border border-[#E5E2DC] bg-white p-8 text-sm text-[#666461]">Loading live venues and scheduled events…</div></section>
      ) : scheduledVenues.length === 0 ? (
        <section className="max-w-7xl mx-auto px-6 w-full py-5"><div className="rounded-2xl border border-[#E5E2DC] bg-white p-8 text-center"><Building2 className="mx-auto mb-3 h-8 w-8 text-[#C5A059]" /><h2 className="font-editorial text-xl font-bold">No scheduled venues yet</h2><p className="mt-2 text-sm text-[#666461]">Venues will appear here when a live Cultural or Sports event has a venue assigned.</p></div></section>
      ) : visibleVenues.length === 0 ? (
        <section className="max-w-7xl mx-auto px-6 w-full py-5"><div className="rounded-2xl border border-[#E5E2DC] bg-white p-8 text-center"><Building2 className="mx-auto mb-3 h-8 w-8 text-[#C5A059]" /><h2 className="font-editorial text-xl font-bold">No {category} venues scheduled</h2><p className="mt-2 text-sm text-[#666461]">This category has no current events with an assigned venue.</p></div></section>
      ) : (
        <section className="max-w-7xl mx-auto px-6 w-full grid grid-cols-1 lg:grid-cols-3 gap-6 pt-4">
          <aside className="rounded-3xl border border-[#E5E2DC] bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between gap-3"><h2 className="font-editorial font-bold text-lg text-[#121212]">Scheduled Venues</h2><span className="text-xs font-mono text-[#666461]">{visibleVenues.length} listed</span></div>
            <div className="mb-4 grid grid-cols-3 gap-1 rounded-lg border border-white/10 p-1" role="group" aria-label="Filter venues by event category">{(['all', 'cultural', 'sports'] as const).map(item => <button key={item} type="button" onClick={() => { setCategory(item); setActiveVenueId(null); }} aria-pressed={category === item} className={`rounded px-2 py-2 text-[10px] font-bold uppercase tracking-wide ${category === item ? 'bg-[#800020] text-white' : 'text-[#c2cde2] hover:bg-white/10'}`}>{item}</button>)}</div>
            <div className="space-y-2" role="list" aria-label="Scheduled venues">
              {visibleVenues.map(venue => <button key={venue.id} type="button" onClick={() => setActiveVenueId(venue.id)} aria-pressed={activeVenue?.id === venue.id} className={`w-full rounded-xl border p-3 text-left transition-colors ${activeVenue?.id === venue.id ? 'border-[#C5A059] bg-[#182544]' : 'border-[#E5E2DC] bg-[#FAF9F6] hover:border-[#C5A059]'}`}>
                <span className="flex items-start justify-between gap-3"><span className="font-semibold text-sm text-white">{venue.name}</span><MapPin aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-[#C5A059]" /></span>
                {venue.location && <span className="mt-1 block text-xs text-[#b8c3dc]">{venue.location}</span>}
                <span className="mt-2 block text-[11px] text-[#C5A059]">{venue.events.filter(event => category === 'all' || event.type === category).length} scheduled events</span>
              </button>)}
            </div>
          </aside>

          {activeVenue && <>
            <div className="rounded-3xl border border-[#E5E2DC] bg-white p-6 shadow-sm">
              {activeVenue.photo ? <div className="relative mb-4 h-48 overflow-hidden rounded-2xl bg-[#101a34]"><img src={activeVenue.photo} alt={activeVenue.name} className="h-full w-full object-cover" /><div className="absolute inset-0 bg-gradient-to-t from-black/75 to-transparent" /><h2 className="absolute bottom-4 left-4 font-editorial text-xl font-bold text-white">{activeVenue.name}</h2></div> : <div className="mb-4 flex min-h-32 items-end rounded-2xl border border-white/10 bg-[#101a34] p-4"><h2 className="font-editorial text-xl font-bold text-white">{activeVenue.name}</h2></div>}
              {activeVenue.type && <p className="text-xs font-mono uppercase tracking-wider text-[#C5A059]">{activeVenue.type}</p>}
              {activeVenue.description && <p className="mt-2 text-sm leading-relaxed text-[#b8c3dc]">{activeVenue.description}</p>}
              {activeVenue.location && <p className="mt-4 flex items-start gap-2 text-sm text-white"><MapPin size={16} className="mt-0.5 shrink-0 text-[#C5A059]" />{activeVenue.location}</p>}
              {formatCapacity(activeVenue.capacity) && <p className="mt-3 text-xs font-mono text-[#b8c3dc]">Capacity: <strong className="text-white">{formatCapacity(activeVenue.capacity)}</strong></p>}
              {!!activeVenue.facilities?.length && <div className="mt-4 border-t border-white/10 pt-4"><h3 className="text-xs font-bold uppercase tracking-wider text-[#C5A059]">Facilities</h3><ul className="mt-2 flex flex-wrap gap-2">{activeVenue.facilities.map((facility, index) => <li key={`${facility}-${index}`} className="rounded-full border border-white/15 px-2.5 py-1 text-xs text-[#d5dced]">{facility}</li>)}</ul></div>}
              <div className="mt-5"><FestivalPassVenue venue={activeVenue} venues={venues} events={venueEvents} onSelectEvent={onSelectEvent} triggerLabel="Venue Festival Pass" /></div>
            </div>

            <div className="rounded-3xl border border-[#E5E2DC] bg-white p-6 shadow-sm lg:col-span-1">
              <h2 className="border-b border-[#E5E2DC] pb-3 font-editorial font-bold text-lg text-[#121212]">Scheduled at {activeVenue.name} <span className="font-mono text-sm">({venueEvents.length})</span></h2>
              {venueEvents.length ? <div className="mt-3 space-y-2">{venueEvents.map(event => <button key={event.id} type="button" onClick={() => onSelectEvent(event.slug || event.id)} className="w-full rounded-xl border border-[#E5E2DC] bg-[#FAF9F6] p-4 text-left transition-colors hover:border-[#C5A059]">
                <span className="flex items-start justify-between gap-3"><span className="font-editorial text-sm font-bold text-[#121212]">{event.title}</span>{event.liveEnabled && <span className="rounded bg-[#800020] px-2 py-0.5 text-[10px] font-bold text-white">LIVE</span>}</span>
                <span className="mt-1 block text-xs text-[#666461]">{event.type === 'sports' ? 'Sports' : 'Cultural'} · {event.category}</span>
                <span className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#666461]"><span className="inline-flex items-center gap-1"><Clock3 size={13} />{event.eventDate || event.dateTime}{event.startTime ? ` · ${event.startTime}` : ''}</span><span className="capitalize">{String(event.status || 'scheduled').toLowerCase()}</span></span>
              </button>)}</div> : <p className="mt-4 rounded-lg bg-[#FAF9F6] p-4 text-sm text-[#666461]">No current events are assigned to this venue.</p>}
            </div>
          </>}
        </section>
      )}
    </div>
  );
};

export default VenuePage;
