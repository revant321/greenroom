import { useCallback, useRef, useState } from "react";
import { useFocusEffect } from "expo-router";

/**
 * Counts how many times this screen has regained focus (e.g. switching back
 * to its tab). Feed the result into <RiseIn refreshKey={...}> so the staggered
 * entrance re-plays on every visit, not just the first mount.
 *
 * The first focus is skipped — the mount already plays the entrance.
 */
export function useFocusRefresh(): number {
  const [tick, setTick] = useState(0);
  const isFirstFocus = useRef(true);

  useFocusEffect(
    useCallback(() => {
      if (isFirstFocus.current) {
        isFirstFocus.current = false;
        return;
      }
      setTick((t) => t + 1);
    }, []),
  );

  return tick;
}
