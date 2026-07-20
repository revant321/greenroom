import { useCallback, useEffect, useRef, useState } from "react";
import { useFocusEffect, useNavigation } from "expo-router";

/**
 * Counts how many times this screen has been "arrived at" (tab swipe, pill
 * tap, or coming back from a screen stacked on top). Feed the result into
 * <RiseIn refreshKey={...}> so the staggered entrance re-plays on every
 * visit, not just the first mount.
 *
 * The replay fires as the arrival *starts* (swipe begins, back-gesture
 * begins), not after the transition settles — otherwise the old content
 * flashes fully-visible for a moment before the animation kicks in.
 */
export function useFocusRefresh(): number {
  const [tick, setTick] = useState(0);
  const navigation = useNavigation();
  const isFirstFocus = useRef(true);
  const lastReplayAt = useRef(0);

  // One arrival can trigger several events (e.g. swipeStart, then focus once
  // the pager settles); the time window collapses them into a single replay.
  const replay = useCallback(() => {
    const now = Date.now();
    if (now - lastReplayAt.current < 1500) return;
    lastReplayAt.current = now;
    setTick((t) => t + 1);
  }, []);

  useEffect(() => {
    // The pager's events live on the parent tab navigator.
    const tabNav = navigation.getParent();
    const subs = [
      // A finger started dragging the pager. With two tabs, the page that
      // is NOT focused is the one being dragged in — replay it now so the
      // rise runs during the swipe.
      (tabNav as any)?.addListener("swipeStart", () => {
        if (!navigation.isFocused()) {
          isFirstFocus.current = false;
          replay();
        }
      }),
      // This page's pill was tapped (fires just before the page snaps over).
      (tabNav as any)?.addListener("tabPress", () => {
        if (!navigation.isFocused()) {
          isFirstFocus.current = false;
          replay();
        }
      }),
      // A screen stacked on top of this one started closing — including the
      // moment an iOS back-swipe gesture begins, well before it finishes.
      (navigation as any).addListener("transitionStart", (e: any) => {
        if (!isFirstFocus.current && !e?.data?.closing) replay();
      }),
    ];
    return () => subs.forEach((unsub: (() => void) | undefined) => unsub?.());
  }, [navigation, replay]);

  // Fallback for arrivals with no early event (e.g. the Settings sheet
  // closing). The first focus is skipped — the mount already plays the
  // entrance.
  useFocusEffect(
    useCallback(() => {
      if (isFirstFocus.current) {
        isFirstFocus.current = false;
        return;
      }
      replay();
    }, [replay]),
  );

  return tick;
}
