import React from 'react';
import crowdImage from './festival_crowd.png';

/** COLORIDO 2K26 FESTIVAL THEME — static generated audience layer. */
export const FestivalCrowd: React.FC = () => (
  <div className="nf-layer nf-crowd" aria-hidden="true">
    <img className="nf-crowd-photo" src={crowdImage} alt="" draggable={false} />
  </div>
);
