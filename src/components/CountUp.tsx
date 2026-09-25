import { useEffect, useRef } from 'react';
import { animate, useReducedMotion } from 'motion/react';
import { formatNumber } from '../lib/format';

// Counts from the previous value to the new one. Short, so repeated period
// switches never feel like waiting.
export default function CountUp({ value, digits = 0 }: { value: number; digits?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const previous = useRef(0);
  const reduce = useReducedMotion();

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const from = previous.current;
    previous.current = value;
    if (reduce || from === value) {
      node.textContent = formatNumber(value, digits);
      return;
    }
    const controls = animate(from, value, {
      duration: 0.6,
      ease: [0.23, 1, 0.32, 1],
      onUpdate: (v) => (node.textContent = formatNumber(v, digits)),
    });
    return () => controls.stop();
  }, [value, digits, reduce]);

  return <span ref={ref}>{formatNumber(reduce ? value : previous.current, digits)}</span>;
}
