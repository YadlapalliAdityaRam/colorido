import React, { useState, useEffect } from 'react';
import { Search, X, ArrowRight } from 'lucide-react';
import type { EventItem } from '../types';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  events: EventItem[];
  onSelectEvent: (slug: string) => void;
  onSelectVenue?: (slug: string) => void;
}

export const SearchModal: React.FC<SearchModalProps> = ({
  isOpen,
  onClose,
  events,
  onSelectEvent,
  onSelectVenue,
}) => {
  const [query, setQuery] = useState('');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
      }
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const filteredEvents = query.trim() === '' ? events.slice(0, 5) : events.filter(e =>
    e.title.toLowerCase().includes(query.toLowerCase()) ||
    e.category.toLowerCase().includes(query.toLowerCase()) ||
    e.venueName.toLowerCase().includes(query.toLowerCase()) ||
    e.description.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="nf-modal-layer fixed inset-0 z-[100] flex items-start justify-center pt-20 px-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="w-full max-w-xl bg-white border border-[#E5E2DC] rounded-2xl shadow-2xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative border-b border-[#E5E2DC] p-4 flex items-center bg-[#FAF9F6]">
          <Search className="w-4 h-4 text-[#666461] absolute left-5" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search competitions, categories, venues..."
            className="w-full bg-white text-[#121212] placeholder-[#8C8A85] pl-10 pr-10 py-2.5 rounded-xl border border-[#E5E2DC] focus:outline-none focus:border-[#121212] text-xs font-medium"
            autoFocus
          />
          <button onClick={onClose} className="ml-3 p-1.5 text-[#666461] hover:text-[#121212]">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 overflow-y-auto max-h-96 space-y-2 bg-white">
          <div className="text-[10px] font-bold tracking-widest text-[#666461] uppercase px-2 mb-2">
            {query.trim() === '' ? 'Featured Events' : `Search Results (${filteredEvents.length})`}
          </div>

          {filteredEvents.map((evt) => (
            <div
              key={evt.id}
              onClick={() => {
                onSelectEvent(evt.slug);
                onClose();
              }}
              className="group flex items-center justify-between p-3 rounded-xl bg-[#FAF9F6] hover:bg-[#F4F2EC] border border-[#E5E2DC] transition-all cursor-pointer"
            >
              <div>
                <h4 className="text-xs font-bold text-[#121212] group-hover:text-[#B8860B] transition-colors">
                  {evt.title}
                </h4>
                <div className="flex items-center space-x-3 text-[11px] text-[#666461] mt-0.5">
                  <span className="uppercase tracking-wider font-semibold text-[#121212]">{evt.category}</span>
                  <span
                    onClick={(e) => {
                      e.stopPropagation();
                      if (onSelectVenue) onSelectVenue(evt.venueName);
                      onClose();
                    }}
                    className="hover:text-[#121212] underline cursor-pointer"
                  >
                    {evt.venueName}
                  </span>
                  <span>{evt.dateTime}</span>
                </div>
              </div>

              <ArrowRight className="w-4 h-4 text-[#666461] group-hover:translate-x-1 transition-transform" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
