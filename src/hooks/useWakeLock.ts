import { useRef, useCallback } from 'react';

/**
 * useWakeLock prevents the device screen from locking during recording.
 *
 * Uses the Screen Wake Lock API (navigator.wakeLock). When the user starts
 * recording, call requestWakeLock() — this tells the OS "keep the screen on."
 * When recording stops, call releaseWakeLock() to let the screen lock normally.
 *
 * The API may not be available in all browsers (notably some older iOS Safari
 * versions), so everything is wrapped in try/catch. If unsupported, recording
 * still works — the screen just might auto-lock during a long take.
 */
export function useWakeLock() {
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);

  const requestWakeLock = useCallback(async () => {
    try {
      if ('wakeLock' in navigator) {
        wakeLockRef.current = await navigator.wakeLock.request('screen');
      }
    } catch {
      // Wake Lock not supported or request denied — safe to ignore
    }
  }, []);

  const releaseWakeLock = useCallback(() => {
    if (wakeLockRef.current) {
      wakeLockRef.current.release();
      wakeLockRef.current = null;
    }
  }, []);

  return { requestWakeLock, releaseWakeLock };
}
