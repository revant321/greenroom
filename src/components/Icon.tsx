import { SymbolView, SymbolWeight } from "expo-symbols";
import { Ionicons } from "@expo/vector-icons";
import { Platform, StyleProp, ViewStyle } from "react-native";
import { useTheme } from "@/theme/useTheme";

type Props = {
  sf: string;
  ion: keyof typeof Ionicons.glyphMap;
  size?: number;
  weight?: SymbolWeight;
  color?: string;
  style?: StyleProp<ViewStyle>;
};

export function Icon({
  sf,
  ion,
  size = 22,
  weight = "regular",
  color,
  style,
}: Props) {
  const { colors } = useTheme();
  const resolved = color ?? colors.accent;

  if (Platform.OS === "ios") {
    return (
      <SymbolView
        name={sf as any}
        size={size}
        weight={weight}
        tintColor={resolved}
        style={style}
      />
    );
  }
  return <Ionicons name={ion} size={size} color={resolved} style={style as any} />;
}
