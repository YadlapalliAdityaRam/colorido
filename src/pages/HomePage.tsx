import React, { useState } from 'react';
import { Calendar, MapPin, Trophy, Users, Building, ArrowRight, Activity, Music, Layers, Radio, CheckCircle } from 'lucide-react';
import type { EventItem } from '../types';
import { GalleryLightboxModal } from '../components/GalleryLightboxModal';
import { getEventBanner } from '../utils/imageHelpers';
import { apiService } from '../services/apiService';
import './homeHero.css';
import { FestivalPassHome } from '../components/festivalPass/FestivalPass';

interface HomePageProps {
  onNavigate: (view: string, param?: string) => void;
  events: EventItem[];
  onSelectEvent: (slug: string) => void;
  onOpenQuickRegister?: () => void;
}

export const HomePage: React.FC<HomePageProps> = ({ onNavigate, events, onSelectEvent, onOpenQuickRegister }) => {
  const [activeDateTab, setActiveDateTab] = useState<'30 SEP' | '01 OCT' | '02 OCT'>('30 SEP');
  const [activeCategoryFilter, setActiveCategoryFilter] = useState<'All' | 'Sports' | 'Cultural'>('All');
  const [festivalPassOpen, setFestivalPassOpen] = useState(false);

  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [galleryPhotos, setGalleryPhotos] = useState<Array<{ title: string; image: string }>>([]);

  const videoRef = React.useRef<HTMLVideoElement>(null);

  React.useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = 0.8;
      videoRef.current.muted = true;
      videoRef.current.volume = 0;
    }
  }, []);

  React.useEffect(() => {
    let active = true;
    apiService.getMedia({ sort: 'latest' }).then((media) => {
      if (!active) return;
      const publishedPhotos = media
        .filter((item) => item.type === 'photo' && item.published !== false)
        .sort((a, b) => Number(b.featured) - Number(a.featured));
      setGalleryPhotos(publishedPhotos.slice(0, 6).map((item) => ({
        title: item.title,
        image: item.coverPhoto || item.thumbnailUrl || item.url,
      })));
    }).catch(() => { /* Keep the curated gallery fallback below. */ });
    return () => { active = false; };
  }, []);

  // Dynamic Event Highlights from real MongoDB database
  const eventHighlights = (events && events.length > 0)
    ? events.slice(0, 4).map(e => ({
      id: e.id,
      slug: e.slug || e.id,
      title: e.title,
      date: e.dateTime.includes('·') ? e.dateTime.split('·')[0].trim() : '30 SEP',
      time: e.dateTime.includes('·') ? e.dateTime.split('·')[1].trim() : e.dateTime,
      location: e.venueName,
      image: getEventBanner(e),
      category: e.type,
    }))
    : [
      {
        id: 'football-championship',
        slug: 'football-championship',
        title: 'Football',
        date: '30 SEP',
        time: '09:00 AM',
        location: 'Main Ground',
        image: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&w=800&q=85',
        category: 'sports',
      },
    ];

  // ─── SCHEDULE PREVIEW: 100% real-time from MongoDB database ──────────────────
  // Map activeDateTab labels to actual date strings for comparison
  const dateLabelMap: Record<string, string[]> = {
    '30 SEP': ['2026-09-30', '30 sep', '30 september', 'sep 30', 'september 30'],
    '01 OCT': ['2026-10-01', '01 oct', '1 oct', '01 october', '1 october', 'oct 01', 'oct 1'],
    '02 OCT': ['2026-10-02', '02 oct', '2 oct', '02 october', '2 october', 'oct 02', 'oct 2'],
  };

  const getEventStatusBadge = (evt: EventItem) => {
    if (evt.liveEnabled || evt.status === 'ongoing') {
      return (
        <span className="flex items-center space-x-1 px-2 py-0.5 rounded bg-rose-600 text-white text-[10px] font-bold uppercase animate-pulse">
          <Radio className="w-3 h-3" /><span>LIVE</span>
        </span>
      );
    }
    if (evt.status === 'completed') {
      return (
        <span className="flex items-center space-x-1 px-2 py-0.5 rounded bg-gray-700 text-white text-[10px] font-bold uppercase">
          <CheckCircle className="w-3 h-3" /><span>Done</span>
        </span>
      );
    }
    if (evt.seatsTotal && evt.seatsLeft <= 0) {
      return <span className="px-2 py-0.5 rounded bg-amber-700 text-white text-[10px] font-bold uppercase">Full</span>;
    }
    return <span className="px-2 py-0.5 rounded bg-emerald-700 text-white text-[10px] font-bold uppercase">Open</span>;
  };

  const filteredSchedule = events.filter((evt) => {
    // Match date tab
    const rawDate = (evt.eventDate || evt.dateTime || '').toLowerCase();
    const tabMatches = dateLabelMap[activeDateTab]?.some(label => rawDate.includes(label));
    if (!tabMatches) return false;
    // Match category
    if (activeCategoryFilter === 'Sports' && evt.type !== 'sports') return false;
    if (activeCategoryFilter === 'Cultural' && evt.type !== 'cultural') return false;
    return true;
  }).sort((a, b) => {
    // Sort by start time ascending
    const timeA = a.startTime || a.dateTime?.split('·')[1]?.trim() || '00:00 AM';
    const timeB = b.startTime || b.dateTime?.split('·')[1]?.trim() || '00:00 AM';
    return timeA.localeCompare(timeB);
  });

  // Glimpses photo gallery
  const galleryGlimpses = [
    {
      title: 'Pro Football Matches',
      image: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&w=800&q=85',
    },
    {
      title: 'Bharatanatyam & Garba Dance',
      image: 'https://images.unsplash.com/photo-1547153760-18fc86324498?auto=format&fit=crop&w=800&q=85',
    },
    {
      title: 'Star Singer Concert Spotlight',
      image: 'https://images.unsplash.com/photo-1465847899084-d164df4dedc6?auto=format&fit=crop&w=800&q=85',
    },
    {
      title: 'High-Energy Street Dance Battles',
      image: 'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?auto=format&fit=crop&w=800&q=85',
    },
    {
      title: 'Indoor Basketball League Final',
      image: 'https://images.unsplash.com/photo-1546519638-68e109498ffc?auto=format&fit=crop&w=800&q=85',
    },
    {
      title: 'Sangeet Fusion Live Jam',
      image: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?auto=format&fit=crop&w=800&q=85',
    },
  ];
  const displayedGalleryGlimpses = galleryPhotos.length > 0 ? galleryPhotos : galleryGlimpses;

  const handleOpenLightbox = (index: number) => {
    setLightboxIndex(index);
    setIsLightboxOpen(true);
  };

  return (
    <div
      className="nf-home-theme w-full min-h-screen text-[#FAF8F3] pb-28 font-sans selection:bg-[#800020] selection:text-white bg-cover bg-center bg-fixed transition-all duration-700 relative"
    >

      {/* Stacking wrapper so atmosphere stays behind existing Home content */}
      <div className="relative z-[20]">

      {/* ─── COLORIDO 2K26 FESTIVAL IDENTITY BANNER ─────────────────────── */}
      {/* Below navigation, above video. Full-bleed — no boxed widget.      */}
      <section className="w-full bg-[#0D0B10]">

        {/* Full-bleed festival poster — the centerpiece */}
        <div
          className="relative isolate w-full cursor-pointer overflow-hidden bg-[#0D0B10]"
          onClick={() => onNavigate('schedule')}
          title="Explore COLORIDO 2K26 Events"
        >
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 scale-110 bg-cover bg-center opacity-55 blur-xl"
            style={{ backgroundImage: "linear-gradient(rgba(5, 9, 22, .42), rgba(5, 9, 22, .58)), url('/colorido_original.png')" }}
          />
          <img
            src="/colorido_original.png"
            alt="COLORIDO 2K26 — RVR &amp; JC College of Engineering National Fest"
            className="relative z-10 mx-auto block h-auto w-full object-contain sm:max-h-[85vh] sm:w-auto sm:max-w-full"
            loading="eager"
          />
          {/* Bottom fade so it flows into the section below */}
          <div className="absolute bottom-0 inset-x-0 h-5 bg-gradient-to-t from-[#0D0B10] to-transparent pointer-events-none sm:h-20" />
        </div>

        {/* Simple domain navigation strip — clean, no clutter */}
        <div className="border-t border-white/8 px-5 sm:px-8 py-3 flex flex-col sm:flex-row items-center justify-between gap-3">
          <nav className="flex items-center divide-x divide-white/10 text-[11px] font-mono tracking-widest uppercase">
            <button onClick={() => onNavigate('cultural')} className="pr-4 text-white/55 hover:text-amber-300 transition-colors cursor-pointer">Cultural</button>
            <button onClick={() => onNavigate('sports')} className="px-4 text-white/55 hover:text-rose-300 transition-colors cursor-pointer">Sports</button>
          </nav>
        </div>

      </section>

      {/* 1. HERO VIDEO SECTION */}
      <section id="home-video-section" className="home-video-hero relative flex h-[100svh] w-full items-center overflow-hidden bg-[#080b12]">
        <video
          ref={videoRef}
          autoPlay
          loop
          muted
          playsInline
          onLoadedMetadata={(e) => { e.currentTarget.playbackRate = 0.8; e.currentTarget.muted = true; }}
          onPlay={(e) => { e.currentTarget.playbackRate = 0.8; e.currentTarget.muted = true; }}
          poster="/rvr_college_hero.jpg"
          className="home-hero-video absolute inset-0 h-full w-full object-cover"
        >
          <source src="/video1.mp4" type="video/mp4" />
          <source src="/video1" type="video/mp4" />
          Your browser does not support HTML5 video.
        </video>

        <div className="home-video-grade pointer-events-none absolute inset-0" aria-hidden="true" />
        <div className="home-video-atmosphere pointer-events-none absolute inset-0" aria-hidden="true" />

        <div className="relative z-10 mx-auto w-full max-w-7xl px-5 py-10 sm:px-8 sm:py-20 md:px-12">
          <div className="max-w-3xl text-left">
            <a href="https://rvrjcce.ac.in" target="_blank" rel="noreferrer" className="mb-6 inline-flex min-h-12 items-center gap-3 rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#E2BF76] focus-visible:outline-offset-4 sm:mb-12">
              <img src="/rvrjc_logo.png" alt="R.V.R. & J.C. College of Engineering emblem" className="h-12 w-12 rounded-full bg-white p-1 object-contain shadow-md sm:h-14 sm:w-14" />
              <span className="flex flex-col border-l border-white/35 pl-3">
                <span className="font-cinzel text-[11px] font-semibold uppercase tracking-[0.12em] text-white sm:text-sm">R.V.R. &amp; J.C.</span>
                <span className="text-[10px] uppercase tracking-[0.13em] text-white/75 sm:text-xs">College of Engineering</span>
                <span className="mt-0.5 font-cinzel text-[9px] font-bold uppercase tracking-[0.28em] text-[#e9c078]">Fest</span>
              </span>
            </a>
            <p className="mb-3 font-mono text-[10px] font-semibold uppercase tracking-[0.3em] text-white/75 sm:text-xs">National level · R.V.R. &amp; J.C.</p>
            <h1 className="festival-title-reveal font-cinzel text-[clamp(2.6rem,10vw,7.5rem)] font-bold leading-[0.88] tracking-[0.015em] text-white drop-shadow-[0_3px_22px_rgba(0,0,0,.35)]">COLORIDO</h1>
            <p className="mt-3 font-cinzel text-2xl font-medium tracking-[0.32em] text-[#f2d4a1] sm:mt-4 sm:text-4xl">2K26</p>
            <p className="mt-5 max-w-xl text-[10px] font-semibold uppercase tracking-[0.15em] text-white/90 sm:text-xs sm:tracking-[0.22em]">Cultural <span className="px-1.5 text-[#f2b38a]">•</span> Sports <span className="px-1.5 text-[#f2b38a]">•</span> Technical <span className="px-1.5 text-[#f2b38a]">•</span> Literary</p>
            <p className="mt-4 max-w-lg text-sm leading-relaxed text-white/85 drop-shadow-sm sm:text-base">A national celebration of competition, creativity and campus spirit.</p>
            <div className="mt-7 flex flex-wrap items-center gap-3 sm:mt-9">
              <button onClick={() => setFestivalPassOpen(true)} className="festival-sheen festival-magnetic inline-flex min-h-12 items-center justify-center gap-2 bg-[#a30e2c] px-5 text-xs font-bold uppercase tracking-[0.12em] text-white shadow-lg transition-colors hover:bg-[#bd1638] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white sm:px-6">Explore Events<ArrowRight className="relative z-[1] h-4 w-4" /></button>
              <button onClick={onOpenQuickRegister} className="festival-sheen festival-magnetic inline-flex min-h-12 items-center justify-center border border-white/60 bg-[#08101c]/25 px-5 text-xs font-bold uppercase tracking-[0.12em] text-white transition-colors hover:border-white hover:bg-[#08101c]/55 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white sm:px-6">Register Now</button>
            </div>
          </div>
        </div>
      </section>

      {/* 2. AUTHENTIC FESTIVAL METRICS STRIP */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-black/55 backdrop-blur-md border border-white/15 rounded-xl p-6 grid grid-cols-2 md:grid-cols-4 gap-6 text-center shadow-lg">

          <div className="space-y-1 border-r border-white/10 last:border-r-0">
            <div className="flex justify-center mb-1 text-[#C5A059]">
              <Trophy className="w-5 h-5" />
            </div>
            <span className="font-cinzel font-extrabold text-2xl sm:text-3xl text-white block">12+</span>
            <span className="text-[11px] font-sans font-semibold text-white/60 uppercase tracking-wider">Sports Competitions</span>
          </div>

          <div className="space-y-1 border-r border-white/10 last:border-r-0">
            <div className="flex justify-center mb-1 text-[#E8B4B8]">
              <Layers className="w-5 h-5" />
            </div>
            <span className="font-cinzel font-extrabold text-2xl sm:text-3xl text-white block">18+</span>
            <span className="text-[11px] font-sans font-semibold text-white/60 uppercase tracking-wider">Cultural Events</span>
          </div>

          <div className="space-y-1 border-r border-white/10 last:border-r-0">
            <div className="flex justify-center mb-1 text-[#C5A059]">
              <Calendar className="w-5 h-5" />
            </div>
            <span className="font-cinzel font-extrabold text-2xl sm:text-3xl text-white block">3 Days</span>
            <span className="text-[11px] font-sans font-semibold text-white/60 uppercase tracking-wider">Festival Duration</span>
          </div>

          <div className="space-y-1">
            <div className="flex justify-center mb-1 text-[#E8B4B8]">
              <Building className="w-5 h-5" />
            </div>
            <span className="font-cinzel font-extrabold text-2xl sm:text-3xl text-white block">RVR &amp; JC</span>
            <span className="text-[11px] font-sans font-semibold text-white/60 uppercase tracking-wider">Host Campus</span>
          </div>

        </div>
      </section>

      {/* 3. EXPLORE COMPETITIONS SECTION */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div>
          <h2 className="font-cinzel font-extrabold text-2xl sm:text-3xl text-white drop-shadow-md">
            EXPLORE <span className="text-[#C5A059]">COMPETITIONS</span>
          </h2>
          <p className="text-xs font-sans text-white/65 mt-1">
            National inter-college sports championships and cultural showcases.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 festival-stagger">

          {/* Card 1: Sports Competitions */}
          <div
            onClick={() => onNavigate('sports')}
            className="group cursor-pointer rounded-xl overflow-hidden border border-white/15 bg-black/50 shadow-lg hover:border-[#C5A059]/50 transition-all relative flex flex-col justify-between"
          >
            <div className="relative h-60 w-full overflow-hidden bg-[#1C1917]">
              <img
                src="https://images.unsplash.com/photo-1517649763962-0c623266ddc0?auto=format&fit=crop&w=800&q=85"
                alt="Sports Competitions"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-95"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />

              <div className="absolute bottom-4 left-4 w-10 h-10 rounded-lg bg-[#800020] text-white flex items-center justify-center shadow-md">
                <Activity className="w-5 h-5" />
              </div>
            </div>

            <div className="p-5 bg-black/70 space-y-2 relative flex items-center justify-between">
              <div className="space-y-1">
                <h3 className="font-cinzel font-bold text-xl text-white group-hover:text-[#C5A059] transition-colors">
                  SPORTS COMPETITIONS
                </h3>
                <p className="text-xs text-white/60">Football • Cricket • Kabaddi • Basketball • Athletics</p>
              </div>

              <div className="w-9 h-9 rounded-lg border border-white/20 text-white group-hover:bg-[#800020] group-hover:border-[#800020] flex items-center justify-center transition-colors shrink-0">
                <ArrowRight className="w-4 h-4" />
              </div>
            </div>
          </div>

          {/* Card 2: Cultural Events */}
          <div
            onClick={() => onNavigate('cultural')}
            className="group cursor-pointer rounded-xl overflow-hidden border border-white/15 bg-black/50 shadow-lg hover:border-[#C5A059]/50 transition-all relative flex flex-col justify-between"
          >
            <div className="relative h-60 w-full overflow-hidden bg-[#1C1917]">
              <img
                src="https://images.unsplash.com/photo-1547153760-18fc86324498?auto=format&fit=crop&w=800&q=85"
                alt="Cultural Events"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-95"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />

              <div className="absolute bottom-4 left-4 w-10 h-10 rounded-lg bg-[#C5A059] text-white flex items-center justify-center shadow-md">
                <Music className="w-5 h-5" />
              </div>
            </div>

            <div className="p-5 bg-black/70 space-y-2 relative flex items-center justify-between">
              <div className="space-y-1">
                <h3 className="font-cinzel font-bold text-xl text-white group-hover:text-[#C5A059] transition-colors">
                  CULTURAL EVENTS
                </h3>
                <p className="text-xs text-white/60">Classical Dance • Solo Singing • Drama • Battle of Bands</p>
              </div>

              <div className="w-9 h-9 rounded-lg border border-white/20 text-white group-hover:bg-[#800020] group-hover:border-[#800020] flex items-center justify-center transition-colors shrink-0">
                <ArrowRight className="w-4 h-4" />
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* 4. EVENT HIGHLIGHTS SECTION */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-cinzel font-extrabold text-3xl sm:text-4xl text-white drop-shadow-md">
              EVENT <span className="text-[#C5A059]">HIGHLIGHTS</span>
            </h2>
          </div>
          <button
            onClick={() => onNavigate('sports')}
            className="text-xs font-bold text-[#C5A059] hover:underline uppercase tracking-wider flex items-center space-x-1"
          >
            <span>View All Events</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 festival-stagger">
          {eventHighlights.map((event) => (
            <div
              key={event.id}
              onClick={() => onSelectEvent(event.slug)}
              className="bg-black/55 backdrop-blur-md border border-white/15 rounded-2xl overflow-hidden shadow-lg hover:border-[#C5A059]/50 transition-all cursor-pointer group"
            >
              <div className="relative h-44 w-full bg-[#1C1917] overflow-hidden">
                <img
                  src={event.image}
                  alt={event.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
              </div>

              <div className="p-4 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="bg-white/10 border border-white/15 px-2.5 py-1 rounded-lg text-center font-mono">
                    <span className="font-bold text-xs text-[#C5A059] block leading-none">30</span>
                    <span className="text-[9px] text-white/55 uppercase block">SEP</span>
                  </div>

                  <div>
                    <h4 className="font-cinzel font-bold text-base text-white group-hover:text-[#C5A059] transition-colors">
                      {event.title}
                    </h4>
                    <p className="text-[11px] font-sans text-white/60">
                      {event.time} | {event.location}
                    </p>
                  </div>
                </div>

                <div className="w-8 h-8 rounded-full border border-white/20 text-white group-hover:bg-[#800020] group-hover:border-[#800020] flex items-center justify-center transition-colors shrink-0">
                  <ArrowRight className="w-3.5 h-3.5" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 5. SCHEDULE PREVIEW SECTION — 100% real-time from database */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-cinzel font-extrabold text-3xl sm:text-4xl text-white drop-shadow-md">
              SCHEDULE <span className="text-[#C5A059]">PREVIEW</span>
            </h2>
            <p className="text-[11px] text-white/55 mt-0.5 font-mono uppercase tracking-wider">
              Live · {events.length} events from database
            </p>
          </div>
          <button
            onClick={() => onNavigate('schedule')}
            className="text-xs font-bold text-[#C5A059] hover:underline uppercase tracking-wider flex items-center space-x-1"
          >
            <span>View Full Schedule</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Date Tabs & Category Filter Controls */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/15 pb-3">
          {/* Date Tabs */}
          <div className="flex items-center space-x-2">
            {(['30 SEP', '01 OCT', '02 OCT'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveDateTab(tab)}
                className={`px-4 py-2 rounded-lg text-xs font-bold font-mono transition-colors ${activeDateTab === tab
                    ? 'bg-[#800020] text-white shadow-sm'
                    : 'bg-white/10 text-white/65 hover:text-white'
                  }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Category Filter Pills */}
          <div className="flex items-center space-x-2">
            {(['All', 'Sports', 'Cultural'] as const).map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategoryFilter(cat)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${activeCategoryFilter === cat
                    ? 'bg-white text-[#1C1917]'
                    : 'bg-transparent border border-white/20 text-white/65 hover:text-white'
                  }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Schedule Rows — Real Event Data */}
        <div className="space-y-3">
          {events.length === 0 ? (
            <div className="p-8 text-center space-y-2 bg-black/50 rounded-xl border border-white/10">
              <Calendar className="w-8 h-8 text-white/50 mx-auto opacity-50" />
              <p className="text-xs text-white/70 font-semibold">No events in database yet.</p>
              <p className="text-[11px] text-white/50">Admin can create events from the Control Panel.</p>
            </div>
          ) : filteredSchedule.length === 0 ? (
            <div className="p-8 text-center space-y-2 bg-black/50 rounded-xl border border-white/10">
              <Calendar className="w-8 h-8 text-white/50 mx-auto opacity-50" />
              <p className="text-xs text-white/70 font-semibold">No events scheduled for {activeDateTab}.</p>
              <p className="text-[11px] text-white/50">Try another date tab or check back after admin creates more events.</p>
            </div>
          ) : (
            filteredSchedule.map((evt) => (
              <div
                key={evt.id}
                onClick={() => onSelectEvent(evt.slug || evt.id)}
                className="bg-black/50 hover:bg-black/70 border border-white/10 hover:border-[#C5A059]/60 p-4 rounded-xl flex items-center justify-between cursor-pointer transition-all backdrop-blur-md group"
              >
                {/* Left: time + icon + title */}
                <div className="flex items-center space-x-4 sm:space-x-8 min-w-0">
                  {/* Time */}
                  <div className="flex-shrink-0 flex flex-col items-center min-w-[60px]">
                    <span className="font-mono font-bold text-xs sm:text-sm text-white leading-none">
                      {evt.startTime || evt.dateTime?.split('·')[1]?.trim() || '—'}
                    </span>
                    {evt.endTime && (
                      <span className="font-mono text-[10px] text-white/50 leading-none mt-0.5">
                        – {evt.endTime}
                      </span>
                    )}
                  </div>

                  {/* Icon + Title */}
                  <div className="flex items-center space-x-3 min-w-0">
                    <div className={`p-2 rounded-full border flex-shrink-0 ${evt.type === 'sports'
                        ? 'bg-white/10 border-white/20 text-[#E8B4B8]'
                        : 'bg-white/10 border-white/20 text-[#C5A059]'
                      }`}>
                      {evt.type === 'sports'
                        ? <Activity className="w-4 h-4" />
                        : <Music className="w-4 h-4" />
                      }
                    </div>

                    <div className="min-w-0">
                      <span className="font-cinzel font-bold text-sm sm:text-base text-white block truncate group-hover:text-[#C5A059] transition-colors">
                        {evt.title}
                      </span>
                      <div className="flex items-center space-x-2 mt-0.5">
                        <span className={`text-[10px] font-mono font-bold uppercase px-1.5 py-0.5 rounded ${evt.type === 'sports' ? 'text-[#E8B4B8] bg-[#800020]/30' : 'text-[#C5A059] bg-[#C5A059]/15'
                          }`}>
                          {evt.category}
                        </span>
                        <span className="flex items-center space-x-1 text-[10px] text-white/55 sm:hidden">
                          <MapPin className="w-3 h-3 text-[#C5A059]" />
                          <span className="truncate max-w-[80px]">{evt.venueName}</span>
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right: venue + status + arrow */}
                <div className="flex items-center space-x-3 flex-shrink-0 ml-3">
                  <div className="hidden sm:flex items-center space-x-1.5 text-xs text-white/60">
                    <MapPin className="w-3.5 h-3.5 text-[#C5A059]" />
                    <span className="max-w-[120px] truncate">{evt.venueName}</span>
                  </div>

                  {getEventStatusBadge(evt)}

                  <div className="w-8 h-8 rounded-full border border-white/20 flex items-center justify-center text-white group-hover:bg-[#800020] group-hover:border-[#800020] transition-colors">
                    <ArrowRight className="w-3.5 h-3.5" />
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      {/* 6. FESTIVAL INTRODUCTION SECTION (FULL BLEED EDGE-TO-EDGE WITH CAMPUS PHOTO) */}
      <section className="relative w-full py-16 sm:py-20 bg-[#1C1917] overflow-hidden my-8">
        {/* Full Bleed Background Campus Image */}
        <img
          src="/rvr_college_hero.jpg"
          alt="R.V.R. & J.C. College Campus"
          className="absolute inset-0 w-full h-full object-cover opacity-35"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/70 to-black/30" />

        <div className="max-w-7xl mx-auto px-6 lg:px-12 relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">

          <div className="lg:col-span-7 space-y-6">
            <h2 className="font-cinzel font-extrabold text-3xl sm:text-5xl text-white leading-tight">
              A FESTIVAL <br />
              BY THE STUDENTS, <br />
              FOR A BRIGHTER <span className="text-[#C5A059]">TOMORROW</span>
            </h2>

            <p className="text-xs sm:text-sm text-white/70 leading-relaxed font-sans max-w-xl">
              COLORIDO 2K26 is a celebration of talent, teamwork and togetherness, bringing students from across the nation to compete, create and connect at R.V.R. &amp; J.C. College of Engineering.
            </p>

            <button
              onClick={() => onNavigate('about')}
              className="px-7 py-3 rounded-lg bg-[#800020] hover:bg-[#660019] text-white font-bold text-xs uppercase tracking-wider shadow-sm transition-all inline-flex items-center space-x-2 border border-[#C5A059]/40"
            >
              <span>About RVR &amp; JC Festival</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {/* Right Floating White Feature Cards */}
          <div className="lg:col-span-5 space-y-3">
            <div className="bg-black/60 backdrop-blur-md border border-white/15 p-4 rounded-xl flex items-center space-x-4 shadow-sm">
              <div className="p-2.5 rounded-lg bg-white/10 text-[#C5A059]">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-cinzel font-bold text-sm text-white">Inter-College Delegation</h4>
                <p className="text-xs text-white/60">Connect with student teams statewide</p>
              </div>
            </div>

            <div className="bg-black/60 backdrop-blur-md border border-white/15 p-4 rounded-xl flex items-center space-x-4 shadow-sm">
              <div className="p-2.5 rounded-lg bg-white/10 text-[#E8B4B8]">
                <Trophy className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-cinzel font-bold text-sm text-white">National Championship</h4>
                <p className="text-xs text-white/60">Compete in 30+ official events</p>
              </div>
            </div>

            <div className="bg-black/60 backdrop-blur-md border border-white/15 p-4 rounded-xl flex items-center space-x-4 shadow-sm">
              <div className="p-2.5 rounded-lg bg-white/10 text-[#C5A059]">
                <Building className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-cinzel font-bold text-sm text-white">Autonomous Campus Host</h4>
                <p className="text-xs text-white/60">State-of-the-art sports complex &amp; auditoriums</p>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* 7. GLIMPSES FROM COLORIDO GALLERY */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-cinzel font-extrabold text-3xl sm:text-4xl text-white drop-shadow-md">
              GLIMPSES FROM <span className="text-[#C5A059]">COLORIDO</span>
            </h2>
          </div>
          <button
            onClick={() => onNavigate('gallery')}
            className="text-xs font-bold text-[#C5A059] hover:underline uppercase tracking-wider flex items-center space-x-1"
          >
            <span>View Gallery</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 festival-stagger">
          {displayedGalleryGlimpses.map((item, idx) => (
            <div
              key={idx}
              onClick={() => handleOpenLightbox(idx)}
              className="group relative h-40 rounded-2xl overflow-hidden border border-white/15 cursor-pointer shadow-lg hover:border-[#C5A059]/50 transition-all"
            >
              <img
                src={item.image}
                alt={item.title}
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-colors" />
              <div className="absolute bottom-2 left-2 right-2 text-white">
                <p className="text-[10px] font-semibold font-sans truncate">{item.title}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      </div>
      <FestivalPassHome open={festivalPassOpen} onOpenChange={setFestivalPassOpen} events={events} onSelectEvent={onSelectEvent} />

      {/* Modals */}
      <GalleryLightboxModal
        isOpen={isLightboxOpen}
        onClose={() => setIsLightboxOpen(false)}
        items={displayedGalleryGlimpses}
        currentIndex={lightboxIndex}
        onSelectIndex={(index) => setLightboxIndex(index)}
      />

    </div>
  );
};

export default HomePage;
