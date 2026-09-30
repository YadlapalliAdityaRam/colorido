import React from 'react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';

interface GalleryItem {
  title: string;
  image: string;
  category?: string;
}

interface GalleryLightboxModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: GalleryItem[];
  currentIndex: number;
  onSelectIndex: (index: number) => void;
}

export const GalleryLightboxModal: React.FC<GalleryLightboxModalProps> = ({
  isOpen,
  onClose,
  items,
  currentIndex,
  onSelectIndex,
}) => {
  if (!isOpen || items.length === 0) return null;

  const currentItem = items[currentIndex] || items[0];

  const handlePrev = () => {
    onSelectIndex((currentIndex - 1 + items.length) % items.length);
  };

  const handleNext = () => {
    onSelectIndex((currentIndex + 1) % items.length);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-5xl h-[80vh] flex flex-col justify-between bg-[#1C1917] rounded-3xl overflow-hidden border border-[#C5A059]/40 shadow-2xl">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-[#2C2825]">
          <div>
            <span className="text-[10px] font-mono text-[#C5A059] uppercase tracking-widest block font-bold">
              GLIMPSES FROM COLORIDO ({currentIndex + 1} / {items.length})
            </span>
            <h3 className="font-cinzel font-bold text-base text-white">
              {currentItem.title}
            </h3>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-full text-white/70 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Center Image Display with Prev/Next Controls */}
        <div className="relative flex-1 bg-black flex items-center justify-center overflow-hidden p-4">
          <img
            src={currentItem.image}
            alt={currentItem.title}
            className="max-h-full max-w-full object-contain rounded-xl shadow-2xl transition-all duration-300"
          />

          <button
            onClick={handlePrev}
            className="absolute left-4 p-3 rounded-full bg-black/60 text-white hover:bg-[#800020] transition-colors border border-white/20"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>

          <button
            onClick={handleNext}
            className="absolute right-4 p-3 rounded-full bg-black/60 text-white hover:bg-[#800020] transition-colors border border-white/20"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        </div>

        {/* Thumbnail Bar */}
        <div className="p-4 bg-[#2C2825] border-t border-white/10 flex items-center justify-center space-x-3 overflow-x-auto">
          {items.map((item, idx) => (
            <button
              key={idx}
              onClick={() => onSelectIndex(idx)}
              className={`relative w-16 h-12 rounded-lg overflow-hidden border-2 transition-all shrink-0 ${
                idx === currentIndex ? 'border-[#C5A059] scale-105' : 'border-transparent opacity-60 hover:opacity-100'
              }`}
            >
              <img src={item.image} alt={item.title} className="w-full h-full object-cover" />
            </button>
          ))}
        </div>

      </div>
    </div>
  );
};

export default GalleryLightboxModal;
