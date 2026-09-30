import { useEffect } from 'react';
import type { EventItem } from '../types';

const routeMetadata: Record<string, { title: string; description: string }> = {
  home: { title: 'COLORIDO 2K26 | National Sports & Cultural Festival', description: 'Discover COLORIDO 2K26, the national-level sports and cultural festival hosted by R.V.R. & J.C. College of Engineering in Guntur, Andhra Pradesh.' },
  about: { title: 'About COLORIDO 2K26 | R.V.R. & J.C. College of Engineering', description: 'Meet the people, purpose and campus spirit behind COLORIDO 2K26, hosted by R.V.R. & J.C. College of Engineering.' },
  sports: { title: 'Sports Events | COLORIDO 2K26', description: 'Explore the sports competitions, event information and registration details published for COLORIDO 2K26.' },
  cultural: { title: 'Cultural Events | COLORIDO 2K26', description: 'Explore the cultural performances and competitions published for COLORIDO 2K26.' },
  schedule: { title: 'Festival Schedule | COLORIDO 2K26', description: 'View the published COLORIDO 2K26 event timetable, including dates, times and scheduled venues.' },
  venues: { title: 'Festival Venues | COLORIDO 2K26', description: 'Find venues currently scheduled for COLORIDO 2K26 sports and cultural events.' },
  gallery: { title: 'Festival Gallery | COLORIDO 2K26', description: 'Browse published photographs and videos from COLORIDO 2K26.' },
  results: { title: 'Competition Results | COLORIDO 2K26', description: 'See official sports and cultural competition results published for COLORIDO 2K26.' },
  live: { title: 'Live Events | COLORIDO 2K26', description: 'Follow published live event information from COLORIDO 2K26.' },
  dashboard: { title: 'My Festival | COLORIDO 2K26', description: 'Review your COLORIDO 2K26 registrations and festival information.' },
  admin: { title: 'Secretariat Portal | COLORIDO 2K26', description: 'COLORIDO 2K26 Secretariat administration portal.' },
};

function ensureMeta(attribute: 'name' | 'property', key: string): HTMLMetaElement {
  let element = document.head.querySelector<HTMLMetaElement>(`meta[${attribute}="${key}"]`);
  if (!element) {
    element = document.createElement('meta');
    element.setAttribute(attribute, key);
    document.head.append(element);
  }
  return element;
}

function setMeta(name: string, content: string, attribute: 'name' | 'property' = 'name') {
  ensureMeta(attribute, name).content = content;
}

export function SeoManager({ view, events, selectedSlug, liveSlug, maintenanceMode }: {
  view: string;
  events: EventItem[];
  selectedSlug: string | null;
  liveSlug: string | null;
  maintenanceMode: boolean;
}) {
  useEffect(() => {
    const base = routeMetadata[view] || routeMetadata.home;
    const event = events.find(item => item.slug === selectedSlug || item.slug === liveSlug || item.liveSlug === liveSlug);
    const title = event ? `${event.title} | COLORIDO 2K26` : base.title;
    const description = event
      ? (event.description || base.description).replace(/\s+/g, ' ').slice(0, 300)
      : base.description;
    const currentUrl = new URL(window.location.href);
    const canonical = new URL(currentUrl.pathname, currentUrl.origin);
    if (!currentUrl.pathname.startsWith('/live/')) {
      if (view !== 'home') canonical.searchParams.set('view', view);
      if (event && selectedSlug) canonical.searchParams.set('event', selectedSlug);
    }
    const canonicalHref = canonical.toString();

    document.title = title;
    setMeta('description', description);
    setMeta('robots', maintenanceMode || view === 'admin' || view === 'dashboard'
      ? 'noindex, nofollow'
      : 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1');
    setMeta('og:type', 'website', 'property');
    setMeta('og:site_name', 'COLORIDO 2K26', 'property');
    setMeta('og:title', title, 'property');
    setMeta('og:description', description, 'property');
    setMeta('og:url', canonicalHref, 'property');
    setMeta('og:image', new URL('/colorido_original.png', currentUrl.origin).toString(), 'property');
    setMeta('og:image:alt', 'COLORIDO 2K26 festival artwork', 'property');
    setMeta('og:locale', 'en_IN', 'property');
    setMeta('twitter:card', 'summary_large_image');
    setMeta('twitter:title', title);
    setMeta('twitter:description', description);
    setMeta('twitter:image', new URL('/colorido_original.png', currentUrl.origin).toString());

    let canonicalLink = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!canonicalLink) {
      canonicalLink = document.createElement('link');
      canonicalLink.rel = 'canonical';
      document.head.append(canonicalLink);
    }
    canonicalLink.href = canonicalHref;

    const structuredData = {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: 'COLORIDO 2K26',
      description: routeMetadata.home.description,
      url: new URL('/', currentUrl.origin).toString(),
      inLanguage: 'en-IN',
      publisher: {
        '@type': 'CollegeOrUniversity',
        name: 'R.V.R. & J.C. College of Engineering',
        url: 'https://rvrjcce.ac.in/',
      },
    };
    let jsonLd = document.head.querySelector<HTMLScriptElement>('#colorido-website-schema');
    if (!jsonLd) {
      jsonLd = document.createElement('script');
      jsonLd.id = 'colorido-website-schema';
      jsonLd.type = 'application/ld+json';
      document.head.append(jsonLd);
    }
    jsonLd.textContent = JSON.stringify(structuredData);
  }, [view, events, selectedSlug, liveSlug, maintenanceMode]);

  return null;
}
