import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  FlatList,
  Linking,
  Platform,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatCard } from "@/components/StatCard";
import { StatusBadge } from "@/components/StatusBadge";
import { useAuth } from "@/context/AuthContext";
import { Donation, DonationStatus, useDonations } from "@/context/DonationsContext";
import { useNotifications } from "@/context/NotificationsContext";
import { useColors } from "@/hooks/useColors";
import { confirm } from "@/utils/confirm";

const STATUS_FLOW: Record<string, DonationStatus> = {
  assigned: "picked",
  picked: "on_way",
  on_way: "delivered",
};

const STATUS_LABELS: Record<string, string> = {
  assigned: "Mark as Picked Up",
  picked: "Mark On the Way",
  on_way: "Mark Delivered",
};

const STATUS_ICONS: Record<string, string> = {
  assigned: "package",
  picked: "truck",
  on_way: "navigation",
};

const STATUS_COLORS: Record<string, string> = {
  assigned: "#E67E22",
  picked: "#4299E1",
  on_way: "#7C3AED",
};

type Tab = "tasks" | "history";

export default function DeliveryDashboard() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuth();
  const { getDeliveryTasks, updateDonation } = useDonations();
  const { unreadCount, addNotification } = useNotifications();
  const [tab, setTab] = useState<Tab>("tasks");
  const [refreshing, setRefreshing] = useState(false);

  // Strictly filter: only show tasks assigned to THIS delivery agent's ID
  const myId = user?.id || "delivery1";
  const allMyTasks = getDeliveryTasks(myId);
  const activeTasks = allMyTasks.filter((d) =>
    ["assigned", "picked", "on_way"].includes(d.status)
  );
  const myDelivered = allMyTasks.filter((d) => d.status === "delivered");

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const updateStatus = (d: Donation) => {
    const next = STATUS_FLOW[d.status];
    if (!next) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    confirm(
      "Update Status",
      `Mark "${d.title}" as "${next.replace("_", " ")}"?`,
      async () => {
        await updateDonation(d.id, {
          status: next,
          deliveryId: user?.id || "delivery1",
          deliveryName: user?.name || "Delivery",
          deliveryPhone: user?.phone || "",
        });
        if (next === "delivered") {
          addNotification({
            title: "Delivery Completed!",
            message: `You successfully delivered "${d.title}". Great job!`,
            type: "success",
            forUserId: user?.id,
            donationId: d.id,
          });
          addNotification({
            title: "Your donation was delivered!",
            message: `"${d.title}" has been delivered by ${user?.name || "the delivery agent"}.`,
            type: "success",
            forRole: "donor",
            donationId: d.id,
          });
          addNotification({
            title: "Donation Delivered",
            message: `"${d.title}" has been delivered successfully by ${user?.name || "the delivery agent"}.`,
            type: "success",
            forRole: "ngo",
            donationId: d.id,
          });
        } else if (next === "picked") {
          addNotification({
            title: "Food Picked Up",
            message: `${user?.name || "Delivery agent"} has picked up "${d.title}". On the way!`,
            type: "info",
            forRole: "donor",
            donationId: d.id,
          });
          addNotification({
            title: "Food Picked Up",
            message: `${user?.name || "Delivery agent"} has picked up "${d.title}".`,
            type: "info",
            forRole: "ngo",
            donationId: d.id,
          });
        } else if (next === "on_way") {
          addNotification({
            title: "On the Way!",
            message: `"${d.title}" is on its way to the destination.`,
            type: "info",
            forRole: "ngo",
            donationId: d.id,
          });
        }
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      },
      { confirmText: "Confirm" }
    );
  };

  const renderTask = ({ item }: { item: Donation }) => {
    const actionColor = STATUS_COLORS[item.status] || "#4299E1";
    return (
      <View style={[styles.taskCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.taskHeader}>
          <View style={[styles.taskIcon, { backgroundColor: actionColor + "18" }]}>
            <Feather name={STATUS_ICONS[item.status] as any || "package"} size={20} color={actionColor} />
          </View>
          <View style={styles.taskInfo}>
            <Text style={[styles.taskTitle, { color: colors.foreground }]} numberOfLines={1}>{item.title}</Text>
            <Text style={[styles.taskSub, { color: colors.mutedForeground }]}>
              {item.quantity} · {item.category}
            </Text>
          </View>
          <StatusBadge status={item.status} size="sm" />
        </View>

        {/* NGO assignment info */}
        {item.ngoName && (
          <View style={[styles.ngoRow, { backgroundColor: "#FFF3E0" }]}>
            <Feather name="home" size={13} color="#E67E22" />
            <Text style={styles.ngoText}>Assigned by: {item.ngoName}</Text>
          </View>
        )}

        {/* Pickup details */}
        <View style={[styles.contactSection, { backgroundColor: colors.muted }]}>
          <Text style={[styles.contactSectionTitle, { color: colors.mutedForeground }]}>PICKUP LOCATION</Text>
          <View style={styles.contactRow}>
            <Feather name="user" size={13} color={colors.primary} />
            <Text style={[styles.contactText, { color: colors.foreground }]}>{item.donorName}</Text>
            {item.donorPhone && (
              <TouchableOpacity
                style={[styles.inlineCallBtn, { backgroundColor: colors.secondary }]}
                onPress={() => Linking.openURL(`tel:${item.donorPhone}`)}
              >
                <Feather name="phone" size={12} color={colors.primary} />
              </TouchableOpacity>
            )}
          </View>
          <View style={styles.contactRow}>
            <Feather name="map-pin" size={13} color={colors.primary} />
            <Text style={[styles.contactText, { color: colors.foreground }]} numberOfLines={2}>
              {item.pickupAddress}
            </Text>
          </View>
        </View>

        {/* Action buttons */}
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: colors.secondary }]}
            onPress={() => Linking.openURL(`https://maps.google.com/?q=${encodeURIComponent(item.pickupAddress)}`)}
          >
            <Feather name="navigation" size={15} color={colors.primary} />
            <Text style={[styles.actionBtnText, { color: colors.primary }]}>Navigate</Text>
          </TouchableOpacity>
          {item.donorPhone && (
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: colors.secondary }]}
              onPress={() => Linking.openURL(`tel:${item.donorPhone}`)}
            >
              <Feather name="phone" size={15} color={colors.primary} />
              <Text style={[styles.actionBtnText, { color: colors.primary }]}>Call Donor</Text>
            </TouchableOpacity>
          )}
        </View>

        {STATUS_LABELS[item.status] && (
          <TouchableOpacity
            style={[styles.updateBtn, { backgroundColor: actionColor }]}
            onPress={() => updateStatus(item)}
          >
            <Feather name={STATUS_ICONS[item.status] as any} size={16} color="#FFF" />
            <Text style={styles.updateBtnText}>{STATUS_LABELS[item.status]}</Text>
          </TouchableOpacity>
        )}

        {item.status === "delivered" && (
          <View style={[styles.deliveredBadge, { backgroundColor: "#2D9E6B18" }]}>
            <Feather name="check-circle" size={16} color="#2D9E6B" />
            <Text style={styles.deliveredText}>Delivered successfully</Text>
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border, paddingTop: topPad + 12 }]}>
        <View style={styles.headerLeft}>
          <View style={[styles.avatar, { backgroundColor: "#EBF4FF" }]}>
            <Text style={[styles.avatarText, { color: "#4299E1" }]}>
              {(user?.name || "D").charAt(0).toUpperCase()}
            </Text>
          </View>
          <View>
            <Text style={[styles.greeting, { color: colors.mutedForeground }]}>Delivery Agent</Text>
            <Text style={[styles.userName, { color: colors.foreground }]} numberOfLines={1}>
              {user?.name || "Driver"}
            </Text>
          </View>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity style={[styles.iconBtn, { backgroundColor: "#7C3AED18" }]} onPress={() => router.push("/ai-chat")}>
            <Feather name="cpu" size={18} color="#7C3AED" />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.iconBtn, { backgroundColor: colors.secondary }]} onPress={() => router.push("/notifications")}>
            <Feather name="bell" size={18} color={colors.foreground} />
            {unreadCount > 0 && (
              <View style={styles.notifBadge}>
                <Text style={styles.notifBadgeText}>{unreadCount > 9 ? "9+" : unreadCount}</Text>
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity style={[styles.iconBtn, { backgroundColor: colors.secondary }]} onPress={() => router.push("/profile")}>
            <Feather name="user" size={18} color={colors.foreground} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.iconBtn, { backgroundColor: colors.secondary }]}
            onPress={() => confirm("Sign Out", "Are you sure you want to sign out?", async () => { await logout(); router.replace("/auth/login"); }, { confirmText: "Sign Out", destructive: true })}
          >
            <Feather name="log-out" size={18} color={colors.mutedForeground} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Stats */}
      <View style={[styles.statsRow, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <StatCard label="Active Tasks" value={activeTasks.length} icon="truck" color="#4299E1" />
        <StatCard label="Delivered" value={myDelivered.length} icon="check-circle" color="#2D9E6B" />
        <StatCard label="Total" value={allMyTasks.length} icon="activity" color="#E67E22" />
      </View>

      {/* Tabs */}
      <View style={[styles.tabs, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        {(["tasks", "history"] as Tab[]).map((t) => (
          <TouchableOpacity
            key={t}
            style={[styles.tab, tab === t && { borderBottomColor: "#4299E1", borderBottomWidth: 2 }]}
            onPress={() => { setTab(t); Haptics.selectionAsync(); }}
          >
            <Text style={[styles.tabText, { color: tab === t ? "#4299E1" : colors.mutedForeground }]}>
              {t === "tasks" ? `Active Tasks (${activeTasks.length})` : `Delivered (${myDelivered.length})`}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={tab === "tasks" ? activeTasks : myDelivered}
        keyExtractor={(d) => d.id}
        renderItem={renderTask}
        contentContainerStyle={[styles.content, { paddingBottom: bottomPad + 20 }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); setTimeout(() => setRefreshing(false), 800); }} tintColor="#4299E1" />}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.empty}>
            <View style={[styles.emptyIcon, { backgroundColor: "#EBF4FF" }]}>
              <Feather name={tab === "tasks" ? "truck" : "check-circle"} size={36} color="#4299E1" />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
              {tab === "tasks" ? "No active tasks" : "No deliveries yet"}
            </Text>
            <Text style={[styles.emptySub, { color: colors.mutedForeground }]}>
              {tab === "tasks"
                ? "Tasks assigned to you by NGOs will appear here"
                : "Your completed deliveries will show up here"}
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 20, paddingBottom: 16, borderBottomWidth: 1,
  },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 10, flex: 1 },
  avatar: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  avatarText: { fontFamily: "Inter_700Bold", fontSize: 18 },
  greeting: { fontFamily: "Inter_400Regular", fontSize: 11 },
  userName: { fontFamily: "Inter_600SemiBold", fontSize: 15, maxWidth: 130 },
  headerRight: { flexDirection: "row", gap: 6 },
  iconBtn: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  notifBadge: {
    position: "absolute", top: -3, right: -3, minWidth: 16, height: 16, borderRadius: 8,
    backgroundColor: "#E53E3E", alignItems: "center", justifyContent: "center", paddingHorizontal: 3,
  },
  notifBadgeText: { fontFamily: "Inter_700Bold", fontSize: 9, color: "#FFF" },
  statsRow: { flexDirection: "row", gap: 10, padding: 12, borderBottomWidth: 1 },
  tabs: { flexDirection: "row", borderBottomWidth: 1 },
  tab: { flex: 1, paddingVertical: 12, alignItems: "center" },
  tabText: { fontFamily: "Inter_600SemiBold", fontSize: 13 },
  content: { padding: 16, gap: 14 },
  taskCard: { borderRadius: 16, borderWidth: 1, padding: 16, gap: 12 },
  taskHeader: { flexDirection: "row", alignItems: "center", gap: 10 },
  taskIcon: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  taskInfo: { flex: 1 },
  taskTitle: { fontFamily: "Inter_600SemiBold", fontSize: 15 },
  taskSub: { fontFamily: "Inter_400Regular", fontSize: 12, marginTop: 2 },
  ngoRow: {
    flexDirection: "row", alignItems: "center", gap: 6,
    borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6,
  },
  ngoText: { fontFamily: "Inter_500Medium", fontSize: 12, color: "#E67E22", flex: 1 },
  contactSection: { borderRadius: 12, padding: 12, gap: 8 },
  contactSectionTitle: { fontFamily: "Inter_600SemiBold", fontSize: 10, letterSpacing: 0.5 },
  contactRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  contactText: { fontFamily: "Inter_400Regular", fontSize: 13, flex: 1 },
  inlineCallBtn: { width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  actionRow: { flexDirection: "row", gap: 8 },
  actionBtn: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 6, borderRadius: 10, paddingVertical: 10,
  },
  actionBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 13 },
  updateBtn: {
    borderRadius: 12, paddingVertical: 13, flexDirection: "row",
    alignItems: "center", justifyContent: "center", gap: 8,
  },
  updateBtnText: { fontFamily: "Inter_600SemiBold", color: "#FFF", fontSize: 15 },
  deliveredBadge: {
    flexDirection: "row", alignItems: "center", gap: 8,
    borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8,
  },
  deliveredText: { fontFamily: "Inter_600SemiBold", fontSize: 13, color: "#2D9E6B" },
  empty: { alignItems: "center", paddingTop: 60, gap: 12 },
  emptyIcon: { width: 80, height: 80, borderRadius: 40, alignItems: "center", justifyContent: "center" },
  emptyTitle: { fontFamily: "Inter_600SemiBold", fontSize: 17 },
  emptySub: { fontFamily: "Inter_400Regular", fontSize: 13, textAlign: "center", maxWidth: 260 },
});
