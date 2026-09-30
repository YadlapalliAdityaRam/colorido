import React from 'react';
import './festival-route-transition.css';

export type FestivalRouteTransitionState = {
  destination: string;
  word: string;
  direction: 'forward' | 'backward';
  duration: number;
  phase: 'outgoing' | 'incoming';
  major: boolean;
  admin: boolean;
  motion: 'full' | 'lite';
};

interface FestivalRouteTransitionProps {
  transition: FestivalRouteTransitionState | null;
}

/** Decorative only: the layer never captures pointer or keyboard input. */
export const FestivalRouteTransition: React.FC<FestivalRouteTransitionProps> = ({ transition }) => {
  if (!transition) return null;

  return (
    <div
      aria-hidden="true"
      className="festival-route-transition"
      data-destination={transition.destination}
      data-direction={transition.direction}
      data-phase={transition.phase}
      data-major={transition.major}
      data-admin={transition.admin}
      data-motion={transition.motion}
      style={{ '--route-duration': `${transition.duration}ms` } as React.CSSProperties}
    >
      {!transition.admin && (
        <>
          <div className="festival-route-transition__curtain" />
          <div className="festival-route-transition__beam" />
          <div className="festival-route-transition__grain" />
          <div className="festival-route-transition__word">{transition.word}</div>
          {transition.major && (
            <div className="festival-route-transition__identity">COLORIDO <span>2K26</span></div>
          )}
        </>
      )}
    </div>
  );
};
