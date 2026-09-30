import { useState, useEffect, useRef } from 'react';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { SearchModal } from './components/SearchModal';
import { EventDetailsModal } from './components/EventDetailsModal';
import { RegistrationWizard } from './components/RegistrationWizard';
import { HomePage } from './pages/HomePage';
import { AboutPage } from './pages/AboutPage';
import { SportsPage } from './pages/SportsPage';
import { CulturalPage } from './pages/CulturalPage';
import { SchedulePage } from './pages/SchedulePage';
import { VenuePage } from './pages/VenuePage';
import { ResultsPage } from './pages/ResultsPage';
import { DashboardPage } from './pages/DashboardPage';
import { AdminPage } from './pages/AdminPage';
import { LiveEventPage } from './pages/LiveEventPage';
import { GalleryPage } from './pages/GalleryPage';
import { NightFestivalTheme } from './components/nightFestival/NightFestivalTheme'; // COLORIDO 2K26 SITE-WIDE VISUAL THEME
import { FestivalRouteTransition, type FestivalRouteTransitionState } from './components/transitions/FestivalRouteTransition';
import { FestivalEntryExperience } from './components/transitions/FestivalEntryExperience';
import { FestivalPointerEffects } from './components/transitions/FestivalPointerEffects';
import { SeoManager } from './components/SeoManager';

import type { EventItem, Registration, Venue, EventResult, CollegeLeaderboard, UserProfile } from './types';
import { apiService, apiUrl } from './services/apiService';

const routeOrder: Record<string, number> = {
  home: 0, about: 1, sports: 2, cultural: 2, schedule: 3, venues: 3,
  gallery: 4, results: 5, dashboard: 6, live: 7, admin: 8,
};

const destinationWords: Record<string, string> = {
  home: 'ENTER', about: 'DISCOVER', sports: 'COMPETE', cultural: 'CREATE',
  schedule: 'PLAN', venues: 'GATHER', gallery: 'REMEMBER', results: 'RELIVE',
  dashboard: 'YOUR FESTIVAL', live: 'LIVE', admin: 'ADMIN',
};

const majorFestivalRoutes = new Set(['home', 'about', 'gallery', 'results']);

function pushRouteHistory(view: string, param?: string) {
  const nextUrl = new URL(window.location.href);
  if (view === 'live') {
    nextUrl.pathname = `/live/${encodeURIComponent(param || 'colorido-2k26-football')}`;
    nextUrl.search = '';
  } else {
    if (nextUrl.pathname.startsWith('/live/')) nextUrl.pathname = '/';
    if (view === 'home') nextUrl.searchParams.delete('view');
    else nextUrl.searchParams.set('view', view);
    if (param) nextUrl.searchParams.set('event', param);
    else nextUrl.searchParams.delete('event');
  }
  window.history.replaceState({ ...(window.history.state || {}), coloridoScroll: window.scrollY }, '', window.location.href);
  window.history.pushState({ coloridoRoute: { view, param }, coloridoScroll: 0 }, '', nextUrl);
}

export function App() {
  const [currentView, setCurrentView] = useState<string>('home');
  const [initialRouteResolved, setInitialRouteResolved] = useState(false);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [myRegistrations, setMyRegistrations] = useState<Registration[]>([]);
  const [allRegistrations, setAllRegistrations] = useState<Registration[]>([]);
  const [results, setResults] = useState<EventResult[]>([]);
  const [leaderboard, setLeaderboard] = useState<CollegeLeaderboard[]>([]);
  const [user, setUser] = useState<UserProfile>(apiService.getUserProfile());
  const [maintenanceMode, setMaintenanceMode] = useState<boolean>(false);
  const [routeTransition, setRouteTransition] = useState<FestivalRouteTransitionState | null>(null);
  const routeTransitionRef = useRef<FestivalRouteTransitionState | null>(null);
  const pendingRouteRef = useRef<{ view: string; param?: string; writeHistory?: boolean; historyPushed?: boolean; restoreScrollY?: number } | null>(null);
  const transitionTimersRef = useRef<number[]>([]);

  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [selectedEventSlug, setSelectedEventSlug] = useState<string | null>(null);
  const [selectedRegisterEvent, setSelectedRegisterEvent] = useState<EventItem | null>(null);
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [liveSlug, setLiveSlug] = useState<string | null>(null);

  const loadData = async () => {
    const [fetchedEvents, fetchedVenues, myRegs, allRegs, fetchedResults, fetchedBoard] = await Promise.all([
      apiService.getEvents(),
      apiService.getVenues(),
      apiService.getMyRegistrations(user.email),
      apiService.getAllRegistrations(),
      apiService.getResults(),
      apiService.getLeaderboard(),
    ]);

    setEvents(fetchedEvents);
    setVenues(fetchedVenues);
    setMyRegistrations(myRegs);
    setAllRegistrations(allRegs);
    setResults(fetchedResults);
    setLeaderboard(fetchedBoard);

    try {
      const setRes = await fetch(apiUrl('/settings')).then(r => r.json());
      if (setRes && typeof setRes.maintenanceMode === 'boolean') {
        setMaintenanceMode(setRes.maintenanceMode);
      }
    } catch { }
  };

  useEffect(() => {
    loadData();

    const path = window.location.pathname;
    if (path.startsWith('/live/')) {
      const slug = path.replace('/live/', '');
      if (slug) {
        setLiveSlug(slug);
        setCurrentView('live');
      }
    }

    const params = new URLSearchParams(window.location.search);
    const viewParam = params.get('view');
    const eventParam = params.get('event');

    if (viewParam) setCurrentView(viewParam);
    if (eventParam) setSelectedEventSlug(eventParam);
    setInitialRouteResolved(true);
  }, []);

  const navigateTo = (view: string, param?: string, writeHistory = true, restoreScrollY?: number) => {
    const activeTransition = routeTransitionRef.current;
    if (view === (activeTransition?.destination || currentView)) {
      if (view === 'live') setLiveSlug(param || selectedEventSlug || 'colorido-2k26-football');
      if (param && view !== 'live') setSelectedEventSlug(param);
      return;
    }

    // If another navigation happens mid-transition, commit its destination first.
    transitionTimersRef.current.forEach(window.clearTimeout);
    transitionTimersRef.current = [];
    if (activeTransition) {
      const pending = pendingRouteRef.current;
      if (pending) {
        if (pending.view === 'live') setLiveSlug(pending.param || selectedEventSlug || 'colorido-2k26-football');
        if (pending.param && pending.view !== 'live') setSelectedEventSlug(pending.param);
        setCurrentView(pending.view);
      }
    }

    const fromView = activeTransition?.destination || currentView;
    const admin = view === 'admin' || fromView === 'admin';
    const major = !admin && majorFestivalRoutes.has(view);
    const duration = admin ? 220 : major ? 820 : 540;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const device = navigator as Navigator & { deviceMemory?: number; connection?: { saveData?: boolean } };
    const motion = device.connection?.saveData ||
      (device.deviceMemory !== undefined && device.deviceMemory < 4) ||
      navigator.hardwareConcurrency <= 4 ||
      window.matchMedia('(pointer: coarse)').matches ? 'lite' : 'full';
    const commitDelay = reducedMotion ? 40 : Math.round(duration * 0.38);
    const transition: FestivalRouteTransitionState = {
      destination: view,
      word: destinationWords[view] || 'EXPLORE',
      direction: (routeOrder[view] ?? 0) >= (routeOrder[fromView] ?? 0) ? 'forward' : 'backward',
      duration: reducedMotion ? 160 : duration,
      phase: 'outgoing',
      major,
      admin,
      motion,
    };

    pendingRouteRef.current = { view, param, writeHistory, restoreScrollY };
    routeTransitionRef.current = transition;
    setRouteTransition(transition);

    transitionTimersRef.current.push(window.setTimeout(() => {
      const pending = pendingRouteRef.current;
      if (!pending) return;
      if (pending.writeHistory && !pending.historyPushed) {
        pushRouteHistory(pending.view, pending.param || (pending.view === 'live' ? selectedEventSlug || undefined : undefined));
        pending.historyPushed = true;
      }
      if (pending.view === 'live') setLiveSlug(pending.param || selectedEventSlug || 'colorido-2k26-football');
      if (pending.param && pending.view !== 'live') setSelectedEventSlug(pending.param);
      setCurrentView(pending.view);
      const incoming = { ...transition, phase: 'incoming' as const };
      routeTransitionRef.current = incoming;
      setRouteTransition(incoming);
      window.scrollTo({ top: pending.restoreScrollY ?? 0, behavior: pending.restoreScrollY === undefined && !reducedMotion ? 'smooth' : 'auto' });
    }, commitDelay));

    transitionTimersRef.current.push(window.setTimeout(() => {
      routeTransitionRef.current = null;
      pendingRouteRef.current = null;
      setRouteTransition(null);
      transitionTimersRef.current = [];
    }, transition.duration));
  };

  const handleNavigate = (view: string, param?: string) => navigateTo(view, param, true);

  useEffect(() => {
    const restoreRoute = (event: PopStateEvent) => {
      const saved = event.state?.coloridoRoute as { view?: unknown; param?: unknown } | undefined;
      let view = typeof saved?.view === 'string' && saved.view in routeOrder ? saved.view : '';
      let param = typeof saved?.param === 'string' ? saved.param : undefined;
      if (!view && window.location.pathname.startsWith('/live/')) {
        view = 'live';
        param = decodeURIComponent(window.location.pathname.slice('/live/'.length));
      }
      if (!view) {
        const params = new URLSearchParams(window.location.search);
        const requested = params.get('view');
        view = requested && requested in routeOrder ? requested : 'home';
        param = params.get('event') || undefined;
      }
      const savedScroll = event.state?.coloridoScroll;
      navigateTo(view, param, false, typeof savedScroll === 'number' ? savedScroll : 0);
    };
    window.addEventListener('popstate', restoreRoute);
    return () => window.removeEventListener('popstate', restoreRoute);
  }, [currentView, selectedEventSlug]);

  useEffect(() => () => transitionTimersRef.current.forEach(window.clearTimeout), []);

  useEffect(() => {
    const skipTransition = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || !routeTransitionRef.current) return;
      transitionTimersRef.current.forEach(window.clearTimeout);
      transitionTimersRef.current = [];
      const pending = pendingRouteRef.current;
      if (pending) {
        if (pending.writeHistory && !pending.historyPushed) pushRouteHistory(pending.view, pending.param || (pending.view === 'live' ? selectedEventSlug || undefined : undefined));
        if (pending.view === 'live') setLiveSlug(pending.param || selectedEventSlug || 'colorido-2k26-football');
        if (pending.param && pending.view !== 'live') setSelectedEventSlug(pending.param);
        setCurrentView(pending.view);
      }
      pendingRouteRef.current = null;
      routeTransitionRef.current = null;
      setRouteTransition(null);
    };
    window.addEventListener('keydown', skipTransition);
    return () => window.removeEventListener('keydown', skipTransition);
  }, [selectedEventSlug]);

  useEffect(() => {
    const finishHiddenTransition = () => {
      if (document.visibilityState !== 'hidden' || !routeTransitionRef.current) return;
      transitionTimersRef.current.forEach(window.clearTimeout);
      transitionTimersRef.current = [];
      const pending = pendingRouteRef.current;
      if (pending) {
        if (pending.writeHistory && !pending.historyPushed) pushRouteHistory(pending.view, pending.param || (pending.view === 'live' ? selectedEventSlug || undefined : undefined));
        if (pending.view === 'live') setLiveSlug(pending.param || selectedEventSlug || 'colorido-2k26-football');
        if (pending.param && pending.view !== 'live') setSelectedEventSlug(pending.param);
        setCurrentView(pending.view);
      }
      pendingRouteRef.current = null;
      routeTransitionRef.current = null;
      setRouteTransition(null);
    };
    document.addEventListener('visibilitychange', finishHiddenTransition);
    return () => document.removeEventListener('visibilitychange', finishHiddenTransition);
  }, [selectedEventSlug]);

  const handleOpenRegistration = (event: EventItem) => {
    setSelectedRegisterEvent(event);
    setIsRegisterOpen(true);
  };

  const handleQuickRegister = () => {
    setSelectedRegisterEvent(null);
    setIsRegisterOpen(true);
  };

  const handleUpdateUser = (updatedProfile: Partial<UserProfile>) => {
    const updated = apiService.updateUserProfile(updatedProfile);
    setUser(updated);
  };

  const activeModalEvent = events.find(e => e.slug === selectedEventSlug || e.id === selectedEventSlug || e.liveSlug === selectedEventSlug) || null;

  // MAINTENANCE MODE PUBLIC OVERLAY
  if (maintenanceMode && currentView !== 'admin') {
    return (
      <div className="nf-site-theme nf-maintenance-theme min-h-screen bg-[#FAF8F3] text-[#1C1917] flex flex-col justify-center items-center px-4 font-sans text-center space-y-6">
        <SeoManager view="home" events={events} selectedSlug={null} liveSlug={null} maintenanceMode />
        <NightFestivalTheme />
        <div className="w-20 h-20 rounded-full bg-[#800020] text-white flex items-center justify-center border-4 border-[#C5A059] shadow-2xl font-cinzel font-bold text-xl">
          RVJC
        </div>
        <div className="max-w-lg space-y-3">
          <span className="text-xs font-mono font-bold text-[#800020] uppercase tracking-widest block">
            FESTIVAL SECRETARIAT NOTICE
          </span>
          <h1 className="font-cinzel font-extrabold text-4xl text-[#1C1917]">
            COLORIDO <span className="text-[#800020]">2K26</span> UNDER MAINTENANCE
          </h1>
          <p className="text-xs text-[#6C665F] leading-relaxed">
            The public portal of R.V.R. &amp; J.C. College of Engineering's National Festival is currently undergoing scheduled maintenance by the Secretariat. Registrations will resume shortly.
          </p>
        </div>
        <button
          onClick={() => handleNavigate('admin')}
          className="px-6 py-2.5 rounded-full bg-[#1C1917] text-white text-xs font-mono font-bold uppercase tracking-wider shadow-md hover:bg-[#800020] transition-colors"
        >
          🔒 Admin Control Panel Access →
        </button>
      </div>
    );
  }

  return (
    <div className={`nf-site-theme ${currentView === 'admin' ? 'nf-admin-theme' : ''} min-h-screen bg-[#F5F2EB] text-[#1C1917] font-sans selection:bg-[#1C1917] selection:text-[#F5F2EB] flex flex-col`}>
      <SeoManager view={currentView} events={events} selectedSlug={selectedEventSlug} liveSlug={liveSlug} maintenanceMode={maintenanceMode} />
      <FestivalEntryExperience enabled={initialRouteResolved && currentView !== 'admin' && !maintenanceMode} />
      {/* COLORIDO 2K26 FESTIVAL THEME — shared atmosphere; crowd photo is homepage-only */}
      <NightFestivalTheme showCrowd={currentView === 'home'} />
      <FestivalPointerEffects enabled={currentView !== 'admin'} />

      {currentView !== 'admin' && (
        <Navbar
          currentView={currentView}
          onNavigate={handleNavigate}
          user={user}
          onOpenSearch={() => setIsSearchOpen(true)}
          onOpenQuickRegister={handleQuickRegister}
          events={events}
        />
      )}

      <main className="flex-1 festival-route-content" data-route-phase={routeTransition?.phase} data-route-destination={routeTransition?.destination} data-route-motion={routeTransition?.motion}>
        {currentView === 'home' && (
          <HomePage
            onNavigate={handleNavigate}
            events={events}
            onSelectEvent={(slug) => setSelectedEventSlug(slug)}
            onOpenQuickRegister={handleQuickRegister}
          />
        )}

        {currentView === 'about' && (
          <AboutPage
            onNavigate={handleNavigate}
            onOpenQuickRegister={handleQuickRegister}
            events={events}
          />
        )}

        {currentView === 'sports' && (
          <SportsPage
            events={events}
            onSelectEvent={(slug) => setSelectedEventSlug(slug)}
            onRegister={handleOpenRegistration}
          />
        )}

        {currentView === 'cultural' && (
          <CulturalPage
            events={events}
            onSelectEvent={(slug) => setSelectedEventSlug(slug)}
            onRegister={handleOpenRegistration}
          />
        )}

        {currentView === 'schedule' && (
          <SchedulePage
            events={events}
            myRegistrations={myRegistrations}
            onSelectEvent={(slug) => setSelectedEventSlug(slug)}
            onRegister={handleOpenRegistration}
          />
        )}

        {currentView === 'gallery' && (
          <GalleryPage
            onNavigate={handleNavigate}
            onOpenQuickRegister={handleQuickRegister}
          />
        )}

        {currentView === 'venues' && (
          <VenuePage
            onSelectEvent={(slug) => setSelectedEventSlug(slug)}
          />
        )}

        {currentView === 'results' && (
          <ResultsPage
            results={results}
            leaderboard={leaderboard}
            events={events}
            onSelectEvent={(slug) => setSelectedEventSlug(slug)}
          />
        )}

        {currentView === 'dashboard' && (
          <DashboardPage
            user={user}
            myRegistrations={myRegistrations}
            events={events}
            onUpdateUser={handleUpdateUser}
          />
        )}

        {currentView === 'admin' && (
          <AdminPage
            events={events}
            registrations={allRegistrations}
            venues={venues}
            onRefreshData={loadData}
            onNavigate={handleNavigate}
          />
        )}

        {currentView === 'live' && (
          <LiveEventPage
            slug={liveSlug || selectedEventSlug || 'colorido-2k26-football'}
            onBack={() => handleNavigate('schedule')}
          />
        )}
      </main>

      {currentView !== 'admin' && <Footer onNavigate={handleNavigate} />}

      <FestivalRouteTransition transition={routeTransition} />

      <SearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        events={events}
        onSelectEvent={(slug) => setSelectedEventSlug(slug)}
        onSelectVenue={() => handleNavigate('venues')}
      />

      {activeModalEvent && (
        <EventDetailsModal
          event={activeModalEvent}
          onClose={() => setSelectedEventSlug(null)}
          onOpenLiveScore={(slug) => {
            setSelectedEventSlug(null);
            handleNavigate('live', slug);
          }}
          onRegister={handleOpenRegistration}
        />
      )}

      <RegistrationWizard
        isOpen={isRegisterOpen}
        onClose={() => setIsRegisterOpen(false)}
        preSelectedEvent={selectedRegisterEvent}
        allEvents={events}
        user={user}
        onRegistrationComplete={() => loadData()}
      />
    </div>
  );
}

export default App;
