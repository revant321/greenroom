import { useRef, useEffect, useState } from 'react';

interface Props {
  /** The live MediaStream from getUserMedia — the waveform reads audio from this */
  stream: MediaStream | null;
  /** Whether we're currently recording — controls the animation loop */
  isRecording: boolean;
}

/**
 * AudioWaveform draws a scrolling bar visualizer, similar to Apple Voice Memos.
 *
 * How it works:
 *
 * 1. We create a Web Audio API AudioContext and connect the mic stream to an
 *    AnalyserNode, which gives us real-time audio amplitude data.
 *
 * 2. Every ~50ms, we sample the current audio level by computing the RMS
 *    (root mean square) of the time-domain data. RMS gives a smooth amplitude
 *    reading — louder audio = higher value.
 *
 * 3. Each sample becomes a vertical bar. New bars appear on the right edge
 *    and old ones scroll left, creating the signature Voice Memos scrolling
 *    effect. Bar height maps to amplitude (louder = taller).
 *
 * 4. A subtle center line and a mm:ss timer complete the look.
 *
 * The drawing loop runs at 60fps via requestAnimationFrame for smooth
 * scrolling, but new bars are only added at the sampling interval so the
 * bar density stays consistent regardless of frame rate.
 */
export default function AudioWaveform({ stream, isRecording }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number>(0);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);

  // Accumulated bar amplitudes — each value is 0..1
  const barsRef = useRef<number[]>([]);
  // Timestamp of last bar sample, used to control bar density
  const lastBarTimeRef = useRef<number>(0);
  // Recording start time for the timer
  const startTimeRef = useRef<number>(0);

  const [elapsed, setElapsed] = useState(0);

  // Bar appearance constants
  const BAR_WIDTH = 3;
  const BAR_GAP = 1;
  const BAR_STEP = BAR_WIDTH + BAR_GAP; // 4px per bar
  const SAMPLE_INTERVAL = 50; // ms between new bars (~20 bars/sec)

  useEffect(() => {
    if (!stream || !isRecording) {
      // Clean up audio context when recording stops
      if (audioCtxRef.current) {
        audioCtxRef.current.close();
        audioCtxRef.current = null;
        analyserRef.current = null;
        sourceRef.current = null;
      }
      cancelAnimationFrame(animFrameRef.current);
      return;
    }

    // Reset bars and timer for a new recording
    barsRef.current = [];
    lastBarTimeRef.current = 0;
    const startTime = performance.now();
    startTimeRef.current = startTime;
    setElapsed(0);

    // --- Set up the Web Audio API pipeline ---
    const audioCtx = new AudioContext();
    audioCtxRef.current = audioCtx;

    const analyser = audioCtx.createAnalyser();
    analyser.fftSize = 2048;
    analyserRef.current = analyser;

    const source = audioCtx.createMediaStreamSource(stream);
    sourceRef.current = source;
    source.connect(analyser);
    // Don't connect to destination — we only analyze, never play back through speakers

    // Buffer for reading time-domain data each frame
    const dataArray = new Uint8Array(analyser.frequencyBinCount);

    function renderFrame(now: number) {
      animFrameRef.current = requestAnimationFrame(renderFrame);

      const canvas = canvasRef.current;
      const currentAnalyser = analyserRef.current;
      if (!canvas || !currentAnalyser) return;

      // Update the timer (triggers re-render for the mm:ss display)
      const elapsedSec = Math.floor((now - startTime) / 1000);
      setElapsed(elapsedSec);

      // Sample a new bar at the fixed interval
      if (now - lastBarTimeRef.current >= SAMPLE_INTERVAL) {
        lastBarTimeRef.current = now;

        // Read time-domain waveform data (0–255, 128 = silence)
        currentAnalyser.getByteTimeDomainData(dataArray);

        // Compute RMS (root mean square) for a smooth amplitude reading.
        // Each value is centered at 128. We normalize to -1..1, square,
        // average, then sqrt. Result is 0..1 where 0 = silence.
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          const v = (dataArray[i] - 128) / 128;
          sum += v * v;
        }
        const rms = Math.sqrt(sum / dataArray.length);

        // Boost quiet signals so they're visible — voice rarely exceeds
        // 0.3 RMS, so we scale up and clamp to 0..1
        const amplitude = Math.min(rms * 3, 1);
        barsRef.current.push(amplitude);
      }

      // --- Draw ---
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      const { width, height } = canvas;
      const centerY = height / 2;

      ctx.clearRect(0, 0, width, height);

      // Get accent color from CSS custom property
      const accent = getComputedStyle(document.documentElement)
        .getPropertyValue('--accent').trim() || '#5856d6';

      // Subtle center line
      ctx.beginPath();
      ctx.strokeStyle = 'rgba(136, 136, 136, 0.25)';
      ctx.lineWidth = 1;
      ctx.moveTo(0, centerY);
      ctx.lineTo(width, centerY);
      ctx.stroke();

      // How many bars fit on screen
      const maxBars = Math.ceil(width / BAR_STEP);
      const bars = barsRef.current;
      // Only draw the most recent bars that fit on screen
      const startIdx = Math.max(0, bars.length - maxBars);

      for (let i = startIdx; i < bars.length; i++) {
        // Position: newest bar is flush right, older bars scroll left
        const x = width - (bars.length - i) * BAR_STEP;

        // Bar height: minimum 2px so even silence shows a tiny dot
        const amp = bars[i];
        const barHeight = Math.max(2, amp * (height - 4));
        const halfBar = barHeight / 2;

        // Opacity varies with amplitude — louder bars are more opaque
        const opacity = 0.4 + amp * 0.6;
        ctx.fillStyle = accent;
        ctx.globalAlpha = opacity;

        // Draw bar extending both up and down from center (like Voice Memos)
        ctx.fillRect(
          x,
          centerY - halfBar,
          BAR_WIDTH,
          barHeight
        );
      }

      ctx.globalAlpha = 1;
    }

    animFrameRef.current = requestAnimationFrame(renderFrame);

    return () => {
      cancelAnimationFrame(animFrameRef.current);
      audioCtx.close();
      audioCtxRef.current = null;
      analyserRef.current = null;
      sourceRef.current = null;
    };
  }, [stream, isRecording]);

  function formatTime(totalSeconds: number): string {
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }

  return (
    <div className="waveform-container">
      <canvas
        ref={canvasRef}
        className="audio-waveform"
        width={600}
        height={80}
      />
      <span className="waveform-timer">{formatTime(elapsed)}</span>
    </div>
  );
}
