import type { EventItem, Registration, Venue, EventResult, CollegeLeaderboard, UserProfile, MediaItem, AboutPageContent } from '../types';
import { INITIAL_EVENTS, MOCK_VENUES, INITIAL_REGISTRATIONS, INITIAL_RESULTS, INITIAL_LEADERBOARD, INITIAL_USER, INITIAL_MEDIA_ITEMS } from '../data/mockData';
import { normalizeAboutPageContent } from '../components/aboutExperience/aboutPageDefaults';

const API_BASE = (import.meta.env.VITE_API_BASE_URL?.trim() || '/api').replace(/\/+$/, '');

export function apiUrl(path: string): string {
  return `${API_BASE}/${path.replace(/^\/+/, '')}`;
}

const STORAGE_KEYS = {
  EVENTS: 'colorido_events',
  REGISTRATIONS: 'colorido_registrations',
  RESULTS: 'colorido_results',
  LEADERBOARD: 'colorido_leaderboard',
  USER: 'colorido_user',
  MEDIA: 'colorido_media',
  ABOUT: 'colorido_about_page',
};

function initializeStorage() {
  if (!localStorage.getItem(STORAGE_KEYS.EVENTS)) {
    localStorage.setItem(STORAGE_KEYS.EVENTS, JSON.stringify(INITIAL_EVENTS));
  }
  if (!localStorage.getItem(STORAGE_KEYS.REGISTRATIONS)) {
    localStorage.setItem(STORAGE_KEYS.REGISTRATIONS, JSON.stringify(INITIAL_REGISTRATIONS));
  }
  if (!localStorage.getItem(STORAGE_KEYS.RESULTS)) {
    localStorage.setItem(STORAGE_KEYS.RESULTS, JSON.stringify(INITIAL_RESULTS));
  }
  if (!localStorage.getItem(STORAGE_KEYS.LEADERBOARD)) {
    localStorage.setItem(STORAGE_KEYS.LEADERBOARD, JSON.stringify(INITIAL_LEADERBOARD));
  }
  if (!localStorage.getItem(STORAGE_KEYS.USER)) {
    localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(INITIAL_USER));
  }
  if (!localStorage.getItem(STORAGE_KEYS.MEDIA)) {
    localStorage.setItem(STORAGE_KEYS.MEDIA, JSON.stringify(INITIAL_MEDIA_ITEMS));
  }
}

initializeStorage();

export const apiService = {
  async getAboutPageContent(): Promise<AboutPageContent> {
    try {
      const response = await fetch(apiUrl('/pages/about'));
      if (response.ok) {
        const data = await response.json();
        if (data?.content) {
          try { localStorage.setItem(STORAGE_KEYS.ABOUT, JSON.stringify(data.content)); } catch { /* server copy remains canonical */ }
          return normalizeAboutPageContent(data.content as Partial<AboutPageContent>);
        }
      }
    } catch {
      // Offline fallback
    }

    const saved = localStorage.getItem(STORAGE_KEYS.ABOUT);
    if (saved) {
      try { return normalizeAboutPageContent(JSON.parse(saved) as Partial<AboutPageContent>); } catch { /* use defaults */ }
    }
    return normalizeAboutPageContent();
  },

  async saveAboutPageContent(content: AboutPageContent): Promise<boolean> {
    const next = { ...content, updatedAt: new Date().toISOString() };
    try {
      const response = await fetch(apiUrl('/pages/about'), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: next }),
      });
      if (response.ok) {
        const data = await response.json();
        try { localStorage.setItem(STORAGE_KEYS.ABOUT, JSON.stringify(data.content || next)); } catch { /* server copy remains canonical */ }
        return true;
      }
    } catch {
      // Keep the existing app's local-first behavior if the API is unavailable.
    }
    try { localStorage.setItem(STORAGE_KEYS.ABOUT, JSON.stringify(next)); } catch { /* storage quota: keep defaults for this session */ }
    return false;
  },

  async getEvents(params?: { type?: string; category?: string; format?: string; status?: string; search?: string; day?: number }): Promise<EventItem[]> {
    try {
      const url = new URL(apiUrl('/events'), window.location.origin);
      if (params) {
        Object.entries(params).forEach(([k, v]) => {
          if (v !== undefined && v !== 'all' && v !== 'All') url.searchParams.append(k, String(v));
        });
      }
      const res = await fetch(url.toString());
      if (res.ok) {
        const events: EventItem[] = await res.json();
        if (events && events.length > 0) {
          localStorage.setItem(STORAGE_KEYS.EVENTS, JSON.stringify(events));
        }
        return events;
      }
    } catch {
      // Offline fallback
    }

    let local: EventItem[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.EVENTS) || '[]');
    if (params?.type && params.type !== 'all') {
      local = local.filter(e => e.type === params.type);
    }
    if (params?.category && params.category !== 'All') {
      local = local.filter(e => e.category.toLowerCase() === params.category!.toLowerCase());
    }
    if (params?.format && params.format !== 'all') {
      local = local.filter(e => e.format === params.format);
    }
    if (params?.day) {
      local = local.filter(e => e.day === params.day);
    }
    if (params?.search) {
      const q = params.search.toLowerCase();
      local = local.filter(e => 
        e.title.toLowerCase().includes(q) || 
        e.description.toLowerCase().includes(q) ||
        e.category.toLowerCase().includes(q) ||
        e.venueName.toLowerCase().includes(q)
      );
    }
    return local;
  },

  async getEventBySlug(slug: string): Promise<EventItem | null> {
    try {
      const res = await fetch(apiUrl(`/events/${slug}`));
      if (res.ok) return await res.json();
    } catch {
      // Fallback
    }
    const local: EventItem[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.EVENTS) || '[]');
    return local.find(e => e.slug === slug || e.id === slug) || null;
  },

  async createEvent(eventData: Partial<EventItem>): Promise<EventItem> {
    let createdEvent: EventItem | null = null;
    try {
      const res = await fetch(apiUrl('/events'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(eventData),
      });
      if (res.ok) {
        createdEvent = await res.json();
      }
    } catch {
      // Fallback
    }

    if (!createdEvent) {
      createdEvent = {
        ...eventData,
        id: `event-${Date.now()}`,
        slug: eventData.slug || (eventData.title ? eventData.title.toLowerCase().replace(/[^a-z0-9]+/g, '-') : 'new-event'),
        title: eventData.title || 'Untitled Event',
        type: eventData.type || 'sports',
        category: eventData.category || 'General',
        description: eventData.description || '',
        oneLineSummary: eventData.oneLineSummary || '',
        rules: eventData.rules || [],
        eligibility: eventData.eligibility || 'Open to all',
        format: eventData.format || 'solo',
        minTeamSize: eventData.minTeamSize || 1,
        maxTeamSize: eventData.maxTeamSize || 1,
        isSubmissionBased: !!eventData.isSubmissionBased,
        venueId: eventData.venueId || 'v-1',
        venueName: eventData.venueName || 'Main Stadium',
        dateTime: eventData.dateTime || '30 Sep 2026 · 10:00 AM',
        day: eventData.day || 1,
        regDeadline: eventData.regDeadline || '28 Sep 2026',
        fee: eventData.fee || 0,
        seatsTotal: eventData.seatsTotal || 0,
        seatsLeft: eventData.seatsTotal || 0,
        bannerImage: eventData.bannerImage || (eventData.type === 'cultural' ? '/cultural_global_profile_photo.jpeg' : '/global_sports_profile.jpeg'),
        status: 'open',
        prizes: eventData.prizes || { first: '₹10,000', second: '₹5,000', third: '₹2,500' },
        coordinators: eventData.coordinators || [{ name: 'Event Coordinator', phone: '+91 98765 00000', email: 'coord@colorido.org' }],
      } as EventItem;
    }

    const local: EventItem[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.EVENTS) || '[]');
    const updatedLocal = [createdEvent, ...local.filter(e => e.id !== createdEvent!.id)];
    localStorage.setItem(STORAGE_KEYS.EVENTS, JSON.stringify(updatedLocal));
    return createdEvent;
  },

  async updateEvent(id: string, eventData: Partial<EventItem>): Promise<EventItem | null> {
    let updatedEvent: EventItem | null = null;
    try {
      const res = await fetch(apiUrl(`/events/${id}`), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(eventData),
      });
      if (res.ok) {
        updatedEvent = await res.json();
      }
    } catch {
      // Fallback
    }

    const local: EventItem[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.EVENTS) || '[]');
    const index = local.findIndex(e => e.id === id);
    if (index !== -1) {
      local[index] = { ...local[index], ...eventData, ...(updatedEvent || {}) };
      localStorage.setItem(STORAGE_KEYS.EVENTS, JSON.stringify(local));
      return local[index];
    }
    return updatedEvent;
  },

  async deleteEvent(id: string): Promise<boolean> {
    try {
      await fetch(apiUrl(`/events/${id}`), { method: 'DELETE' });
    } catch {
      // Fallback
    }
    let local: EventItem[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.EVENTS) || '[]');
    local = local.filter(e => e.id !== id);
    localStorage.setItem(STORAGE_KEYS.EVENTS, JSON.stringify(local));
    return true;
  },

  async updateLiveScore(id: string, liveData: {
    teamA?: string;
    teamB?: string;
    scoreA?: number;
    scoreB?: number;
    status?: 'LIVE' | 'HALFTIME' | 'UPCOMING' | 'FINISHED' | 'COMPLETED' | 'FULL_TIME';
    startTime?: string;
    endTime?: string;
    winner?: string;
    remarks?: string;
  }): Promise<EventItem | null> {
    try {
      const res = await fetch(apiUrl(`/events/${id}/live-score`), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(liveData),
      });
      if (res.ok) {
        const updated = await res.json();
        const local: EventItem[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.EVENTS) || '[]');
        const idx = local.findIndex(e => e.id === id || e.slug === id);
        if (idx !== -1) {
          local[idx] = { ...local[idx], ...updated };
          localStorage.setItem(STORAGE_KEYS.EVENTS, JSON.stringify(local));
        }
        return updated;
      }
    } catch {
      // Fallback
    }
    return null;
  },

  async getLiveEvent(slug: string): Promise<EventItem | null> {
    try {
      const res = await fetch(apiUrl(`/events/live/${slug}`));
      if (res.ok) return await res.json();
    } catch {
      // Fallback
    }
    const local: EventItem[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.EVENTS) || '[]');
    return local.find(e => e.liveSlug === slug || e.slug === slug || e.id === slug) || null;
  },

  async createRegistration(payload: {
    eventId: string;
    participantName: string;
    participantEmail: string;
    participantPhone: string;
    collegeName: string;
    studentId: string;
    format: 'solo' | 'team' | 'doubles';
    teamName?: string;
    members?: any[];
  }): Promise<Registration> {
    try {
      const res = await fetch(apiUrl('/registrations'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) return await res.json();
    } catch {
      // Fallback
    }

    const events: EventItem[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.EVENTS) || '[]');
    const targetEvent = events.find(e => e.id === payload.eventId);

    const prefix = targetEvent?.type === 'sports' ? 'COL26-SPT' : 'COL26-CUL';
    const randomNum = String(Math.floor(1000 + Math.random() * 9000));
    const regId = `${prefix}-${randomNum}`;

    const newReg: Registration = {
      id: `reg-${Date.now()}`,
      registrationId: regId,
      eventId: payload.eventId,
      eventTitle: targetEvent ? targetEvent.title : 'Registered Event',
      eventType: targetEvent ? targetEvent.type : 'sports',
      eventDate: targetEvent ? targetEvent.dateTime : '30 Sep 2026',
      venueName: targetEvent ? targetEvent.venueName : 'Apex Campus',
      participantName: payload.participantName,
      participantEmail: payload.participantEmail,
      participantPhone: payload.participantPhone,
      collegeName: payload.collegeName,
      studentId: payload.studentId,
      format: payload.format,
      teamName: payload.teamName,
      members: payload.members || [{ name: payload.participantName, email: payload.participantEmail, phone: payload.participantPhone, studentId: payload.studentId }],
      status: 'confirmed',
      isCheckedIn: false,
      createdAt: new Date().toISOString(),
    };

    const regs: Registration[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.REGISTRATIONS) || '[]');
    regs.unshift(newReg);
    localStorage.setItem(STORAGE_KEYS.REGISTRATIONS, JSON.stringify(regs));

    if (targetEvent && targetEvent.seatsLeft > 0) {
      targetEvent.seatsLeft -= 1;
      localStorage.setItem(STORAGE_KEYS.EVENTS, JSON.stringify(events));
    }

    return newReg;
  },

  async getMyRegistrations(email?: string): Promise<Registration[]> {
    const targetEmail = email || 'aditya.ram@apextech.edu';
    try {
      const res = await fetch(apiUrl(`/registrations/my?email=${encodeURIComponent(targetEmail)}`));
      if (res.ok) return await res.json();
    } catch {
      // Fallback
    }
    const regs: Registration[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.REGISTRATIONS) || '[]');
    return regs.filter(r => r.participantEmail.toLowerCase() === targetEmail.toLowerCase());
  },

  async getAllRegistrations(): Promise<Registration[]> {
    try {
      const res = await fetch(apiUrl('/registrations/admin'));
      if (res.ok) return await res.json();
    } catch {
      // Fallback
    }
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.REGISTRATIONS) || '[]');
  },

  async toggleCheckIn(registrationId: string): Promise<Registration | null> {
    try {
      const res = await fetch(apiUrl(`/registrations/${registrationId}/checkin`), { method: 'PATCH' });
      if (res.ok) {
        const data = await res.json();
        return data.registration;
      }
    } catch {
      // Fallback
    }
    const regs: Registration[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.REGISTRATIONS) || '[]');
    const item = regs.find(r => r.id === registrationId || r.registrationId === registrationId);
    if (item) {
      item.isCheckedIn = !item.isCheckedIn;
      localStorage.setItem(STORAGE_KEYS.REGISTRATIONS, JSON.stringify(regs));
      return item;
    }
    return null;
  },

  async getVenues(): Promise<Venue[]> {
    try {
      const res = await fetch(apiUrl('/venues'));
      if (res.ok) return await res.json();
    } catch {
      // Fallback
    }
    return MOCK_VENUES;
  },

  // Venue directory uses explicit live reads; unlike general offline-first views it never falls back to demo venues.
  async getLiveVenues(signal?: AbortSignal): Promise<Venue[]> {
    const res = await fetch(apiUrl('/venues'), { cache: 'no-store', signal });
    if (!res.ok) throw new Error(`Venue service returned ${res.status}`);
    const records: unknown = await res.json();
    if (!Array.isArray(records)) throw new Error('Venue service returned invalid data');
    return records
      .filter((record: any) => record && (record.id || record._id) && typeof record.name === 'string' && record.name.trim() && record.isDisabled !== true)
      .map((record: any): Venue => ({
        id: String(record.id || record._id),
        name: String(record.name),
        description: typeof record.description === 'string' ? record.description : '',
        capacity: record.capacity,
        location: typeof record.location === 'string' ? record.location : '',
        photo: typeof record.image === 'string' ? record.image : undefined,
        facilities: Array.isArray(record.facilities) ? record.facilities.filter((item: unknown): item is string => typeof item === 'string') : [],
        eventsCount: typeof record.eventsCount === 'number' ? record.eventsCount : undefined,
        type: typeof record.type === 'string' ? record.type : undefined,
        isDisabled: false,
      }))
      .filter((venue: Venue) => venue.id && venue.name);
  },

  async getLiveEvents(signal?: AbortSignal): Promise<EventItem[]> {
    const res = await fetch(apiUrl('/events'), { cache: 'no-store', signal });
    if (!res.ok) throw new Error(`Event service returned ${res.status}`);
    const records: unknown = await res.json();
    if (!Array.isArray(records)) throw new Error('Event service returned invalid data');
    return records as EventItem[];
  },

  async getResults(): Promise<EventResult[]> {
    try {
      const res = await fetch(apiUrl('/results'));
      if (res.ok) return await res.json();
    } catch {
      // Fallback
    }
    const localResults: EventResult[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.RESULTS) || '[]');
    return localResults;
  },

  recalculateLeaderboard(): CollegeLeaderboard[] {
    const results: EventResult[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.RESULTS) || '[]');
    const scoreMap: Record<string, { totalPoints: number; gold: number; silver: number; bronze: number }> = {};

    results.forEach((r) => {
      const { first, second, third } = r.podium || {};
      const pointsEnabled = r.includePoints === true;

      if (first && first.college) {
        if (!scoreMap[first.college]) scoreMap[first.college] = { totalPoints: 0, gold: 0, silver: 0, bronze: 0 };
        const pts = pointsEnabled && first.points ? Number(first.points) : 0;
        scoreMap[first.college].totalPoints += pts;
        if (first.medal === 'gold' || (!first.medal && first.position === 1)) {
          scoreMap[first.college].gold += 1;
        }
      }
      if (second && second.college) {
        if (!scoreMap[second.college]) scoreMap[second.college] = { totalPoints: 0, gold: 0, silver: 0, bronze: 0 };
        const pts = pointsEnabled && second.points ? Number(second.points) : 0;
        scoreMap[second.college].totalPoints += pts;
        if (second.medal === 'silver' || (!second.medal && second.position === 2)) {
          scoreMap[second.college].silver += 1;
        }
      }
      if (third && third.college) {
        if (!scoreMap[third.college]) scoreMap[third.college] = { totalPoints: 0, gold: 0, silver: 0, bronze: 0 };
        const pts = pointsEnabled && third.points ? Number(third.points) : 0;
        scoreMap[third.college].totalPoints += pts;
        if (third.medal === 'bronze' || (!third.medal && third.position === 3)) {
          scoreMap[third.college].bronze += 1;
        }
      }
    });

    const leaderboard: CollegeLeaderboard[] = Object.keys(scoreMap)
      .map((college) => ({
        college,
        totalPoints: scoreMap[college].totalPoints,
        goldCount: scoreMap[college].gold,
        silverCount: scoreMap[college].silver,
        bronzeCount: scoreMap[college].bronze,
        rank: 0,
      }))
      .sort((a, b) => b.totalPoints - a.totalPoints);

    leaderboard.forEach((item, index) => {
      item.rank = index + 1;
    });

    localStorage.setItem(STORAGE_KEYS.LEADERBOARD, JSON.stringify(leaderboard));
    return leaderboard;
  },

  async createResult(resultData: Partial<EventResult>): Promise<EventResult> {
    let savedResult: EventResult | null = null;
    try {
      const res = await fetch(apiUrl('/results'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(resultData),
      });
      if (res.ok) {
        savedResult = await res.json();
      }
    } catch {
      // Fallback
    }

    const results: EventResult[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.RESULTS) || '[]');
    const existingIndex = results.findIndex(r => r.eventId === resultData.eventId);

    const newRes: EventResult = savedResult || {
      id: existingIndex !== -1 ? results[existingIndex].id : `res-${Date.now()}`,
      eventId: resultData.eventId || 's-1',
      eventTitle: resultData.eventTitle || 'Completed Event',
      eventType: resultData.eventType || 'sports',
      category: resultData.category || 'Sports',
      date: resultData.date || new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
      podium: resultData.podium || {
        first: { position: 1, teamOrParticipant: 'Winning Team', college: 'Apex Institute of Tech', points: 100 },
        second: { position: 2, teamOrParticipant: 'Runner Up Team', college: 'St. Xavier College', points: 60 },
        third: { position: 3, teamOrParticipant: 'Third Place Team', college: 'BITS Pilani', points: 30 },
      }
    };

    if (existingIndex !== -1) {
      results[existingIndex] = newRes;
    } else {
      results.unshift(newRes);
    }
    localStorage.setItem(STORAGE_KEYS.RESULTS, JSON.stringify(results));

    // Also mark the event status as completed in local storage
    if (resultData.eventId) {
      const events: EventItem[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.EVENTS) || '[]');
      const evtIdx = events.findIndex(e => e.id === resultData.eventId);
      if (evtIdx !== -1) {
        events[evtIdx].status = 'completed';
        localStorage.setItem(STORAGE_KEYS.EVENTS, JSON.stringify(events));
      }
    }

    // Automatically recalculate leaderboard points
    this.recalculateLeaderboard();

    return newRes;
  },

  async getLeaderboard(): Promise<CollegeLeaderboard[]> {
    try {
      const res = await fetch(apiUrl('/leaderboard'));
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          localStorage.setItem(STORAGE_KEYS.LEADERBOARD, JSON.stringify(data));
          return data;
        }
      }
    } catch {
      // Fallback
    }

    const localBoard = this.recalculateLeaderboard();
    return localBoard.length > 0 ? localBoard : JSON.parse(localStorage.getItem(STORAGE_KEYS.LEADERBOARD) || '[]');
  },

  getUserProfile(): UserProfile {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.USER) || JSON.stringify(INITIAL_USER));
  },

  updateUserProfile(profile: Partial<UserProfile>): UserProfile {
    const current = this.getUserProfile();
    const updated = { ...current, ...profile };
    localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(updated));
    return updated;
  },

  // ----------------------------------------------------
  // COLORIDO 2K26 MEDIA GALLERY OPERATIONS
  // ----------------------------------------------------
  async getMedia(params?: { type?: string; category?: string; eventId?: string; featured?: boolean; search?: string; sort?: string; includeHidden?: boolean }): Promise<MediaItem[]> {
    try {
      const url = new URL(apiUrl('/media'), window.location.origin);
      if (params) {
        Object.entries(params).forEach(([k, v]) => {
          if (v !== undefined && v !== 'all' && v !== 'ALL') {
            url.searchParams.append(k, String(v));
          }
        });
      }
      const res = await fetch(url.toString());
      if (res.ok) {
        const media: MediaItem[] = await res.json();
        if (Array.isArray(media) && media.length > 0) {
          localStorage.setItem(STORAGE_KEYS.MEDIA, JSON.stringify(media));
          return media;
        }
      }
    } catch {
      // Local fallback
    }

    let local: MediaItem[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.MEDIA) || JSON.stringify(INITIAL_MEDIA_ITEMS));

    // Hidden items should only appear if includeHidden is true
    if (!params?.includeHidden) {
      local = local.filter(m => m.published !== false);
    }

    if (params?.type && params.type !== 'ALL' && params.type !== 'all') {
      const isVideo = params.type.toLowerCase().startsWith('video');
      local = local.filter(m => isVideo ? m.type === 'video' : m.type === 'photo');
    }

    if (params?.category && params.category !== 'ALL' && params.category !== 'all') {
      local = local.filter(m => m.category.toUpperCase() === params.category!.toUpperCase());
    }

    if (params?.eventId && params.eventId !== 'ALL' && params.eventId !== 'all') {
      local = local.filter(m => m.eventId === params.eventId);
    }

    if (params?.featured) {
      local = local.filter(m => m.featured);
    }

    if (params?.search) {
      const q = params.search.toLowerCase();
      local = local.filter(m => 
        m.title.toLowerCase().includes(q) || 
        m.description.toLowerCase().includes(q) ||
        m.category.toLowerCase().includes(q) ||
        (m.eventTitle && m.eventTitle.toLowerCase().includes(q)) ||
        (m.location && m.location.toLowerCase().includes(q))
      );
    }

    // Default: Sort by createdAt DESC (LATEST FIRST)
    if (params?.sort === 'oldest') {
      local.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    } else if (params?.sort === 'title' || params?.sort === 'title_asc') {
      local.sort((a, b) => a.title.localeCompare(b.title));
    } else if (params?.sort === 'title_desc') {
      local.sort((a, b) => b.title.localeCompare(a.title));
    } else if (params?.sort === 'highlight') {
      local.sort((a, b) => (a.highlightOrder ?? 0) - (b.highlightOrder ?? 0));
    } else {
      local.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }

    return local;
  },

  async createMedia(mediaData: Partial<MediaItem>): Promise<MediaItem> {
    const now = new Date().toISOString();
    const primaryUrl = mediaData.url || (mediaData.photos && mediaData.photos.length > 0 ? mediaData.photos[0].url : '');
    const cover = mediaData.coverPhoto || primaryUrl;
    const thumb = mediaData.thumbnailUrl || cover;

    const payload: MediaItem = {
      id: `med-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      type: mediaData.type || 'photo',
      title: mediaData.title || 'COLORIDO 2K26 Festival Memory',
      category: (mediaData.category || 'CEREMONIES').toUpperCase(),
      eventId: mediaData.eventId || '',
      eventTitle: mediaData.eventTitle || '',
      url: primaryUrl,
      thumbnailUrl: thumb,
      coverPhoto: cover,
      photos: mediaData.photos || [],
      published: mediaData.published !== false,
      createdAt: mediaData.createdAt || now,
      updatedAt: now,
      featured: Boolean(mediaData.featured),
      highlightOrder: mediaData.highlightOrder || 0,
      description: mediaData.description || '',
      width: mediaData.width || 1920,
      height: mediaData.height || 1080,
      duration: mediaData.duration || null,
      aspectRatio: mediaData.aspectRatio || '16:9',
      focalPoint: mediaData.focalPoint || { x: 50, y: 50 },
      location: mediaData.location || 'R.V.R. & J.C. Campus',
      author: mediaData.author || 'Secretariat Media Cell',
    };

    try {
      const res = await fetch(apiUrl('/media'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const created = await res.json();
        const currentList = JSON.parse(localStorage.getItem(STORAGE_KEYS.MEDIA) || JSON.stringify(INITIAL_MEDIA_ITEMS));
        localStorage.setItem(STORAGE_KEYS.MEDIA, JSON.stringify([created, ...currentList]));
        return created;
      }
    } catch {
      // Offline fallback
    }

    const currentList = JSON.parse(localStorage.getItem(STORAGE_KEYS.MEDIA) || JSON.stringify(INITIAL_MEDIA_ITEMS));
    const updated = [payload, ...currentList];
    localStorage.setItem(STORAGE_KEYS.MEDIA, JSON.stringify(updated));
    return payload;
  },

  async togglePublishMedia(id: string, published?: boolean): Promise<MediaItem | null> {
    try {
      const res = await fetch(apiUrl(`/media/${id}/publish`), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ published }),
      });
      if (res.ok) {
        const updated = await res.json();
        const currentList: MediaItem[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.MEDIA) || '[]');
        const idx = currentList.findIndex(m => m.id === id);
        if (idx !== -1) {
          currentList[idx] = updated;
          localStorage.setItem(STORAGE_KEYS.MEDIA, JSON.stringify(currentList));
        }
        return updated;
      }
    } catch {
      // Offline
    }

    const currentList: MediaItem[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.MEDIA) || '[]');
    const idx = currentList.findIndex(m => m.id === id);
    if (idx !== -1) {
      currentList[idx].published = published !== undefined ? published : !currentList[idx].published;
      currentList[idx].updatedAt = new Date().toISOString();
      localStorage.setItem(STORAGE_KEYS.MEDIA, JSON.stringify(currentList));
      return currentList[idx];
    }
    return null;
  },

  async reorderHighlights(orders: { id: string; order: number }[]): Promise<MediaItem[]> {
    try {
      const res = await fetch(apiUrl('/media/reorder-highlights'), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orders }),
      });
      if (res.ok) {
        const updated = await res.json();
        return updated;
      }
    } catch {
      // Offline
    }

    const currentList: MediaItem[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.MEDIA) || '[]');
    orders.forEach(({ id, order }) => {
      const item = currentList.find(m => m.id === id);
      if (item) item.highlightOrder = order;
    });
    localStorage.setItem(STORAGE_KEYS.MEDIA, JSON.stringify(currentList));
    return currentList.filter(m => m.featured).sort((a, b) => (a.highlightOrder ?? 0) - (b.highlightOrder ?? 0));
  },

  async updateMedia(id: string, mediaData: Partial<MediaItem>): Promise<MediaItem | null> {
    try {
      const res = await fetch(apiUrl(`/media/${id}`), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mediaData),
      });
      if (res.ok) {
        const updated = await res.json();
        const currentList: MediaItem[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.MEDIA) || '[]');
        const idx = currentList.findIndex(m => m.id === id);
        if (idx !== -1) {
          currentList[idx] = updated;
          localStorage.setItem(STORAGE_KEYS.MEDIA, JSON.stringify(currentList));
        }
        return updated;
      }
    } catch {
      // Offline fallback
    }

    const currentList: MediaItem[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.MEDIA) || '[]');
    const idx = currentList.findIndex(m => m.id === id);
    if (idx !== -1) {
      currentList[idx] = { ...currentList[idx], ...mediaData, updatedAt: new Date().toISOString() };
      localStorage.setItem(STORAGE_KEYS.MEDIA, JSON.stringify(currentList));
      return currentList[idx];
    }
    return null;
  },

  async toggleFeaturedMedia(id: string, featured?: boolean): Promise<MediaItem | null> {
    try {
      const res = await fetch(apiUrl(`/media/${id}/featured`), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ featured }),
      });
      if (res.ok) {
        const updated = await res.json();
        const currentList: MediaItem[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.MEDIA) || '[]');
        const idx = currentList.findIndex(m => m.id === id);
        if (idx !== -1) {
          currentList[idx] = updated;
          localStorage.setItem(STORAGE_KEYS.MEDIA, JSON.stringify(currentList));
        }
        return updated;
      }
    } catch {
      // Offline
    }

    const currentList: MediaItem[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.MEDIA) || '[]');
    const idx = currentList.findIndex(m => m.id === id);
    if (idx !== -1) {
      currentList[idx].featured = featured !== undefined ? featured : !currentList[idx].featured;
      currentList[idx].updatedAt = new Date().toISOString();
      localStorage.setItem(STORAGE_KEYS.MEDIA, JSON.stringify(currentList));
      return currentList[idx];
    }
    return null;
  },

  async deleteMedia(id: string): Promise<boolean> {
    try {
      const res = await fetch(apiUrl(`/media/${id}`), { method: 'DELETE' });
      if (res.ok) {
        const currentList: MediaItem[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.MEDIA) || '[]');
        const filtered = currentList.filter(m => m.id !== id);
        localStorage.setItem(STORAGE_KEYS.MEDIA, JSON.stringify(filtered));
        return true;
      }
    } catch {
      // Offline
    }

    const currentList: MediaItem[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.MEDIA) || '[]');
    const filtered = currentList.filter(m => m.id !== id);
    localStorage.setItem(STORAGE_KEYS.MEDIA, JSON.stringify(filtered));
    return true;
  }
};
