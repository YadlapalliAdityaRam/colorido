import React, { useEffect, useMemo, useState } from 'react';
import { ArrowDown, ArrowRight, Building2, Camera, Check, ExternalLink, Music2, Users } from 'lucide-react';
import type { AboutPageContent, AboutStorySection, EventItem, MediaItem } from '../types';
import { apiService } from '../services/apiService';
import { getEventBanner } from '../utils/imageHelpers';
import { normalizeAboutPageContent } from '../components/aboutExperience/aboutPageDefaults';
import '../components/aboutExperience/aboutStory.css';
import { FestivalPassAbout } from '../components/festivalPass/FestivalPass';
import { RevealText, Stagger } from '../components/transitions/motionPrimitives';

interface AboutPageProps {
  onNavigate: (view: string, param?: string) => void;
  onOpenQuickRegister?: () => void;
  events: EventItem[];
}

const imgForMedia = (item: MediaItem) => item.coverPhoto || item.thumbnailUrl || item.url;

export const AboutPage: React.FC<AboutPageProps> = ({ onNavigate, onOpenQuickRegister, events }) => {
  const [content, setContent] = useState<AboutPageContent>(() => normalizeAboutPageContent());
  const [media, setMedia] = useState<MediaItem[]>([]);

  useEffect(() => {
    let active = true;
    Promise.all([apiService.getAboutPageContent(), apiService.getMedia({ featured: true, sort: 'highlight' })]).then(([about, gallery]) => {
      if (!active) return;
      setContent(normalizeAboutPageContent(about));
      setMedia(gallery.filter(item => item.published !== false));
    }).catch(() => { /* Existing local defaults keep the story available offline. */ });
    return () => { active = false; };
  }, []);

  const sections = useMemo(() => [...content.sections].filter(section => section.published).sort((a, b) => a.order - b.order), [content.sections]);
  const selectedMemories = useMemo(() => {
    const eligible = media.filter(item => item.featured && item.published !== false);
    const selected = content.selectedMemoryIds.length > 0 ? eligible.filter(item => content.selectedMemoryIds.includes(item.id)) : eligible;
    if (content.selectedMemoryIds.length > 0) selected.sort((a, b) => content.selectedMemoryIds.indexOf(a.id) - content.selectedMemoryIds.indexOf(b.id));
    return selected.slice(0, 5);
  }, [content.selectedMemoryIds, media]);
  const eventSelection = (type: EventItem['type']) => {
    const selectedIds = type === 'sports' ? content.selectedSportsEventIds : content.selectedCulturalEventIds;
    const selected = selectedIds.length > 0 ? events.filter(event => selectedIds.includes(event.id)) : events;
    return selected.filter(event => event.type === type).sort((a, b) => selectedIds.length ? selectedIds.indexOf(a.id) - selectedIds.indexOf(b.id) : 0);
  };
  const registrationIsOpen = events.some(event => ['open', 'closing-soon'].includes(String(event.status).toLowerCase()) && event.seatsLeft > 0);

  const imageLayer = (image: string, alt: string, className = '') => (
    <img src={image} alt={alt} className={`nf-about-image ${className}`} loading="lazy" />
  );

  const renderEventWorld = (section: AboutStorySection, type: EventItem['type']) => {
    const items = eventSelection(type);
    return (
      <section key={section.id} id={section.id} className="nf-about-section nf-about-world">
        <div className="nf-about-world-image">{imageLayer(section.image, `${section.title} festival scene`)}</div>
        <div className="nf-about-world-copy">
          <p className="nf-about-eyebrow">{section.eyebrow}</p>
          <h2>{section.title}</h2>
          <p className="nf-about-subtitle">{section.subtitle}</p>
          <p className="nf-about-description">{section.description}</p>
          <div className="nf-about-live-events">
            {items.slice(0, 4).map(event => (
              <button key={event.id} onClick={() => onNavigate(type === 'sports' ? 'sports' : 'cultural')} className="nf-about-event-link">
                <img src={getEventBanner(event)} alt="" loading="lazy" /><span>{event.title}</span><ArrowRight aria-hidden="true" />
              </button>
            ))}
            {items.length === 0 && <p className="nf-about-muted">Event listings will appear here when available.</p>}
          </div>
          <button onClick={() => onNavigate(type === 'sports' ? 'sports' : 'cultural')} className="nf-about-link">Explore {type === 'sports' ? 'sports' : 'cultural'} events <ArrowRight aria-hidden="true" /></button>
        </div>
      </section>
    );
  };

  return (
    <div className="nf-about-story">
      {sections.map(section => {
        switch (section.id) {
          case 'hero':
            return <section key={section.id} id="about-entry" className="nf-about-hero">
              {imageLayer(section.image, 'COLORIDO 2K26 festival artwork', 'nf-about-hero-image')}
              <div className="nf-about-hero-wash" aria-hidden="true" />
              <div className="nf-about-hero-content">
                <p className="nf-about-eyebrow">{section.eyebrow}</p>
                <h1><span><RevealText text={section.title} /></span><strong><RevealText text={section.subtitle} /></strong></h1>
                <p className="nf-about-description">{section.description}</p>
                <a className="nf-about-scroll" href="#about-story-start">Scroll to enter <ArrowDown aria-hidden="true" /></a>
              </div>
              <span className="nf-about-hero-index" aria-hidden="true">COLORIDO · 2K26</span>
            </section>;

          case 'statement':
            return <section key={section.id} id="about-story-start" className="nf-about-statement nf-about-section">
              <p className="nf-about-eyebrow">{section.eyebrow}</p>
              <h2>{section.title}</h2>
              <p className="nf-about-statement-accent">{section.subtitle}</p>
              <p className="nf-about-description">{section.description}</p>
              <span className="nf-about-giant-word" aria-hidden="true">COLORIDO</span>
            </section>;

          case 'introduction':
            return <section key={section.id} id={section.id} className="nf-about-section nf-about-intro">
              <div className="nf-about-intro-image">{imageLayer(section.image, 'R.V.R. & J.C. campus and COLORIDO festival')}</div>
              <div className="nf-about-intro-copy"><p className="nf-about-eyebrow">{section.eyebrow}</p><h2>{section.title}</h2><p className="nf-about-subtitle">{section.subtitle}</p><p className="nf-about-description">{section.description}</p><span className="nf-about-meta"><Check aria-hidden="true" /> COLORIDO 2K26</span></div>
            </section>;

          case 'worlds':
            return <section key={section.id} id={section.id} className="nf-about-section nf-about-worlds">
              <div className="nf-about-section-heading"><p className="nf-about-eyebrow">{section.eyebrow}</p><h2>{section.title}</h2><p className="nf-about-description">{section.description}</p></div>
              <Stagger className="nf-about-world-panels">
                {content.worlds.filter(world => world.published).sort((a, b) => a.order - b.order).map(world => <a key={world.id} href={`#${world.href}`} className="nf-about-world-panel">{imageLayer(world.image, `${world.label} at COLORIDO`)}<span>{world.label}</span><strong>{world.title}</strong><p>{world.description}</p><ArrowRight aria-hidden="true" /></a>)}
              </Stagger>
            </section>;

          case 'sports': return renderEventWorld(section, 'sports');
          case 'cultural': return renderEventWorld(section, 'cultural');

          case 'night':
            return <section key={section.id} id={section.id} className="nf-about-night nf-about-section">
              {imageLayer(section.image, 'Festival stage and night lights')}
              <div className="nf-about-night-wash" aria-hidden="true" />
              <div className="nf-about-night-content"><p className="nf-about-eyebrow">{section.eyebrow}</p><h2>{section.title}<br /><span>{section.subtitle}</span></h2><p className="nf-about-description">{section.description}</p><div className="nf-about-night-signals"><span><Music2 aria-hidden="true" /> Music</span><span><Camera aria-hidden="true" /> Performances</span><span><Users aria-hidden="true" /> Together</span></div></div>
            </section>;

          case 'people': {
            const people = content.people.filter(person => person.published).sort((a, b) => a.order - b.order);
            return <section key={section.id} id={section.id} className="nf-about-section nf-about-people">
              <div className="nf-about-section-heading"><p className="nf-about-eyebrow">{section.eyebrow}</p><h2>{section.title}<br /><span>{section.subtitle}</span></h2><p className="nf-about-description">{section.description}</p></div>
              {people.length ? <div className="nf-about-people-wall">{people.map(person => <article key={person.id} className="nf-about-person">{person.image && imageLayer(person.image, person.name)}<div><p className="nf-about-eyebrow">{person.role}</p><h3>{person.name}</h3><p>{person.description}</p></div></article>)}</div> : <p className="nf-about-muted">People profiles will appear here when the Secretariat publishes them.</p>}
            </section>;
          }

          case 'college':
            return <section key={section.id} id={section.id} className="nf-about-section nf-about-college"><div className="nf-about-college-image">{imageLayer(section.image, 'R.V.R. & J.C. College campus')}</div><div><p className="nf-about-eyebrow">{section.eyebrow}</p><h2>{section.title}</h2><p className="nf-about-subtitle">{section.subtitle}</p><p className="nf-about-description">{section.description}</p>{content.collegeWebsite && <a className="nf-about-link" href={content.collegeWebsite} target="_blank" rel="noreferrer">Visit college <ExternalLink aria-hidden="true" /></a>}<Building2 className="nf-about-college-mark" aria-hidden="true" /></div></section>;

          case 'dna':
            return <section key={section.id} id={section.id} className="nf-about-section nf-about-dna"><p className="nf-about-eyebrow">{section.eyebrow}</p><h2>{section.title}</h2><div className="nf-about-dna-center"><img src="/COLORIDO.jpg" alt="COLORIDO 2K26 festival logo artwork" loading="lazy" /></div><div className="nf-about-dna-words">{content.dna.map(word => <span key={word}>{word}</span>)}</div><p className="nf-about-description">{section.description}</p><FestivalPassAbout events={events} onSelectEvent={slug => onNavigate('sports', slug)} triggerLabel="Explore the festival pass" /></section>;

          case 'journey': {
            const journey = content.journey.filter(moment => moment.published).sort((a, b) => a.order - b.order);
            return <section key={section.id} id={section.id} className="nf-about-section nf-about-journey"><div className="nf-about-section-heading"><p className="nf-about-eyebrow">{section.eyebrow}</p><h2>{section.title}</h2><p className="nf-about-description">{section.description}</p></div><div className="nf-about-timeline">{journey.map(moment => <article key={moment.id}><span>{moment.phase}</span><h3>{moment.title}</h3><p>{moment.description}</p>{moment.time && <small>{moment.time}</small>}</article>)}</div></section>;
          }

          case 'memories':
            return <section key={section.id} id={section.id} className="nf-about-section nf-about-memories"><div className="nf-about-section-heading"><p className="nf-about-eyebrow">{section.eyebrow}</p><h2>{section.title}</h2><p className="nf-about-description">{section.description}</p></div>{selectedMemories.length ? <Stagger className="nf-about-memory-strip">{selectedMemories.map(item => <button key={item.id} onClick={() => onNavigate('gallery')} className="nf-about-memory">{imageLayer(imgForMedia(item), item.title)}<span>{item.category}</span><strong>{item.title}</strong></button>)}</Stagger> : <p className="nf-about-muted">Published, highlighted Gallery memories will appear here.</p>}<button className="nf-about-link" onClick={() => onNavigate('gallery')}>View all memories <ArrowRight aria-hidden="true" /></button></section>;

          case 'future':
            return <section key={section.id} id={section.id} className="nf-about-future nf-about-section">{imageLayer(section.image, 'COLORIDO campus at night')}<div className="nf-about-night-wash" aria-hidden="true" /><div><p className="nf-about-eyebrow">{section.eyebrow}</p><h2>{section.title}</h2><p className="nf-about-subtitle">{section.subtitle}</p></div></section>;

          case 'cta':
            return <section key={section.id} id={section.id} className="nf-about-cta nf-about-section">{imageLayer(section.image, '', 'nf-about-cta-bleed')}{imageLayer(section.image, 'COLORIDO festival finale', 'nf-about-cta-poster')}<div className="nf-about-night-wash" aria-hidden="true" /><div className="nf-about-cta-content"><p className="nf-about-eyebrow">{section.eyebrow}</p><h2>{section.title}</h2><p className="nf-about-description">{section.description}</p><div className="nf-about-cta-actions"><button onClick={() => onNavigate('sports')}>Explore events <ArrowRight aria-hidden="true" /></button><button onClick={() => onNavigate('gallery')}>View gallery <Camera aria-hidden="true" /></button>{registrationIsOpen && onOpenQuickRegister && <button onClick={onOpenQuickRegister}>Register now <ArrowRight aria-hidden="true" /></button>}</div></div></section>;

          default: return null;
        }
      })}
    </div>
  );
};

export default AboutPage;
