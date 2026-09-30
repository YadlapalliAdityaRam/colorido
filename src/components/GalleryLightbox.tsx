import React, { useEffect, useCallback, useState, useRef } from 'react';
import {
  X, ChevronLeft, ChevronRight, Calendar, MapPin, Film, Image as ImageIcon,
  Sparkles, Layers, Play, Pause, Volume2, VolumeX, Maximize, Minimize, RotateCcw
} from 'lucide-react';
import type { MediaItem } from '../types';
import { formatDuration } from '../utils/videoProcessor';

interface GalleryLightboxProps {
  items: MediaItem[];
  currentIndex: number | null;
  initialCollectionPhotoIndex?: number;
  isOpen: boolean;
  sharedTransitionMediaId?: string | null;
  onClose: () => void;
  onNavigate: (newIndex: number) => void;
}

export const GalleryLightbox: React.FC<GalleryLightboxProps> = ({
  items,
  currentIndex,
  initialCollectionPhotoIndex = 0,
  isOpen,
  sharedTransitionMediaId = null,
  onClose,
  onNavigate,
}) => {
  const [collectionPhotoIndex, setCollectionPhotoIndex] = useState<number>(0);
  const [isVideoPlaying, setIsVideoPlaying] = useState<boolean>(false);
  const [videoCurrentTime, setVideoCurrentTime] = useState<number>(0);
  const [videoDuration, setVideoDuration] = useState<number>(0);
  const [videoVolume, setVideoVolume] = useState<number>(1);
  const [videoIsMuted, setVideoIsMuted] = useState<boolean>(false);
  const [videoIsFullscreen, setVideoIsFullscreen] = useState<boolean>(false);
  const [showControls, setShowControls] = useState<boolean>(true);

  const videoRef = useRef<HTMLVideoElement>(null);
  const videoContainerRef = useRef<HTMLDivElement>(null);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Sync initial photo index when item changes, reset video playback to cover
  useEffect(() => {
    setCollectionPhotoIndex(initialCollectionPhotoIndex);
    setIsVideoPlaying(false);
    setVideoCurrentTime(0);
    setVideoDuration(0);
  }, [currentIndex, initialCollectionPhotoIndex, isOpen]);

  // Touch swipe support
  const touchStartX = useRef<number>(0);
  const touchEndX = useRef<number>(0);

  const activeItem = currentIndex !== null ? items[currentIndex] : null;
  const isCollection = Boolean(activeItem?.photos && activeItem.photos.length > 1);
  const totalItems = items.length;
  const collectionTotal = isCollection ? activeItem!.photos!.length : 1;

  const handlePrev = useCallback(() => {
    if (currentIndex === null) return;
    if (isCollection && collectionPhotoIndex > 0) {
      setCollectionPhotoIndex(prev => prev - 1);
    } else {
      const prevItemIndex = (currentIndex - 1 + totalItems) % totalItems;
      onNavigate(prevItemIndex);
      const prevItem = items[prevItemIndex];
      if (prevItem?.photos && prevItem.photos.length > 1) {
        setCollectionPhotoIndex(prevItem.photos.length - 1);
      } else {
        setCollectionPhotoIndex(0);
      }
    }
  }, [currentIndex, isCollection, collectionPhotoIndex, totalItems, onNavigate, items]);

  const handleNext = useCallback(() => {
    if (currentIndex === null) return;
    if (isCollection && collectionPhotoIndex < collectionTotal - 1) {
      setCollectionPhotoIndex(prev => prev + 1);
    } else {
      const nextItemIndex = (currentIndex + 1) % totalItems;
      onNavigate(nextItemIndex);
      setCollectionPhotoIndex(0);
    }
  }, [currentIndex, isCollection, collectionPhotoIndex, collectionTotal, totalItems, onNavigate]);

  // Video playback toggling
  const togglePlayPause = () => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play().catch(() => {});
      setIsVideoPlaying(true);
    } else {
      videoRef.current.pause();
      setIsVideoPlaying(false);
    }
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    const nextMuted = !videoRef.current.muted;
    videoRef.current.muted = nextMuted;
    setVideoIsMuted(nextMuted);
  };

  const handleVolumeChange = (newVol: number) => {
    if (!videoRef.current) return;
    videoRef.current.volume = newVol;
    setVideoVolume(newVol);
    const muted = newVol === 0;
    videoRef.current.muted = muted;
    setVideoIsMuted(muted);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const targetTime = parseFloat(e.target.value);
    if (videoRef.current) {
      videoRef.current.currentTime = targetTime;
      setVideoCurrentTime(targetTime);
    }
  };

  const toggleFullscreen = () => {
    const el = videoContainerRef.current;
    if (!el) return;
    if (!document.fullscreenElement) {
      el.requestFullscreen().catch(() => {});
      setVideoIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setVideoIsFullscreen(false);
    }
  };

  // Keyboard navigation & video shortcuts
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (document.fullscreenElement) {
          document.exitFullscreen().catch(() => {});
          setVideoIsFullscreen(false);
        } else {
          onClose();
        }
      } else if (e.key === 'ArrowLeft') {
        handlePrev();
      } else if (e.key === 'ArrowRight') {
        handleNext();
      } else if (e.key === ' ' && activeItem?.type === 'video') {
        e.preventDefault();
        togglePlayPause();
      } else if ((e.key === 'm' || e.key === 'M') && activeItem?.type === 'video') {
        toggleMute();
      } else if ((e.key === 'f' || e.key === 'F') && activeItem?.type === 'video') {
        toggleFullscreen();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, handlePrev, handleNext, activeItem]);

  // Auto-hide controls when playing
  const handleMouseMove = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    controlsTimeoutRef.current = setTimeout(() => {
      if (isVideoPlaying && !videoRef.current?.paused) {
        setShowControls(false);
      }
    }, 2800);
  };

  // Prevent body scrolling while modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.body.style.overflow = '';
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    };
  }, [isOpen]);

  if (!isOpen || currentIndex === null || !activeItem) {
    return null;
  }

  // Active display image
  const currentPhoto = isCollection && activeItem.photos ? activeItem.photos[collectionPhotoIndex] : null;
  const displayUrl = currentPhoto?.url || activeItem.coverPhoto || activeItem.url;

  // Touch Swipe Handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.targetTouches[0].clientX;
  };

  const handleTouchEnd = () => {
    const distance = touchStartX.current - touchEndX.current;
    if (distance > 45) {
      handleNext();
    } else if (distance < -45) {
      handlePrev();
    }
  };

  // Compute exact aspect ratio & orientation for video
  const videoRatio = activeItem.width && activeItem.height
    ? (activeItem.width / activeItem.height)
    : (activeItem.aspectRatio === '9:16' ? 9 / 16
      : activeItem.aspectRatio === '1:1' ? 1
      : activeItem.aspectRatio === '4:3' ? 4 / 3
      : activeItem.aspectRatio === '3:4' ? 3 / 4
      : activeItem.aspectRatio === '21:9' ? 21 / 9
      : 16 / 9);

  const isPortraitVideo = videoRatio < 0.9;
  const isSquareVideo = videoRatio >= 0.95 && videoRatio <= 1.05;
  const isUltraWideVideo = videoRatio > 2.05;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-xl animate-in fade-in duration-200 select-none"
      role="dialog"
      aria-modal="true"
      aria-label={activeItem.title}
      onTouchStart={handleTouchStart}
      onTouchMove={(e) => { touchEndX.current = e.targetTouches[0].clientX; }}
      onTouchEnd={handleTouchEnd}
      onMouseMove={handleMouseMove}
    >
      {/* Top Header Bar */}
      <div className="absolute top-0 inset-x-0 h-20 px-6 flex items-center justify-between z-30 bg-gradient-to-b from-black/85 via-black/50 to-transparent">
        <div className="flex items-center space-x-3">
          <div className="px-2.5 py-1 rounded-full bg-[#800020] text-white text-[11px] font-mono font-bold tracking-wider uppercase flex items-center space-x-1.5 shadow-sm">
            {activeItem.type === 'video' ? <Film className="w-3 h-3" /> : <ImageIcon className="w-3 h-3" />}
            <span>{activeItem.category}</span>
          </div>

          {activeItem.featured && (
            <span className="px-2.5 py-0.5 rounded-full bg-[#C5A059]/20 border border-[#C5A059] text-[#C5A059] text-[10px] font-mono font-bold tracking-wider uppercase flex items-center space-x-1">
              <Sparkles className="w-2.5 h-2.5" />
              <span>HIGHLIGHT</span>
            </span>
          )}

          {isCollection ? (
            <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 border border-amber-400 text-amber-300 text-xs font-mono font-bold flex items-center space-x-1">
              <Layers className="w-3 h-3" />
              <span>{String(collectionPhotoIndex + 1).padStart(2, '0')} / {String(collectionTotal).padStart(2, '0')}</span>
            </span>
          ) : (
            <span className="text-white/60 text-xs font-mono">
              {currentIndex + 1} <span className="text-white/30">/</span> {totalItems}
            </span>
          )}
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={onClose}
            className="p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white/90 hover:text-white transition-all focus:outline-none cursor-pointer"
            title="Close viewer (Esc)"
            aria-label="Close viewer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Prev / Next Arrows */}
      <button
        onClick={handlePrev}
        className="absolute left-3 sm:left-6 top-1/2 -translate-y-1/2 z-30 p-3 sm:p-4 rounded-full bg-black/60 hover:bg-black/90 text-white/90 hover:text-white border border-white/20 backdrop-blur-md transition-all focus:outline-none cursor-pointer active:scale-95"
        title="Previous photo (←)"
        aria-label="Previous photo"
      >
        <ChevronLeft className="w-6 h-6" />
      </button>

      <button
        onClick={handleNext}
        className="absolute right-3 sm:right-6 top-1/2 -translate-y-1/2 z-30 p-3 sm:p-4 rounded-full bg-black/60 hover:bg-black/90 text-white/90 hover:text-white border border-white/20 backdrop-blur-md transition-all focus:outline-none cursor-pointer active:scale-95"
        title="Next photo (→)"
        aria-label="Next photo"
      >
        <ChevronRight className="w-6 h-6" />
      </button>

      {/* Main Content Area */}
      <div className="relative w-full h-full flex flex-col justify-between p-4 sm:p-10 pt-20 pb-24 z-10 select-none">

        {/* Media Frame (Never stretched, squashed or forced into 16:9) */}
        <div className="flex-1 flex items-center justify-center overflow-hidden min-h-0">
          {activeItem.type === 'video' ? (
            <div
              ref={videoContainerRef}
              className={`relative rounded-2xl overflow-hidden bg-black shadow-2xl border border-white/10 group flex items-center justify-center transition-all duration-300 ${
                isPortraitVideo
                  ? 'max-w-[400px] sm:max-w-[420px] max-h-[58vh] sm:max-h-[68vh] w-full'
                  : isSquareVideo
                  ? 'max-w-[58vh] sm:max-w-[60vh] max-h-[52vh] sm:max-h-[60vh] w-full aspect-square'
                  : isUltraWideVideo
                  ? 'max-w-6xl max-h-[50vh] sm:max-h-[58vh] w-full'
                  : 'max-w-5xl max-h-[52vh] sm:max-h-[62vh] w-full'
              }`}
              style={{
                aspectRatio: !isSquareVideo ? `${videoRatio}` : undefined,
              }}
            >
              {!isVideoPlaying ? (
                /* INSTAGRAM-STYLE VIDEO COVER SCREEN (SEEN BEFORE PLAYING) */
                <div
                  onClick={() => {
                    setIsVideoPlaying(true);
                    setTimeout(() => {
                      if (videoRef.current) {
                        videoRef.current.play().catch(() => {});
                      }
                    }, 60);
                  }}
                  className="relative w-full h-full cursor-pointer overflow-hidden flex items-center justify-center select-none"
                >
                  {/* High-res cover image matching natural video proportions */}
                  <img
                    src={activeItem.coverPhoto || activeItem.thumbnailUrl || activeItem.url}
                    alt={activeItem.title}
                    className="w-full h-full object-contain transition-transform duration-700 ease-out group-hover:scale-[1.02]"
                    style={{ viewTransitionName: activeItem.id === sharedTransitionMediaId ? 'festival-selected-media' : undefined }}
                  />

                  {/* Gradient Scrim Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-black/45" />

                  {/* Top Instagram-style Badges */}
                  <div className="absolute top-4 inset-x-4 flex items-center justify-between pointer-events-none z-10">
                    <span className="px-3 py-1 rounded-full bg-black/60 backdrop-blur-md text-white font-mono text-[10px] font-bold uppercase tracking-wider border border-white/20 flex items-center space-x-1.5 shadow-md">
                      <Film className="w-3 h-3 text-[#C5A059]" />
                      <span>{isPortraitVideo ? 'MOBILE REEL' : isUltraWideVideo ? 'PANORAMIC' : 'VIDEO REEL'} · {activeItem.category}</span>
                    </span>

                    <span className="px-3 py-1 rounded-full bg-black/60 backdrop-blur-md text-white font-mono text-[10px] font-bold border border-white/20 shadow-md">
                      {activeItem.duration || 'Video'}
                    </span>
                  </div>

                  {/* Centered Instagram Play Button */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-10">
                    <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-white/95 hover:bg-white text-[#800020] flex items-center justify-center shadow-[0_0_50px_rgba(0,0,0,0.8)] border-4 border-white/50 group-hover:scale-110 active:scale-95 transition-all duration-300">
                      <Play className="w-8 h-8 sm:w-10 sm:h-10 fill-[#800020] translate-x-1" />
                    </div>
                    <span className="mt-3 px-3.5 py-1 rounded-full bg-black/70 backdrop-blur-md text-white font-mono text-xs font-bold uppercase tracking-widest border border-white/25 shadow-lg group-hover:bg-[#800020] transition-colors">
                      Watch Video
                    </span>
                  </div>

                  {/* Bottom Cover Title Hint */}
                  <div className="absolute bottom-4 inset-x-4 pointer-events-none z-10">
                    <span className="text-[10px] font-mono text-[#C5A059] uppercase tracking-widest block font-bold">
                      {isPortraitVideo ? 'PORTRAIT 9:16 REEL' : isSquareVideo ? '1:1 SQUARE REEL' : 'VIDEO COVER'}
                    </span>
                    <h4 className="text-white font-cinzel font-bold text-sm sm:text-base truncate drop-shadow">
                      {activeItem.title}
                    </h4>
                  </div>
                </div>
              ) : (
                /* ACTIVE PLAYING HTML5 VIDEO WITH COMPREHENSIVE PLAYBACK CONTROLS */
                <div
                  className="relative w-full h-full flex items-center justify-center bg-black cursor-pointer"
                  onClick={togglePlayPause}
                >
                  <video
                    ref={videoRef}
                    key={activeItem.id}
                    src={activeItem.url}
                    poster={activeItem.coverPhoto || activeItem.thumbnailUrl}
                    playsInline
                    autoPlay
                    onTimeUpdate={() => {
                      if (videoRef.current) {
                        setVideoCurrentTime(videoRef.current.currentTime);
                      }
                    }}
                    onLoadedMetadata={() => {
                      if (videoRef.current) {
                        setVideoDuration(videoRef.current.duration);
                      }
                    }}
                    onEnded={() => setIsVideoPlaying(false)}
                    className="w-full h-full object-contain"
                  />

                  {/* Interactive Playback Controls Bar */}
                  <div
                    onClick={(e) => e.stopPropagation()}
                    className={`absolute bottom-0 inset-x-0 px-3 pt-5 pb-4 sm:px-4 sm:pt-6 sm:pb-5 bg-gradient-to-t from-black/95 via-black/70 to-transparent flex flex-col gap-2 transition-opacity duration-300 z-30 ${
                      showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
                    }`}
                  >
                    {/* Scrubbable Progress Bar */}
                    <div className="flex items-center space-x-2 w-full">
                      <span className="text-[10px] font-mono text-white/80 min-w-10 text-right">
                        {formatDuration(videoCurrentTime)}
                      </span>
                      <input
                        type="range"
                        min="0"
                        max={videoDuration || 100}
                        step="0.1"
                        value={videoCurrentTime}
                        onChange={handleSeek}
                        className="flex-1 h-1.5 bg-white/20 rounded-lg appearance-none cursor-pointer accent-[#800020] hover:h-2 transition-all"
                      />
                      <span className="text-[10px] font-mono text-white/60 min-w-10">
                        {formatDuration(videoDuration || 0)}
                      </span>
                    </div>

                    {/* Bottom Controls Row: Play/Pause, Volume, Reset Cover, Fullscreen */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={togglePlayPause}
                          className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
                          title={videoRef.current?.paused ? 'Play (Space)' : 'Pause (Space)'}
                        >
                          {videoRef.current?.paused ? (
                            <Play className="w-4 h-4 fill-white" />
                          ) : (
                            <Pause className="w-4 h-4 fill-white" />
                          )}
                        </button>

                        {/* Volume & Mute */}
                        <div className="flex items-center space-x-1.5 group/vol">
                          <button
                            onClick={toggleMute}
                            className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
                            title={videoIsMuted ? 'Unmute (M)' : 'Mute (M)'}
                          >
                            {videoIsMuted || videoVolume === 0 ? (
                              <VolumeX className="w-4 h-4 text-rose-400" />
                            ) : (
                              <Volume2 className="w-4 h-4 text-white" />
                            )}
                          </button>
                          <input
                            type="range"
                            min="0"
                            max="1"
                            step="0.05"
                            value={videoIsMuted ? 0 : videoVolume}
                            onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                            className="w-16 h-1 bg-white/20 rounded-lg appearance-none cursor-pointer accent-[#C5A059]"
                            title="Volume"
                          />
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        {/* Return to Cover */}
                        <button
                          onClick={() => {
                            if (videoRef.current) videoRef.current.pause();
                            setIsVideoPlaying(false);
                          }}
                          className="px-2.5 py-1 rounded-lg bg-black/60 hover:bg-black/90 text-white text-[11px] font-mono font-bold border border-white/20 flex items-center space-x-1 transition-colors cursor-pointer"
                          title="Return to Video Cover Screen"
                        >
                          <RotateCcw className="w-3 h-3 text-amber-400" />
                          <span className="hidden sm:inline">Cover</span>
                        </button>

                        {/* Fullscreen */}
                        <button
                          onClick={toggleFullscreen}
                          className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
                          title="Toggle Fullscreen (F)"
                        >
                          {videoIsFullscreen ? (
                            <Minimize className="w-4 h-4" />
                          ) : (
                            <Maximize className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="relative max-w-7xl max-h-[78vh] sm:max-h-[82vh] w-full flex items-center justify-center animate-in zoom-in-95 duration-200">
              <img
                key={`${activeItem.id}-${collectionPhotoIndex}`}
                src={displayUrl}
                alt={currentPhoto?.caption || activeItem.title}
                className="max-h-[78vh] sm:max-h-[82vh] max-w-full object-contain rounded-xl shadow-2xl border border-white/10"
                style={{ viewTransitionName: activeItem.id === sharedTransitionMediaId ? 'festival-selected-media' : undefined }}
              />
            </div>
          )}
        </div>

        {/* Bottom Details Caption */}
        <div className="max-w-4xl mx-auto w-full pt-4 text-center sm:text-left flex flex-col sm:flex-row items-center justify-between gap-4 bg-gradient-to-t from-black/85 via-black/50 to-transparent p-4 rounded-2xl border border-white/10 backdrop-blur-md">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <h3 className="font-cinzel font-bold text-lg sm:text-xl text-white tracking-wide">
                {activeItem.title}
              </h3>
              {isCollection && (
                <span className="text-[#C5A059] text-xs font-mono font-bold">
                  ({String(collectionPhotoIndex + 1).padStart(2, '0')} / {String(collectionTotal).padStart(2, '0')})
                </span>
              )}
            </div>

            <p className="text-xs text-white/80 max-w-2xl line-clamp-2 leading-relaxed">
              {currentPhoto?.caption || activeItem.description || 'COLORIDO 2K26 Festival Archive'}
            </p>

            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 pt-1 text-[11px] font-mono text-white/60">
              <span className="flex items-center space-x-1">
                <Calendar className="w-3 h-3 text-[#C5A059]" />
                <span>{new Date(activeItem.createdAt).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
              </span>
              {activeItem.location && (
                <span className="flex items-center space-x-1">
                  <MapPin className="w-3 h-3 text-[#800020]" />
                  <span>{activeItem.location}</span>
                </span>
              )}
              {activeItem.eventTitle && (
                <span className="px-2 py-0.5 rounded bg-white/10 text-white/80">
                  {activeItem.eventTitle}
                </span>
              )}
              {(currentPhoto?.width || activeItem.width) && (
                <span className="px-2 py-0.5 rounded bg-white/15 text-white/90 font-mono text-[10px]">
                  {currentPhoto?.width || activeItem.width} × {currentPhoto?.height || activeItem.height} ({currentPhoto?.aspectRatio || activeItem.aspectRatio || 'Natural'})
                </span>
              )}
            </div>
          </div>

          {/* Quick thumbnail strip: If collection, show collection thumbnails! */}
          <div className="flex items-center space-x-2 overflow-x-auto max-w-xs shrink-0 py-1">
            {isCollection && activeItem.photos ? (
              activeItem.photos.map((photo, pIdx) => (
                <button
                  key={photo.id || pIdx}
                  onClick={() => setCollectionPhotoIndex(pIdx)}
                  className={`relative w-12 h-12 rounded-lg overflow-hidden border transition-all shrink-0 cursor-pointer ${pIdx === collectionPhotoIndex
                      ? 'border-[#C5A059] ring-2 ring-[#C5A059]/50 scale-105'
                      : 'border-white/20 opacity-50 hover:opacity-100'
                    }`}
                  title={photo.caption || `Photo ${pIdx + 1}`}
                >
                  <img
                    src={photo.url}
                    alt={photo.caption || `Photo ${pIdx + 1}`}
                    className="w-full h-full object-cover"
                  />
                </button>
              ))
            ) : (
              items.slice(0, 10).map((item, idx) => (
                <button
                  key={item.id}
                  onClick={() => onNavigate(idx)}
                  className={`relative w-12 h-12 rounded-lg overflow-hidden border transition-all shrink-0 cursor-pointer ${idx === currentIndex
                      ? 'border-[#C5A059] ring-2 ring-[#C5A059]/40 scale-105'
                      : 'border-white/20 opacity-50 hover:opacity-100'
                    }`}
                  title={item.title}
                >
                  <img
                    src={item.coverPhoto || item.thumbnailUrl || item.url}
                    alt={item.title}
                    className="w-full h-full object-cover"
                  />
                </button>
              ))
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
