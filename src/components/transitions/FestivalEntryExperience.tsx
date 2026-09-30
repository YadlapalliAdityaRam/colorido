import React, { useCallback, useEffect, useRef, useState } from 'react';
import './festival-entry-experience.css';

type EntryMode = 'first' | 'quick';
const ENTRY_SEEN_KEY = 'colorido-premium-entry-v2-seen';

function getEntryMode(): EntryMode {
  try {
    return sessionStorage.getItem(ENTRY_SEEN_KEY) === 'true' ? 'quick' : 'first';
  } catch {
    return 'first';
  }
}

/** One-time first-entry reveal, then a short refresh awakening for this tab session. */
export const FestivalEntryExperience: React.FC<{ enabled: boolean }> = ({ enabled }) => {
  const [mode] = useState<EntryMode>(getEntryMode);
  const [exiting, setExiting] = useState(false);
  const [complete, setComplete] = useState(false);
  const [artworkFailed, setArtworkFailed] = useState(false);
  const [rushedEntry, setRushedEntry] = useState(false);
  const [skipping, setSkipping] = useState(false);
  const [ripple, setRipple] = useState<{ x: number; y: number; key: number } | null>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const finishedRef = useRef(false);
  const posterReadyRef = useRef(false);
  const posterFailedRef = useRef(false);

  const finish = useCallback((skip = false, exitDuration = 360) => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    if (skip) setSkipping(true);
    setExiting(true);
    window.setTimeout(() => setComplete(true), skip ? 140 : exitDuration);
  }, []);

  useEffect(() => {
    if (!enabled || complete) return;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const startedAt = performance.now();
    const isMobile = window.matchMedia('(max-width: 639px)').matches;
    const introDuration = isMobile ? 2050 : 2440;
    const normalExitDuration = isMobile ? (mode === 'quick' ? 180 : 240) : (mode === 'quick' ? 220 : 260);
    let timer = window.setTimeout(() => finish(false, reducedMotion ? 160 : normalExitDuration), reducedMotion ? 100 : mode === 'first' ? introDuration : 600);
    let adaptationTimer: number | undefined;
    try {
      sessionStorage.setItem(ENTRY_SEEN_KEY, 'true');
    } catch { /* The short timed intro still works when storage is unavailable. */ }

    const root = document.documentElement;
    root.classList.add('colorido-entry-active');
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    overlayRef.current?.focus({ preventScroll: true });

    const poster = overlayRef.current?.querySelector<HTMLImageElement>('.festival-entry__poster');
    if (poster?.complete) {
      posterReadyRef.current = true;
      posterFailedRef.current = poster.naturalWidth === 0;
    }
    // Assets ready early: keep the authored reveal but trim its tail. If the
    // main art is slow, end the overlay promptly and let the real page load on.
    if (!reducedMotion && mode === 'first') {
      adaptationTimer = window.setTimeout(() => {
        window.clearTimeout(timer);
        if (posterReadyRef.current && !posterFailedRef.current) {
          timer = window.setTimeout(() => finish(false, normalExitDuration), Math.max(0, introDuration - (performance.now() - startedAt)));
        } else {
          setRushedEntry(true);
          // The rushed animation starts when this class is applied; allow its
          // shorter timeline to finish before fading the overlay away.
          const fallbackEnd = isMobile ? 1760 : 1570;
          timer = window.setTimeout(() => finish(true), Math.max(0, fallbackEnd - (performance.now() - startedAt)));
        }
      }, 520);
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        finish(true);
      } else if (event.key === 'Tab') {
        // Keep keyboard focus out of the temporarily covered page.
        event.preventDefault();
        overlayRef.current?.focus({ preventScroll: true });
      }
    };
    window.addEventListener('keydown', onKeyDown, true);

    return () => {
      window.clearTimeout(timer);
      if (adaptationTimer !== undefined) window.clearTimeout(adaptationTimer);
      window.removeEventListener('keydown', onKeyDown, true);
      document.body.style.overflow = previousOverflow;
      root.classList.remove('colorido-entry-active');
    };
  }, [enabled, complete, mode, finish]);

  useEffect(() => {
    if (!complete) return;
    const root = document.documentElement;
    root.classList.add('colorido-entry-arrived');
    const timer = window.setTimeout(() => root.classList.remove('colorido-entry-arrived'), 700);
    return () => {
      window.clearTimeout(timer);
      root.classList.remove('colorido-entry-arrived');
    };
  }, [complete]);

  if (!enabled || complete) return null;

  const handleTouch = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.pointerType !== 'touch') return;
    const rect = event.currentTarget.getBoundingClientRect();
    setRipple({ x: event.clientX - rect.left, y: event.clientY - rect.top, key: Date.now() });
  };

  const markPosterReady = (failed = false) => {
    posterReadyRef.current = true;
    posterFailedRef.current = failed;
    if (failed) setArtworkFailed(true);
  };

  return (
    <div
      ref={overlayRef}
      className={`festival-entry ${mode === 'first' ? 'festival-entry--first' : 'festival-entry--quick'}${rushedEntry ? ' festival-entry--rushed' : ''}${exiting ? ' is-exiting' : ''}${skipping ? ' is-skipping' : ''}${artworkFailed ? ' has-artwork-fallback' : ''}`}
      role="dialog"
      aria-modal="true"
      aria-label="Welcome to COLORIDO 2K26"
      aria-describedby="festival-entry-announcement"
      tabIndex={-1}
      onPointerDown={handleTouch}
    >
      <span id="festival-entry-announcement" className="festival-entry__sr-only">R.V.R. and J.C. College of Engineering presents COLORIDO 2K26.</span>
      <img className="festival-entry__campus" src="/rvr_college_hero.jpg" alt="" />
      <img className="festival-entry__campus-reveal" src="/rvr_college_hero.jpg" alt="" />
      <div className="festival-entry__sparks" aria-hidden="true">{Array.from({ length: 8 }, (_, index) => <i key={index} />)}</div>
      <img className="festival-entry__poster" src="/colorido_original.png" alt="" fetchPriority="high" onLoad={() => markPosterReady()} onError={() => markPosterReady(true)} />
      <div className="festival-entry__shade" aria-hidden="true" />
      <div className="festival-entry__color-wash" aria-hidden="true" />
      <div className="festival-entry__travel-light" aria-hidden="true" />
      <div className="festival-entry__lights" aria-hidden="true"><i /><i /><i /></div>
      <div className="festival-entry__sweep" aria-hidden="true" />
      <div className="festival-entry__exit-light" aria-hidden="true" />
      {ripple && <span key={ripple.key} className="festival-entry__ripple" style={{ left: ripple.x, top: ripple.y }} aria-hidden="true" />}

      <div className="festival-entry__identity" aria-hidden="true">
        <div className="festival-entry__rvr">
          <img src="/rvrjc_logo.png" alt="" />
          <span><b>R.V.R. &amp; J.C.</b><small>COLLEGE OF ENGINEERING</small><em>presents</em></span>
        </div>
        <div className="festival-entry__reduced-wordmark">COLORIDO <small>2K26</small></div>
      </div>

      <span className="festival-entry__sr-only" aria-live="polite">The COLORIDO festival is coming to life.</span>
    </div>
  );
};
