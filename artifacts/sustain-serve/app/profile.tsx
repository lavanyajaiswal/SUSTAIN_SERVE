import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useState } from "react";
import {
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
import { useAuth, UserRole } from "@/context/AuthContext";
import { useDonations } from "@/context/DonationsContext";
import { useColors } from "@/hooks/useColors";
import { confirm } from "@/utils/confirm";

const ROLE_COLORS: Record<UserRole, string> = {
  admin: "#9B59B6",
  donor: "#2D9E6B",
  ngo: "#E67E22",
  delivery: "#4299E1",
};

const ROLE_LABELS: Record<UserRole, string> = {
  admin: "Administrator",
  donor: "Food Donor",
  ngo: "NGO / Shelter",
  delivery: "Delivery Partner",
};

export default function ProfileScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user, logout, updateUser } = useAuth();
  const { stats, getDonationsByDonor } = useDonations();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(user?.name || "");
  const [phone, setPhone] = useState(user?.phone || "");

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  if (!user) return null;

  const roleColor = ROLE_COLORS[user.role];
  const myDonations = getDonationsByDonor(user.id);

  const saveProfile = () => {
    updateUser({ name: name.trim(), phone: phone.trim() });
    setEditing(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const handleLogout = () => {
    confirm(
      "Sign Out",
      "Are you sure you want to sign out?",
      async () => {
        await logout();
        router.replace("/auth/login");
      },
      { confirmText: "Sign Out", destructive: true }
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}> 
      <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border, paddingTop: topPad + 12 }]}> 
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Profile</Text>
        <TouchableOpacity onPress={() => { setEditing(!editing); Haptics.selectionAsync(); }}>
          <Text style={[styles.editBtn, { color: colors.primary }]}> 
            {editing ? "Cancel" : "Edit"}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: bottomPad + 20 }]} showsVerticalScrollIndicator={false}>
        {/* Avatar */}
        <View style={styles.avatarSection}>
          <View style={[styles.avatar, { backgroundColor: roleColor + "18", borderColor: roleColor + "40" }]}> 
            <Text style={[styles.avatarText, { color: roleColor }]}> 
              {user.name.charAt(0).toUpperCase()}
            </Text>
          </View>
          <Text style={[styles.userName, { color: colors.foreground }]}>{user.name}</Text>
          <View style={[styles.roleBadge, { backgroundColor: roleColor + "18" }]}> 
            <Text style={[styles.roleText, { color: roleColor }]}>{ROLE_LABELS[user.role]}</Text>
          </View>
          {!user.isApproved && (
            <View style={[styles.pendingBadge, { backgroundColor: "#FEF3C7" }]}> 
              <Feather name="clock" size={12} color="#B45309" />
              <Text style={styles.pendingText}>Pending approval</Text>
            </View>
          )}
        </View>

        {/* Info Card */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}> 
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Account Info</Text>

          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.mutedForeground }]}>Full Name</Text>
            {editing ? (
              <TextInput
                style={[styles.input, { backgroundColor: colors.muted, borderColor: colors.border, color: colors.foreground }]}
                value={name} onChangeText={setName}
              />
            ) : (
              <Text style={[styles.value, { color: colors.foreground }]}>{user.name}</Text>
            )}
          </View>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.mutedForeground }]}>Email</Text>
            <Text style={[styles.value, { color: colors.foreground }]}>{user.email}</Text>
          </View>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.mutedForeground }]}>Phone</Text>
            {editing ? (
              <TextInput
                style={[styles.input, { backgroundColor: colors.muted, borderColor: colors.border, color: colors.foreground }]}
                value={phone} onChangeText={setPhone}
                keyboardType="phone-pad" placeholder="Add phone number"
                placeholderTextColor={colors.mutedForeground}
              />
            ) : (
              <Text style={[styles.value, { color: user.phone ? colors.foreground : colors.mutedForeground }]}> 
                {user.phone || "Not added"}
              </Text>
            )}
          </View>

          {user.orgName && (
            <>
              <View style={[styles.divider, { backgroundColor: colors.border }]} />
              <View style={styles.field}>
                <Text style={[styles.label, { color: colors.mutedForeground }]}>Organization</Text>
                <Text style={[styles.value, { color: colors.foreground }]}>{user.orgName}</Text>
              </View>
            </>
          )}

          {editing && (
            <TouchableOpacity style={[styles.saveBtn, { backgroundColor: colors.primary }]} onPress={saveProfile}>
              <Text style={styles.saveBtnText}>Save Changes</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Stats for donor */}
        {user.role === "donor" && (
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}> 
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Your Impact</Text>
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: roleColor }]}>{myDonations.length}</Text>
                <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Total Donated</Text>
              </View>
              <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: roleColor }]}>
                  {myDonations.filter((d) => d.status === "delivered").length}
                </Text>
                <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Delivered</Text>
              </View>
              <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: roleColor }]}>
                  {myDonations.filter((d) => d.status === "delivered").length * 12}kg
                </Text>
                <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Food Saved</Text>
              </View>
            </View>
          </View>
        )}

        {/* Actions */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}> 
          {[
            { icon: "bell", label: "Notifications", onPress: () => router.push("/notifications") },
            { icon: "shield", label: "Privacy & Security", onPress: () => {} },
            { icon: "help-circle", label: "Help & Support", onPress: () => router.push("/ai-chat") },
          ].map((item, i, arr) => (
            <React.Fragment key={item.label}>
              <TouchableOpacity style={styles.actionRow} onPress={item.onPress}>
                <Feather name={item.icon as any} size={18} color={colors.mutedForeground} />
                <Text style={[styles.actionLabel, { color: colors.foreground }]}>{item.label}</Text>
                <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
              </TouchableOpacity>
              {i < arr.length - 1 && <View style={[styles.divider, { backgroundColor: colors.border }]} />}
            </React.Fragment>
          ))}
        </View>

        <TouchableOpacity
          style={[styles.logoutBtn, { backgroundColor: "#FEE2E2", borderColor: "#FCA5A5" }]}
          onPress={handleLogout}
        >
          <Feather name="log-out" size={18} color="#E53E3E" />
          <Text style={styles.logoutText}>Sign Out</Text>
        </TouchableOpacity>

        <View style={styles.brandingRow}>
          <SustainServeLogo size={20} showText={false} />
          <Text style={[styles.brandingText, { color: colors.mutedForeground }]}> 
            SustainServe · Fighting hunger, reducing waste
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 20, paddingBottom: 16, borderBottomWidth: 1,
  },
  backBtn: { width: 40, height: 40, justifyContent: "center" },
  headerTitle: { fontFamily: "Inter_600SemiBold", fontSize: 18, flex: 1, textAlign: "center" },
  editBtn: { fontFamily: "Inter_500Medium", fontSize: 14 },
  scroll: { padding: 20, gap: 16 },
  avatarSection: { alignItems: "center", gap: 8, paddingVertical: 8 },
  avatar: { width: 80, height: 80, borderRadius: 40, borderWidth: 3, alignItems: "center", justifyContent: "center" },
  avatarText: { fontFamily: "Inter_700Bold", fontSize: 32 },
  userName: { fontFamily: "Inter_700Bold", fontSize: 20 },
  roleBadge: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20 },
  roleText: { fontFamily: "Inter_600SemiBold", fontSize: 13 },
  pendingBadge: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 },
  pendingText: { fontFamily: "Inter_500Medium", fontSize: 11, color: "#B45309" },
  card: { borderRadius: 16, borderWidth: 1, padding: 16, gap: 12 },
  sectionTitle: { fontFamily: "Inter_600SemiBold", fontSize: 16 },
  field: { gap: 4 },
  label: { fontFamily: "Inter_400Regular", fontSize: 12 },
  value: { fontFamily: "Inter_500Medium", fontSize: 15 },
  input: { borderRadius: 10, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 10, fontFamily: "Inter_400Regular", fontSize: 15 },
  divider: { height: 1 },
  saveBtn: { borderRadius: 12, paddingVertical: 12, alignItems: "center", marginTop: 4 },
  saveBtnText: { fontFamily: "Inter_600SemiBold", color: "#FFF", fontSize: 15 },
  statsRow: { flexDirection: "row", alignItems: "center" },
  statItem: { flex: 1, alignItems: "center", gap: 4 },
  statValue: { fontFamily: "Inter_700Bold", fontSize: 22 },
  statLabel: { fontFamily: "Inter_400Regular", fontSize: 11, textAlign: "center" },
  statDivider: { width: 1, height: 40 },
  actionRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 4 },
  actionLabel: { fontFamily: "Inter_400Regular", fontSize: 15, flex: 1 },
  logoutBtn: { borderRadius: 14, paddingVertical: 14, borderWidth: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  logoutText: { fontFamily: "Inter_600SemiBold", color: "#E53E3E", fontSize: 15 },
  brandingRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingTop: 4 },
  brandingText: { fontFamily: "Inter_400Regular", fontSize: 11 },
});
