import { flushSync } from 'react-dom';

interface NativeViewTransition {
  finished: Promise<void>;
  skipTransition: () => void;
}

type DocumentWithViewTransitions = Document & {
  startViewTransition?: (update: () => void) => NativeViewTransition;
};

/** Uses the browser's shared-element snapshots where available; otherwise updates normally. */
export function runSharedViewTransition(update: () => void): NativeViewTransition | null {
  if (typeof document === 'undefined' || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    update();
    return null;
  }
  const startViewTransition = (document as DocumentWithViewTransitions).startViewTransition;
  if (!startViewTransition) {
    update();
    return null;
  }
  let updated = false;
  const updateOnce = () => {
    if (updated) return;
    updated = true;
    flushSync(update);
  };
  try {
    return startViewTransition.call(document, updateOnce);
  } catch {
    if (!updated) update();
    return null;
  }
}
