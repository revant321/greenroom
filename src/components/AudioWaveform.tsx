import { useRef, useEffect } from 'react';

interface Props {
  /** The live MediaStream from getUserMedia — the waveform reads audio from this */
  stream: MediaStream | null;
  /** Whether we're currently recording — controls the animation loop */
  isRecording: boolean;
}

/**
 * AudioWaveform draws a real-time audio waveform on a <canvas>, similar to
 * Apple Voice Memos. Here's how it works:
 *
 * 1. We create a Web Audio API AudioContext and connect the mic stream to an
 *    AnalyserNode. The AnalyserNode does FFT (Fast Fourier Transform) on the
 *    incoming audio, giving us time-domain data — essentially the raw waveform
 *    amplitude at each point in time.
 *
 * 2. Every animation frame, we read that time-domain data into a Uint8Array.
 *    Each value is 0–255, where 128 = silence (center line). Values above 128
 *    mean the wave is above center; below 128 means below.
 *
 * 3. We draw those values as a smooth line across the canvas, mapping each
 *    array index to an X position and each value to a Y position.
 *
 * The AnalyserNode's `fftSize` controls resolution — 2048 gives us 1024 data
 * points per frame, which is plenty smooth for a nice waveform.
 */
export default function AudioWaveform({ stream, isRecording }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number>(0);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);

  useEffect(() => {
    // Only start the visualizer when we have a stream and are recording
    if (!stream || !isRecording) {
      // If we stopped recording, clean up the audio context
      if (audioCtxRef.current) {
        audioCtxRef.current.close();
        audioCtxRef.current = null;
        analyserRef.current = null;
        sourceRef.current = null;
      }
      cancelAnimationFrame(animFrameRef.current);
      // Draw a flat line on the canvas (idle state)
      drawIdle();
      return;
    }

    // --- Set up the Web Audio API pipeline ---

    // AudioContext is the main entry point for all Web Audio operations.
    // It represents an audio-processing graph.
    const audioCtx = new AudioContext();
    audioCtxRef.current = audioCtx;

    // AnalyserNode provides real-time frequency and time-domain analysis.
    // We use time-domain data (getByteTimeDomainData) for the waveform.
    const analyser = audioCtx.createAnalyser();
    analyser.fftSize = 2048; // Higher = more data points = smoother wave
    analyserRef.current = analyser;

    // Connect the mic stream → AnalyserNode.
    // createMediaStreamSource wraps the raw mic stream into the Web Audio graph.
    const source = audioCtx.createMediaStreamSource(stream);
    sourceRef.current = source;
    source.connect(analyser);
    // Note: we do NOT connect analyser to audioCtx.destination — that would
    // play the mic audio through the speakers (feedback loop!). We just analyze.

    // Start the drawing loop
    draw();

    return () => {
      cancelAnimationFrame(animFrameRef.current);
      audioCtx.close();
      audioCtxRef.current = null;
      analyserRef.current = null;
      sourceRef.current = null;
    };
  }, [stream, isRecording]);

  /** Draw a flat center line when not recording */
  function drawIdle() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { width, height } = canvas;
    ctx.clearRect(0, 0, width, height);

    // Draw a subtle center line
    ctx.beginPath();
    ctx.strokeStyle = 'rgba(136, 136, 136, 0.3)';
    ctx.lineWidth = 1;
    ctx.moveTo(0, height / 2);
    ctx.lineTo(width, height / 2);
    ctx.stroke();
  }

  /** The main animation loop — reads audio data and draws the waveform */
  function draw() {
    const canvas = canvasRef.current;
    const analyser = analyserRef.current;
    if (!canvas || !analyser) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // bufferLength = fftSize / 2. This is how many data points we get per frame.
    const bufferLength = analyser.frequencyBinCount;
    // Uint8Array to hold the time-domain data (waveform amplitudes, 0–255)
    const dataArray = new Uint8Array(bufferLength);

    function renderFrame() {
      animFrameRef.current = requestAnimationFrame(renderFrame);

      // Fill dataArray with the current waveform data
      analyser!.getByteTimeDomainData(dataArray);

      const { width, height } = canvas!;
      const ctx2 = canvas!.getContext('2d')!;

      // Clear the previous frame
      ctx2.clearRect(0, 0, width, height);

      // Set up the line style — accent-colored, slightly thick
      ctx2.lineWidth = 2;
      ctx2.strokeStyle = getComputedStyle(document.documentElement)
        .getPropertyValue('--accent')
        .trim() || '#5856d6';
      ctx2.beginPath();

      // Each data point maps to a horizontal slice of the canvas
      const sliceWidth = width / bufferLength;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        // Normalize: 0–255 → 0.0–1.0, then map to canvas height.
        // 128 (silence) maps to height/2 (center).
        const v = dataArray[i] / 128.0;
        const y = (v * height) / 2;

        if (i === 0) {
          ctx2.moveTo(x, y);
        } else {
          ctx2.lineTo(x, y);
        }
        x += sliceWidth;
      }

      ctx2.lineTo(width, height / 2);
      ctx2.stroke();
    }

    renderFrame();
  }

  return (
    <canvas
      ref={canvasRef}
      className="audio-waveform"
      width={600}
      height={80}
    />
  );
}
