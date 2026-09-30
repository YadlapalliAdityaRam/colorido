import React, { useEffect, useRef, useState } from 'react';
import { ArrowRight, X } from 'lucide-react';
import type { EventItem, EventResult, MediaItem, Venue } from '../../types';
import './festivalPass.css';

export type FestivalPassVariant = 'home' | 'about' | 'category' | 'venue' | 'gallery' | 'result' | 'admin-preview';
interface FestivalPassProps {
  variant: FestivalPassVariant;
  events?: EventItem[];
  venues?: Venue[];
  venue?: Venue;
  media?: MediaItem[];
  results?: EventResult[];
  previewEvent?: EventItem;
  onSelectEvent?: (slug: string) => void;
  onSelectMedia?: (item: MediaItem) => void;
  triggerLabel?: string;
  triggerClassName?: string;
  initialCategory?: 'cultural' | 'sports';
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export const FestivalPass: React.FC<FestivalPassProps> = ({ variant, events = [], venues = [], venue, media = [], results = [], previewEvent, onSelectEvent, onSelectMedia, triggerLabel, triggerClassName, initialCategory, open: controlledOpen, onOpenChange }) => {
  const [internalOpen, setInternalOpen] = useState(false);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const [category, setCategory] = useState<'cultural' | 'sports'>(initialCategory || (variant === 'category' ? 'sports' : 'cultural'));
  const open = controlledOpen ?? internalOpen;
  const setOpen = (next: boolean) => { setInternalOpen(next); onOpenChange?.(next); };
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeButtonRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { setOpen(false); return; }
      if (event.key !== 'Tab') return;
      const dialog = closeButtonRef.current?.closest('[role="dialog"]');
      const focusable = dialog?.querySelectorAll<HTMLElement>('button:not([disabled]), a[href], input:not([disabled]), [tabindex]:not([tabindex="-1"])');
      if (!focusable?.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    window.addEventListener('keydown', onKey);
    return () => { document.body.style.overflow = previous; window.removeEventListener('keydown', onKey); };
  }, [open]);

  const visibleEvents = (variant === 'venue' && venue ? events.filter(e => e.venueId === venue.id || e.venueName === venue.name) : events).filter(e => e.type === category);
  const preview = previewEvent ? [previewEvent] : [];
  return <>
    {controlledOpen === undefined && <button type="button" className={triggerClassName || 'fp-trigger'} onClick={() => setOpen(true)}>{triggerLabel || 'Open Festival Pass'} <ArrowRight size={15} /></button>}
    {open && <div className="nf-modal-layer fp-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) setOpen(false); }}>
      <section className="fp-dialog" role="dialog" aria-modal="true" aria-labelledby="fp-title" tabIndex={-1}>
        <button ref={closeButtonRef} type="button" className="fp-close" aria-label="Close Festival Pass" onClick={() => setOpen(false)}><X size={20} /></button>
        <div className="fp-brand"><img src="/rvrjc_logo.png" alt="R.V.R. & J.C. College of Engineering" /><div><span>R.V.R. &amp; J.C. COLLEGE OF ENGINEERING</span><small>FEST</small></div></div>
        <p className="fp-eyebrow">COLORIDO 2K26 · FESTIVAL PASS</p>
        <h2 id="fp-title">Your festival, <em>your way.</em></h2>
        {variant === 'venue' && venue && <div className="fp-context"><strong>{venue.name}</strong><span>{venue.description}</span></div>}
        {variant === 'gallery' && <p className="fp-copy">Featured moments from the festival. Open any selection in the existing gallery viewer.</p>}
        {variant === 'result' && <p className="fp-copy">Official results published for COLORIDO 2K26.</p>}
        {variant === 'admin-preview' && <p className="fp-copy">Event preview · {previewEvent?.type === 'sports' ? 'Sports' : 'Cultural'}</p>}
        {(variant === 'home' || variant === 'about' || variant === 'category' || variant === 'venue') && <div className="fp-tabs" role="tablist" aria-label="Festival category">{(['cultural', 'sports'] as const).map(item => <button type="button" role="tab" aria-selected={category === item} className={category === item ? 'active' : ''} key={item} onClick={() => setCategory(item)}>{item}</button>)}</div>}
        <div className="fp-content" key={`${variant}-${category}`}>
          {(variant === 'home' || variant === 'about' || variant === 'category' || variant === 'venue') && (visibleEvents.length ? visibleEvents.map(event => <article className="fp-row" key={event.id}><div><b>{event.title}</b><span>{event.dateTime} · {event.venueName}</span><small>{event.status}</small></div>{onSelectEvent && <button type="button" aria-label={`View ${event.title}`} onClick={() => { setOpen(false); onSelectEvent(event.slug); }}><ArrowRight size={18} /></button>}</article>) : <p className="fp-empty">No {category} events are currently available.</p>)}
          {variant === 'gallery' && (media.length ? media.map(item => <button className="fp-media" type="button" key={item.id} onClick={() => { onSelectMedia?.(item); setOpen(false); }}><img src={item.coverPhoto || item.thumbnailUrl || item.url} alt="" loading="lazy" /><span>{item.title}<small>{item.type === 'video' ? 'VIDEO · OPEN IN GALLERY' : 'PHOTO · OPEN IN GALLERY'}</small></span></button>) : <p className="fp-empty">No featured memories are available yet.</p>)}
          {variant === 'result' && (results.length ? results.map(result => <article className="fp-row" key={result.id}><div><b>{result.eventTitle}</b><span>{result.eventType === 'sports' ? 'Sports' : 'Cultural'} · {result.date}</span>{result.podium.first && <small>Winner · {result.podium.first.teamOrParticipant}</small>}</div></article>) : <p className="fp-empty">Official results have not been published yet.</p>)}
          {variant === 'admin-preview' && preview.map(event => <article className="fp-row" key={event.id}><div><b>{event.title}</b><span>{event.dateTime} · {event.venueName}</span><small>{event.status} · {event.format === 'team' ? 'Team event' : 'Individual event'}</small></div></article>)}
        </div>
        {variant === 'venue' && venues.length > 0 && <p className="fp-footnote">Venue information is supplied by the existing venue records.</p>}
      </section>
    </div>}
  </>;
};

type WrapperProps = Omit<FestivalPassProps, 'variant'>;
export const FestivalPassHome: React.FC<WrapperProps> = props => <FestivalPass variant="home" {...props} />;
export const FestivalPassAbout: React.FC<WrapperProps> = props => <FestivalPass variant="about" {...props} />;
export const FestivalPassCategory: React.FC<WrapperProps> = props => <FestivalPass variant="category" {...props} />;
export const FestivalPassVenue: React.FC<WrapperProps> = props => <FestivalPass variant="venue" {...props} />;
export const FestivalPassGallery: React.FC<WrapperProps> = props => <FestivalPass variant="gallery" {...props} />;
export const FestivalPassResult: React.FC<WrapperProps> = props => <FestivalPass variant="result" {...props} />;
export const FestivalPassAdminPreview: React.FC<WrapperProps> = props => <FestivalPass variant="admin-preview" {...props} />;
