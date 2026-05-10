import { useEffect, useRef } from "react";

export function useDebouncedSave<T>(
  value: T,
  delayMs: number,
  save: (value: T) => void,
  enabled = true,
) {
  const first = useRef(true);
  useEffect(() => {
    if (!enabled) return;
    if (first.current) {
      first.current = false;
      return;
    }
    const t = setTimeout(() => save(value), delayMs);
    return () => clearTimeout(t);
  }, [value, delayMs, save, enabled]);
}
