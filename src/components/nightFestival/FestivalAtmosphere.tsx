import React from 'react';

/** COLORIDO 2K26 — NIGHT FESTIVAL THEME */
export const FestivalAtmosphere: React.FC = () => {
  const particles = [
    { left: '8%', top: '22%', delay: '0s', size: 2 },
    { left: '14%', top: '48%', delay: '1.2s', size: 3 },
    { left: '22%', top: '18%', delay: '2.4s', size: 2 },
    { left: '31%', top: '62%', delay: '0.6s', size: 2 },
    { left: '41%', top: '28%', delay: '3.1s', size: 3 },
    { left: '52%', top: '14%', delay: '1.8s', size: 2 },
    { left: '61%', top: '44%', delay: '2.8s', size: 2 },
    { left: '72%', top: '20%', delay: '0.4s', size: 3 },
    { left: '81%', top: '56%', delay: '1.5s', size: 2 },
    { left: '88%', top: '30%', delay: '2.2s', size: 2 },
    { left: '93%', top: '68%', delay: '3.6s', size: 3 },
    { left: '6%', top: '74%', delay: '4.1s', size: 2 },
  ];

  return (
    <>
      <div className="nf-layer nf-atmosphere" aria-hidden="true">
        <div className="nf-vignette" />
        <div className="nf-stage-glow" />
        <div className="nf-haze" />
      </div>
      <div className="nf-layer nf-light-particles" aria-hidden="true">
        <div className="nf-particles">
          {particles.map((p, i) => (
            <span
              key={i}
              className={`nf-particle ${i > 5 ? 'nf-hide-mobile' : ''}`}
              style={{
                left: p.left,
                top: p.top,
                width: p.size,
                height: p.size,
                animationDelay: p.delay,
                animationDuration: `${11 + (i % 5)}s`,
              }}
            />
          ))}
        </div>
      </div>
    </>
  );
};
