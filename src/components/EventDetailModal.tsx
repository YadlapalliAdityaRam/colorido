import React, { useState } from 'react';
import { X, Calendar, MapPin, Share2 } from 'lucide-react';
import type { EventItem } from '../types';
import { downloadCalendarICS } from '../utils/calendar';
import { getEventBanner, isGlobalProfile } from '../utils/imageHelpers';

interface EventDetailModalProps {
  event: EventItem | null;
  onClose: () => void;
  onRegister: (event: EventItem) => void;
}

export const EventDetailModal: React.FC<EventDetailModalProps> = ({
  event,
  onClose,
  onRegister,
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'rules' | 'prizes'>('overview');
  const [copied, setCopied] = useState(false);

  if (!event) return null;

  const eventType = (event.type || 'sports').toLowerCase();
  const isSports = eventType === 'sports';
  const eventFormat = (event.format || 'solo').toUpperCase();
  const rulesList = Array.isArray(event.rules) ? event.rules : typeof event.rules === 'string' ? (event.rules as string).split('\n') : [];
  const prizeFirst = event.prizes?.first || '₹10,000';
  const prizeSecond = event.prizes?.second || '₹5,000';
  const prizeThird = event.prizes?.third || '₹2,500';

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.origin + `?event=${event.slug || event.id}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200">
      <div
        className="bg-white border border-[#E2E8F0] rounded-lg w-full max-w-3xl max-h-[92dvh] flex flex-col shadow-xl overflow-hidden relative text-[#0F172A]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-20 p-1.5 rounded-md bg-black/60 hover:bg-black/90 text-white border border-white/20 transition-colors shadow-xs cursor-pointer"
          aria-label="Close modal"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Editorial Photography / Global Profile Frame */}
        {(() => {
          const banner = getEventBanner(event);
          const isGlobal = isGlobalProfile(banner);
          return (
            <div className={`relative h-56 sm:h-64 w-full overflow-hidden border-b border-[#E2E8F0] flex items-center justify-center shrink-0 ${
              isGlobal ? 'bg-white p-4' : 'bg-[#0F172A]'
            }`}>
              <img
                src={banner}
                alt={event.title}
                onError={(e) => {
                  (e.target as HTMLImageElement).src = event?.type === 'cultural'
                    ? '/cultural_global_profile_photo.jpeg'
                    : '/global_sports_profile.jpeg';
                }}
                className={isGlobal ? 'max-h-full max-w-full object-contain' : 'w-full h-full object-cover'}
              />
              {!isGlobal && <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent pointer-events-none" />}

              <div className="absolute bottom-4 left-4 right-4 sm:bottom-5 sm:left-5 sm:right-5 space-y-1 z-10">
                <span className={`text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-md shadow-xs ${
                  isSports ? 'bg-[#800020] text-white' : 'bg-[#B45309] text-white'
                }`}>
                  {eventType.toUpperCase()} &middot; {event.category || 'General'}
                </span>
                <h2 className={`font-cinzel font-bold text-xl sm:text-2xl tracking-tight leading-tight ${
                  isGlobal ? 'text-[#0F172A] bg-white/80 backdrop-blur-xs px-2 py-0.5 rounded inline-block' : 'text-white'
                }`}>
                  {event.title}
                </h2>
                <p className={`text-xs font-normal max-w-xl ${isGlobal ? 'text-[#475569] bg-white/80 backdrop-blur-xs px-2 py-0.5 rounded' : 'text-slate-200'}`}>
                  {event.oneLineSummary || 'National Level Event at R.V.R. & J.C. Campus'}
                </p>
              </div>
            </div>
          );
        })()}

        {/* Quick Facts Strip */}
        <div className="bg-[#FAF9F6] border-y border-[#E5E2DC] px-6 py-3 flex flex-wrap items-center justify-between text-xs text-[#666461]">
          <div className="flex items-center space-x-2">
            <Calendar className="w-4 h-4 text-[#B8860B]" />
            <span className="text-[#121212] font-medium">{event.dateTime || '30 Sep 2026 · 10:00 AM'}</span>
          </div>
          <div className="flex items-center space-x-2">
            <MapPin className="w-4 h-4 text-[#B8860B]" />
            <span className="text-[#121212] font-medium">{event.venueName || 'Campus Ground'}</span>
          </div>
          <span>Format: <strong className="text-[#121212]">{eventFormat}</strong></span>
          <span className="font-semibold text-[#121212]">{event.seatsLeft ?? 30} Slots Left</span>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-[#E5E2DC] bg-[#FAF9F6] px-6 text-xs uppercase tracking-wider font-semibold">
          {['overview', 'rules', 'prizes'].map((t) => (
            <button
              key={t}
              onClick={() => setActiveTab(t as any)}
              className={`px-4 py-3 border-b-2 transition-all ${activeTab === t ? 'border-[#121212] text-[#121212] font-bold' : 'border-transparent text-[#666461] hover:text-[#121212]'
                }`}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6 text-xs text-[#121212] leading-relaxed">
          {activeTab === 'overview' && (
            <div className="space-y-4">
              <div>
                <h3 className="font-editorial text-xs font-bold text-[#666461] uppercase tracking-wider mb-1">About</h3>
                <p className="text-sm text-[#121212] leading-relaxed">{event.description || 'Inter-college competitive event.'}</p>
              </div>

              <div className="pt-3 border-t border-[#E5E2DC]">
                <h3 className="font-editorial text-xs font-bold text-[#666461] uppercase tracking-wider mb-1">Eligibility</h3>
                <p className="text-xs text-[#666461]">{event.eligibility || 'Open to all bonafide college students.'}</p>
              </div>
            </div>
          )}

          {activeTab === 'rules' && (
            <div className="space-y-3">
              <h3 className="font-editorial text-xs font-bold text-[#666461] uppercase tracking-wider mb-2">Rules & Regulations</h3>
              {rulesList.length > 0 ? (
                rulesList.map((rule, idx) => (
                  <div key={idx} className="p-3 bg-[#FAF9F6] border border-[#E5E2DC] rounded-xl flex items-start space-x-3 text-[#121212]">
                    <span className="text-[#B8860B] font-bold">{idx + 1}.</span>
                    <span>{rule}</span>
                  </div>
                ))
              ) : (
                <p className="text-xs text-[#666461]">Standard festival rules apply. Valid college identity card is mandatory.</p>
              )}
            </div>
          )}

          {activeTab === 'prizes' && (
            <div className="space-y-4">
              <h3 className="font-editorial text-xs font-bold text-[#666461] uppercase tracking-wider mb-2">Prizes</h3>
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="bg-[#FAF9F6] border border-[#E5E2DC] p-3 rounded-xl">
                  <span className="text-xs text-[#666461] block font-semibold">1ST PLACE</span>
                  <span className="font-bold text-sm text-[#B8860B] block mt-1">{prizeFirst}</span>
                </div>
                <div className="bg-[#FAF9F6] border border-[#E5E2DC] p-3 rounded-xl">
                  <span className="text-xs text-[#666461] block font-semibold">2ND PLACE</span>
                  <span className="font-bold text-sm text-[#121212] block mt-1">{prizeSecond}</span>
                </div>
                <div className="bg-[#FAF9F6] border border-[#E5E2DC] p-3 rounded-xl">
                  <span className="text-xs text-[#666461] block font-semibold">3RD PLACE</span>
                  <span className="font-bold text-sm text-[#666461] block mt-1">{prizeThird}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="bg-[#FAF9F6] border-t border-[#E5E2DC] px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <button
              onClick={() => downloadCalendarICS(event)}
              className="px-3.5 py-2 rounded-xl bg-white hover:bg-[#F4F2EC] text-[#121212] text-xs font-semibold border border-[#E5E2DC] flex items-center space-x-1.5 shadow-sm transition-colors"
            >
              <Calendar className="w-3.5 h-3.5 text-[#B8860B]" />
              <span>Add to iCal</span>
            </button>
            <button
              onClick={handleShare}
              className="p-2 rounded-xl bg-white text-[#666461] hover:text-[#121212] border border-[#E5E2DC] shadow-sm transition-colors"
            >
              <Share2 className="w-4 h-4" />
            </button>
            {copied && <span className="text-[11px] text-emerald-600 font-semibold">Link copied!</span>}
          </div>

          <button
            onClick={() => {
              onClose();
              onRegister(event);
            }}
            className="px-8 py-2.5 rounded-full bg-[#121212] hover:bg-[#2A2A2A] text-white font-bold text-xs uppercase tracking-wider shadow-md transition-all flex items-center space-x-1.5"
          >
            <span>REGISTER →</span>
          </button>
        </div>
      </div>
    </div>
  );
};
