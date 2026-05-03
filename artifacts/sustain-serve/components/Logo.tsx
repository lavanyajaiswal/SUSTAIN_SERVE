import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Svg, { Circle, Path, G } from "react-native-svg";
import { useColors } from "@/hooks/useColors";

interface LogoProps {
  size?: number;
  showText?: boolean;
  textColor?: string;
  variant?: "default" | "white" | "dark";
  onPress?: () => void;
}

export function SustainServeLogo({
  size = 48,
  showText = true,
  textColor,
  variant = "default",
  onPress,
}: LogoProps) {
  const colors = useColors();

  const logoColor =
    variant === "white"
      ? "#FFFFFF"
      : variant === "dark"
      ? colors.primary
      : colors.primary;
  const txtColor = textColor || (variant === "white" ? "#FFFFFF" : colors.primary);

  const content = (
    <View style={styles.container}>
      <Svg width={size} height={size} viewBox="0 0 100 100">
        <Circle cx="50" cy="50" r="48" fill={logoColor} opacity={0.12} />
        <Circle cx="50" cy="50" r="42" fill={logoColor} opacity={0.08} />
        {/* Fork */}
        <G transform="translate(28, 18)">
          <Path
            d="M10 0 L10 20 M6 0 L6 12 C6 16 10 18 10 20 M14 0 L14 12 C14 16 10 18 10 20 M10 20 L10 45"
            stroke={logoColor}
            strokeWidth="3.5"
            strokeLinecap="round"
            fill="none"
          />
        </G>
        {/* Leaf */}
        <G transform="translate(50, 14)">
          <Path
            d="M5 0 C5 0 -8 8 -8 20 C-8 30 0 36 5 36 C10 36 18 30 18 20 C18 8 5 0 5 0 Z"
            fill={logoColor}
            opacity={0.9}
          />
          <Path
            d="M5 4 C5 4 5 30 5 36"
            stroke={logoColor === "#FFFFFF" ? "rgba(255,255,255,0.6)" : "rgba(255,255,255,0.7)"}
            strokeWidth="1.5"
            strokeLinecap="round"
            fill="none"
          />
        </G>
        {/* Plate/circle at bottom */}
        <Path
          d="M22 72 Q50 80 78 72"
          stroke={logoColor}
          strokeWidth="3.5"
          strokeLinecap="round"
          fill="none"
        />
      </Svg>
      {showText && (
        <View style={styles.textContainer}>
          <Text style={[styles.brand, { color: txtColor, fontSize: size * 0.35 }]}>
            SustainServe
          </Text>
        </View>
      )}
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
        {content}
      </TouchableOpacity>
    );
  }

  return content;
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  textContainer: {
    justifyContent: "center",
  },
  brand: {
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.5,
  },
});
