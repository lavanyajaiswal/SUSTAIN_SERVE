import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/context/AuthContext";
import { useDonations } from "@/context/DonationsContext";
import { useColors } from "@/hooks/useColors";

function getApiBase(): string {
  const domain = process.env.EXPO_PUBLIC_DOMAIN;
  if (domain) return `https://${domain}`;
  return "http://localhost:8080";
}

export default function AISuggestScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { getAvailableDonations, stats } = useDonations();

  const [suggestion, setSuggestion] = useState<string | null>(null);
  const [prediction, setPrediction] = useState<string | null>(null);
  const [loadingSuggest, setLoadingSuggest] = useState(false);
  const [loadingPredict, setLoadingPredict] = useState(false);

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const available = getAvailableDonations();

  const fetchSuggestion = async () => {
    setLoadingSuggest(true);
    setSuggestion(null);
    Haptics.selectionAsync();
    try {
      const res = await fetch(`${getApiBase()}/api/ai/suggest`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ngoName: user?.orgName || user?.name || "NGO",
          donations: available.slice(0, 10).map((d) => ({
            title: d.title,
            quantity: d.quantity,
            category: d.category,
            expiryDate: d.expiryDate,
          })),
        }),
      });
      const data = await res.json();
      setSuggestion(data.suggestion ?? "No suggestions available.");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      setSuggestion("Could not fetch suggestions. Check your connection.");
    } finally {
      setLoadingSuggest(false);
    }
  };

  const fetchPrediction = async (category: string) => {
    setLoadingPredict(true);
    setPrediction(null);
    Haptics.selectionAsync();
    try {
      const res = await fetch(`${getApiBase()}/api/ai/predict`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category,
          history: [
            { date: "3 days ago", count: Math.max(0, stats.total - 5) },
            { date: "2 days ago", count: Math.max(0, stats.total - 3) },
            { date: "Yesterday", count: Math.max(0, stats.total - 1) },
            { date: "Today", count: stats.total },
          ],
        }),
      });
      const data = await res.json();
      setPrediction(data.prediction ?? "No prediction available.");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      setPrediction("Could not fetch prediction. Check your connection.");
    } finally {
      setLoadingPredict(false);
    }
  };

  // Auto-fetch suggestion if there are available donations
  useEffect(() => {
    if (available.length > 0) fetchSuggestion();
  }, []);

  const categories = ["vegetables", "cooked", "dairy", "bakery", "grains"];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border, paddingTop: topPad + 12 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>AI Recommendations</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: bottomPad + 20 }]} showsVerticalScrollIndicator={false}>
        {/* Smart Allocation */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.cardHeader}>
            <View style={[styles.cardIcon, { backgroundColor: "#2D9E6B18" }]}>
              <Feather name="zap" size={20} color="#2D9E6B" />
            </View>
            <View style={styles.cardHeaderText}>
              <Text style={[styles.cardTitle, { color: colors.foreground }]}>Smart Allocation</Text>
              <Text style={[styles.cardSub, { color: colors.mutedForeground }]}>
                AI-powered advice based on {available.length} available donations
              </Text>
            </View>
          </View>

          {loadingSuggest ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator color="#2D9E6B" />
              <Text style={[styles.loadingText, { color: colors.mutedForeground }]}>Analyzing donations…</Text>
            </View>
          ) : suggestion ? (
            <View style={[styles.resultBox, { backgroundColor: "#E8F5EE", borderColor: "#2D9E6B30" }]}>
              <Text style={[styles.resultText, { color: "#1B5E3B" }]}>{suggestion}</Text>
            </View>
          ) : (
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
              No available donations to analyze. Accept some donations first.
            </Text>
          )}

          <TouchableOpacity
            style={[styles.refreshBtn, { backgroundColor: "#2D9E6B18", borderColor: "#2D9E6B30" }]}
            onPress={fetchSuggestion}
            disabled={loadingSuggest}
          >
            <Feather name="refresh-cw" size={14} color="#2D9E6B" />
            <Text style={[styles.refreshBtnText, { color: "#2D9E6B" }]}>
              {loadingSuggest ? "Analyzing…" : "Refresh Suggestions"}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Demand Prediction */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.cardHeader}>
            <View style={[styles.cardIcon, { backgroundColor: "#7C3AED18" }]}>
              <Feather name="trending-up" size={20} color="#7C3AED" />
            </View>
            <View style={styles.cardHeaderText}>
              <Text style={[styles.cardTitle, { color: colors.foreground }]}>Demand Prediction</Text>
              <Text style={[styles.cardSub, { color: colors.mutedForeground }]}>
                7-day forecast by food category
              </Text>
            </View>
          </View>

          <Text style={[styles.label, { color: colors.mutedForeground }]}>Select category to predict:</Text>
          <View style={styles.categoryGrid}>
            {categories.map((cat) => (
              <TouchableOpacity
                key={cat}
                style={[styles.catChip, { backgroundColor: colors.secondary, borderColor: colors.border }]}
                onPress={() => fetchPrediction(cat)}
                disabled={loadingPredict}
              >
                <Text style={[styles.catChipText, { color: colors.foreground }]}>
                  {cat.charAt(0).toUpperCase() + cat.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {loadingPredict ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator color="#7C3AED" />
              <Text style={[styles.loadingText, { color: colors.mutedForeground }]}>Generating forecast…</Text>
            </View>
          ) : prediction ? (
            <View style={[styles.resultBox, { backgroundColor: "#7C3AED0A", borderColor: "#7C3AED30" }]}>
              <Text style={[styles.resultText, { color: "#4C1D95" }]}>{prediction}</Text>
            </View>
          ) : null}
        </View>

        {/* Chat shortcut */}
        <TouchableOpacity
          style={[styles.chatCard, { backgroundColor: colors.primary }]}
          onPress={() => router.push("/ai-chat")}
        >
          <Feather name="message-circle" size={24} color="#FFF" />
          <View style={{ flex: 1 }}>
            <Text style={styles.chatCardTitle}>Ask SustainBot</Text>
            <Text style={styles.chatCardSub}>Chat with AI for any donation or logistics questions</Text>
          </View>
          <Feather name="arrow-right" size={20} color="rgba(255,255,255,0.8)" />
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 16, paddingBottom: 14, borderBottomWidth: 1,
  },
  backBtn: { width: 40, height: 40, justifyContent: "center" },
  headerTitle: { fontFamily: "Inter_600SemiBold", fontSize: 18 },
  content: { padding: 20, gap: 16 },
  card: { borderRadius: 16, borderWidth: 1, padding: 16, gap: 14 },
  cardHeader: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  cardIcon: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  cardHeaderText: { flex: 1, gap: 2 },
  cardTitle: { fontFamily: "Inter_600SemiBold", fontSize: 16 },
  cardSub: { fontFamily: "Inter_400Regular", fontSize: 12 },
  loadingRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 8 },
  loadingText: { fontFamily: "Inter_400Regular", fontSize: 13 },
  resultBox: { borderRadius: 12, borderWidth: 1, padding: 14 },
  resultText: { fontFamily: "Inter_400Regular", fontSize: 14, lineHeight: 21 },
  emptyText: { fontFamily: "Inter_400Regular", fontSize: 13, fontStyle: "italic" },
  refreshBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 6, borderRadius: 10, borderWidth: 1, paddingVertical: 10,
  },
  refreshBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 13 },
  label: { fontFamily: "Inter_400Regular", fontSize: 12 },
  categoryGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  catChip: { borderRadius: 20, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 7 },
  catChipText: { fontFamily: "Inter_500Medium", fontSize: 13 },
  chatCard: {
    borderRadius: 16, padding: 18,
    flexDirection: "row", alignItems: "center", gap: 14,
  },
  chatCardTitle: { fontFamily: "Inter_700Bold", color: "#FFF", fontSize: 16 },
  chatCardSub: { fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.8)", fontSize: 12, marginTop: 2 },
});
