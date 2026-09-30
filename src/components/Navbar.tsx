import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Search, ChevronDown, Menu, X, ArrowRight, Shield } from 'lucide-react';
import type { UserProfile, EventItem } from '../types';
import './navigation.css';

interface NavbarProps {
  currentView: string;
  onNavigate: (view: string, param?: string) => void;
  user: UserProfile;
  onOpenSearch: () => void;
  onOpenQuickRegister: () => void;
  events?: EventItem[];
}

export const Navbar: React.FC<NavbarProps> = ({ currentView, onNavigate, onOpenSearch, onOpenQuickRegister, events = [] }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileMenuClosing, setMobileMenuClosing] = useState(false);
  const [mobileEventsOpen, setMobileEventsOpen] = useState(false);
  const [eventsDropdownOpen, setEventsDropdownOpen] = useState(false);
  const mobileCloseTimer = useRef<number | null>(null);
  const desktopNavRef = useRef<HTMLElement | null>(null);
  const [indicator, setIndicator] = useState({ x: 0, width: 0, ready: false });
  const sportsCount = events.filter(event => event.type === 'sports').length;
  const culturalCount = events.filter(event => event.type === 'cultural').length;
  const navLinks = [
    { id: 'home', label: 'Home' }, { id: 'about', label: 'About Fest' },
    { id: 'events', label: 'Events', hasDropdown: true }, { id: 'schedule', label: 'Schedule' },
    { id: 'gallery', label: 'Gallery' }, { id: 'venues', label: 'Venues' }, { id: 'results', label: 'Results' },
  ];
  const closeMobileMenu = (afterClose?: () => void) => {
    if (mobileCloseTimer.current !== null) window.clearTimeout(mobileCloseTimer.current);
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setMobileMenuOpen(false);
      setMobileMenuClosing(false);
      afterClose?.();
      return;
    }
    setMobileMenuClosing(true);
    mobileCloseTimer.current = window.setTimeout(() => {
      setMobileMenuOpen(false);
      setMobileMenuClosing(false);
      mobileCloseTimer.current = null;
      afterClose?.();
    }, 160);
  };

  const navigate = (view: string) => {
    if (mobileMenuOpen) {
      closeMobileMenu();
      onNavigate(view);
    } else {
      onNavigate(view);
    }
    setMobileEventsOpen(false);
    setEventsDropdownOpen(false);
  };

  useEffect(() => () => {
    if (mobileCloseTimer.current !== null) window.clearTimeout(mobileCloseTimer.current);
  }, []);

  useEffect(() => {
    if (!mobileMenuOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeMobileMenu();
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', closeOnEscape);
    };
  }, [mobileMenuOpen]);

  const isEventsActive = currentView === 'sports' || currentView === 'cultural';
  const activeNavId = isEventsActive ? 'events' : currentView;

  useLayoutEffect(() => {
    const nav = desktopNavRef.current;
    if (!nav) return;
    const placeIndicator = () => {
      const activeItem = Array.from(nav.querySelectorAll<HTMLElement>('[data-nav-item]'))
        .find(item => item.dataset.navItem === activeNavId);
      if (!activeItem) {
        setIndicator(current => ({ ...current, ready: false }));
        return;
      }
      const navRect = nav.getBoundingClientRect();
      const itemRect = activeItem.getBoundingClientRect();
      setIndicator({ x: itemRect.left - navRect.left, width: itemRect.width, ready: true });
    };
    placeIndicator();
    const resizeObserver = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(placeIndicator);
    resizeObserver?.observe(nav);
    window.addEventListener('resize', placeIndicator);
    return () => {
      resizeObserver?.disconnect();
      window.removeEventListener('resize', placeIndicator);
    };
  }, [activeNavId]);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-[#E2E8F0] bg-[#FAF9F6]/95 backdrop-blur-md">
      <div className="mx-auto flex h-[68px] max-w-7xl items-center justify-between gap-3 px-4 sm:h-20 sm:px-6">
        <button onClick={() => navigate('home')} className="group flex min-w-0 items-center gap-2.5 text-left sm:gap-3" aria-label="COLORIDO 2K26 home">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-[#E2E8F0] bg-white p-1 shadow-sm transition-colors group-hover:border-[#800020] sm:h-14 sm:w-14">
            <img src="/rvrjc_logo.png" alt="R.V.R. & J.C. College emblem" className="h-full w-full object-contain" />
          </span>
          <span className="flex min-w-0 flex-col">
            <span className="truncate font-cinzel text-[10px] font-bold leading-tight tracking-wide text-[#800020] sm:text-sm">R.V.R. &amp; J.C. COLLEGE OF ENGINEERING</span>
            <span className="my-0.5 text-[9px] font-bold leading-none tracking-wider text-[#0D7A3E] sm:text-[10px]">AUTONOMOUS</span>
            <span className="hidden text-[9px] leading-tight text-[#64748B] xl:block">Approved by AICTE | Affiliated to Acharya Nagarjuna University</span>
          </span>
        </button>

        <nav ref={desktopNavRef} aria-label="Main navigation" className="colorido-desktop-nav relative hidden items-center gap-4 text-xs font-semibold lg:flex xl:gap-6">
          <span aria-hidden="true" className="colorido-nav-indicator" style={{ width: indicator.width, transform: `translateX(${indicator.x}px)`, opacity: indicator.ready ? 1 : 0 }} />
          {navLinks.map(link => {
            const active = currentView === link.id || (link.id === 'events' && isEventsActive);
            if (link.hasDropdown) return (
              <div key={link.id} className="relative flex items-center gap-0.5" onMouseLeave={() => setEventsDropdownOpen(false)}>
                <button data-nav-item={link.id} aria-current={active ? 'page' : undefined} onClick={() => navigate('sports')} className={`rounded px-1 py-2 transition-colors ${active ? 'font-bold text-[#800020]' : 'text-[#0F172A] hover:text-[#800020]'}`}>Events</button>
                <button onClick={() => setEventsDropdownOpen(open => !open)} onMouseEnter={() => setEventsDropdownOpen(true)} aria-label="Toggle Events menu" aria-expanded={eventsDropdownOpen} className="flex min-h-11 min-w-8 cursor-pointer items-center justify-center rounded text-[#475569] hover:bg-black/5 hover:text-[#800020] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#C5A059]"><ChevronDown className={`h-4 w-4 transition-transform ${eventsDropdownOpen ? 'rotate-180' : ''}`} /></button>
                {eventsDropdownOpen && <div className="absolute left-0 top-full z-[70] mt-1 w-56 rounded-lg border border-[#E2E8F0] bg-white py-2 text-[#0F172A] shadow-xl">
                  <button onClick={() => navigate('sports')} className="flex min-h-11 w-full items-center justify-between px-4 text-left hover:bg-[#F8FAFC] hover:text-[#800020]">Sports competitions<span className="text-xs text-[#B45309]">{sportsCount}</span></button>
                  <button onClick={() => navigate('cultural')} className="flex min-h-11 w-full items-center justify-between border-t border-[#E2E8F0] px-4 text-left hover:bg-[#F8FAFC] hover:text-[#800020]">Cultural events<span className="text-xs text-[#800020]">{culturalCount}</span></button>
                </div>}
              </div>
            );
            return <button key={link.id} data-nav-item={link.id} onClick={() => navigate(link.id)} aria-current={active ? 'page' : undefined} className={`min-h-11 rounded px-1 py-2 transition-colors ${active ? 'font-bold text-[#800020]' : 'text-[#0F172A] hover:text-[#800020]'}`}>{link.label}</button>;
          })}
        </nav>

        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2.5">
          <button onClick={() => navigate('admin')} className={`festival-sheen festival-magnetic flex min-h-11 items-center gap-1.5 rounded-md px-2.5 text-xs font-bold transition-colors sm:px-3 ${currentView === 'admin' ? 'bg-[#800020] text-white' : 'border border-[#E2E8F0] bg-white text-[#800020] hover:bg-[#800020] hover:text-white'}`} title="Administrator Portal"><Shield className="relative z-[1] h-4 w-4" /><span className="relative z-[1] hidden md:inline">Admin</span></button>
          <button onClick={onOpenSearch} className="flex min-h-11 min-w-11 items-center justify-center rounded-md text-[#475569] hover:bg-white hover:text-[#800020]" title="Search events and schedules" aria-label="Search"><Search className="h-4 w-4" /></button>
          <button onClick={onOpenQuickRegister} className="festival-sheen festival-magnetic hidden min-h-11 items-center gap-1.5 rounded-md bg-[#800020] px-4 text-xs font-bold tracking-wide text-white shadow-sm transition-colors hover:bg-[#660019] sm:flex"><span className="relative z-[1]">Register</span><ArrowRight className="relative z-[1] h-3.5 w-3.5" /></button>
          <button onClick={() => setMobileMenuOpen(true)} className="flex min-h-11 min-w-11 items-center justify-center rounded-md border border-white/30 bg-white/10 text-[#f8f5ec] transition-colors hover:bg-white/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C5A059] lg:hidden" aria-label="Open navigation menu" aria-controls="colorido-mobile-navigation" aria-expanded={mobileMenuOpen}><Menu aria-hidden="true" className="h-6 w-6" /></button>
        </div>
      </div>

      {mobileMenuOpen && <div className={`colorido-mobile-menu-backdrop fixed inset-0 z-[80] bg-[#050b1d]/75 backdrop-blur-sm lg:hidden ${mobileMenuClosing ? 'colorido-mobile-menu-closing' : ''}`} onMouseDown={event => { if (event.target === event.currentTarget) closeMobileMenu(); }}>
        <nav id="colorido-mobile-navigation" aria-label="Mobile navigation" className="colorido-mobile-menu-drawer ml-auto flex h-[100dvh] w-full max-w-[min(440px,92vw)] flex-col overflow-y-auto border-l border-white/10 bg-[#0b1430] px-5 pb-6 pt-4 text-[#f8f5ec] shadow-2xl sm:px-7">
          <div className="mb-5 flex items-center justify-between border-b border-white/10 pb-4">
            <button onClick={() => navigate('home')} className="text-left"><span className="block font-cinzel text-sm font-bold tracking-[0.16em] text-[#e2bf76]">COLORIDO 2K26</span><span className="mt-1 block text-[10px] uppercase tracking-widest text-slate-300">R.V.R. &amp; J.C. College of Engineering</span></button>
            <button onClick={() => closeMobileMenu()} className="flex min-h-11 min-w-11 items-center justify-center rounded-full border border-white/20 text-white hover:bg-white/10" aria-label="Close navigation menu"><X className="h-5 w-5" /></button>
          </div>
          <div className="flex-1">
            {navLinks.map(link => link.hasDropdown ? <div key={link.id} className="border-b border-white/10">
              <div className="flex min-h-[56px] items-center justify-between gap-2">
                <button onClick={() => navigate('sports')} className={`flex min-h-11 flex-1 items-center text-left text-lg font-semibold ${isEventsActive ? 'text-[#e2bf76]' : 'text-white'}`}>Events<span className="ml-2 text-xs text-slate-400">({sportsCount + culturalCount})</span></button>
                <button onClick={() => setMobileEventsOpen(open => !open)} className="flex min-h-11 min-w-11 cursor-pointer items-center justify-center rounded-md text-[#e2bf76] hover:bg-white/10" aria-label={`${mobileEventsOpen ? 'Collapse' : 'Expand'} Events submenu`} aria-expanded={mobileEventsOpen}><ChevronDown className={`h-5 w-5 transition-transform duration-200 ${mobileEventsOpen ? 'rotate-180' : ''}`} /></button>
              </div>
              {mobileEventsOpen && <div className="mb-3 ml-3 border-l border-[#c5a059]/50 pl-3">
                <button onClick={() => navigate('sports')} className="flex min-h-11 w-full items-center justify-between rounded px-3 text-left text-sm text-slate-200 hover:bg-white/5 hover:text-[#e2bf76]">Sports competitions<span className="text-xs text-slate-400">{sportsCount}</span></button>
                <button onClick={() => navigate('cultural')} className="flex min-h-11 w-full items-center justify-between rounded px-3 text-left text-sm text-slate-200 hover:bg-white/5 hover:text-[#e2bf76]">Cultural events<span className="text-xs text-slate-400">{culturalCount}</span></button>
              </div>}
            </div> : <button key={link.id} onClick={() => navigate(link.id)} aria-current={currentView === link.id ? 'page' : undefined} className={`flex min-h-[56px] w-full items-center border-b border-white/10 text-left text-lg font-semibold ${currentView === link.id ? 'text-[#e2bf76]' : 'text-white hover:text-[#e2bf76]'}`}>{link.label}</button>)}
          </div>
          <div className="space-y-2 pt-5">
            <button onClick={() => navigate('admin')} className="flex min-h-12 w-full items-center gap-2 rounded-lg border border-white/15 px-4 text-sm font-semibold text-slate-200 hover:bg-white/5"><Shield className="h-4 w-4" />Admin Secretariat Portal</button>
            <button onClick={() => { closeMobileMenu(onOpenQuickRegister); }} className="festival-sheen flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-[#800020] px-4 text-sm font-bold text-white hover:bg-[#97052b]">Register for COLORIDO 2K26<ArrowRight className="relative z-[1] h-4 w-4" /></button>
          </div>
        </nav>
      </div>}
    </header>
  );
};

export default Navbar;
