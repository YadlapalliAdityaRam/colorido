// Global fallback profiles for events when no image is provided by admin
export const GLOBAL_SPORTS_PROFILE = '/global_sports_profile.jpeg';
export const GLOBAL_CULTURAL_PROFILE = '/cultural_global_profile_photo.jpeg';

export function isGlobalProfile(url?: string | null): boolean {
  if (!url) return true;
  return (
    url.includes('global_sports_profile') ||
    url.includes('cultural_global_profile') ||
    url.includes('unsplash.com')
  );
}

export function getEventBanner(event?: { type?: string; bannerImage?: string } | null): string {
  const banner = event?.bannerImage?.trim();
  if (banner && !banner.includes('unsplash.com')) {
    if (banner.includes('global_sports_profile')) {
      return GLOBAL_SPORTS_PROFILE;
    }
    if (banner.includes('cultural_global_profile')) {
      return GLOBAL_CULTURAL_PROFILE;
    }
    return banner;
  }
  return event?.type === 'cultural'
    ? GLOBAL_CULTURAL_PROFILE
    : GLOBAL_SPORTS_PROFILE;
}
