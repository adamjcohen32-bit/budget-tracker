import { useState, useEffect, useRef } from 'react';

// Smoothly animates a number toward `target` (easeOutCubic).
// Counts up from 0 on first mount; animates from the previous value after.
export default function useCountUp(target, duration = 650) {
  const [value, setValue] = useState(0);
  const fromRef = useRef(0);
  const rafRef = useRef();

  useEffect(() => {
    const from = fromRef.current;
    const to = Number(target) || 0;
    if (from === to) {
      setValue(to);
      return;
    }
    const start = performance.now();
    const tick = (now) => {
      const t = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3); // easeOutCubic
      setValue(from + (to - from) * eased);
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        fromRef.current = to;
      }
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [target, duration]);

  return value;
}
