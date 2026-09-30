import React, { useEffect, useState } from 'react';
import { FestivalAtmosphere } from './FestivalAtmosphere';
import { FestivalLights } from './FestivalLights';
import { FestivalCrowd } from './FestivalCrowd';
import { FestivalImageFallbacks } from './FestivalImageFallbacks';
import './nightFestival.css';

/** COLORIDO 2K26 — NIGHT FESTIVAL THEME
 * Shared atmosphere across the site; the generated crowd photo is homepage-only.
 * Remove this component (and the nightFestival folder) to fully revert.
 */
export const NightFestivalTheme: React.FC<{ showCrowd?: boolean }> = ({ showCrowd = false }) => {
  const [crowdInOpeningView, setCrowdInOpeningView] = useState(showCrowd);

  useEffect(() => {
    if (!showCrowd) {
      setCrowdInOpeningView(false);
      return;
    }

    const updateCrowdVisibility = () => setCrowdInOpeningView(window.scrollY < 120);
    updateCrowdVisibility();
    window.addEventListener('scroll', updateCrowdVisibility, { passive: true });
    return () => window.removeEventListener('scroll', updateCrowdVisibility);
  }, [showCrowd]);

  return (
    <>
      <FestivalImageFallbacks />
      <FestivalAtmosphere />
      <FestivalLights />
      {showCrowd && crowdInOpeningView && <FestivalCrowd />}
    </>
  );
};
