import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  FlatList,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { confirm } from "@/utils/confirm";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { RoleHeader } from "@/components/RoleHeader";
import { StatCard } from "@/components/StatCard";
import { StatusBadge } from "@/components/StatusBadge";
import { useAuth, User } from "@/context/AuthContext";
import { useDonations } from "@/context/DonationsContext";
import { useUsers } from "@/context/UsersContext";
import { useColors } from "@/hooks/useColors";

type Tab = "overview" | "users" | "donations";

export default function AdminDashboard() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuth();
  const { donations, stats } = useDonations();
  const { users, approveUser, blockUser, refreshUsers } = useUsers();
  const [tab, setTab] = useState<Tab>("overview");
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    await refreshUsers();
    setRefreshing(false);
  };

  const handleApprove = (u: User) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    confirm("Approve User", `Approve ${u.name}?`, () => approveUser(u.id), { confirmText: "Approve" });
  };

  const handleBlock = (u: User) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    confirm("Block User", `Block ${u.name}?`, () => blockUser(u.id), { confirmText: "Block", destructive: true });
  };

  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const renderUser = ({ item }: { item: User }) => (
    <View
      style={[
        styles.userCard,
        { backgroundColor: colors.card, borderColor: colors.border },
      ]}
    >
      <View
        style={[
          styles.userAvatar,
          {
            backgroundColor:
              item.role === "admin"
                ? "#9B59B615"
                : item.role === "ngo"
                ? "#E67E2215"
                : item.role === "delivery"
                ? "#4299E115"
                : "#2D9E6B15",
          },
        ]}
      >
        <Text style={styles.userAvatarText}>
          {item.name.charAt(0).toUpperCase()}
        </Text>
      </View>
      <View style={styles.userInfo}>
        <Text style={[styles.userName, { color: colors.foreground }]}>
          {item.name}
        </Text>
        <Text style={[styles.userEmail, { color: colors.mutedForeground }]}>
          {item.email}
        </Text>
        <View style={styles.userMeta}>
          <View
            style={[
              styles.rolePill,
              {
                backgroundColor:
                  item.role === "admin"
                    ? "#9B59B618"
                    : item.role === "ngo"
                    ? "#E67E2218"
                    : item.role === "delivery"
                    ? "#4299E118"
                    : "#2D9E6B18",
              },
            ]}
          >
            <Text
              style={[
                styles.rolePillText,
                {
                  color:
                    item.role === "admin"
                      ? "#9B59B6"
                      : item.role === "ngo"
                      ? "#E67E22"
                      : item.role === "delivery"
                      ? "#4299E1"
                      : "#2D9E6B",
                },
              ]}
            >
              {item.role}
            </Text>
          </View>
          <View
            style={[
              styles.statusPill,
              {
                backgroundColor: item.isApproved ? "#D1FAE5" : "#FEE2E2",
              },
            ]}
          >
            <Text
              style={[
                styles.statusPillText,
                { color: item.isApproved ? "#065F46" : "#B91C1C" },
              ]}
            >
              {item.isApproved ? "Approved" : "Pending"}
            </Text>
          </View>
        </View>
      </View>
      {item.role !== "admin" && (
        <View style={styles.userActions}>
          {!item.isApproved && (
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: "#D1FAE5" }]}
              onPress={() => handleApprove(item)}
            >
              <Feather name="check" size={14} color="#065F46" />
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: "#FEE2E2" }]}
            onPress={() => handleBlock(item)}
          >
            <Feather name="slash" size={14} color="#B91C1C" />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <RoleHeader
        role="admin"
        name={user?.name || "Admin"}
        onLogout={() => confirm("Sign Out", "Are you sure you want to sign out?", async () => { await logout(); router.replace("/auth/login"); }, { confirmText: "Sign Out", destructive: true })}
      />

      <View style={styles.tabs}>
        {(["overview", "users", "donations"] as Tab[]).map((t) => (
          <TouchableOpacity
            key={t}
            style={[
              styles.tab,
              tab === t && { backgroundColor: colors.primary },
            ]}
            onPress={() => {
              setTab(t);
              Haptics.selectionAsync();
            }}
          >
            <Text
              style={[
                styles.tabText,
                { color: tab === t ? "#FFFFFF" : colors.mutedForeground },
              ]}
            >
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {tab === "overview" && (
        <ScrollView
          contentContainerStyle={[
            styles.content,
            { paddingBottom: bottomPad + 20 },
          ]}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
          }
          showsVerticalScrollIndicator={false}
        >
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
            System Overview
          </Text>
          <View style={styles.statsGrid}>
            <StatCard label="Total Donations" value={stats.total} icon="package" color="#2D9E6B" />
            <StatCard label="Delivered" value={stats.delivered} icon="check-circle" color="#2D9E6B" />
          </View>
          <View style={styles.statsGrid}>
            <StatCard label="Active" value={stats.active} icon="activity" color="#4299E1" />
            <StatCard label="Food Saved" value={`${stats.foodSavedKg}kg`} icon="heart" color="#E67E22" />
          </View>
          <View style={styles.statsGrid}>
            <StatCard label="Total Users" value={users.length} icon="users" color="#9B59B6" />
            <StatCard label="Pending Approval" value={users.filter((u) => !u.isApproved).length} icon="clock" color="#E53E3E" />
          </View>

          <Text style={[styles.sectionTitle, { color: colors.foreground, marginTop: 8 }]}>
            Recent Donations
          </Text>
          {donations.slice(0, 5).map((d) => (
            <View
              key={d.id}
              style={[
                styles.donationRow,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
            >
              <View style={styles.donationRowInfo}>
                <Text style={[styles.donationRowTitle, { color: colors.foreground }]}>
                  {d.title}
                </Text>
                <Text style={[styles.donationRowSub, { color: colors.mutedForeground }]}>
                  by {d.donorName} · {d.quantity}
                </Text>
              </View>
              <StatusBadge status={d.status} size="sm" />
            </View>
          ))}
        </ScrollView>
      )}

      {tab === "users" && (
        <FlatList
          data={users}
          keyExtractor={(u) => u.id}
          renderItem={renderUser}
          contentContainerStyle={[
            styles.content,
            { paddingBottom: bottomPad + 20 },
          ]}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
          }
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <Text style={[styles.empty, { color: colors.mutedForeground }]}>
              No users yet
            </Text>
          }
        />
      )}

      {tab === "donations" && (
        <FlatList
          data={donations}
          keyExtractor={(d) => d.id}
          renderItem={({ item }) => (
            <View
              style={[
                styles.donationRow,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
            >
              <View style={styles.donationRowInfo}>
                <Text style={[styles.donationRowTitle, { color: colors.foreground }]}>
                  {item.title}
                </Text>
                <Text style={[styles.donationRowSub, { color: colors.mutedForeground }]}>
                  by {item.donorName} · {item.quantity}
                </Text>
                {item.ngoName && (
                  <Text style={[styles.donationRowSub, { color: colors.mutedForeground }]}>
                    NGO: {item.ngoName}
                  </Text>
                )}
              </View>
              <StatusBadge status={item.status} size="sm" />
            </View>
          )}
          contentContainerStyle={[
            styles.content,
            { paddingBottom: bottomPad + 20 },
          ]}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <Text style={[styles.empty, { color: colors.mutedForeground }]}>
              No donations yet
            </Text>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  tabs: {
    flexDirection: "row",
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 8,
  },
  tab: {
    flex: 1, paddingVertical: 8, borderRadius: 10, alignItems: "center",
  },
  tabText: { fontFamily: "Inter_600SemiBold", fontSize: 13 },
  content: { paddingHorizontal: 20, paddingTop: 4, gap: 8 },
  sectionTitle: { fontFamily: "Inter_600SemiBold", fontSize: 16, marginBottom: 4 },
  statsGrid: { flexDirection: "row", gap: 12 },
  userCard: {
    borderRadius: 14, borderWidth: 1, padding: 14,
    flexDirection: "row", alignItems: "center", gap: 12,
  },
  userAvatar: {
    width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center",
  },
  userAvatarText: { fontFamily: "Inter_700Bold", fontSize: 18, color: "#444" },
  userInfo: { flex: 1, gap: 4 },
  userName: { fontFamily: "Inter_600SemiBold", fontSize: 15 },
  userEmail: { fontFamily: "Inter_400Regular", fontSize: 12 },
  userMeta: { flexDirection: "row", gap: 6, marginTop: 2 },
  rolePill: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  rolePillText: { fontFamily: "Inter_600SemiBold", fontSize: 10 },
  statusPill: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  statusPillText: { fontFamily: "Inter_600SemiBold", fontSize: 10 },
  userActions: { flexDirection: "row", gap: 6 },
  actionBtn: { width: 32, height: 32, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  donationRow: {
    borderRadius: 12, borderWidth: 1, padding: 14,
    flexDirection: "row", alignItems: "center", gap: 12,
  },
  donationRowInfo: { flex: 1, gap: 2 },
  donationRowTitle: { fontFamily: "Inter_600SemiBold", fontSize: 14 },
  donationRowSub: { fontFamily: "Inter_400Regular", fontSize: 12 },
  empty: { textAlign: "center", paddingTop: 40, fontFamily: "Inter_400Regular", fontSize: 15 },
});
