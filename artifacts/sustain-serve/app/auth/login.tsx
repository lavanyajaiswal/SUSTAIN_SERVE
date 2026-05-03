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
import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";

const DEMO_ACCOUNTS = [
  { role: "Admin", email: null, color: "#9B59B6" },
  { role: "Donor", email: "donor@sustainserve.com", color: "#2D9E6B" },
  { role: "NGO", email: "ngo@sustainserve.com", color: "#E67E22" },
  { role: "Delivery", email: "delivery@sustainserve.com", color: "#4299E1" },
];

export default function LoginScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email.trim()) {
      Alert.alert("Error", "Please enter your email");
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setLoading(true);
    try {
      const loggedInUser = await login(email.trim(), password);
      router.replace(`/dashboard/${loggedInUser.role}` as any);
    } catch (e: any) {
      Alert.alert("Login Failed", e.message || "Invalid credentials");
    } finally {
      setLoading(false);
    }
  };

  const fillDemo = (demoEmail: string | null) => {
    if (demoEmail) {
      setEmail(demoEmail);
      setPassword("demo123");
    } else {
      // Admin — clear fields so only the real admin can enter their own credentials
      setEmail("");
      setPassword("");
    }
    Haptics.selectionAsync();
  };

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingTop: topPad + 20 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.logoSection}>
          <SustainServeLogo size={52} showText={true} onPress={() => router.replace("/landing")} />
          <Text style={[styles.tagline, { color: colors.mutedForeground }]}>
            Fighting hunger, reducing waste
          </Text>
        </View>

        <View
          style={[
            styles.card,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <Text style={[styles.cardTitle, { color: colors.foreground }]}>
            Sign In
          </Text>

          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.mutedForeground }]}>
              Email
            </Text>
            <View
              style={[
                styles.input,
                { backgroundColor: colors.muted, borderColor: colors.border },
              ]}
            >
              <Feather name="mail" size={16} color={colors.mutedForeground} />
              <TextInput
                style={[styles.inputText, { color: colors.foreground }]}
                value={email}
                onChangeText={setEmail}
                placeholder="your@email.com"
                placeholderTextColor={colors.mutedForeground}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
          </View>

          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.mutedForeground }]}>
              Password
            </Text>
            <View
              style={[
                styles.input,
                { backgroundColor: colors.muted, borderColor: colors.border },
              ]}
            >
              <Feather name="lock" size={16} color={colors.mutedForeground} />
              <TextInput
                style={[styles.inputText, { color: colors.foreground }]}
                value={password}
                onChangeText={setPassword}
                placeholder="Enter password"
                placeholderTextColor={colors.mutedForeground}
                secureTextEntry={!showPwd}
              />
              <TouchableOpacity onPress={() => setShowPwd(!showPwd)}>
                <Feather
                  name={showPwd ? "eye-off" : "eye"}
                  size={16}
                  color={colors.mutedForeground}
                />
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.loginBtn, { backgroundColor: colors.primary }]}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.loginBtnText}>Sign In</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity onPress={() => router.push("/auth/register")}>
            <Text style={[styles.registerLink, { color: colors.mutedForeground }]}>
              Don't have an account?{" "}
              <Text style={{ color: colors.primary, fontFamily: "Inter_600SemiBold" }}>
                Register
              </Text>
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.demoSection}>
          <Text style={[styles.demoTitle, { color: colors.mutedForeground }]}>
            Quick Demo Access
          </Text>
          <View style={styles.demoGrid}>
            {DEMO_ACCOUNTS.map((acc) => (
              <TouchableOpacity
                key={acc.role}
                style={[
                  styles.demoBtn,
                  {
                    backgroundColor: acc.color + "15",
                    borderColor: acc.color + "30",
                  },
                ]}
                onPress={() => fillDemo(acc.email)}
              >
                <Text style={[styles.demoBtnRole, { color: acc.color }]}>
                  {acc.role}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={{ height: Platform.OS === "web" ? 34 : insets.bottom + 20 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 20,
    gap: 24,
  },
  logoSection: {
    alignItems: "center",
    gap: 8,
    paddingVertical: 8,
  },
  tagline: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
  },
  card: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 24,
    gap: 16,
  },
  cardTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 22,
  },
  field: {
    gap: 6,
  },
  label: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
  },
  input: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
  },
  inputText: {
    flex: 1,
    fontFamily: "Inter_400Regular",
    fontSize: 15,
  },
  loginBtn: {
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 4,
  },
  loginBtnText: {
    fontFamily: "Inter_600SemiBold",
    color: "#FFFFFF",
    fontSize: 16,
  },
  registerLink: {
    textAlign: "center",
    fontFamily: "Inter_400Regular",
    fontSize: 14,
  },
  demoSection: {
    gap: 10,
  },
  demoTitle: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    textAlign: "center",
  },
  demoGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    justifyContent: "center",
  },
  demoBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  demoBtnRole: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
  },
});
