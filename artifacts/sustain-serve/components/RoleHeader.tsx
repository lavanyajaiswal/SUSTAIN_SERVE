import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React from "react";
import {
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { UserRole } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
import { SustainServeLogo } from "./Logo";

const ROLE_CONFIG: Record<UserRole, { label: string; color: string }> = {
  admin: { label: "Admin", color: "#9B59B6" },
  donor: { label: "Donor", color: "#2D9E6B" },
  ngo: { label: "NGO", color: "#E67E22" },
  delivery: { label: "Delivery Partner", color: "#4299E1" },
};

interface Props {
  role: UserRole;
  name: string;
  onNotification?: () => void;
  onLogout?: () => void;
  notifCount?: number;
}

export function RoleHeader({
  role,
  name,
  onNotification,
  onLogout,
  notifCount = 0,
}: Props) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const roleConfig = ROLE_CONFIG[role];
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  return (
    <View
      style={[
        styles.header,
        {
          backgroundColor: colors.card,
          borderBottomColor: colors.border,
          paddingTop: topPad + 12,
        },
      ]}
    >
      <View style={styles.left}>
        <SustainServeLogo size={32} showText={false} onPress={() => router.replace("/landing")} />
        <View>
          <Text style={[styles.greeting, { color: colors.mutedForeground }]}>
            Welcome back,
          </Text>
          <Text style={[styles.name, { color: colors.foreground }]} numberOfLines={1}>
            {name}
          </Text>
        </View>
      </View>
      <View style={styles.right}>
        <View style={[styles.roleBadge, { backgroundColor: roleConfig.color + "18" }]}>
          <Text style={[styles.roleText, { color: roleConfig.color }]}>
            {roleConfig.label}
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.iconBtn, { backgroundColor: colors.secondary }]}
          onPress={onLogout}
        >
          <Feather name="log-out" size={18} color={colors.mutedForeground} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  left: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  greeting: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
  },
  name: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 16,
    maxWidth: 140,
  },
  right: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  roleBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  roleText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 11,
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  notifDot: {
    position: "absolute",
    top: 4,
    right: 4,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#E53E3E",
  },
});
