import React from 'react';

/** COLORIDO 2K26 — NIGHT FESTIVAL THEME */
export const FestivalLights: React.FC = () => {
  const bokeh = [
    { left: '12%', bottom: '18%', size: 18, delay: '0s' },
    { left: '28%', bottom: '12%', size: 12, delay: '1.4s' },
    { left: '68%', bottom: '16%', size: 16, delay: '0.8s' },
    { left: '84%', bottom: '22%', size: 11, delay: '2.2s' },
    { left: '47%', bottom: '8%', size: 9, delay: '1.8s' },
  ];

  const flashes = [
    { left: '18%', bottom: '22%', delay: '0s' },
    { left: '39%', bottom: '16%', delay: '5.6s' },
    { left: '71%', bottom: '20%', delay: '11.2s' },
    { left: '88%', bottom: '28%', delay: '16.8s' },
    { left: '9%', bottom: '34%', delay: '22.4s' },
  ];

  const beams = [
    { className: 'nf-beam-a', delay: '0s' },
    { className: 'nf-beam-b nf-beam-white', delay: '2.4s' },
    { className: 'nf-beam-c nf-beam-gold', delay: '1.4s' },
    { className: 'nf-beam-d nf-beam-violet', delay: '4.2s' },
    { className: 'nf-beam-e', delay: '6.1s' },
  ];

  return (
    <div className="nf-layer nf-lighting" aria-hidden="true">
      <div className="nf-light-pulse" />
      {beams.map((beam) => (
        <div key={beam.className} className={`nf-beam ${beam.className}`} style={{ animationDelay: beam.delay }} />
      ))}

      {bokeh.map((b, i) => (
        <span
          key={`bokeh-${i}`}
          className={`nf-bokeh ${i > 2 ? 'nf-hide-mobile' : ''}`}
          style={{
            left: b.left,
            bottom: b.bottom,
            width: b.size,
            height: b.size,
            animationDelay: b.delay,
          }}
        />
      ))}

      {flashes.map((f, i) => (
        <span
          key={`flash-${i}`}
          className={`nf-flash ${i > 0 ? 'nf-hide-mobile' : ''}`}
          style={{
            left: f.left,
            bottom: f.bottom,
            animationDelay: f.delay,
          }}
        />
      ))}
    </div>
  );
};
