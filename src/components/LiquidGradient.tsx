import { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import {
  Blur,
  Canvas,
  Circle,
  DisplacementMap,
  Fill,
  Group,
  Paint,
  RadialGradient,
  Turbulence,
  vec,
} from "@shopify/react-native-skia";
import {
  cancelAnimation,
  Easing,
  SharedValue,
  useDerivedValue,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { useTheme } from "@/theme/useTheme";

/**
 * Animated "liquid" version of the signature gradient, used only on the big
 * action elements (FAB + primary buttons). Three soft color washes drift on
 * independent curved paths over a pink base, and the whole layer is blurred
 * and warped by slowly-morphing noise so it wobbles like water.
 *
 * Renders as an absolute-fill layer *behind* the element's content — the
 * icon/label stays crisp because it's a sibling above the canvas, not inside it.
 */

const BASE_COLOR = "#E9337A";

/** Each wash: color + travel range for its center, as fractions of the element size. */
const WASHES = [
  { color: "#FFA51E", x: [-0.45, 0.85], y: [-0.35, 0.95] },
  { color: "#7C3BFF", x: [0.25, 1.45], y: [-0.4, 0.9] },
  { color: "#FF2E63", x: [-0.25, 1.25], y: [0.2, 1.5] },
] as const;

/** Drift periods in seconds, one [x, y] pair per wash. Different x vs y
 * periods make each path a curve, and different pairs keep the washes
 * from ever moving in sync. */
export const LIQUID_PERIODS = {
  fab: [
    [1.7, 2.6],
    [2.1, 1.4],
    [2.4, 1.9],
  ],
  button: [
    [2.6, 3.9],
    [3.1, 2.2],
    [3.6, 2.8],
  ],
} as const;

/** How far the canvas extends past the visible element on every side.
 * The blur + displacement warp sample pixels from just outside the element;
 * without this margin the edges would show dark/transparent fringes. */
const BLEED = 32;

/** One looping 0→1→0 oscillation. `withRepeat(..., -1, true)` ping-pongs forever. */
function useOscillator(periodSec: number): SharedValue<number> {
  const value = useSharedValue(0);
  useEffect(() => {
    value.value = 0;
    value.value = withRepeat(
      withTiming(1, {
        duration: periodSec * 1000,
        easing: Easing.inOut(Easing.ease),
      }),
      -1,
      true,
    );
    return () => cancelAnimation(value);
  }, [periodSec, value]);
  return value;
}

function Wash({
  color,
  xRange,
  yRange,
  xPeriod,
  yPeriod,
  width,
  height,
  radius,
}: {
  color: string;
  xRange: readonly [number, number];
  yRange: readonly [number, number];
  xPeriod: number;
  yPeriod: number;
  width: number;
  height: number;
  radius: number;
}) {
  const ox = useOscillator(xPeriod);
  const oy = useOscillator(yPeriod);
  const center = useDerivedValue(
    () =>
      vec(
        BLEED + (xRange[0] + (xRange[1] - xRange[0]) * ox.value) * width,
        BLEED + (yRange[0] + (yRange[1] - yRange[0]) * oy.value) * height,
      ),
    [width, height],
  );
  return (
    <Circle c={center} r={radius}>
      <RadialGradient
        c={center}
        r={radius}
        colors={[color, `${color}00`]}
        positions={[0, 0.6]}
      />
    </Circle>
  );
}

export function LiquidGradient({
  variant = "button",
  speed = 1,
  intensity = 1,
  borderRadius = 0,
}: {
  variant?: keyof typeof LIQUID_PERIODS;
  /** Extra duration multiplier on top of the theme's animation-speed setting. */
  speed?: number;
  /** Scales the blur + warp strength. 1 = spec values. */
  intensity?: number;
  borderRadius?: number;
}) {
  const { speed: themeSpeed } = useTheme();
  const [size, setSize] = useState({ width: 0, height: 0 });

  const timeScale = themeSpeed * speed;
  const periods = LIQUID_PERIODS[variant];

  const noiseOsc = useOscillator(9 * timeScale);
  const noiseFreq = useDerivedValue(() => 0.012 + noiseOsc.value * 0.016);

  const { width, height } = size;
  const washRadius = Math.max(width, height) * 1.1;
  const blurSigma = Math.min(Math.max(Math.min(width, height) * 0.25, 6), 20) * intensity;

  return (
    <View
      pointerEvents="none"
      style={[
        StyleSheet.absoluteFill,
        { borderRadius, overflow: "hidden", backgroundColor: BASE_COLOR },
      ]}
      onLayout={(e) => {
        const { width: w, height: h } = e.nativeEvent.layout;
        if (w !== size.width || h !== size.height) setSize({ width: w, height: h });
      }}
    >
      {width > 0 && height > 0 && (
        <Canvas
          style={{
            position: "absolute",
            left: -BLEED,
            top: -BLEED,
            width: width + BLEED * 2,
            height: height + BLEED * 2,
          }}
        >
          <Group
            layer={
              <Paint>
                <Blur blur={blurSigma}>
                  <DisplacementMap channelX="g" channelY="a" scale={24 * intensity}>
                    <Turbulence
                      freqX={noiseFreq}
                      freqY={noiseFreq}
                      octaves={2}
                      seed={7}
                    />
                  </DisplacementMap>
                </Blur>
              </Paint>
            }
          >
            <Fill color={BASE_COLOR} />
            {WASHES.map((wash, i) => (
              <Wash
                key={wash.color}
                color={wash.color}
                xRange={wash.x}
                yRange={wash.y}
                xPeriod={periods[i][0] * timeScale}
                yPeriod={periods[i][1] * timeScale}
                width={width}
                height={height}
                radius={washRadius}
              />
            ))}
          </Group>
        </Canvas>
      )}
    </View>
  );
}
