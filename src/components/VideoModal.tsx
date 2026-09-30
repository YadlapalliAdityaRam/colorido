import React, { useState, useEffect, useRef } from 'react';
import { X, Play, Film, RotateCcw } from 'lucide-react';

interface VideoModalProps {
  isOpen: boolean;
  onClose: () => void;
  coverImage?: string;
  title?: string;
}

export const VideoModal: React.FC<VideoModalProps> = ({
  isOpen,
  onClose,
  coverImage = 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=2000&q=85',
  title = 'COLORIDO 2K26 — Teaser & Highlights',
}) => {
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (!isOpen) setIsPlaying(false);
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl bg-[#1C1917] rounded-3xl overflow-hidden border border-[#C5A059]/40 shadow-2xl">

        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-[#2C2825]">
          <div className="flex items-center space-x-2">
            <div className="p-1.5 rounded-full bg-[#800020] text-white">
              <Play className="w-4 h-4 fill-current" />
            </div>
            <div>
              <h3 className="font-cinzel font-bold text-sm text-white">
                {title}
              </h3>
              <p className="text-[10px] text-white/60 font-sans">
                R.V.R. &amp; J.C. College of Engineering (Autonomous)
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-full text-white/70 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Video Player Frame with Instagram Cover Screen */}
        <div className="relative aspect-video w-full bg-black flex items-center justify-center group overflow-hidden">
          {!isPlaying ? (
            /* Instagram-style Video Cover Poster Screen */
            <div
              onClick={() => {
                setIsPlaying(true);
                setTimeout(() => {
                  videoRef.current?.play().catch(() => {});
                }, 50);
              }}
              className="relative w-full h-full cursor-pointer flex items-center justify-center select-none"
            >
              <img
                src={coverImage}
                alt="Video Cover"
                className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-103"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-black/40" />

              {/* Top Badges */}
              <div className="absolute top-4 inset-x-4 flex items-center justify-between pointer-events-none z-10">
                <span className="px-3 py-1 rounded-full bg-black/60 backdrop-blur-md text-white font-mono text-[10px] font-bold uppercase tracking-wider border border-white/20 flex items-center space-x-1.5">
                  <Film className="w-3 h-3 text-[#C5A059]" />
                  <span>OFFICIAL TEASER</span>
                </span>
                <span className="px-3 py-1 rounded-full bg-black/60 backdrop-blur-md text-white font-mono text-[10px] font-bold border border-white/20">
                  02:15
                </span>
              </div>

              {/* Center Instagram-style Play Button */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-10">
                <div className="w-20 h-20 rounded-full bg-white/95 text-[#800020] flex items-center justify-center shadow-2xl border-4 border-white/50 group-hover:scale-110 active:scale-95 transition-all">
                  <Play className="w-8 h-8 fill-[#800020] translate-x-1" />
                </div>
                <span className="mt-3 px-3.5 py-1 rounded-full bg-black/70 backdrop-blur-md text-white font-mono text-xs font-bold uppercase tracking-widest border border-white/25 shadow-lg group-hover:bg-[#800020] transition-colors">
                  Play Video
                </span>
              </div>

              {/* Bottom Caption Overlay */}
              <div className="absolute bottom-4 inset-x-4 pointer-events-none z-10">
                <p className="text-[10px] font-mono text-[#C5A059] uppercase tracking-widest font-bold">
                  NATIONAL FESTIVAL FILM
                </p>
                <h4 className="text-white font-cinzel font-bold text-base truncate">
                  Experience The Grand Energy of COLORIDO 2K26
                </h4>
              </div>
            </div>
          ) : (
            /* Active Playing Video */
            <div className="relative w-full h-full flex items-center justify-center bg-black">
              <video
                ref={videoRef}
                className="w-full h-full object-contain"
                src="/video1.mp4"
                controls
                autoPlay
                playsInline
                onEnded={() => setIsPlaying(false)}
                onLoadedMetadata={(e) => {
                  e.currentTarget.playbackRate = 0.8;
                }}
              >
                <source src="/video1.mp4" type="video/mp4" />
                <source src="/video1" type="video/mp4" />
                Your browser does not support the video tag.
              </video>

              {/* Show Cover button */}
              <button
                onClick={() => {
                  if (videoRef.current) videoRef.current.pause();
                  setIsPlaying(false);
                }}
                className="absolute top-4 right-4 z-20 px-3 py-1.5 rounded-lg bg-black/75 hover:bg-black text-white text-xs font-mono font-bold border border-white/25 backdrop-blur-md flex items-center space-x-1.5 shadow-lg transition-all opacity-0 group-hover:opacity-100 cursor-pointer"
                title="Return to Video Cover"
              >
                <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
                <span>Show Cover</span>
              </button>
            </div>
          )}
        </div>

        {/* Video Footer Caption */}
        <div className="px-6 py-3 bg-[#1C1917] text-xs text-[#FAF8F3]/80 font-sans flex justify-between items-center border-t border-white/10">
          <span>National Level Cultural &amp; Sports Festival · Sept 30, 2026</span>
          <span className="font-mono text-[#C5A059] font-bold">R.V.R. &amp; J.C. CAMPUS</span>
        </div>

      </div>
    </div>
  );
};

export default VideoModal;
