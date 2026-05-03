import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useRef, useState } from "react";
import {
  Dimensions,
  FlatList,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ViewToken,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { SustainServeLogo } from "@/components/Logo";
import { useColors } from "@/hooks/useColors";

const { width } = Dimensions.get("window");

const SLIDES = [
  { id: "1", icon: "heart", emoji: "🍱", title: "Reduce Food Waste", subtitle: "Connect surplus food with people who need it most", color: "#2D9E6B", bg: "#E8F5EE", points: ["Post surplus food in 30 seconds", "Reach NGOs in your area instantly", "Track every donation in real-time"] },
  { id: "2", icon: "home", emoji: "🏠", title: "For NGOs & Shelters", subtitle: "Access a steady stream of food donations near you", color: "#E67E22", bg: "#FEF3E2", points: ["Browse available donations on map", "Accept donations with one tap", "Coordinate delivery partners easily"] },
  { id: "3", icon: "truck", emoji: "🚚", title: "Delivery Partners", subtitle: "Be the bridge between donors and those in need", color: "#4299E1", bg: "#EBF4FF", points: ["Get delivery tasks assigned instantly", "Navigate with built-in directions", "Track your impact and deliveries"] },
  { id: "4", icon: "shield", emoji: "🌱", title: "SustainServe", subtitle: "Fighting hunger, reducing waste — together", color: "#2D9E6B", bg: "#E8F5EE", points: ["Verified donors and NGOs", "Transparent donation tracking", "Real-time status updates"], isFinal: true },
];

export default function LandingScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatRef = useRef<FlatList>(null);
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const onViewRef = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    if (viewableItems.length > 0) setCurrentIndex(viewableItems[0].index ?? 0);
  });

  const next = async () => {
    Haptics.selectionAsync();
    if (currentIndex < SLIDES.length - 1) {
      flatRef.current?.scrollToIndex({ index: currentIndex + 1, animated: true });
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push("/auth/register");
  };

  const slide = SLIDES[currentIndex];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}> 
      <View style={[styles.header, { paddingTop: topPad + 12 }]}> 
        <SustainServeLogo size={32} showText={true} />
        <TouchableOpacity onPress={() => router.push("/auth/login")}> 
          <Text style={[styles.skipText, { color: colors.mutedForeground }]}>Sign In</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        ref={flatRef}
        data={SLIDES}
        keyExtractor={(s) => s.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onViewableItemsChanged={onViewRef.current}
        viewabilityConfig={{ itemVisiblePercentThreshold: 50 }}
        renderItem={({ item }) => (
          <View style={[styles.slide, { width }]}> 
            <View style={[styles.heroBox, { backgroundColor: item.bg }]}> 
              <Text style={styles.heroEmoji}>{item.emoji}</Text>
              <View style={[styles.heroBadge, { backgroundColor: item.color + "20", borderColor: item.color + "40" }]}> 
                <Feather name={item.icon as any} size={20} color={item.color} />
                <Text style={[styles.heroBadgeText, { color: item.color }]}>
                  {item.id === "1" ? "For Donors" : item.id === "2" ? "For NGOs" : item.id === "3" ? "For Delivery" : "Our Mission"}
                </Text>
              </View>
            </View>
            <View style={styles.slideContent}> 
              <Text style={[styles.slideTitle, { color: colors.foreground }]}>{item.title}</Text>
              <Text style={[styles.slideSubtitle, { color: colors.mutedForeground }]}>{item.subtitle}</Text>
              <View style={styles.points}>
                {item.points.map((p: string, i: number) => (
                  <View key={i} style={styles.point}> 
                    <View style={[styles.pointDot, { backgroundColor: item.color }]} />
                    <Text style={[styles.pointText, { color: colors.foreground }]}>{p}</Text>
                  </View>
                ))}
              </View>
            </View>
          </View>
        )}
      />

      <View style={[styles.footer, { paddingBottom: bottomPad + 16 }]}> 
        <View style={styles.dots}>
          {SLIDES.map((_, i) => (
            <TouchableOpacity
              key={i}
              onPress={() => {
                flatRef.current?.scrollToIndex({ index: i, animated: true });
                Haptics.selectionAsync();
              }}
              style={[styles.dot, { backgroundColor: i === currentIndex ? slide.color : colors.border, width: i === currentIndex ? 20 : 8 }]}
            />
          ))}
        </View>

        <View style={styles.footerButtons}>
          <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: currentIndex < SLIDES.length - 1 ? slide.color : colors.primary }]} onPress={next}>
            <Text style={styles.primaryBtnText}>{currentIndex < SLIDES.length - 1 ? "Next" : "Get Started"}</Text>
            <Feather name="arrow-right" size={18} color="#FFF" />
          </TouchableOpacity>
          {currentIndex === SLIDES.length - 1 && (
            <TouchableOpacity style={[styles.secondaryBtn, { borderColor: colors.border }]} onPress={() => router.push("/auth/login")}> 
              <Text style={[styles.secondaryBtnText, { color: colors.foreground }]}>Already have an account? <Text style={{ color: colors.primary }}>Sign In</Text></Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 24, paddingBottom: 8 },
  skipText: { fontFamily: "Inter_500Medium", fontSize: 14 },
  slide: { paddingHorizontal: 24, gap: 0 },
  heroBox: { borderRadius: 24, marginBottom: 28, padding: 32, alignItems: "center", justifyContent: "center", gap: 16, minHeight: 280 },
  heroEmoji: { fontSize: 80, lineHeight: 96 },
  heroBadge: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, borderWidth: 1 },
  heroBadgeText: { fontFamily: "Inter_600SemiBold", fontSize: 13 },
  slideContent: { gap: 12 },
  slideTitle: { fontFamily: "Inter_700Bold", fontSize: 26 },
  slideSubtitle: { fontFamily: "Inter_400Regular", fontSize: 15, lineHeight: 22 },
  points: { gap: 10, marginTop: 4 },
  point: { flexDirection: "row", alignItems: "center", gap: 10 },
  pointDot: { width: 8, height: 8, borderRadius: 4 },
  pointText: { fontFamily: "Inter_400Regular", fontSize: 14, flex: 1 },
  footer: { paddingHorizontal: 24, gap: 16 },
  dots: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6 },
  dot: { height: 8, borderRadius: 4 },
  footerButtons: { gap: 10 },
  primaryBtn: { borderRadius: 14, paddingVertical: 16, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  primaryBtnText: { fontFamily: "Inter_600SemiBold", color: "#FFF", fontSize: 16 },
  secondaryBtn: { borderRadius: 14, paddingVertical: 14, borderWidth: 1, alignItems: "center" },
  secondaryBtnText: { fontFamily: "Inter_400Regular", fontSize: 14 },
});