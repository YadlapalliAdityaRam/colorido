import type { EventItem } from '../types';

type RegistrationRules = Pick<EventItem, 'format' | 'playersPerTeam' | 'maxTeamSize' | 'minTeamSize'>;

export const isTeamRegistration = (event?: RegistrationRules | null): boolean => {
  const format = String(event?.format || '').toLowerCase();
  return format === 'team' || format === 'doubles';
};

/** A solo event always collects one participant. Team events honor Admin's configured squad size. */
export const getRequiredPlayerCount = (event?: RegistrationRules | null): number => {
  if (!event || !isTeamRegistration(event)) return 1;
  const configured = [event.playersPerTeam, event.maxTeamSize, event.minTeamSize]
    .map(value => Number(value))
    .find(value => Number.isInteger(value) && value > 1);
  return configured || 2;
};
