import React, { useState, useRef, useEffect } from 'react';
import { Sparkles, Calendar, MapPin, Play, ArrowRight, Layers } from 'lucide-react';
import type { MediaItem } from '../types';

interface ColoridoHighlightsProps {
  items: MediaItem[];
  onSelectMedia: (item: MediaItem) => void;
}

export const ColoridoHighlights: React.FC<ColoridoHighlightsProps> = ({
  items,
  onSelectMedia,
}) => {
  // Sort highlights strictly according to Admin-defined highlightOrder, then latest
  const highlightItems = items
    .filter(m => m.featured && m.published !== false)
    .sort((a, b) => {
      const orderA = a.highlightOrder ?? 999;
      const orderB = b.highlightOrder ?? 999;
      if (orderA !== orderB) return orderA - orderB;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const [isPlayingVideo, setIsPlayingVideo] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const safeIndex = selectedIndex < highlightItems.length ? selectedIndex : 0;
  const current = highlightItems[safeIndex] || highlightItems[0];

  useEffect(() => {
    setIsPlayingVideo(false);
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
      videoRef.current.muted = true;
    }
  }, [safeIndex]);

  const handleMouseEnter = () => {
    if (current?.type === 'video' && videoRef.current) {
      const p = videoRef.current.play();
      if (p !== undefined) {
        p.then(() => setIsPlayingVideo(true)).catch(() => {});
      }
    }
  };

  const handleMouseLeave = () => {
    if (current?.type === 'video' && videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
      setIsPlayingVideo(false);
    }
  };

  if (highlightItems.length === 0) {
    return null;
  }

  const isCollection = Boolean(current.photos && current.photos.length > 1);
  const totalPhotos = isCollection ? current.photos!.length : 1;
  const displayImage = current.coverPhoto || (current.photos && current.photos.length > 0 ? current.photos[0].url : current.url);

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full space-y-6">

      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-[#E5DFC9] pb-4">
        <div className="space-y-1">
          <div className="flex items-center space-x-2 text-[11px] font-mono font-bold tracking-widest text-[#800020] uppercase">
            <Sparkles className="w-3.5 h-3.5 text-[#C5A059]" />
            <span>CURATED FESTIVAL SELECTION</span>
          </div>
          <h2 className="font-cinzel font-extrabold text-2xl sm:text-3xl lg:text-4xl text-[#1C1917] tracking-tight">
            COLORIDO <span className="text-[#800020]">HIGHLIGHTS</span>
          </h2>
        </div>
        <p className="text-xs text-[#6C665F] max-w-md font-sans leading-relaxed">
          The defining moments handpicked by the Secretariat — capturing the heart, fire, and spirit of R.V.R. &amp; J.C. College of Engineering.
        </p>
      </div>

      {/* Large Cinematic Horizontal Feature Card (10 photos = ONE Highlight card) */}
      <div
        onClick={() => onSelectMedia(current)}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className="group relative w-full h-[360px] sm:h-[460px] lg:h-[520px] rounded-3xl overflow-hidden cursor-pointer shadow-xl border border-[#E5DFC9] bg-[#1C1917] transition-all duration-300 hover:shadow-2xl"
      >
        {/* Background Image with Cinematic Scrim */}
        <img
          key={current.id}
          src={displayImage}
          alt={current.title}
          className={`w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105 ${
            current.type === 'video' && isPlayingVideo ? 'opacity-0' : 'opacity-100'
          }`}
          style={{
            objectPosition: current.focalPoint ? `${current.focalPoint.x}% ${current.focalPoint.y}%` : 'center',
          }}
        />

        {/* Video Player on Hover */}
        {current.type === 'video' && (
          <video
            ref={videoRef}
            src={current.url}
            poster={displayImage}
            muted
            loop
            playsInline
            preload="metadata"
            className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ${
              isPlayingVideo ? 'opacity-100 z-[5]' : 'opacity-0 pointer-events-none'
            }`}
          />
        )}

        {/* Double Scrim Gradient for Ultra-Legible Editorial Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#1C1917] via-[#1C1917]/50 to-transparent pointer-events-none z-10" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#1C1917]/80 via-transparent to-transparent hidden sm:block pointer-events-none z-10" />

        {/* Top Badges */}
        <div className="absolute top-6 left-6 right-6 flex items-center justify-between z-20">
          <div className="flex items-center space-x-2">
            <span className="px-3 py-1 rounded-full bg-[#800020] text-white text-[11px] font-mono font-bold tracking-wider uppercase flex items-center space-x-1.5 shadow-md border border-white/10">
              <Sparkles className="w-3 h-3 text-[#C5A059]" />
              <span>FEATURED HIGHLIGHT #{safeIndex + 1}</span>
            </span>
            <span className="px-3 py-1 rounded-full bg-[#1C1917]/80 backdrop-blur-md text-[#C5A059] border border-[#C5A059]/40 text-[11px] font-mono font-bold uppercase">
              {current.category}
            </span>
            {isCollection && (
              <span className="px-3 py-1 rounded-full bg-amber-500/20 backdrop-blur-md text-amber-300 border border-amber-400/50 text-[11px] font-mono font-bold flex items-center space-x-1">
                <Layers className="w-3 h-3" />
                <span>{totalPhotos} PHOTOS</span>
              </span>
            )}
          </div>

          {current.type === 'video' && (
            <div className={`px-3 py-1 rounded-full text-xs font-mono font-bold flex items-center space-x-1.5 border transition-all ${
              isPlayingVideo
                ? 'bg-emerald-600 text-white border-emerald-400/50 shadow-md animate-pulse'
                : 'bg-black/60 backdrop-blur-md text-white border-white/20'
            }`}>
              <Play className="w-3 h-3 fill-white" />
              <span>{isPlayingVideo ? 'PREVIEW PLAYING' : current.duration || 'Video'}</span>
            </div>
          )}
        </div>

        {/* Bottom Editorial Content */}
        <div className="absolute bottom-0 inset-x-0 p-6 sm:p-10 z-10 space-y-3 max-w-3xl">
          <div className="flex items-center space-x-3 text-xs font-mono text-[#C5A059]">
            <span className="flex items-center space-x-1">
              <Calendar className="w-3.5 h-3.5" />
              <span>{new Date(current.createdAt).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
            </span>
            <span>•</span>
            <span className="flex items-center space-x-1 text-white/80">
              <MapPin className="w-3.5 h-3.5 text-[#C5A059]" />
              <span>{current.location || 'R.V.R. & J.C. Campus'}</span>
            </span>
            {current.eventTitle && (
              <>
                <span>•</span>
                <span className="text-white font-bold">{current.eventTitle}</span>
              </>
            )}
          </div>

          <h3 className="font-cinzel font-bold text-2xl sm:text-3xl lg:text-4xl text-white tracking-wide leading-tight group-hover:text-[#F5F2EB] transition-colors">
            {current.title}
          </h3>

          <p className="text-xs sm:text-sm text-white/80 font-sans line-clamp-2 leading-relaxed max-w-2xl">
            {current.description}
          </p>

          <div className="pt-2 flex items-center space-x-2 text-xs font-bold text-white group-hover:text-[#C5A059] transition-colors">
            <span>{current.type === 'video' ? 'Play Highlight Video' : isCollection ? 'Explore Collection In Lightbox' : 'View Full Resolution'}</span>
            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
          </div>
        </div>
      </div>

      {/* Selectable Highlight Thumbnails Row */}
      <div className="space-y-2 pt-2">
        <div className="flex items-center justify-between text-xs font-mono text-[#6C665F]">
          <span>SELECT HIGHLIGHT ({safeIndex + 1} OF {highlightItems.length})</span>
          <span className="text-[11px] text-[#800020] font-bold">CLICK TO SWITCH FEATURE</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
          {highlightItems.map((item, idx) => {
            const isSelected = idx === safeIndex;
            const thumb = item.coverPhoto || item.thumbnailUrl || item.url;
            const hasMultiple = Boolean(item.photos && item.photos.length > 1);

            return (
              <button
                key={item.id}
                onClick={() => setSelectedIndex(idx)}
                className={`group/thumb relative h-24 rounded-2xl overflow-hidden border text-left transition-all cursor-pointer ${isSelected
                    ? 'border-[#800020] ring-2 ring-[#800020]/40 scale-[1.03] shadow-md'
                    : 'border-[#E5DFC9] opacity-70 hover:opacity-100 hover:border-[#800020]/50'
                  }`}
              >
                <img
                  src={thumb}
                  alt={item.title}
                  className="w-full h-full object-cover transition-transform group-hover/thumb:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />

                {item.type === 'video' && (
                  <div className="absolute top-1.5 right-1.5 p-1 rounded-full bg-black/60 text-white">
                    <Play className="w-2.5 h-2.5 fill-white" />
                  </div>
                )}

                {hasMultiple && (
                  <div className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded-full bg-amber-500/80 text-black font-mono font-bold text-[8px] flex items-center space-x-0.5">
                    <Layers className="w-2 h-2" />
                    <span>{item.photos!.length}</span>
                  </div>
                )}

                <div className="absolute bottom-2 left-2 right-2">
                  <p className="text-[10px] font-mono font-bold text-[#C5A059] uppercase tracking-wider line-clamp-1">
                    {item.category}
                  </p>
                  <p className="text-[11px] font-bold text-white leading-tight line-clamp-1">
                    {item.title}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

    </section>
  );
};
