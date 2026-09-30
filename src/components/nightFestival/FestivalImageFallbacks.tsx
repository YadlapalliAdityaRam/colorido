import { useEffect } from 'react';

/** Recover failed remote/local image requests with an existing local festival asset. */
export const FestivalImageFallbacks = () => {
  useEffect(() => {
    const recoverImage = (event: Event) => {
      const image = event.target;
      if (!(image instanceof HTMLImageElement) || image.dataset.nfFallbackApplied) return;

      const label = `${image.alt} ${image.currentSrc} ${image.src}`.toLowerCase();
      // Existing logo-specific fallback handlers get first chance to recover the emblem.
      if (label.includes('rvrjc_logo') || label.includes('college emblem')) return;

      image.dataset.nfFallbackApplied = 'true';
      image.src = label.includes('sport') || label.includes('football') || label.includes('basketball')
        ? '/global_sports_profile.jpeg'
        : label.includes('cultural') || label.includes('dance') || label.includes('music')
          ? '/cultural_global_profile_photo.jpeg'
          : '/rvr_college_hero.jpg';
    };

    document.addEventListener('error', recoverImage, true);
    return () => document.removeEventListener('error', recoverImage, true);
  }, []);

  return null;
};
