import React, { useState } from 'react';
import { ChevronDown, Mail, MapPin, Phone } from 'lucide-react';

interface FooterProps { onNavigate: (view: string, param?: string) => void; }
type FooterGroup = 'explore' | 'events' | 'connect';

export const Footer: React.FC<FooterProps> = ({ onNavigate }) => {
  const [openGroups, setOpenGroups] = useState<Set<FooterGroup>>(new Set());
  const toggleGroup = (group: FooterGroup) => setOpenGroups(current => {
    const next = new Set(current);
    if (next.has(group)) next.delete(group); else next.add(group);
    return next;
  });
  const linkClass = 'festival-motion-link flex min-h-11 items-center text-sm text-[#F8F5EC]/75 transition-colors hover:text-[#E2BF76] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#E2BF76] focus-visible:outline-offset-2';
  const group = (id: FooterGroup, title: string, children: React.ReactNode) => <section className="border-b border-white/10 md:border-0" key={id}>
    <button onClick={() => toggleGroup(id)} aria-expanded={openGroups.has(id)} className="flex min-h-12 w-full items-center justify-between text-left font-cinzel text-xs font-bold uppercase tracking-[0.15em] text-[#E2BF76] md:mb-3 md:min-h-0 md:cursor-default">
      {title}<ChevronDown className={`h-4 w-4 transition-transform md:hidden ${openGroups.has(id) ? 'rotate-180' : ''}`} />
    </button>
    <div className={`${openGroups.has(id) ? 'block' : 'hidden'} pb-3 md:block md:pb-0`}>{children}</div>
  </section>;

  return <footer className="relative w-full overflow-hidden border-t border-[#C5A059]/70 bg-[#09132c] text-[#FAF8F3]">
    <div className="mx-auto grid max-w-7xl gap-x-10 px-5 pb-8 pt-10 sm:px-7 md:grid-cols-12 md:gap-y-8 md:pt-12">
      <div className="pb-4 md:col-span-5 md:pb-0">
        <button onClick={() => onNavigate('home')} className="flex min-h-12 items-center gap-3 text-left" aria-label="COLORIDO 2K26 home">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[#C5A059] bg-[#FAF8F3] p-1.5"><img src="/rvrjc_logo.png" alt="R.V.R. & J.C. College emblem" className="h-full w-full object-contain" /></span>
          <span><strong className="block font-cinzel text-xs font-bold tracking-wide sm:text-sm">COLORIDO 2K26</strong><span className="mt-1 block text-[10px] font-semibold uppercase tracking-wider text-[#E2BF76]">R.V.R. &amp; J.C. College of Engineering</span></span>
        </button>
        <p className="mt-4 max-w-md text-sm leading-relaxed text-[#F8F5EC]/70">A national-level cultural and sports festival hosted by R.V.R. &amp; J.C. College of Engineering.</p>
        <p className="mt-4 font-cinzel text-xs tracking-[0.12em] text-[#E2BF76]">✦ COLORIDO 2K26</p>
      </div>
      <div className="md:col-span-2">{group('explore', 'Explore', <ul>
        <li><button className={linkClass} onClick={() => onNavigate('home')}>Home</button></li><li><button className={linkClass} onClick={() => onNavigate('about')}>About Fest</button></li><li><button className={linkClass} onClick={() => onNavigate('gallery')}>Gallery</button></li><li><button className={linkClass} onClick={() => onNavigate('schedule')}>Schedule</button></li><li><button className={linkClass} onClick={() => onNavigate('results')}>Results</button></li>
      </ul>)}</div>
      <div className="md:col-span-2">{group('events', 'Events', <ul>
        <li><button className={linkClass} onClick={() => onNavigate('sports')}>Sports</button></li><li><button className={linkClass} onClick={() => onNavigate('cultural')}>Cultural</button></li><li><button className={linkClass} onClick={() => onNavigate('venues')}>Venues</button></li>
      </ul>)}</div>
      <div className="md:col-span-3">{group('connect', 'Connect', <div className="space-y-3 py-1 text-sm leading-relaxed text-[#F8F5EC]/75">
        <p className="flex items-start gap-2.5"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[#E2BF76]" /><span>R.V.R. &amp; J.C. College of Engineering, Guntur, Andhra Pradesh - 522019</span></p>
        <a href="tel:+918632188201" className="flex min-h-11 items-center gap-2.5 hover:text-[#E2BF76]"><Phone className="h-4 w-4 shrink-0 text-[#E2BF76]" />+91 863 218 8201</a>
        <a href="mailto:colorido@rvrjc.ac.in" className="flex min-h-11 items-center gap-2.5 hover:text-[#E2BF76]"><Mail className="h-4 w-4 shrink-0 text-[#E2BF76]" />colorido@rvrjc.ac.in</a>
        <a href="https://instagram.com" target="_blank" rel="noreferrer" className={`${linkClass} text-[#E2BF76]`}>Instagram <span className="sr-only">(opens in new tab)</span></a>
        <a href="https://youtube.com" target="_blank" rel="noreferrer" className={`${linkClass} text-[#E2BF76]`}>YouTube <span className="sr-only">(opens in new tab)</span></a>
        <a href="https://linkedin.com" target="_blank" rel="noreferrer" className={`${linkClass} text-[#E2BF76]`}>LinkedIn <span className="sr-only">(opens in new tab)</span></a>
        <button className={`${linkClass} !min-h-10`} onClick={() => onNavigate('admin')}>Admin portal</button>
      </div>)}</div>
    </div>
    <div className="border-t border-white/10 bg-[#060e21] px-5 py-4 text-center text-xs text-[#F8F5EC]/55 sm:px-7 md:text-left">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-2 md:flex-row"><p>© 2026 COLORIDO 2K26 · R.V.R. &amp; J.C. College of Engineering</p><div className="flex flex-wrap items-center justify-center gap-x-4"><a href="#" className="flex min-h-10 items-center hover:text-[#E2BF76]">Terms &amp; Conditions</a><a href="#" className="flex min-h-10 items-center hover:text-[#E2BF76]">Privacy Policy</a><a href="https://rvrjcce.ac.in" target="_blank" rel="noreferrer" className="flex min-h-10 items-center hover:text-[#E2BF76]">Official college website</a></div></div>
    </div>
  </footer>;
};

export default Footer;
