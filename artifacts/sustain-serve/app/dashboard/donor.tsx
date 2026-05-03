import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  FlatList,
  Linking,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { DonationCard } from "@/components/DonationCard";
import { StatCard } from "@/components/StatCard";
import { StatusBadge } from "@/components/StatusBadge";
import { useAuth } from "@/context/AuthContext";
import { Donation, useDonations } from "@/context/DonationsContext";
import { useNotifications } from "@/context/NotificationsContext";
import { useColors } from "@/hooks/useColors";
import { confirm } from "@/utils/confirm";

type Tab = "home" | "history";

type HistoryFilter = "all" | "pending" | "accepted" | "assigned" | "picked" | "on_way" | "delivered" | "cancelled";

const HISTORY_FILTERS: { value: HistoryFilter; label: string; emoji: string }[] = [
  { value: "all", label: "All", emoji: "🍽️" },
  { value: "pending", label: "Pending", emoji: "⏳" },
  { value: "accepted", label: "Accepted", emoji: "✅" },
  { value: "assigned", label: "Assigned", emoji: "🚚" },
  { value: "on_way", label: "On Way", emoji: "🛣️" },
  { value: "delivered", label: "Delivered", emoji: "🎉" },
];

function ContactRow({ icon, label, value, onCall }: { icon: string; label: string; value: string; onCall?: () => void }) {
  const colors = useColors();
  return (
    <View style={styles.contactRow}>
      <Feather name={icon as any} size={14} color={colors.primary} />
      <View style={{ flex: 1 }}>
        <Text style={[styles.contactLabel, { color: colors.mutedForeground }]}>{label}</Text>
        <Text style={[styles.contactValue, { color: colors.foreground }]}>{value}</Text>
      </View>
      {onCall && (
        <TouchableOpacity style={[styles.callBtn, { backgroundColor: colors.secondary }]} onPress={onCall}>
          <Feather name="phone" size={14} color={colors.primary} />
        </TouchableOpacity>
      )}
    </View>
  );
}

function DonationStatusCard({ donation, onCancel }: { donation: Donation; onCancel?: () => void }) {
  const colors = useColors();
  const hasNGO = !!donation.ngoName;
  const hasDelivery = !!donation.deliveryName;
  const canCancel = donation.status === "pending";

  return (
    <View style={[styles.statusCard, { backgroundColor: colors.card, borderColor: colors.border }]}> 
      <View style={styles.statusCardHeader}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.statusCardTitle, { color: colors.foreground }]} numberOfLines={1}>
            {donation.title}
          </Text>
          <Text style={[styles.statusCardSub, { color: colors.mutedForeground }]}>
            {donation.quantity} · {donation.category}
          </Text>
        </View>
        <StatusBadge status={donation.status} size="sm" />
      </View>

      {(hasNGO || hasDelivery) && (
        <View style={[styles.contactBox, { backgroundColor: colors.muted, borderRadius: 10 }]}> 
          {hasNGO && (
            <ContactRow icon="home" label="Accepted by NGO" value={donation.ngoName!} />
          )}
          {hasDelivery && (
            <ContactRow
              icon="truck"
              label="Delivery Partner"
              value={donation.deliveryName!}
              onCall={donation.deliveryPhone ? () => Linking.openURL(`tel:${donation.deliveryPhone}`) : undefined}
            />
          )}
        </View>
      )}

      <View style={styles.cardActions}>
        <TouchableOpacity style={styles.viewBtn} onPress={() => router.push(`/donation/${donation.id}` as any)}>
          <Text style={[styles.viewBtnText, { color: colors.primary }]}>View Details →</Text>
        </TouchableOpacity>
        {canCancel && onCancel && (
          <TouchableOpacity style={[styles.cancelBtn, { borderColor: "#FCA5A5" }]} onPress={onCancel}>
            <Feather name="x" size={13} color="#E53E3E" />
            <Text style={styles.cancelBtnText}>Cancel</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

export default function DonorDashboard() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuth();
  const { getDonationsByDonor, deleteDonation } = useDonations();
  const { unreadCount } = useNotifications();
  const [tab, setTab] = useState<Tab>("home");
  const [historyFilter, setHistoryFilter] = useState<HistoryFilter>("all");
  const [refreshing, setRefreshing] = useState(false);

  const myDonations = getDonationsByDonor(user?.id || "donor1");
  const activeDonations = myDonations.filter((d) =>
    ["pending", "accepted", "assigned", "picked", "on_way"].includes(d.status)
  );

  const filteredHistory = historyFilter === "all"
    ? myDonations
    : myDonations.filter((d) => d.status === historyFilter);

  const donorStats = {
    total: myDonations.length,
    delivered: myDonations.filter((d) => d.status === "delivered").length,
    active: activeDonations.length,
    foodSaved: myDonations.filter((d) => d.status === "delivered").length * 12,
  };

  const filterCounts: Record<HistoryFilter, number> = {
    all: myDonations.length,
    pending: myDonations.filter((d) => d.status === "pending").length,
    accepted: myDonations.filter((d) => d.status === "accepted").length,
    assigned: myDonations.filter((d) => d.status === "assigned").length,
    picked: myDonations.filter((d) => d.status === "picked").length,
    on_way: myDonations.filter((d) => d.status === "on_way").length,
    delivered: myDonations.filter((d) => d.status === "delivered").length,
    cancelled: myDonations.filter((d) => d.status === "cancelled").length,
  };

  const onRefresh = async () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 800);
  };

  const handleCancelDonation = (donation: Donation) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    confirm(
      "Cancel Donation",
      `Cancel "${donation.title}"? This cannot be undone.`,
      async () => {
        await deleteDonation(donation.id);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      },
      { confirmText: "Cancel Donation", destructive: true }
    );
  };

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}> 
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border, paddingTop: topPad + 12 }]}> 
        <View style={styles.headerLeft}>
          <View style={[styles.avatar, { backgroundColor: "#2D9E6B18" }]}> 
            <Text style={[styles.avatarText, { color: "#2D9E6B" }]}> 
              {(user?.name || "D").charAt(0).toUpperCase()}
            </Text>
          </View>
          <View>
            <Text style={[styles.greeting, { color: colors.mutedForeground }]}>Hello,</Text>
            <Text style={[styles.userName, { color: colors.foreground }]} numberOfLines={1}>
              {user?.name || "Donor"}
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

      {/* Tabs */}
      <View style={[styles.tabs, { backgroundColor: colors.card, borderBottomColor: colors.border }]}> 
        {(["home", "history"] as Tab[]).map((t) => (
          <TouchableOpacity
            key={t}
            style={[styles.tab, tab === t && { borderBottomColor: colors.primary, borderBottomWidth: 2 }]}
            onPress={() => { setTab(t); Haptics.selectionAsync(); }}
          >
            <Text style={[styles.tabText, { color: tab === t ? colors.primary : colors.mutedForeground }]}>
              {t === "home" ? "Dashboard" : `My Donations (${myDonations.length})`}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {tab === "home" ? (
        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: bottomPad + 20 }]}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
          showsVerticalScrollIndicator={false}
        >
          {/* Impact Stats */}
          <View style={styles.statsGrid}>
            <StatCard label="Total Given" value={donorStats.total} icon="gift" color="#2D9E6B" />
            <StatCard label="Delivered" value={donorStats.delivered} icon="check-circle" color="#4299E1" />
            <StatCard label="Food Saved" value={`${donorStats.foodSaved}kg`} icon="heart" color="#E53E3E" />
          </View>

          {/* Donate CTA */}
          <TouchableOpacity style={[styles.donateBtn, { backgroundColor: colors.primary }]} onPress={() => router.push("/donation/create")}> 
            <View style={styles.donateBtnInner}>
              <View>
                <Text style={styles.donateBtnTitle}>Donate Food Now</Text>
                <Text style={styles.donateBtnSub}>Post surplus food in 30 seconds</Text>
              </View>
              <View style={styles.donateBtnIcon}>
                <Feather name="plus" size={24} color="#2D9E6B" />
              </View>
            </View>
          </TouchableOpacity>

          {/* Active Donations with Contact Info */}
          {activeDonations.length > 0 && (
            <>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}> 
                Active Donations ({activeDonations.length})
              </Text>
              {activeDonations.map((d) => (
                <DonationStatusCard key={d.id} donation={d} onCancel={() => handleCancelDonation(d)} />
              ))}
            </>
          )}

          {activeDonations.length === 0 && (
            <View style={[styles.emptyActive, { backgroundColor: colors.muted, borderColor: colors.border }]}> 
              <Feather name="inbox" size={36} color={colors.mutedForeground} />
              <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No active donations</Text>
              <Text style={[styles.emptySub, { color: colors.mutedForeground }]}> 
                Make your first donation and help feed those in need
              </Text>
            </View>
          )}

          {/* How it works */}
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>How It Works</Text>
          <View style={[styles.howItWorks, { backgroundColor: colors.card, borderColor: colors.border }]}> 
            {[
              { step: "1", icon: "plus-circle", text: "Post your surplus food with details", color: "#2D9E6B" },
              { step: "2", icon: "home", text: "Nearby NGO accepts your donation", color: "#E67E22" },
              { step: "3", icon: "truck", text: "Delivery partner picks it up", color: "#4299E1" },
              { step: "4", icon: "check-circle", text: "Food reaches people in need!", color: "#2D9E6B" },
            ].map((s) => (
              <View key={s.step} style={styles.howStep}>
                <View style={[styles.howDot, { backgroundColor: s.color }]}>
                  <Feather name={s.icon as any} size={14} color="#FFF" />
                </View>
                <Text style={[styles.howText, { color: colors.foreground }]}>{s.text}</Text>
              </View>
            ))}
          </View>
        </ScrollView>
      ) : (
        <View style={{ flex: 1 }}>
          {/* Filter chips */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={[styles.filterBar, { backgroundColor: colors.card, borderBottomColor: colors.border }]}
            contentContainerStyle={styles.filterBarContent}
          >
            {HISTORY_FILTERS.filter((f) => f.value === "all" || filterCounts[f.value] > 0).map((f) => {
              const active = historyFilter === f.value;
              return (
                <TouchableOpacity
                  key={f.value}
                  style={[
                    styles.filterChip,
                    {
                      backgroundColor: active ? colors.primary : colors.muted,
                      borderColor: active ? colors.primary : colors.border,
                    },
                  ]}
                  onPress={() => { setHistoryFilter(f.value); Haptics.selectionAsync(); }}
                >
                  <Text style={styles.filterChipEmoji}>{f.emoji}</Text>
                  <Text style={[styles.filterChipText, { color: active ? "#FFF" : colors.foreground }]}>
                    {f.label}
                  </Text>
                  {filterCounts[f.value] > 0 && (
                    <View style={[styles.filterCount, { backgroundColor: active ? "rgba(255,255,255,0.25)" : colors.border }]}> 
                      <Text style={[styles.filterCountText, { color: active ? "#FFF" : colors.mutedForeground }]}>
                        {filterCounts[f.value]}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <FlatList
            data={filteredHistory}
            keyExtractor={(d) => d.id}
            renderItem={({ item }) => (
              <DonationCard donation={item} onPress={() => router.push(`/donation/${item.id}` as any)} />
            )}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
            contentContainerStyle={[styles.flatContent, { paddingBottom: bottomPad + 20 }]}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={styles.emptyCenter}>
                <Feather name="archive" size={40} color={colors.mutedForeground} />
                <Text style={[styles.emptyTitle, { color: colors.mutedForeground }]}> 
                  {historyFilter === "all" ? "No donations yet" : `No ${historyFilter} donations`}
                </Text>
                <Text style={[styles.emptySub, { color: colors.mutedForeground, textAlign: "center" }]}> 
                  {historyFilter === "all" ? "Post a donation to see it here" : "Try a different filter"}
                </Text>
              </View>
            }
          />
        </View>
      )}
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
  userName: { fontFamily: "Inter_600SemiBold", fontSize: 16, maxWidth: 130 },
  headerRight: { flexDirection: "row", gap: 6 },
  iconBtn: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  notifBadge: {
    position: "absolute", top: -3, right: -3, minWidth: 16, height: 16, borderRadius: 8,
    backgroundColor: "#E53E3E", alignItems: "center", justifyContent: "center", paddingHorizontal: 3,
  },
  notifBadgeText: { fontFamily: "Inter_700Bold", fontSize: 9, color: "#FFF" },
  tabs: { flexDirection: "row", borderBottomWidth: 1 },
  tab: { flex: 1, paddingVertical: 12, alignItems: "center" },
  tabText: { fontFamily: "Inter_600SemiBold", fontSize: 14 },
  content: { padding: 20, gap: 16 },
  flatContent: { padding: 16, gap: 0 },
  statsGrid: { flexDirection: "row", gap: 10 },
  donateBtn: { borderRadius: 16, padding: 20 },
  donateBtnInner: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  donateBtnTitle: { fontFamily: "Inter_700Bold", color: "#FFF", fontSize: 18 },
  donateBtnSub: { fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.8)", fontSize: 13, marginTop: 2 },
  donateBtnIcon: { width: 48, height: 48, borderRadius: 24, backgroundColor: "rgba(255,255,255,0.9)", alignItems: "center", justifyContent: "center" },
  sectionTitle: { fontFamily: "Inter_600SemiBold", fontSize: 16 },
  statusCard: { borderRadius: 16, borderWidth: 1, padding: 16, gap: 12 },
  statusCardHeader: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  statusCardTitle: { fontFamily: "Inter_600SemiBold", fontSize: 15 },
  statusCardSub: { fontFamily: "Inter_400Regular", fontSize: 12, marginTop: 2 },
  contactBox: { padding: 12, gap: 10 },
  contactRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  contactLabel: { fontFamily: "Inter_400Regular", fontSize: 11 },
  contactValue: { fontFamily: "Inter_500Medium", fontSize: 14 },
  callBtn: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  cardActions: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  viewBtn: { alignSelf: "flex-start" },
  viewBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 13 },
  cancelBtn: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, borderWidth: 1 },
  cancelBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 12, color: "#E53E3E" },
  emptyActive: { borderRadius: 16, borderWidth: 1, padding: 32, alignItems: "center", gap: 10 },
  emptyTitle: { fontFamily: "Inter_600SemiBold", fontSize: 16 },
  emptySub: { fontFamily: "Inter_400Regular", fontSize: 13, textAlign: "center" },
  howItWorks: { borderRadius: 16, borderWidth: 1, padding: 16, gap: 14 },
  howStep: { flexDirection: "row", alignItems: "center", gap: 12 },
  howDot: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  howText: { fontFamily: "Inter_400Regular", fontSize: 14, flex: 1 },
  filterBar: { borderBottomWidth: 1, flexGrow: 0 },
  filterBarContent: { paddingHorizontal: 16, paddingVertical: 10, gap: 8 },
  filterChip: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, borderWidth: 1 },
  filterChipEmoji: { fontSize: 13 },
  filterChipText: { fontFamily: "Inter_600SemiBold", fontSize: 12 },
  filterCount: { paddingHorizontal: 6, paddingVertical: 1, borderRadius: 8, minWidth: 18, alignItems: "center" },
  filterCountText: { fontFamily: "Inter_700Bold", fontSize: 10 },
  emptyCenter: { alignItems: "center", paddingTop: 60, gap: 10 },
});
