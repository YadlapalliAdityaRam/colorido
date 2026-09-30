import React, { useEffect, useRef } from 'react';

/** Fine-pointer-only ambient cursor glow and opt-in magnetic CTA movement. */
export const FestivalPointerEffects: React.FC<{ enabled?: boolean }> = ({ enabled = true }) => {
  const glowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const finePointer = window.matchMedia('(pointer: fine)');
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const device = navigator as Navigator & { deviceMemory?: number; connection?: { saveData?: boolean } };
    const lowPower = device.connection?.saveData ||
      (device.deviceMemory !== undefined && device.deviceMemory < 4) ||
      navigator.hardwareConcurrency <= 4;
    if (!enabled || !finePointer.matches || reducedMotion.matches || lowPower) return;

    let frame = 0;
    let lastTarget: HTMLElement | null = null;
    const glow = glowRef.current;

    const onPointerMove = (event: PointerEvent) => {
      if (event.pointerType !== 'mouse' && event.pointerType !== 'pen') return;
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        if (glow) {
          glow.style.transform = `translate3d(${event.clientX}px, ${event.clientY}px, 0) translate(-50%, -50%)`;
          glow.style.opacity = document.visibilityState === 'visible' ? '1' : '0';
        }

        const target = (event.target as HTMLElement | null)?.closest<HTMLElement>('.festival-magnetic') || null;
        if (lastTarget && lastTarget !== target) {
          lastTarget.style.setProperty('--mag-x', '0px');
          lastTarget.style.setProperty('--mag-y', '0px');
        }
        lastTarget = target;
        if (!target) return;

        const rect = target.getBoundingClientRect();
        const dx = Math.max(-8, Math.min(8, (event.clientX - rect.left - rect.width / 2) * .14));
        const dy = Math.max(-8, Math.min(8, (event.clientY - rect.top - rect.height / 2) * .14));
        target.style.setProperty('--mag-x', `${dx}px`);
        target.style.setProperty('--mag-y', `${dy}px`);
      });
    };

    const resetMagnets = () => {
      if (lastTarget) {
        lastTarget.style.setProperty('--mag-x', '0px');
        lastTarget.style.setProperty('--mag-y', '0px');
        lastTarget = null;
      }
      if (glow) glow.style.opacity = '0';
    };

    window.addEventListener('pointermove', onPointerMove, { passive: true });
    window.addEventListener('blur', resetMagnets);
    document.addEventListener('visibilitychange', resetMagnets);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('blur', resetMagnets);
      document.removeEventListener('visibilitychange', resetMagnets);
      resetMagnets();
    };
  }, [enabled]);

  return enabled ? <div ref={glowRef} aria-hidden="true" className="festival-cursor-glow" /> : null;
};
