import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/context/AuthContext";
import { useDonations } from "@/context/DonationsContext";
import { useColors } from "@/hooks/useColors";

const CATEGORIES = [
  { value: "vegetables", label: "Vegetables", emoji: "🥦" },
  { value: "fruits", label: "Fruits", emoji: "🍎" },
  { value: "cooked", label: "Cooked Food", emoji: "🍲" },
  { value: "bakery", label: "Bakery", emoji: "🍞" },
  { value: "dairy", label: "Dairy", emoji: "🥛" },
  { value: "grains", label: "Grains", emoji: "🌾" },
  { value: "other", label: "Other", emoji: "📦" },
];

const FRESHNESS_COLORS = {
  fresh: "#2D9E6B",
  acceptable: "#F59E0B",
  poor: "#E67E22",
  unsafe: "#E53E3E",
};

const FRESHNESS_ICONS = {
  fresh: "check-circle",
  acceptable: "alert-circle",
  poor: "alert-triangle",
  unsafe: "x-circle",
};

const FRESHNESS_LABELS = {
  fresh: "Fresh",
  acceptable: "Acceptable",
  poor: "Poor Condition",
  unsafe: "Unsafe",
};

interface FreshnessResult {
  score: number;
  label: "fresh" | "acceptable" | "poor" | "unsafe";
  summary: string;
  tips: string;
  analyzedAt?: string;
}

function getApiBase() {
  const domain = process.env.EXPO_PUBLIC_DOMAIN;
  if (domain) return `https://${domain}`;
  return "http://localhost:8080";
}

export default function CreateDonationScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { createDonation } = useDonations();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [quantity, setQuantity] = useState("");
  const [category, setCategory] = useState("vegetables");
  const [address, setAddress] = useState("");
  const [expiryHours, setExpiryHours] = useState("24");
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [freshnessResult, setFreshnessResult] = useState<FreshnessResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [unsafeWarning, setUnsafeWarning] = useState(false);

  const analyzeFreshness = async (base64: string, foodTitle: string, foodCategory: string) => {
    setAnalyzing(true);
    setFreshnessResult(null);
    try {
      const resp = await fetch(`${getApiBase()}/api/ai/freshness`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageBase64: base64,
          mimeType: "image/jpeg",
          foodTitle: foodTitle || "food item",
          category: foodCategory,
        }),
      });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const data = await resp.json();
      setFreshnessResult(data);
      if (data.label === "unsafe") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch {
      setFreshnessResult({
        score: 50,
        label: "acceptable",
        summary: "AI freshness analysis is temporarily unavailable.",
        tips: "Please follow standard food safety checks before posting.",
        analyzedAt: new Date().toISOString(),
      });
    } finally {
      setAnalyzing(false);
    }
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.7,
      base64: true,
    });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      setImageUri(asset.uri);
      setFreshnessResult(null);
      setUnsafeWarning(false);
      Haptics.selectionAsync();
      const b64 = asset.base64;
      if (b64) {
        setImageBase64(b64);
        analyzeFreshness(b64, title, category);
      }
    }
  };

  const handleSubmit = async () => {
    setErrorMsg(null);
    if (!title.trim() || !quantity.trim() || !address.trim()) {
      setErrorMsg("Please fill in all required fields: Food Title, Quantity, and Pickup Address.");
      return;
    }
    if (loading) return;
    if (freshnessResult?.label === "unsafe" && !unsafeWarning) {
      setUnsafeWarning(true);
      return;
    }
    await submitDonation();
  };

  const submitDonation = async () => {
    if (loading) return;
    setUnsafeWarning(false);
    setLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const expiry = new Date(Date.now() + parseInt(expiryHours, 10) * 60 * 60 * 1000).toISOString();
      await createDonation({
        title,
        description,
        quantity,
        category,
        pickupAddress: address,
        expiryDate: expiry,
        donorId: user?.id || "",
        donorName: user?.name || "",
        donorPhone: user?.phone || "",
        imageUri: imageUri || undefined,
        freshnessReport: freshnessResult
          ? {
              score: freshnessResult.score,
              label: freshnessResult.label,
              summary: freshnessResult.summary,
              tips: freshnessResult.tips,
              analyzedAt: freshnessResult.analyzedAt || new Date().toISOString(),
            }
          : undefined,
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    } catch {
      setErrorMsg("Failed to create donation. Please try again.");
      setLoading(false);
    }
  };

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;
  const freshnessColor = freshnessResult ? FRESHNESS_COLORS[freshnessResult.label] : colors.primary;

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.background }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
      <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border, paddingTop: topPad + 12 }]}> 
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Donate Food</Text>
        <TouchableOpacity style={[styles.submitBtn, { backgroundColor: loading ? colors.muted : colors.primary }]} onPress={handleSubmit} disabled={loading}>
          {loading ? <ActivityIndicator size="small" color={colors.primary} /> : <Text style={styles.submitBtnText}>Post</Text>}
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: bottomPad + 20 }]} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        {errorMsg && (
          <View style={styles.errorBanner}>
            <Feather name="alert-circle" size={16} color="#E53E3E" />
            <Text style={styles.errorBannerText}>{errorMsg}</Text>
            <TouchableOpacity onPress={() => setErrorMsg(null)}>
              <Feather name="x" size={16} color="#E53E3E" />
            </TouchableOpacity>
          </View>
        )}

        {unsafeWarning && (
          <View style={styles.unsafeBox}>
            <View style={styles.unsafeHeader}>
              <Feather name="alert-triangle" size={18} color="#E53E3E" />
              <Text style={styles.unsafeTitle}>Food Safety Warning</Text>
            </View>
            <Text style={styles.unsafeMsg}>
              AI analysis flagged this food as unsafe. Are you sure you want to post this donation?
            </Text>
            <View style={styles.unsafeBtns}>
              <TouchableOpacity style={styles.unsafeCancelBtn} onPress={() => setUnsafeWarning(false)}>
                <Text style={styles.unsafeCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.unsafePostBtn} onPress={submitDonation}>
                <Text style={styles.unsafePostText}>Post Anyway</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        <TouchableOpacity style={[styles.imagePicker, { backgroundColor: colors.muted, borderColor: freshnessResult ? freshnessColor : colors.border }]} onPress={pickImage}>
          {imageUri ? (
            <Image source={{ uri: imageUri }} style={styles.previewImage} />
          ) : (
            <View style={styles.imagePickerContent}>
              <Feather name="camera" size={32} color={colors.mutedForeground} />
              <Text style={[styles.imagePickerText, { color: colors.mutedForeground }]}>Add Food Photo</Text>
              <Text style={[styles.imagePickerSub, { color: colors.mutedForeground }]}>AI will analyze freshness automatically</Text>
            </View>
          )}
        </TouchableOpacity>

        {analyzing && (
          <View style={[styles.freshnessBox, { backgroundColor: "#7C3AED10", borderColor: "#7C3AED30" }]}>
            <ActivityIndicator size="small" color="#7C3AED" />
            <View style={{ flex: 1 }}>
              <Text style={[styles.freshnessTitle, { color: "#7C3AED" }]}>Analyzing Freshness...</Text>
              <Text style={[styles.freshnessSub, { color: colors.mutedForeground }]}>AI is checking the food's condition</Text>
            </View>
          </View>
        )}

        {freshnessResult && !analyzing && (
          <View style={[styles.freshnessBox, { backgroundColor: freshnessColor + "12", borderColor: freshnessColor + "35" }]}>
            <View style={[styles.freshnessIcon, { backgroundColor: freshnessColor + "20" }]}>
              <Feather name={FRESHNESS_ICONS[freshnessResult.label] as any} size={20} color={freshnessColor} />
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <View style={styles.freshnessRow}>
                <Text style={[styles.freshnessTitle, { color: freshnessColor }]}>{FRESHNESS_LABELS[freshnessResult.label]}</Text>
                <Text style={[styles.freshnessScore, { color: freshnessColor }]}>{freshnessResult.score}/100</Text>
              </View>
              <Text style={[styles.freshnessSummary, { color: colors.foreground }]}>{freshnessResult.summary}</Text>
              <Text style={[styles.freshnessTip, { color: colors.mutedForeground }]}>💡 {freshnessResult.tips}</Text>
            </View>
            <TouchableOpacity onPress={() => imageBase64 && analyzeFreshness(imageBase64, title, category)} style={styles.reanalyzeBtn}>
              <Feather name="refresh-cw" size={14} color={colors.mutedForeground} />
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.field}>
          <Text style={[styles.label, { color: colors.mutedForeground }]}>Food Title *</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.muted, borderColor: colors.border, color: colors.foreground }]}
            value={title} onChangeText={(t) => { setTitle(t); setErrorMsg(null); }}
            placeholder="e.g., Fresh Vegetables" placeholderTextColor={colors.mutedForeground}
          />
        </View>

        <View style={styles.field}>
          <Text style={[styles.label, { color: colors.mutedForeground }]}>Category *</Text>
          <View style={styles.categoryGrid}>
            {CATEGORIES.map((c) => (
              <TouchableOpacity
                key={c.value}
                style={[styles.categoryBtn, { borderColor: category === c.value ? colors.primary : colors.border, backgroundColor: category === c.value ? colors.primary + "15" : colors.muted }]}
                onPress={() => { setCategory(c.value); Haptics.selectionAsync(); }}
              >
                <Text style={styles.categoryEmoji}>{c.emoji}</Text>
                <Text style={[styles.categoryLabel, { color: category === c.value ? colors.primary : colors.foreground }]}>{c.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.row}>
          <View style={[styles.field, { flex: 1 }]}>
            <Text style={[styles.label, { color: colors.mutedForeground }]}>Quantity *</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.muted, borderColor: colors.border, color: colors.foreground }]}
              value={quantity} onChangeText={(t) => { setQuantity(t); setErrorMsg(null); }}
              placeholder="e.g., 10 kg" placeholderTextColor={colors.mutedForeground}
            />
          </View>
          <View style={[styles.field, { flex: 1 }]}>
            <Text style={[styles.label, { color: colors.mutedForeground }]}>Expires in (hrs)</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.muted, borderColor: colors.border, color: colors.foreground }]}
              value={expiryHours} onChangeText={setExpiryHours}
              placeholder="24" placeholderTextColor={colors.mutedForeground}
              keyboardType="numeric"
            />
          </View>
        </View>

        <View style={styles.field}>
          <Text style={[styles.label, { color: colors.mutedForeground }]}>Pickup Address *</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.muted, borderColor: colors.border, color: colors.foreground }]}
            value={address} onChangeText={(t) => { setAddress(t); setErrorMsg(null); }}
            placeholder="Full pickup address" placeholderTextColor={colors.mutedForeground}
          />
        </View>

        <View style={styles.field}>
          <Text style={[styles.label, { color: colors.mutedForeground }]}>Description</Text>
          <TextInput
            style={[styles.textarea, { backgroundColor: colors.muted, borderColor: colors.border, color: colors.foreground }]}
            value={description} onChangeText={setDescription}
            placeholder="Additional details about the food..." placeholderTextColor={colors.mutedForeground}
            multiline numberOfLines={4}
          />
        </View>

        <View style={[styles.infoBox, { backgroundColor: colors.secondary, borderColor: colors.primary + "30" }]}>
          <Feather name="info" size={16} color={colors.primary} />
          <Text style={[styles.infoText, { color: colors.primary }]}>Upload a photo to get an instant AI freshness check. NGOs can see this report when reviewing your donation.</Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingBottom: 16, borderBottomWidth: 1 },
  backBtn: { width: 40, height: 40, justifyContent: "center" },
  headerTitle: { fontFamily: "Inter_600SemiBold", fontSize: 18, flex: 1, textAlign: "center" },
  submitBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10, minWidth: 52, alignItems: "center" },
  submitBtnText: { fontFamily: "Inter_600SemiBold", color: "#FFF", fontSize: 14 },
  scroll: { padding: 20, gap: 16 },
  errorBanner: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: "#FEE2E2", borderRadius: 12, borderWidth: 1, borderColor: "#FCA5A5", padding: 12 },
  errorBannerText: { fontFamily: "Inter_500Medium", fontSize: 13, color: "#E53E3E", flex: 1 },
  unsafeBox: { backgroundColor: "#FEF2F2", borderRadius: 14, borderWidth: 1.5, borderColor: "#FCA5A5", padding: 16, gap: 10 },
  unsafeHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  unsafeTitle: { fontFamily: "Inter_700Bold", fontSize: 15, color: "#E53E3E" },
  unsafeMsg: { fontFamily: "Inter_400Regular", fontSize: 13, color: "#7F1D1D", lineHeight: 19 },
  unsafeBtns: { flexDirection: "row", gap: 8, marginTop: 4 },
  unsafeCancelBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: "#FCA5A5", alignItems: "center" },
  unsafeCancelText: { fontFamily: "Inter_600SemiBold", fontSize: 14, color: "#E53E3E" },
  unsafePostBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, backgroundColor: "#E53E3E", alignItems: "center" },
  unsafePostText: { fontFamily: "Inter_600SemiBold", fontSize: 14, color: "#FFF" },
  imagePicker: { height: 160, borderRadius: 16, borderWidth: 2, borderStyle: "dashed", alignItems: "center", justifyContent: "center", overflow: "hidden" },
  imagePickerContent: { alignItems: "center", gap: 6 },
  imagePickerText: { fontFamily: "Inter_500Medium", fontSize: 14 },
  imagePickerSub: { fontFamily: "Inter_400Regular", fontSize: 11 },
  previewImage: { width: "100%", height: "100%", resizeMode: "cover" },
  freshnessBox: { borderRadius: 14, borderWidth: 1, padding: 14, flexDirection: "row", alignItems: "flex-start", gap: 12 },
  freshnessIcon: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  freshnessRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  freshnessTitle: { fontFamily: "Inter_700Bold", fontSize: 15 },
  freshnessScore: { fontFamily: "Inter_600SemiBold", fontSize: 13 },
  freshnessSub: { fontFamily: "Inter_400Regular", fontSize: 12 },
  freshnessSummary: { fontFamily: "Inter_400Regular", fontSize: 13, lineHeight: 18, marginTop: 2 },
  freshnessTip: { fontFamily: "Inter_400Regular", fontSize: 12, fontStyle: "italic", marginTop: 2 },
  reanalyzeBtn: { padding: 4, marginTop: 2 },
  field: { gap: 6 },
  label: { fontFamily: "Inter_500Medium", fontSize: 13 },
  input: { borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 12, fontFamily: "Inter_400Regular", fontSize: 15 },
  textarea: { borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 12, fontFamily: "Inter_400Regular", fontSize: 15, textAlignVertical: "top", minHeight: 100 },
  row: { flexDirection: "row", gap: 12 },
  categoryGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  categoryBtn: { borderRadius: 10, borderWidth: 1.5, paddingHorizontal: 12, paddingVertical: 8, alignItems: "center", flexDirection: "row", gap: 6 },
  categoryEmoji: { fontSize: 16 },
  categoryLabel: { fontFamily: "Inter_500Medium", fontSize: 13 },
  infoBox: { borderRadius: 12, borderWidth: 1, padding: 14, flexDirection: "row", alignItems: "flex-start", gap: 10 },
  infoText: { fontFamily: "Inter_400Regular", fontSize: 13, flex: 1 },
});