import React, { useState, useRef, useEffect } from 'react';
import {
  MapPin, Play, Maximize2,
  ArrowUpRight, VolumeX, Eye, Layers, ChevronLeft, ChevronRight
} from 'lucide-react';
import type { MediaItem } from '../types';

interface MemoryCardStackProps {
  items: MediaItem[];
  onOpenLightbox: (index: number, collectionPhotoIndex?: number) => void;
  filterType?: string;
}

// Controlled subtle rotation angles for the stacked paper / memory deck feel
const ROTATION_PATTERN = [-2.2, 1.8, -1.2, 2.0, -1.6, 1.4, -2.0, 1.6];
const HORIZONTAL_OFFSETS = [-8, 10, -6, 8, -10, 6, -4, 8];

export const MemoryCardStack: React.FC<MemoryCardStackProps> = ({
  items,
  onOpenLightbox,
  filterType: _filterType,
}) => {
  // Sort items strictly by createdAt DESC (LATEST FIRST)
  const sortedItems = [...items].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  const [activeCardId, setActiveCardId] = useState<string | null>(sortedItems[0]?.id || null);
  const [hoveredCardId, setHoveredCardId] = useState<string | null>(null);

  // In-card carousel index state for collections: map itemId -> currentPhotoIndex
  const [carouselIndices, setCarouselIndices] = useState<Record<string, number>>({});

  // Touch coordinates for mobile swipe
  const touchStartXRef = useRef<number>(0);
  const touchEndXRef = useRef<number>(0);

  // Cursor-Origin Image Reveal state
  const [revealState, setRevealState] = useState<{
    cardId: string | null;
    entryX: number; // percentage 0-100
    entryY: number; // percentage 0-100
    cursorX: number; // current relative px from center
    cursorY: number;
    isVisible: boolean;
  }>({
    cardId: null,
    entryX: 50,
    entryY: 50,
    cursorX: 0,
    cursorY: 0,
    isVisible: false,
  });

  // Tilt physics state for each card
  const [cardTilt, setCardTilt] = useState<{
    cardId: string | null;
    rotateX: number;
    rotateY: number;
  }>({
    cardId: null,
    rotateX: 0,
    rotateY: 0,
  });

  const cardRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const videoRefs = useRef<Map<string, HTMLVideoElement>>(new Map());

  const handlePrevPhoto = (e: React.MouseEvent, item: MediaItem) => {
    e.stopPropagation();
    if (!item.photos || item.photos.length <= 1) return;
    const current = carouselIndices[item.id] || 0;
    const total = item.photos.length;
    setCarouselIndices(prev => ({
      ...prev,
      [item.id]: (current - 1 + total) % total,
    }));
  };

  const handleNextPhoto = (e: React.MouseEvent, item: MediaItem) => {
    e.stopPropagation();
    if (!item.photos || item.photos.length <= 1) return;
    const current = carouselIndices[item.id] || 0;
    const total = item.photos.length;
    setCarouselIndices(prev => ({
      ...prev,
      [item.id]: (current + 1) % total,
    }));
  };

  // Keyboard arrow keys when a card is focused/hovered
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!hoveredCardId) return;
      const item = sortedItems.find(m => m.id === hoveredCardId);
      if (!item || !item.photos || item.photos.length <= 1) return;

      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        const current = carouselIndices[item.id] || 0;
        const total = item.photos.length;
        setCarouselIndices(prev => ({
          ...prev,
          [item.id]: (current - 1 + total) % total,
        }));
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        const current = carouselIndices[item.id] || 0;
        const total = item.photos.length;
        setCarouselIndices(prev => ({
          ...prev,
          [item.id]: (current + 1) % total,
        }));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [hoveredCardId, carouselIndices, sortedItems]);

  // Touch Swipe Handlers for Mobile
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartXRef.current = e.targetTouches[0].clientX;
  };

  const handleTouchEnd = (item: MediaItem) => {
    if (!item.photos || item.photos.length <= 1) return;
    const distance = touchStartXRef.current - touchEndXRef.current;
    const threshold = 40;
    const current = carouselIndices[item.id] || 0;
    const total = item.photos.length;

    if (distance > threshold) {
      // Swiped Left -> Next Photo
      setCarouselIndices(prev => ({ ...prev, [item.id]: (current + 1) % total }));
    } else if (distance < -threshold) {
      // Swiped Right -> Prev Photo
      setCarouselIndices(prev => ({ ...prev, [item.id]: (current - 1 + total) % total }));
    }
  };

  // Handle cursor entering card
  const handleMouseEnterCard = (e: React.MouseEvent<HTMLDivElement>, card: MediaItem) => {
    const cardEl = cardRefs.current.get(card.id);
    if (!cardEl) return;

    const rect = cardEl.getBoundingClientRect();
    const entryX = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
    const entryY = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));

    setActiveCardId(card.id);
    setHoveredCardId(card.id);

    // Trigger cursor-origin reveal
    setRevealState({
      cardId: card.id,
      entryX,
      entryY,
      cursorX: 0,
      cursorY: 0,
      isVisible: true,
    });

    // Play muted video preview if video
    if (card.type === 'video') {
      const vid = videoRefs.current.get(card.id);
      if (vid) {
        vid.currentTime = 0;
        vid.play().catch(() => { });
      }
    }
  };

  // Handle cursor moving across card with 3D tilt & weighted follow
  const handleMouseMoveCard = (e: React.MouseEvent<HTMLDivElement>, card: MediaItem) => {
    const cardEl = cardRefs.current.get(card.id);
    if (!cardEl) return;

    const rect = cardEl.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const deltaX = (e.clientX - centerX) / (rect.width / 2);
    const deltaY = (e.clientY - centerY) / (rect.height / 2);

    // Subtle 3D tilt: max 3.5 degrees
    setCardTilt({
      cardId: card.id,
      rotateX: -deltaY * 3.5,
      rotateY: deltaX * 3.5,
    });

    // Weighted cursor follow bounded within ±22px
    setRevealState((prev) => ({
      ...prev,
      cursorX: deltaX * 22,
      cursorY: deltaY * 18,
    }));
  };

  // Handle cursor leaving card
  const handleMouseLeaveCard = (card: MediaItem) => {
    setHoveredCardId(null);
    setCardTilt({ cardId: null, rotateX: 0, rotateY: 0 });

    // Smoothly contract & hide reveal preview
    setRevealState((prev) => ({
      ...prev,
      isVisible: false,
    }));

    // Pause video preview
    if (card.type === 'video') {
      const vid = videoRefs.current.get(card.id);
      if (vid) {
        vid.pause();
        vid.currentTime = 0;
      }
    }
  };

  if (sortedItems.length === 0) {
    return (
      <div className="text-center py-20 bg-white/40 rounded-3xl border border-[#E5DFC9] p-8 max-w-xl mx-auto space-y-4">
        <Layers className="w-12 h-12 text-[#C5A059] mx-auto opacity-75" />
        <h3 className="font-cinzel font-bold text-xl text-[#1C1917]">No Memories in this View</h3>
        <p className="text-xs text-[#6C665F]">Try selecting "ALL" or choose another category from the filter bar above.</p>
      </div>
    );
  }

  return (
    <div className="relative w-full max-w-5xl mx-auto px-4 sm:px-6 py-12 select-none">

      {/* Stack Status & Visual Instructions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-8 border-b border-[#E5DFC9]/60 gap-3">
        <div className="flex items-center space-x-3">
          <div className="w-2.5 h-2.5 rounded-full bg-[#800020] animate-pulse" />
          <span className="text-xs font-mono font-bold uppercase tracking-wider text-[#1C1917]">
            MEMORY CARD STACK — {sortedItems.length} ARTIFACTS
          </span>
          <span className="hidden md:inline-block px-2 py-0.5 rounded-full bg-[#FAF8F3] border border-[#E5DFC9] text-[10px] font-mono text-[#6C665F]">
            CHRONOLOGICAL · LATEST AT APEX
          </span>
        </div>

        <div className="text-[11px] font-mono text-[#6C665F] flex items-center space-x-2">
          <span>HOVER TO LIFT &amp; REVEAL</span>
          <span>•</span>
          <span className="text-[#800020] font-bold">CLICK FOR FULLSCREEN</span>
        </div>
      </div>

      {/* Vertical Cascading Card Stack */}
      <div className="relative pt-8 pb-32 flex flex-col items-center">
        {sortedItems.map((item, index) => {
          const isLatest = index === 0;
          const isActive = activeCardId === item.id;
          const isHovered = hoveredCardId === item.id;
          const baseRotation = ROTATION_PATTERN[index % ROTATION_PATTERN.length];
          const baseOffset = HORIZONTAL_OFFSETS[index % HORIZONTAL_OFFSETS.length];

          // Collection details
          const isCollection = Boolean(item.photos && item.photos.length > 1);
          const totalPhotos = isCollection ? item.photos!.length : 1;
          const currentPhotoIdx = carouselIndices[item.id] || 0;
          const currentPhoto = isCollection ? item.photos![currentPhotoIdx] : null;

          // 3D tilt delta if this card is currently hovered
          const currentTiltX = cardTilt.cardId === item.id ? cardTilt.rotateX : 0;
          const currentTiltY = cardTilt.cardId === item.id ? cardTilt.rotateY : 0;

          // Stacking logic: Card 0 is highest z-index so latest is on top
          const zIndex = isHovered ? 60 : 40 - index;
          const overlapMargin = index === 0 ? '0px' : '-135px';

          // Aspect ratio label
          const aspectLabel = item.aspectRatio || (item.width && item.height ? `${item.width}×${item.height}` : '16:9');

          // Active display image
          const activeDisplayUrl = currentPhoto?.url || item.coverPhoto || item.url;

          return (
            <div
              key={item.id}
              ref={(el) => {
                if (el) cardRefs.current.set(item.id, el);
                else cardRefs.current.delete(item.id);
              }}
              style={{
                marginTop: overlapMargin,
                zIndex,
                transform: `
                  translateX(${isHovered ? 0 : baseOffset}px)
                  translateY(${isHovered ? -16 : 0}px)
                  scale(${isHovered ? 1.03 : isActive ? 1.01 : 0.99})
                  rotate(${isHovered ? 0 : baseRotation}deg)
                  perspective(1000px)
                  rotateX(${currentTiltX}deg)
                  rotateY(${currentTiltY}deg)
                `,
                transition: 'transform 0.4s cubic-bezier(0.25, 1, 0.5, 1), box-shadow 0.4s ease, opacity 0.3s ease',
              }}
              onMouseEnter={(e) => handleMouseEnterCard(e, item)}
              onMouseMove={(e) => handleMouseMoveCard(e, item)}
              onMouseLeave={() => handleMouseLeaveCard(item)}
              onTouchStart={handleTouchStart}
              onTouchMove={(e) => { touchEndXRef.current = e.targetTouches[0].clientX; }}
              onTouchEnd={() => handleTouchEnd(item)}
              onClick={() => onOpenLightbox(index, isCollection ? currentPhotoIdx : undefined)}
              className={`group relative w-full rounded-3xl overflow-hidden cursor-pointer border transition-all duration-300 ${isHovered
                  ? 'border-[#C5A059] shadow-[0_30px_60px_-15px_rgba(28,25,23,0.35)] ring-2 ring-[#C5A059]/40 bg-[#FAF8F3]'
                  : isActive
                    ? 'border-[#800020]/60 shadow-[0_20px_40px_-12px_rgba(28,25,23,0.22)] bg-[#FAF8F3]'
                    : 'border-[#E5DFC9] shadow-[0_12px_30px_-10px_rgba(28,25,23,0.14)] bg-[#F5F1E8] hover:border-[#800020]/40'
                }`}
              tabIndex={0}
              role="button"
              aria-label={`Photo memory: ${item.title}`}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onOpenLightbox(index, isCollection ? currentPhotoIdx : undefined);
                }
              }}
            >

              {/* TOP HEADER / TITLE STRIP (Always visible in stack view - Section 19) */}
              <div
                className="relative px-5 py-3.5 bg-gradient-to-r from-[#FAF8F3] via-white to-[#FAF8F3] border-b border-[#E5DFC9] flex items-center justify-between z-20 backdrop-blur-sm"
                onMouseEnter={() => setActiveCardId(item.id)}
              >
                <div className="flex items-center space-x-3.5 min-w-0">
                  {/* Miniature Thumbnail beside Title */}
                  <div
                    className="relative w-11 h-11 rounded-xl overflow-hidden border border-[#E5DFC9] shrink-0 shadow-xs group-hover:border-[#800020] transition-colors"
                    title="Hover thumbnail to focus card"
                  >
                    <img
                      src={item.coverPhoto || item.thumbnailUrl || item.url}
                      alt={item.title}
                      className="w-full h-full object-cover"
                    />
                    {item.type === 'video' && (
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                        <Play className="w-3 h-3 fill-white text-white" />
                      </div>
                    )}
                  </div>

                  {/* Title & Metadata */}
                  <div className="min-w-0">
                    <div className="flex items-center space-x-2">
                      {isLatest && (
                        <span className="px-2 py-0.5 rounded-full bg-[#800020] text-white text-[9px] font-mono font-bold uppercase tracking-wider flex items-center space-x-1 shadow-xs">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#C5A059] animate-ping" />
                          <span>LATEST</span>
                        </span>
                      )}
                      <span className="text-[10px] font-mono font-bold text-[#800020] tracking-wider uppercase">
                        {item.category}
                      </span>
                      <span className="text-[#C5A059] text-[10px]">•</span>
                      <span className="text-[10px] font-mono text-[#6C665F]">
                        {new Date(item.createdAt).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </span>
                      {isCollection && (
                        <>
                          <span className="text-[#C5A059] text-[10px]">•</span>
                          <span className="px-2 py-0.2 rounded-full bg-amber-100 text-amber-900 border border-amber-300 text-[9px] font-mono font-bold flex items-center space-x-1">
                            <Layers className="w-2.5 h-2.5 text-[#C5A059]" />
                            <span>{totalPhotos} Photos</span>
                          </span>
                        </>
                      )}
                    </div>

                    <h3 className="font-cinzel font-bold text-sm sm:text-base text-[#1C1917] truncate group-hover:text-[#800020] transition-colors">
                      {item.title}
                    </h3>
                  </div>
                </div>

                {/* Right Badges */}
                <div className="flex items-center space-x-2 shrink-0">
                  {item.type === 'video' ? (
                    <span className="px-2.5 py-1 rounded-md bg-[#800020]/10 text-[#800020] text-[10px] font-mono font-bold flex items-center space-x-1 border border-[#800020]/20">
                      <Play className="w-2.5 h-2.5 fill-[#800020]" />
                      <span>{item.duration || 'Video'}</span>
                    </span>
                  ) : (
                    <span className="hidden sm:inline-block px-2 py-0.5 rounded-md bg-stone-100 text-[#6C665F] text-[10px] font-mono border border-stone-200">
                      {isCollection ? `${totalPhotos} CAROUSEL` : aspectLabel}
                    </span>
                  )}

                  <div className="p-1.5 rounded-lg bg-stone-100 group-hover:bg-[#800020] group-hover:text-white text-[#6C665F] transition-all">
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </div>
                </div>
              </div>

              {/* MAIN PHOTOGRAPHIC FRAME (Sections 17, 20 & 21: One card frame, in-card carousel) */}
              <div className="relative w-full h-[320px] sm:h-[380px] lg:h-[420px] overflow-hidden bg-stone-900">
                {/* Media Image / Video Container */}
                {item.type === 'video' ? (
                  <div className="relative w-full h-full">
                    {/* Poster Image */}
                    <img
                      src={item.thumbnailUrl || item.url}
                      alt={item.title}
                      className={`w-full h-full object-cover transition-opacity duration-300 ${isHovered ? 'opacity-0' : 'opacity-100'
                        }`}
                      style={{
                        objectPosition: item.focalPoint ? `${item.focalPoint.x}% ${item.focalPoint.y}%` : 'center',
                      }}
                    />

                    {/* Muted Autoplay Video on Hover */}
                    <video
                      ref={(el) => {
                        if (el) videoRefs.current.set(item.id, el);
                        else videoRefs.current.delete(item.id);
                      }}
                      src={item.url}
                      muted
                      playsInline
                      loop
                      className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${isHovered ? 'opacity-100' : 'opacity-0 pointer-events-none'
                        }`}
                    />

                    {/* Video Center Play Indicator */}
                    {!isHovered && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/25">
                        <div className="w-14 h-14 rounded-full bg-white/90 backdrop-blur-md flex items-center justify-center text-[#800020] shadow-xl group-hover:scale-110 transition-transform">
                          <Play className="w-6 h-6 fill-[#800020] ml-1" />
                        </div>
                      </div>
                    )}

                    {/* Muted Preview Notice */}
                    {isHovered && (
                      <div className="absolute top-4 left-4 z-20 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md text-white text-[10px] font-mono flex items-center space-x-1.5 border border-white/20">
                        <VolumeX className="w-3 h-3 text-[#C5A059]" />
                        <span>Muted Preview · Click for Sound</span>
                      </div>
                    )}
                  </div>
                ) : isCollection ? (
                  /* ============================================================== */
                  /* MULTI-PHOTO CAROUSEL (Section 20: Smooth 400-550ms transition) */
                  /* ============================================================== */
                  <div className="relative w-full h-full overflow-hidden bg-stone-950 flex items-center justify-center">
                    {/* Ambient backdrop */}
                    <img
                      src={activeDisplayUrl}
                      alt=""
                      aria-hidden="true"
                      className="absolute inset-0 w-full h-full object-cover blur-2xl opacity-30 scale-110 pointer-events-none"
                    />

                    <img
                      key={`${item.id}-${currentPhotoIdx}`}
                      src={activeDisplayUrl}
                      alt={currentPhoto?.caption || item.title}
                      loading={index < 3 ? 'eager' : 'lazy'}
                      className="relative z-10 max-h-full max-w-full object-contain transition-all duration-500 ease-out group-hover:scale-[1.02] animate-in fade-in zoom-in-95"
                      style={{
                        objectPosition: item.focalPoint ? `${item.focalPoint.x}% ${item.focalPoint.y}%` : 'center',
                      }}
                    />

                    {/* In-Card Carousel Arrows (Previous ← and → Next) */}
                    <div className="absolute inset-y-0 inset-x-3 flex items-center justify-between pointer-events-none z-20">
                      <button
                        onClick={(e) => handlePrevPhoto(e, item)}
                        className="pointer-events-auto p-2 sm:p-2.5 rounded-full bg-black/50 hover:bg-black/85 text-white/90 hover:text-white border border-white/20 backdrop-blur-md transition-all shadow-lg active:scale-95"
                        title="Previous photo (←)"
                        aria-label="Previous photo in collection"
                      >
                        <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
                      </button>

                      <button
                        onClick={(e) => handleNextPhoto(e, item)}
                        className="pointer-events-auto p-2 sm:p-2.5 rounded-full bg-black/50 hover:bg-black/85 text-white/90 hover:text-white border border-white/20 backdrop-blur-md transition-all shadow-lg active:scale-95"
                        title="Next photo (→)"
                        aria-label="Next photo in collection"
                      >
                        <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
                      </button>
                    </div>

                    {/* Top Right Counter Indicator (e.g. 01 / 10) */}
                    <div className="absolute top-4 right-4 z-20 px-3 py-1 rounded-full bg-black/70 backdrop-blur-md text-white font-mono text-xs font-bold border border-white/20 shadow-md">
                      {String(currentPhotoIdx + 1).padStart(2, '0')} <span className="text-white/40">/</span> {String(totalPhotos).padStart(2, '0')}
                    </div>
                  </div>
                ) : (
                  <div className="relative w-full h-full overflow-hidden bg-stone-950 flex items-center justify-center">
                    {/* Ambient backdrop */}
                    <img
                      src={item.url}
                      alt=""
                      aria-hidden="true"
                      className="absolute inset-0 w-full h-full object-cover blur-2xl opacity-30 scale-110 pointer-events-none"
                    />

                    <img
                      src={item.url}
                      alt={item.title}
                      loading={index < 3 ? 'eager' : 'lazy'}
                      className="relative z-10 max-h-full max-w-full object-contain transition-transform duration-700 ease-out group-hover:scale-[1.02]"
                      style={{
                        objectPosition: item.focalPoint ? `${item.focalPoint.x}% ${item.focalPoint.y}%` : 'center',
                      }}
                    />
                  </div>
                )}

                {/* Editorial Subtle Gradient Scrim at bottom of photograph */}
                <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-black/85 via-black/40 to-transparent pointer-events-none" />

                {/* Bottom Photographic Caption & Location */}
                <div className="absolute bottom-0 inset-x-0 p-5 flex items-end justify-between text-white z-10 pointer-events-none">
                  <div className="space-y-1 max-w-lg">
                    {item.location && (
                      <div className="flex items-center space-x-1.5 text-[11px] font-mono text-[#C5A059]">
                        <MapPin className="w-3 h-3" />
                        <span>{item.location}</span>
                      </div>
                    )}
                    <p className="text-xs text-white/80 line-clamp-1 font-sans">
                      {currentPhoto?.caption || item.description || item.title}
                    </p>
                  </div>

                  <div className="flex items-center space-x-1.5 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-white text-[10px] font-mono border border-white/20">
                    <Maximize2 className="w-3 h-3 text-[#C5A059]" />
                    <span className="hidden sm:inline">Examine High-Res</span>
                  </div>
                </div>

                {/* ============================================================== */}
                {/* SECTION 18: CURSOR-ORIGIN ENLARGED IMAGE REVEAL & FOLLOW       */}
                {/* ============================================================== */}
                {revealState.cardId === item.id && revealState.isVisible && item.type === 'photo' && (
                  <div
                    className="absolute inset-0 pointer-events-none z-30 overflow-hidden"
                    style={{
                      transformOrigin: `${revealState.entryX}% ${revealState.entryY}%`,
                    }}
                  >
                    {/* Enlarged Floating Magnifier Layer emerging from cursor origin */}
                    <div
                      className="absolute inset-0 flex items-center justify-center animate-in zoom-in-50 fade-in duration-300"
                      style={{
                        transform: `translate(${revealState.cursorX}px, ${revealState.cursorY}px)`,
                        transition: 'transform 0.15s cubic-bezier(0.2, 0.8, 0.4, 1)',
                      }}
                    >
                      <div className="relative w-[92%] h-[92%] rounded-2xl overflow-hidden border-2 border-[#C5A059] shadow-[0_20px_50px_rgba(0,0,0,0.6)] bg-black/90">
                        <img
                          src={activeDisplayUrl}
                          alt={`${item.title} detail view`}
                          className="w-full h-full object-cover scale-110"
                          style={{
                            objectPosition: `${revealState.entryX}% ${revealState.entryY}%`,
                          }}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30" />

                        {/* Detail Tag */}
                        <div className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-[#800020]/90 backdrop-blur-md text-white text-[10px] font-mono font-bold flex items-center space-x-1 border border-white/20">
                          <Eye className="w-3 h-3 text-[#C5A059]" />
                          <span>FOCAL REGION REVEAL</span>
                        </div>

                        <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-white text-xs font-mono">
                          <span className="truncate max-w-[70%] text-white/90 font-cinzel font-bold">{item.title}</span>
                          <span className="text-[#C5A059] text-[10px]">CLICK TO EXPAND ↗</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

              </div>
            </div>
          );
        })}
      </div>

      {/* End of Stack Architectural Marker */}
      <div className="text-center pt-4 pb-12 space-y-2">
        <div className="inline-flex items-center space-x-2 px-4 py-1.5 rounded-full bg-[#FAF8F3] border border-[#E5DFC9] text-xs font-mono text-[#6C665F]">
          <span>END OF ARCHIVED CARDS</span>
          <span>•</span>
          <span className="text-[#800020] font-bold">R.V.R. &amp; J.C. ARCHIVES</span>
        </div>
      </div>

    </div>
  );
};
