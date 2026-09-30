import React, { useState, useEffect, useRef } from 'react';
import { flushSync } from 'react-dom';
import {
  Sparkles, Layers, Grid, Film, Image as ImageIcon, ArrowDown,
  Search, RefreshCw, VolumeX
} from 'lucide-react';
import type { MediaItem, MediaCategory, MediaFilterType } from '../types';
import { apiService } from '../services/apiService';
import { MemoryCardStack } from '../components/MemoryCardStack';
import { ColoridoHighlights } from '../components/ColoridoHighlights';
import { GalleryLightbox } from '../components/GalleryLightbox';
import { FestivalPassGallery } from '../components/festivalPass/FestivalPass';
import { runSharedViewTransition } from '../components/transitions/sharedTransition';

interface GalleryPageProps {
  onNavigate: (view: string, param?: string) => void;
  onOpenQuickRegister?: () => void;
}

const CATEGORIES: MediaCategory[] = [
  'ALL',
  'SPORTS',
  'CULTURAL',
  'PERFORMANCES',
  'CAMPUS',
  'CEREMONIES',
  'AWARDS',
  'CANDID',
  'STUDENTS',
];

interface MasonryGalleryCardProps {
  item: MediaItem;
  idx: number;
  onOpen: () => void;
  isSharedSource?: boolean;
}

const MasonryGalleryCard: React.FC<MasonryGalleryCardProps> = ({ item, onOpen, isSharedSource = false }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const hasDimensions = Boolean(item.width && item.height && item.width > 0 && item.height > 0);
  const isVideo = item.type === 'video';


  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.muted = true;
    }
  }, []);

  const handleMouseEnter = () => {
    setIsHovered(true);
    if (!isVideo || !videoRef.current) return;
    try {
      videoRef.current.currentTime = 0;
      const playPromise = videoRef.current.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => setIsPlaying(true))
          .catch(() => { /* Autoplay interrupted */ });
      }
    } catch { /* Ignored */ }
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    if (!isVideo || !videoRef.current) return;
    try {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
    } catch { /* Ignored */ }
    setIsPlaying(false);
  };

  return (
    <div
      onClick={onOpen}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={{
        boxShadow: isHovered
          ? '0 8px 32px rgba(0,0,0,0.22), 0 2px 8px rgba(0,0,0,0.14)'
          : '0 1px 4px rgba(0,0,0,0.08)',
        transition: 'box-shadow 220ms cubic-bezier(0.25, 0.46, 0.45, 0.94)',
      }}
      className="break-inside-avoid mb-5 relative overflow-hidden bg-white cursor-pointer flex flex-col"
    >
      {/* Photographic frame — clean, deliberate border like a darkroom print */}
      <div className="absolute inset-0 border border-stone-200 pointer-events-none z-20" />

      {/* Image / Video Area */}
      <div className="relative w-full overflow-hidden bg-stone-950 flex items-center justify-center">

        {/* Thumbnail / Cover */}
        <img
          src={item.coverPhoto || item.thumbnailUrl || item.url}
          alt={item.title}
          loading="lazy"
          className={`w-full h-auto block object-contain ${
            isVideo && isPlaying ? 'opacity-0' : 'opacity-100'
          }`}
          style={{
            transition: 'opacity 180ms linear, transform 380ms cubic-bezier(0.33, 1, 0.68, 1)',
            transform: isPlaying ? 'scale(1)' : undefined,
            aspectRatio: hasDimensions ? `${item.width} / ${item.height}` : undefined,
            objectPosition: item.focalPoint ? `${item.focalPoint.x}% ${item.focalPoint.y}%` : 'center',
            viewTransitionName: isSharedSource ? 'festival-selected-media' : undefined,
          }}
        />

        {/* Video playback element */}
        {isVideo && (
          <video
            ref={videoRef}
            src={item.url}
            poster={item.coverPhoto || item.thumbnailUrl}
            muted
            loop
            playsInline
            preload="metadata"
            className="absolute inset-0 w-full h-full object-cover"
            style={{
              opacity: isPlaying ? 1 : 0,
              transition: 'opacity 220ms linear',
              zIndex: isPlaying ? 5 : -1,
              pointerEvents: isPlaying ? 'auto' : 'none',
              aspectRatio: hasDimensions ? `${item.width} / ${item.height}` : undefined,
            }}
          />
        )}

        {/* Scrim — lighter on photos, heavier on videos */}
        <div
          className="absolute inset-0 pointer-events-none z-10"
          style={{
            background: isVideo
              ? 'linear-gradient(to top, rgba(0,0,0,0.72) 0%, rgba(0,0,0,0.08) 55%, transparent 100%)'
              : 'linear-gradient(to top, rgba(0,0,0,0.55) 0%, transparent 60%)',
          }}
        />

        {/* Category label — top-left, clean film-label style */}
        <div className="absolute top-2.5 left-2.5 z-20 flex items-center space-x-1.5">
          <span
            className="px-2 py-0.5 text-white text-[9px] font-mono font-bold uppercase tracking-wider"
            style={{ background: '#800020', letterSpacing: '0.12em' }}
          >
            {item.category}
          </span>
          {isVideo && !isPlaying && (
            <span className="px-1.5 py-0.5 bg-black/60 text-amber-300 text-[9px] font-mono uppercase tracking-widest border border-white/10">
              REEL
            </span>
          )}
          {isVideo && isPlaying && (
            <span className="px-1.5 py-0.5 bg-emerald-700/90 text-white text-[9px] font-mono uppercase tracking-widest">
              ● LIVE
            </span>
          )}
          {item.photos && item.photos.length > 1 && (
            <span className="px-1.5 py-0.5 bg-black/60 text-white/80 text-[9px] font-mono border border-white/10">
              {item.photos.length}×
            </span>
          )}
          {item.featured && (
            <span className="px-1.5 py-0.5 bg-[#C5A059] text-white text-[9px] font-mono uppercase tracking-wider">
              ★
            </span>
          )}
        </div>

        {/* Play cue — appears on hover, minimal typographic style */}
        {isVideo && !isPlaying && isHovered && (
          <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none">
            <span
              className="text-white font-mono font-bold text-xs tracking-widest uppercase px-3 py-1.5 border border-white/40 bg-black/50"
              style={{ letterSpacing: '0.18em' }}
            >
              ▶ PREVIEW
            </span>
          </div>
        )}

        {/* Bottom meta — date & title */}
        <div className="absolute bottom-0 inset-x-0 z-20 px-3 pb-3 pt-6">
          <p className="font-cinzel font-bold text-sm text-white leading-snug line-clamp-1 group-hover:text-[#FDE68A]"
            style={{ transition: 'color 180ms ease' }}>
            {item.title}
          </p>
          <div className="flex items-center justify-between mt-1">
            <span className="text-[9px] font-mono text-white/50 uppercase tracking-widest">
              {new Date(item.createdAt).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: '2-digit' })}
            </span>
            <span className="text-[9px] font-mono text-white/60 uppercase tracking-widest">
              {isVideo
                ? (isPlaying ? 'Click to open' : 'Hover · Play')
                : 'View →'}
            </span>
          </div>
        </div>

        {/* Muted pill — bottom-left only when playing */}
        {isVideo && isPlaying && (
          <div className="absolute top-2.5 right-2.5 z-20 flex items-center space-x-1 px-2 py-0.5 bg-black/60 border border-white/10">
            <VolumeX className="w-2.5 h-2.5 text-stone-400" />
            <span className="text-[9px] font-mono text-stone-400 uppercase tracking-wider">Muted</span>
          </div>
        )}

        {/* Thin maroon left border accent on hover */}
        <div
          className="absolute left-0 top-0 bottom-0 w-[3px] bg-[#800020] pointer-events-none z-30"
          style={{
            transform: isHovered ? 'scaleY(1)' : 'scaleY(0)',
            transformOrigin: 'bottom',
            transition: 'transform 280ms cubic-bezier(0.33, 1, 0.68, 1)',
          }}
        />
      </div>
    </div>
  );
};

export const GalleryPage: React.FC<GalleryPageProps> = ({
  onNavigate: _onNavigate,
  onOpenQuickRegister: _onOpenQuickRegister,
}) => {
  const [mediaList, setMediaList] = useState<MediaItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Filters state
  const [filterType, setFilterType] = useState<MediaFilterType>('ALL');
  const [selectedCategory, setSelectedCategory] = useState<MediaCategory>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortBy, setSortBy] = useState<'latest' | 'oldest' | 'title'>('latest');
  const [viewMode, setViewMode] = useState<'masonry' | 'stack'>('masonry');

  // Lightbox viewer state
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [lightboxCollectionIndex, setLightboxCollectionIndex] = useState<number>(0);
  const [isLightboxOpen, setIsLightboxOpen] = useState<boolean>(false);
  const [sharedTransitionMediaId, setSharedTransitionMediaId] = useState<string | null>(null);

  // Refs for smooth scroll
  const stackRef = useRef<HTMLDivElement>(null);
  const highlightsRef = useRef<HTMLDivElement>(null);

  const fetchMedia = async () => {
    setIsLoading(true);
    try {
      const data = await apiService.getMedia({
        type: filterType,
        category: selectedCategory,
        search: searchQuery,
        sort: sortBy,
      });
      // Public gallery only displays published items
      setMediaList(data.filter(m => m.published !== false));
    } catch {
      // Handled
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMedia();
  }, [filterType, selectedCategory, searchQuery, sortBy]);

  // Filtered list for display
  const displayItems = mediaList.filter((item) => {
    if (item.published === false) return false;
    if (filterType === 'PHOTOS' && item.type !== 'photo') return false;
    if (filterType === 'VIDEOS' && item.type !== 'video') return false;
    if (selectedCategory !== 'ALL' && item.category.toUpperCase() !== selectedCategory) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const match =
        item.title.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q) ||
        (item.location && item.location.toLowerCase().includes(q));
      if (!match) return false;
    }
    return true;
  });

  const photoCount = mediaList.filter(m => m.type === 'photo').length;
  const videoCount = mediaList.filter(m => m.type === 'video').length;

  const handleOpenLightbox = (index: number, collectionPhotoIndex?: number) => {
    const selectedItem = displayItems[index];
    const sharedId = viewMode === 'masonry' && selectedItem?.type === 'photo' ? selectedItem.id : null;
    if (sharedId) flushSync(() => setSharedTransitionMediaId(sharedId));
    const transition = runSharedViewTransition(() => {
      setLightboxIndex(index);
      setLightboxCollectionIndex(collectionPhotoIndex || 0);
      setIsLightboxOpen(true);
    });
    if (!transition && sharedId) setSharedTransitionMediaId(null);
  };

  const handleCloseLightbox = () => {
    const transition = runSharedViewTransition(() => setIsLightboxOpen(false));
    if (transition && sharedTransitionMediaId) {
      transition.finished.then(
        () => setSharedTransitionMediaId(null),
        () => setSharedTransitionMediaId(null),
      );
    } else {
      setSharedTransitionMediaId(null);
    }
  };

  const handleSelectHighlightMedia = (item: MediaItem) => {
    const idx = displayItems.findIndex(m => m.id === item.id);
    if (idx !== -1) {
      handleOpenLightbox(idx, 0);
    } else {
      // Find in full media list
      const fullIdx = mediaList.findIndex(m => m.id === item.id);
      if (fullIdx !== -1) {
        handleOpenLightbox(fullIdx, 0);
      }
    }
  };

  const scrollToStack = () => {
    stackRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const scrollToHighlights = () => {
    highlightsRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-[#FAF8F3] text-[#1C1917] flex flex-col font-sans selection:bg-[#800020] selection:text-white">

      {/* ============================================================== */}
      {/* 2. GALLERY HERO SECTION (Minimal, Cinematic, Editorial)        */}
      {/* ============================================================== */}
      <section className="relative w-full pt-16 pb-12 sm:pt-24 sm:pb-16 overflow-hidden border-b border-[#E5DFC9] bg-gradient-to-b from-[#FAF8F3] via-[#FAF6EE] to-[#FAF8F3]">
        {/* Subtle decorative background watermark */}
        <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/3 select-none pointer-events-none opacity-5 font-cinzel text-[180px] sm:text-[280px] font-black tracking-tighter text-[#800020] whitespace-nowrap">
          COLORIDO
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">

            {/* Left Editorial Copy */}
            <div className="lg:col-span-7 space-y-6">
              <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-[#FAF8F3] border border-[#C5A059]/60 text-xs font-mono font-bold tracking-widest text-[#800020] uppercase shadow-xs">
                <span className="w-1.5 h-1.5 rounded-full bg-[#800020]" />
                <span>R.V.R. &amp; J.C. COLLEGE OF ENGINEERING • COLORIDO 2K26</span>
              </div>

              <div className="space-y-2">
                <h1 className="festival-title-reveal font-cinzel font-black text-4xl sm:text-6xl lg:text-7xl text-[#1C1917] tracking-tight leading-[1.05]">
                  MOMENTS <br />
                  <span className="text-[#800020] italic font-serif-editorial font-normal">THAT</span> STAY
                </h1>
                <p className="text-sm sm:text-base text-[#6C665F] max-w-xl font-sans leading-relaxed pt-2">
                  Explore the moments, people, performances, and victories that made COLORIDO 2K26 unforgettable. A tactile photographic chronicle of collegiate passion.
                </p>
              </div>

              {/* Hero Action CTAs */}
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <button
                  onClick={scrollToStack}
                  className="px-6 py-3 rounded-xl bg-[#800020] hover:bg-[#660019] text-white font-bold text-xs uppercase tracking-wider shadow-md hover:shadow-lg transition-all flex items-center space-x-2 group"
                >
                  <Layers className="w-4 h-4 text-[#C5A059]" />
                  <span>Explore Photos</span>
                  <ArrowDown className="w-3.5 h-3.5 group-hover:translate-y-0.5 transition-transform" />
                </button>

                <button
                  onClick={scrollToHighlights}
                  className="px-6 py-3 rounded-xl bg-white hover:bg-[#F5F1E8] text-[#1C1917] border border-[#E5DFC9] font-bold text-xs uppercase tracking-wider shadow-xs hover:border-[#800020] transition-all flex items-center space-x-2"
                >
                  <Sparkles className="w-4 h-4 text-[#C5A059]" />
                  <span>Watch Highlights</span>
                </button>
              </div>

              {/* Real-time stats strip */}
              <div className="pt-4 flex items-center space-x-6 text-xs font-mono text-[#6C665F]">
                <div>
                  <span className="font-bold text-[#1C1917]">{mediaList.length}</span> Memories Archived
                </div>
                <span className="text-[#E5DFC9]">•</span>
                <div>
                  <span className="font-bold text-[#800020]">{photoCount}</span> Photographs
                </div>
                <span className="text-[#E5DFC9]">•</span>
                <div>
                  <span className="font-bold text-[#C5A059]">{videoCount}</span> Cinematic Reels
                </div>
              </div>
              <div className="pt-4"><FestivalPassGallery media={displayItems.filter(item => item.featured).slice(0, 6)} onSelectMedia={handleSelectHighlightMedia} triggerLabel="Festival Memories Pass" /></div>
            </div>

            {/* Right Subtly Integrated Cinematic Photograph */}
            <div className="lg:col-span-5 relative">
              <div className="relative w-full h-[320px] sm:h-[400px] rounded-3xl overflow-hidden border-2 border-[#E5DFC9] shadow-2xl bg-white p-2">
                <div className="relative w-full h-full rounded-2xl overflow-hidden">
                  <img
                    src="https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=1200&q=85"
                    alt="COLORIDO 2K26 Festival Inauguration"
                    className="w-full h-full object-cover filter contrast-[1.05]"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

                  <div className="absolute top-4 left-4">
                    <span className="px-2.5 py-1 rounded-full bg-[#800020]/90 backdrop-blur-md text-white text-[10px] font-mono font-bold tracking-wider uppercase">
                      LATEST CAPTURE · 26 SEP 2026
                    </span>
                  </div>

                  <div className="absolute bottom-4 left-4 right-4 text-white space-y-1">
                    <p className="text-[10px] font-mono text-[#C5A059] uppercase tracking-wider">
                      INAUGURAL CEREMONY
                    </p>
                    <p className="font-cinzel font-bold text-sm leading-tight text-white line-clamp-1">
                      Grand Lamp Lighting &amp; Fest Flag Hoisting
                    </p>
                  </div>
                </div>
              </div>

              {/* Decorative Corner Offset Accent */}
              <div className="absolute -bottom-3 -right-3 w-28 h-28 rounded-3xl border border-[#C5A059]/40 -z-10 bg-[#FAF6EE]" />
            </div>

          </div>
        </div>
      </section>

      {/* ============================================================== */}
      {/* 3. GALLERY FILTER BAR                                          */}
      {/* ============================================================== */}
      <section className="relative z-10 w-full border-b border-[#E5DFC9] bg-[#FAF8F3]/95 py-3.5 shadow-xs backdrop-blur-md md:sticky md:top-20 md:z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-3">

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">

            {/* Primary Media Type Filters: ALL, PHOTOS, VIDEOS */}
            <div className="flex w-full items-center justify-between gap-1 overflow-x-auto rounded-xl border border-[#E5DFC9] bg-[#F5F1E8] p-1 md:w-auto md:justify-start md:gap-0 md:space-x-1.5">
              <button
                onClick={() => setFilterType('ALL')}
                className={`flex min-h-11 shrink-0 items-center space-x-1.5 rounded-lg px-3 py-2 text-xs font-mono font-bold uppercase tracking-wider transition-all sm:px-4 ${filterType === 'ALL'
                    ? 'bg-[#800020] text-white shadow-xs'
                    : 'text-[#6C665F] hover:text-[#1C1917]'
                  }`}
              >
                <span>ALL</span>
                <span className="text-[10px] opacity-75">({mediaList.length})</span>
              </button>

              <button
                onClick={() => setFilterType('PHOTOS')}
                className={`flex min-h-11 shrink-0 items-center space-x-1.5 rounded-lg px-3 py-2 text-xs font-mono font-bold uppercase tracking-wider transition-all sm:px-4 ${filterType === 'PHOTOS'
                    ? 'bg-[#800020] text-white shadow-xs'
                    : 'text-[#6C665F] hover:text-[#1C1917]'
                  }`}
              >
                <ImageIcon className="w-3.5 h-3.5" />
                <span>PHOTOS</span>
                <span className="text-[10px] opacity-75">({photoCount})</span>
              </button>

              <button
                onClick={() => setFilterType('VIDEOS')}
                className={`flex min-h-11 shrink-0 items-center space-x-1.5 rounded-lg px-3 py-2 text-xs font-mono font-bold uppercase tracking-wider transition-all sm:px-4 ${filterType === 'VIDEOS'
                    ? 'bg-[#800020] text-white shadow-xs'
                    : 'text-[#6C665F] hover:text-[#1C1917]'
                  }`}
              >
                <Film className="w-3.5 h-3.5" />
                <span>VIDEOS</span>
                <span className="text-[10px] opacity-75">({videoCount})</span>
              </button>
            </div>

            {/* Search Input & Controls */}
            <div className="flex w-full flex-wrap items-center gap-2 md:w-auto md:flex-nowrap md:gap-3">
              <div className="relative basis-full sm:basis-52 sm:flex-1 md:w-64 md:basis-auto">
                <Search className="w-3.5 h-3.5 text-[#6C665F] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search memories, stages..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="min-h-11 w-full rounded-xl border border-[#E5DFC9] bg-white py-2 pl-9 pr-3 text-xs text-[#1C1917] shadow-xs placeholder:text-[#6C665F]/60 focus:border-[#800020] focus:outline-none"
                />
              </div>

              {/* View Mode Toggle: Adaptive Masonry vs Stack */}
              <div className="flex shrink-0 items-center rounded-xl border border-[#E5DFC9] bg-[#F5F1E8] p-1">
                <button
                  onClick={() => setViewMode('masonry')}
                  className={`flex min-h-11 min-w-11 items-center justify-center rounded-lg p-1.5 transition-colors ${viewMode === 'masonry' ? 'bg-[#800020] text-white shadow-xs' : 'text-[#6C665F] hover:text-[#1C1917]'
                    }`}
                  title="Adaptive Masonry Gallery (Preserves all photo aspect ratios)"
                >
                  <Grid className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('stack')}
                  className={`flex min-h-11 min-w-11 items-center justify-center rounded-lg p-1.5 transition-colors ${viewMode === 'stack' ? 'bg-[#800020] text-white shadow-xs' : 'text-[#6C665F] hover:text-[#1C1917]'
                    }`}
                  title="Interactive Memory Card Stack"
                >
                  <Layers className="w-4 h-4" />
                </button>
              </div>

              {/* Sort Selector */}
              <select
                value={sortBy}
                onChange={(e: any) => setSortBy(e.target.value)}
                className="min-h-11 w-full min-w-0 cursor-pointer rounded-xl border border-[#E5DFC9] bg-white px-3 py-2 text-xs font-mono font-bold text-[#1C1917] shadow-xs focus:border-[#800020] focus:outline-none sm:w-auto sm:flex-1 md:flex-none"
              >
                <option value="latest">Sort: LATEST FIRST</option>
                <option value="oldest">Sort: OLDEST FIRST</option>
                <option value="title">Sort: TITLE A-Z</option>
              </select>
            </div>

          </div>

          {/* Category Chips Bar */}
          <div className="flex items-center space-x-2 overflow-x-auto pb-1 pt-1 scrollbar-none">
            {CATEGORIES.map((cat) => {
              const isActive = selectedCategory === cat;
              return (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`min-h-11 shrink-0 rounded-full px-3.5 py-1.5 text-[11px] font-mono font-bold uppercase whitespace-nowrap transition-all ${isActive
                      ? 'bg-[#1C1917] text-white shadow-xs'
                      : 'bg-white text-[#6C665F] border border-[#E5DFC9] hover:border-[#800020] hover:text-[#800020]'
                    }`}
                >
                  {cat}
                </button>
              );
            })}
          </div>

        </div>
      </section>

      {/* ============================================================== */}
      {/* 4. COLORIDO HIGHLIGHTS SECTION                                 */}
      {/* ============================================================== */}
      <div ref={highlightsRef}>
        <ColoridoHighlights
          items={mediaList}
          onSelectMedia={handleSelectHighlightMedia}
        />
      </div>

      {/* ============================================================== */}
      {/* 5. ADAPTIVE MASONRY GALLERY OR INTERACTIVE CARD STACK          */}
      {/* ============================================================== */}
      <section ref={stackRef} className="flex-1 w-full bg-[#FAF8F3] py-8">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-24 space-y-4">
            <RefreshCw className="w-8 h-8 text-[#800020] animate-spin" />
            <p className="text-xs font-mono text-[#6C665F] uppercase tracking-wider">
              Loading COLORIDO 2K26 Memory Archive...
            </p>
          </div>
        ) : viewMode === 'stack' ? (
          <MemoryCardStack
            items={displayItems}
            onOpenLightbox={handleOpenLightbox}
            filterType={filterType}
          />
        ) : (
          /* ADAPTIVE RESPONSIVE MASONRY GALLERY (Preserves all photo aspect ratios with ZERO distortion) */
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-[#E5DFC9]">
              <div className="flex items-center space-x-2">
                <span className="text-xs font-mono font-bold text-[#800020] uppercase tracking-wider">
                  ADAPTIVE MASONRY GALLERY
                </span>
                <span className="text-stone-300">•</span>
                <span className="text-xs font-mono text-[#6C665F]">
                  {displayItems.length} ITEMS (NATURAL PROPORTIONS)
                </span>
              </div>
              <button
                onClick={() => setViewMode('stack')}
                className="text-xs font-bold text-[#800020] hover:underline flex items-center space-x-1"
              >
                <span>Switch to Memory Card Stack</span>
                <Layers className="w-3.5 h-3.5 ml-1" />
              </button>
            </div>

            {/* CSS Multi-Column Masonry: Naturally accommodates portrait, landscape, square & ultra-wide */}
            <div className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-6 space-y-6 festival-stagger">
              {displayItems.map((item, idx) => (
                <MasonryGalleryCard
                  key={item.id}
                  item={item}
                  idx={idx}
                  onOpen={() => handleOpenLightbox(idx)}
                  isSharedSource={!isLightboxOpen && sharedTransitionMediaId === item.id}
                />
              ))}
            </div>
          </div>
        )}
      </section>

      {/* ============================================================== */}
      {/* 6. FULLSCREEN VIEWER MODAL                                     */}
      {/* ============================================================== */}
      <GalleryLightbox
        items={displayItems}
        currentIndex={lightboxIndex}
        initialCollectionPhotoIndex={lightboxCollectionIndex}
        isOpen={isLightboxOpen}
        sharedTransitionMediaId={sharedTransitionMediaId}
        onClose={handleCloseLightbox}
        onNavigate={(newIdx) => setLightboxIndex(newIdx)}
      />

    </div>
  );
};
