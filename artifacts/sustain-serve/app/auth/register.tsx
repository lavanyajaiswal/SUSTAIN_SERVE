import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
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
import { SustainServeLogo } from "@/components/Logo";
import { UserRole } from "@/context/AuthContext";
import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";

const ROLES: { value: UserRole; label: string; desc: string; icon: string; color: string }[] = [
  { value: "donor", label: "Donor", desc: "Donate surplus food", icon: "gift", color: "#2D9E6B" },
  { value: "ngo", label: "NGO", desc: "Collect & distribute", icon: "users", color: "#E67E22" },
  { value: "delivery", label: "Delivery", desc: "Transport food", icon: "truck", color: "#4299E1" },
];

export default function RegisterScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { register } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [orgName, setOrgName] = useState("");
  const [role, setRole] = useState<UserRole>("donor");
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (!name.trim() || !email.trim() || !password.trim()) {
      Alert.alert("Error", "Please fill all required fields");
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setLoading(true);
    try {
      const newUser = await register({ name, email, password, role, phone, orgName });
      router.replace(`/dashboard/${newUser.role}` as any);
    } catch (e: any) {
      Alert.alert("Registration Failed", e.message || "Please try again");
    } finally {
      setLoading(false);
    }
  };

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingTop: topPad + 10 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </TouchableOpacity>

        <View style={styles.logoSection}>
          <SustainServeLogo size={42} showText={true} onPress={() => router.replace("/landing")} />
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
            Create your account
          </Text>
        </View>

        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>
            I am a...
          </Text>
          <View style={styles.roleGrid}>
            {ROLES.map((r) => (
              <TouchableOpacity
                key={r.value}
                style={[
                  styles.roleBtn,
                  {
                    borderColor: role === r.value ? r.color : colors.border,
                    backgroundColor: role === r.value ? r.color + "15" : colors.muted,
                  },
                ]}
                onPress={() => { setRole(r.value); Haptics.selectionAsync(); }}
              >
                <Feather name={r.icon as any} size={20} color={role === r.value ? r.color : colors.mutedForeground} />
                <Text style={[styles.roleLabel, { color: role === r.value ? r.color : colors.foreground }]}>
                  {r.label}
                </Text>
                <Text style={[styles.roleDesc, { color: colors.mutedForeground }]}>
                  {r.desc}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.fieldRow}>
            <View style={[styles.field, { flex: 1 }]}>
              <Text style={[styles.label, { color: colors.mutedForeground }]}>Full Name *</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.muted, borderColor: colors.border, color: colors.foreground }]}
                value={name} onChangeText={setName}
                placeholder="Your name" placeholderTextColor={colors.mutedForeground}
              />
            </View>
          </View>

          {role === "ngo" && (
            <View style={styles.field}>
              <Text style={[styles.label, { color: colors.mutedForeground }]}>Organization Name</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.muted, borderColor: colors.border, color: colors.foreground }]}
                value={orgName} onChangeText={setOrgName}
                placeholder="NGO name" placeholderTextColor={colors.mutedForeground}
              />
            </View>
          )}

          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.mutedForeground }]}>Email *</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.muted, borderColor: colors.border, color: colors.foreground }]}
              value={email} onChangeText={setEmail}
              placeholder="your@email.com" placeholderTextColor={colors.mutedForeground}
              keyboardType="email-address" autoCapitalize="none"
            />
          </View>

          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.mutedForeground }]}>Phone</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.muted, borderColor: colors.border, color: colors.foreground }]}
              value={phone} onChangeText={setPhone}
              placeholder="+1 234 567 890" placeholderTextColor={colors.mutedForeground}
              keyboardType="phone-pad"
            />
          </View>

          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.mutedForeground }]}>Password *</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.muted, borderColor: colors.border, color: colors.foreground }]}
              value={password} onChangeText={setPassword}
              placeholder="Min. 6 characters" placeholderTextColor={colors.mutedForeground}
              secureTextEntry
            />
          </View>

          <TouchableOpacity
            style={[styles.registerBtn, { backgroundColor: colors.primary }]}
            onPress={handleRegister} disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.registerBtnText}>Create Account</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity onPress={() => router.back()}>
            <Text style={[styles.link, { color: colors.mutedForeground }]}>
              Already have an account?{" "}
              <Text style={{ color: colors.primary, fontFamily: "Inter_600SemiBold" }}>Sign In</Text>
            </Text>
          </TouchableOpacity>
        </View>
        <View style={{ height: Platform.OS === "web" ? 34 : insets.bottom + 20 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  scroll: { flexGrow: 1, paddingHorizontal: 20, gap: 16 },
  backBtn: { width: 40, height: 40, justifyContent: "center" },
  logoSection: { alignItems: "center", gap: 6 },
  subtitle: { fontFamily: "Inter_400Regular", fontSize: 14 },
  card: { borderRadius: 20, borderWidth: 1, padding: 24, gap: 16 },
  sectionTitle: { fontFamily: "Inter_500Medium", fontSize: 13 },
  roleGrid: { flexDirection: "row", gap: 8 },
  roleBtn: {
    flex: 1, borderRadius: 12, borderWidth: 1.5, padding: 12,
    alignItems: "center", gap: 4,
  },
  roleLabel: { fontFamily: "Inter_600SemiBold", fontSize: 13 },
  roleDesc: { fontFamily: "Inter_400Regular", fontSize: 10, textAlign: "center" },
  fieldRow: { flexDirection: "row", gap: 12 },
  field: { gap: 6 },
  label: { fontFamily: "Inter_500Medium", fontSize: 13 },
  input: {
    borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 12,
    fontFamily: "Inter_400Regular", fontSize: 15,
  },
  registerBtn: { borderRadius: 12, paddingVertical: 14, alignItems: "center", marginTop: 4 },
  registerBtnText: { fontFamily: "Inter_600SemiBold", color: "#FFFFFF", fontSize: 16 },
  link: { textAlign: "center", fontFamily: "Inter_400Regular", fontSize: 14 },
});
