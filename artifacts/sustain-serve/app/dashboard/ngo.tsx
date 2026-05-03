import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Linking,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatCard } from "@/components/StatCard";
import { StatusBadge } from "@/components/StatusBadge";
import { useAuth } from "@/context/AuthContext";
import { User } from "@/context/AuthContext";
import { Donation, useDonations } from "@/context/DonationsContext";
import { useNotifications } from "@/context/NotificationsContext";
import { useUsers } from "@/context/UsersContext";
import { useColors } from "@/hooks/useColors";
import { confirm } from "@/utils/confirm";

type Tab = "available" | "active" | "analytics";

const CATEGORY_EMOJI: Record<string, string> = {
  vegetables: "🥦", fruits: "🍎", cooked: "🍲",
  bakery: "🍞", dairy: "🥛", grains: "🌾", other: "📦",
};

const CATEGORY_FILTERS = [
  { value: "all", label: "All", emoji: "🍽️" },
  { value: "vegetables", label: "Veggies", emoji: "🥦" },
  { value: "fruits", label: "Fruits", emoji: "🍎" },
  { value: "cooked", label: "Cooked", emoji: "🍲" },
  { value: "bakery", label: "Bakery", emoji: "🍞" },
  { value: "dairy", label: "Dairy", emoji: "🥛" },
  { value: "grains", label: "Grains", emoji: "🌾" },
  { value: "other", label: "Other", emoji: "📦" },
];

/** Bottom-sheet style modal for selecting a delivery agent */
function DeliveryAgentPicker({
  visible,
  agents,
  onSelect,
  onClose,
  donationTitle,
}: {
  visible: boolean;
  agents: User[];
  onSelect: (agent: User) => void;
  onClose: () => void;
  donationTitle: string;
}) {
  const colors = useColors();
  const [agentSearch, setAgentSearch] = useState("");

  const filtered = agents.filter(
    (a) =>
      a.name.toLowerCase().includes(agentSearch.toLowerCase()) ||
      (a.phone || "").includes(agentSearch)
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={picker.overlay}>
        <TouchableOpacity style={picker.backdrop} onPress={onClose} activeOpacity={1} />
        <View style={[picker.sheet, { backgroundColor: colors.card }]}>
          {/* Handle bar */}
          <View style={[picker.handle, { backgroundColor: colors.border }]} />

          <View style={picker.sheetHeader}>
            <View>
              <Text style={[picker.sheetTitle, { color: colors.foreground }]}>Assign Delivery Agent</Text>
              <Text style={[picker.sheetSub, { color: colors.mutedForeground }]} numberOfLines={1}>
                For: {donationTitle}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={[picker.closeBtn, { backgroundColor: colors.muted }]}>
              <Feather name="x" size={18} color={colors.foreground} />
            </TouchableOpacity>
          </View>

          {/* Search */}
          <View style={[picker.searchBar, { backgroundColor: colors.muted, borderColor: colors.border }]}>
            <Feather name="search" size={15} color={colors.mutedForeground} />
            <TextInput
              style={[picker.searchInput, { color: colors.foreground }]}
              placeholder="Search by name or phone..."
              placeholderTextColor={colors.mutedForeground}
              value={agentSearch}
              onChangeText={setAgentSearch}
            />
            {agentSearch.length > 0 && (
              <TouchableOpacity onPress={() => setAgentSearch("")}>
                <Feather name="x" size={14} color={colors.mutedForeground} />
              </TouchableOpacity>
            )}
          </View>

          {filtered.length === 0 ? (
            <View style={picker.emptyBox}>
              <Feather name="users" size={36} color={colors.mutedForeground} />
              <Text style={[picker.emptyTitle, { color: colors.foreground }]}>
                {agents.length === 0 ? "No delivery agents registered" : "No agents match your search"}
              </Text>
              <Text style={[picker.emptySub, { color: colors.mutedForeground }]}>
                {agents.length === 0
                  ? "Ask delivery partners to register with the Delivery role"
                  : "Try a different name or phone number"}
              </Text>
            </View>
          ) : (
            <FlatList
              data={filtered}
              keyExtractor={(a) => a.id}
              style={picker.list}
              showsVerticalScrollIndicator={false}
              renderItem={({ item: agent }) => (
                <TouchableOpacity
                  style={[picker.agentRow, { borderColor: colors.border }]}
                  onPress={() => { onSelect(agent); setAgentSearch(""); }}
                  activeOpacity={0.75}
                >
                  <View style={[picker.agentAvatar, { backgroundColor: "#4299E118" }]}>
                    <Text style={picker.agentAvatarText}>
                      {agent.name.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <View style={picker.agentInfo}>
                    <Text style={[picker.agentName, { color: colors.foreground }]}>{agent.name}</Text>
                    {agent.phone ? (
                      <Text style={[picker.agentPhone, { color: colors.mutedForeground }]}>{agent.phone}</Text>
                    ) : (
                      <Text style={[picker.agentPhone, { color: colors.mutedForeground }]}>No phone on file</Text>
                    )}
                  </View>
                  <View style={[picker.agentBadge, { backgroundColor: "#4299E118" }]}>
                    <Feather name="truck" size={13} color="#4299E1" />
                    <Text style={picker.agentBadgeText}>Active</Text>
                  </View>
                  <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
                </TouchableOpacity>
              )}
            />
          )}
        </View>
      </View>
    </Modal>
  );
}

function DonationListItem({
  item,
  onAccept,
  onAssign,
  showContactsExpanded,
}: {
  item: Donation;
  onAccept?: () => void;
  onAssign?: () => void;
  showContactsExpanded?: boolean;
}) {
  const colors = useColors();
  const [expanded, setExpanded] = useState(showContactsExpanded ?? false);
  const emoji = CATEGORY_EMOJI[item.category] || "📦";
  const hoursLeft = Math.max(0, Math.round((new Date(item.expiryDate).getTime() - Date.now()) / 3600000));
  const isExpired = hoursLeft === 0;

  return (
    <View style={[styles.donCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <TouchableOpacity onPress={() => setExpanded(!expanded)} activeOpacity={0.9}>
        <View style={styles.donHeader}>
          <View style={[styles.donEmoji, { backgroundColor: colors.secondary }]}>
            <Text style={{ fontSize: 22 }}>{emoji}</Text>
          </View>
          <View style={styles.donInfo}>
            <Text style={[styles.donTitle, { color: colors.foreground }]} numberOfLines={1}>{item.title}</Text>
            <Text style={[styles.donSub, { color: colors.mutedForeground }]}>
              {item.quantity} · {item.pickupAddress.split(",")[0]}
            </Text>
          </View>
          <View style={styles.donRight}>
            <StatusBadge status={item.status} size="sm" />
            <Feather name={expanded ? "chevron-up" : "chevron-down"} size={16} color={colors.mutedForeground} />
          </View>
        </View>

        <View style={styles.donMeta}>
          <View style={styles.metaItem}>
            <Feather name="clock" size={12} color={isExpired ? colors.destructive : colors.mutedForeground} />
            <Text style={[styles.metaText, { color: isExpired ? colors.destructive : colors.mutedForeground }]}>
              {isExpired ? "Expired" : `${hoursLeft}h left`}
            </Text>
          </View>
          <View style={styles.metaItem}>
            <Feather name="user" size={12} color={colors.mutedForeground} />
            <Text style={[styles.metaText, { color: colors.mutedForeground }]}>{item.donorName}</Text>
          </View>
          {item.freshnessReport && (() => {
            const FC: Record<string, string> = { fresh: "#2D9E6B", acceptable: "#F59E0B", poor: "#E67E22", unsafe: "#E53E3E" };
            const FL: Record<string, string> = { fresh: "Fresh", acceptable: "OK", poor: "Poor", unsafe: "Unsafe" };
            const fc = FC[item.freshnessReport.label] || "#F59E0B";
            return (
              <View style={[styles.freshnessPill, { backgroundColor: fc + "18" }]}>
                <Feather name="zap" size={10} color={fc} />
                <Text style={[styles.freshnessPillText, { color: fc }]}>
                  {FL[item.freshnessReport.label]} {item.freshnessReport.score}%
                </Text>
              </View>
            );
          })()}
        </View>
      </TouchableOpacity>

      {expanded && (
        <View style={[styles.expandedSection, { borderTopColor: colors.border }]}>
          <View style={[styles.contactCard, { backgroundColor: colors.muted }]}>
            <Text style={[styles.contactTitle, { color: colors.mutedForeground }]}>DONOR CONTACT</Text>
            <View style={styles.contactRow}>
              <Feather name="user" size={14} color={colors.primary} />
              <Text style={[styles.contactName, { color: colors.foreground }]}>{item.donorName}</Text>
            </View>
            {item.donorPhone && (
              <View style={styles.contactRow}>
                <Feather name="phone" size={14} color={colors.primary} />
                <Text style={[styles.contactPhone, { color: colors.foreground }]}>{item.donorPhone}</Text>
                <TouchableOpacity
                  style={[styles.callBtn, { backgroundColor: "#2D9E6B20" }]}
                  onPress={() => Linking.openURL(`tel:${item.donorPhone}`)}
                >
                  <Feather name="phone-call" size={13} color="#2D9E6B" />
                  <Text style={[styles.callText, { color: "#2D9E6B" }]}>Call</Text>
                </TouchableOpacity>
              </View>
            )}
            <View style={styles.contactRow}>
              <Feather name="map-pin" size={14} color={colors.primary} />
              <Text style={[styles.contactAddr, { color: colors.foreground }]} numberOfLines={2}>
                {item.pickupAddress}
              </Text>
              <TouchableOpacity
                style={[styles.callBtn, { backgroundColor: "#4299E120" }]}
                onPress={() => Linking.openURL(`https://maps.google.com/?q=${encodeURIComponent(item.pickupAddress)}`)}
              >
                <Feather name="navigation" size={13} color="#4299E1" />
                <Text style={[styles.callText, { color: "#4299E1" }]}>Map</Text>
              </TouchableOpacity>
            </View>
          </View>

          {item.description ? (
            <Text style={[styles.description, { color: colors.mutedForeground }]}>{item.description}</Text>
          ) : null}

          {item.deliveryName && (
            <View style={[styles.contactCard, { backgroundColor: "#EBF4FF" }]}>
              <Text style={[styles.contactTitle, { color: "#4299E1" }]}>ASSIGNED DELIVERY AGENT</Text>
              <View style={styles.contactRow}>
                <Feather name="truck" size={14} color="#4299E1" />
                <Text style={[styles.contactName, { color: "#1a365d" }]}>{item.deliveryName}</Text>
              </View>
              {item.deliveryPhone && (
                <View style={styles.contactRow}>
                  <Feather name="phone" size={14} color="#4299E1" />
                  <Text style={[styles.contactPhone, { color: "#1a365d" }]}>{item.deliveryPhone}</Text>
                  <TouchableOpacity
                    style={[styles.callBtn, { backgroundColor: "#4299E120" }]}
                    onPress={() => Linking.openURL(`tel:${item.deliveryPhone}`)}
                  >
                    <Feather name="phone-call" size={13} color="#4299E1" />
                    <Text style={[styles.callText, { color: "#4299E1" }]}>Call</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}

          <View style={styles.actionRow}>
            {onAccept && (
              <TouchableOpacity style={[styles.actionBtn, { backgroundColor: "#E67E22" }]} onPress={onAccept}>
                <Feather name="check" size={16} color="#FFF" />
                <Text style={styles.actionBtnText}>Accept Donation</Text>
              </TouchableOpacity>
            )}
            {onAssign && !item.deliveryId && (
              <TouchableOpacity style={[styles.actionBtnOutline, { borderColor: "#4299E1" }]} onPress={onAssign}>
                <Feather name="truck" size={16} color="#4299E1" />
                <Text style={[styles.actionBtnOutlineText, { color: "#4299E1" }]}>Assign Delivery Agent</Text>
              </TouchableOpacity>
            )}
            {item.deliveryId && onAssign && (
              <TouchableOpacity style={[styles.actionBtnOutline, { borderColor: colors.border }]} onPress={onAssign}>
                <Feather name="refresh-cw" size={14} color={colors.mutedForeground} />
                <Text style={[styles.actionBtnOutlineText, { color: colors.mutedForeground }]}>Reassign Agent</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}
    </View>
  );
}

export default function NGODashboard() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuth();
  const { donations, getAvailableDonations, getDonationsByNGO, updateDonation } = useDonations();
  const { unreadCount, addNotification } = useNotifications();
  const { deliveryAgents, refreshUsers } = useUsers();
  const [tab, setTab] = useState<Tab>("available");
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");

  // Delivery agent picker state
  const [pickerVisible, setPickerVisible] = useState(false);
  const [pickerDonationId, setPickerDonationId] = useState<string | null>(null);
  const [pickerDonationTitle, setPickerDonationTitle] = useState("");
  const [assigning, setAssigning] = useState(false);

  const allAvailable = getAvailableDonations();
  const available = allAvailable.filter((d) => {
    const matchSearch = !search.trim() ||
      d.title.toLowerCase().includes(search.toLowerCase()) ||
      d.donorName.toLowerCase().includes(search.toLowerCase()) ||
      d.pickupAddress.toLowerCase().includes(search.toLowerCase());
    const matchCategory = categoryFilter === "all" || d.category === categoryFilter;
    return matchSearch && matchCategory;
  });

  const myDonations = getDonationsByNGO(user?.id || "ngo1");
  const activeMyDonations = myDonations.filter((d) =>
    ["accepted", "assigned", "picked", "on_way"].includes(d.status)
  );
  const delivered = myDonations.filter((d) => d.status === "delivered");

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const onRefresh = async () => {
    setRefreshing(true);
    await refreshUsers();
    setTimeout(() => setRefreshing(false), 800);
  };

  const acceptDonation = (id: string, donorName: string, title: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    confirm(
      "Accept Donation",
      `Accept "${title}" from ${donorName}?`,
      async () => {
        await updateDonation(id, {
          status: "accepted",
          ngoId: user?.id || "ngo1",
          ngoName: user?.orgName || user?.name || "NGO",
        });
        addNotification({
          title: "Donation Accepted",
          message: `You accepted "${title}" from ${donorName}. Please assign a delivery agent.`,
          type: "success",
          forUserId: user?.id,
          donationId: id,
        });
        addNotification({
          title: "NGO Accepted Your Donation!",
          message: `${user?.orgName || user?.name} accepted your donation "${title}". A delivery agent will be assigned soon.`,
          type: "success",
          forRole: "donor",
          donationId: id,
        });
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      },
      { confirmText: "Accept" }
    );
  };

  const openAgentPicker = (donationId: string, title: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setPickerDonationId(donationId);
    setPickerDonationTitle(title);
    setPickerVisible(true);
    // Refresh agents list when picker opens
    refreshUsers();
  };

  const handleAgentSelected = async (agent: User) => {
    if (!pickerDonationId || assigning) return;
    setAssigning(true);
    setPickerVisible(false);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await updateDonation(pickerDonationId, {
        status: "assigned",
        deliveryId: agent.id,
        deliveryName: agent.name,
        deliveryPhone: agent.phone || "",
      });
      addNotification({
        title: "New Delivery Task!",
        message: `You have been assigned to deliver "${pickerDonationTitle}". Check your dashboard now.`,
        type: "info",
        forUserId: agent.id,
        donationId: pickerDonationId,
      });
      addNotification({
        title: "Delivery Agent Assigned",
        message: `${agent.name} has been assigned to deliver "${pickerDonationTitle}".`,
        type: "info",
        forRole: "donor",
        donationId: pickerDonationId,
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } finally {
      setAssigning(false);
      setPickerDonationId(null);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Delivery agent picker modal */}
      <DeliveryAgentPicker
        visible={pickerVisible}
        agents={deliveryAgents}
        donationTitle={pickerDonationTitle}
        onSelect={handleAgentSelected}
        onClose={() => setPickerVisible(false)}
      />

      {/* Assigning overlay */}
      {assigning && (
        <View style={styles.assigningOverlay}>
          <View style={[styles.assigningBox, { backgroundColor: colors.card }]}>
            <ActivityIndicator color="#4299E1" size="large" />
            <Text style={[styles.assigningText, { color: colors.foreground }]}>Assigning delivery agent...</Text>
          </View>
        </View>
      )}

      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border, paddingTop: topPad + 12 }]}>
        <View style={styles.headerLeft}>
          <View style={[styles.avatar, { backgroundColor: "#E67E2218" }]}>
            <Text style={[styles.avatarText, { color: "#E67E22" }]}>
              {(user?.orgName || user?.name || "N").charAt(0).toUpperCase()}
            </Text>
          </View>
          <View>
            <Text style={[styles.greeting, { color: colors.mutedForeground }]}>NGO Dashboard</Text>
            <Text style={[styles.userName, { color: colors.foreground }]} numberOfLines={1}>
              {user?.orgName || user?.name || "NGO"}
            </Text>
          </View>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity style={[styles.iconBtn, { backgroundColor: "#7C3AED18" }]} onPress={() => router.push("/ai-suggest")}>
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
        {(["available", "active", "analytics"] as Tab[]).map((t) => (
          <TouchableOpacity
            key={t}
            style={[styles.tab, tab === t && { borderBottomColor: "#E67E22", borderBottomWidth: 2 }]}
            onPress={() => { setTab(t); Haptics.selectionAsync(); }}
          >
            <Text style={[styles.tabText, { color: tab === t ? "#E67E22" : colors.mutedForeground }]}>
              {t === "available" ? `Available (${allAvailable.length})` : t === "active" ? `Active (${activeMyDonations.length})` : "Analytics"}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {tab === "available" && (
        <FlatList
          data={available}
          keyExtractor={(d) => d.id}
          renderItem={({ item }) => (
            <DonationListItem
              item={item}
              onAccept={() => acceptDonation(item.id, item.donorName, item.title)}
            />
          )}
          contentContainerStyle={[styles.listContent, { paddingBottom: bottomPad + 20 }]}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#E67E22" />}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <View style={styles.filterSection}>
              <View style={[styles.searchBar, { backgroundColor: colors.muted, borderColor: colors.border }]}>
                <Feather name="search" size={16} color={colors.mutedForeground} />
                <TextInput
                  style={[styles.searchInput, { color: colors.foreground }]}
                  placeholder="Search donations..."
                  placeholderTextColor={colors.mutedForeground}
                  value={search}
                  onChangeText={setSearch}
                />
                {search.length > 0 && (
                  <TouchableOpacity onPress={() => setSearch("")}>
                    <Feather name="x" size={15} color={colors.mutedForeground} />
                  </TouchableOpacity>
                )}
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll} contentContainerStyle={styles.categoryScrollContent}>
                {CATEGORY_FILTERS.map((c) => (
                  <TouchableOpacity
                    key={c.value}
                    style={[styles.categoryChip, { backgroundColor: categoryFilter === c.value ? "#E67E22" : colors.muted, borderColor: categoryFilter === c.value ? "#E67E22" : colors.border }]}
                    onPress={() => { setCategoryFilter(c.value); Haptics.selectionAsync(); }}
                  >
                    <Text style={{ fontSize: 13 }}>{c.emoji}</Text>
                    <Text style={[styles.categoryChipText, { color: categoryFilter === c.value ? "#FFF" : colors.foreground }]}>{c.label}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              {(search || categoryFilter !== "all") && (
                <Text style={[styles.resultCount, { color: colors.mutedForeground }]}>
                  {available.length} result{available.length !== 1 ? "s" : ""}
                </Text>
              )}
            </View>
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Feather name="search" size={48} color={colors.mutedForeground} />
              <Text style={[styles.emptyTitle, { color: colors.mutedForeground }]}>
                {search || categoryFilter !== "all" ? "No matches found" : "No available donations"}
              </Text>
              <Text style={[styles.emptySub, { color: colors.mutedForeground }]}>
                {search || categoryFilter !== "all" ? "Try adjusting your search or filter" : "Check back soon for new food donations"}
              </Text>
            </View>
          }
        />
      )}

      {tab === "active" && (
        <FlatList
          data={activeMyDonations}
          keyExtractor={(d) => d.id}
          renderItem={({ item }) => (
            <DonationListItem
              item={item}
              showContactsExpanded
              onAssign={() => openAgentPicker(item.id, item.title)}
            />
          )}
          contentContainerStyle={[styles.listContent, { paddingBottom: bottomPad + 20 }]}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#E67E22" />}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Feather name="inbox" size={48} color={colors.mutedForeground} />
              <Text style={[styles.emptyTitle, { color: colors.mutedForeground }]}>No active donations</Text>
              <Text style={[styles.emptySub, { color: colors.mutedForeground }]}>Accept donations from the Available tab</Text>
            </View>
          }
        />
      )}

      {tab === "analytics" && (
        <ScrollView contentContainerStyle={[styles.listContent, { paddingBottom: bottomPad + 20 }]} showsVerticalScrollIndicator={false}>
          <View style={styles.statsGrid}>
            <StatCard label="Total Accepted" value={myDonations.length} icon="package" color="#E67E22" />
            <StatCard label="Delivered" value={delivered.length} icon="check-circle" color="#2D9E6B" />
          </View>
          <View style={styles.statsGrid}>
            <StatCard label="Active" value={activeMyDonations.length} icon="activity" color="#4299E1" />
            <StatCard label="Food Served" value={`${delivered.length * 12}kg`} icon="heart" color="#E53E3E" />
          </View>

          {/* Delivery agents overview */}
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Available Delivery Agents ({deliveryAgents.length})</Text>
          {deliveryAgents.length === 0 ? (
            <View style={[styles.agentEmptyBox, { backgroundColor: colors.muted, borderColor: colors.border }]}>
              <Text style={[styles.agentEmptyText, { color: colors.mutedForeground }]}>
                No delivery agents registered yet. Agents who register with the Delivery role will appear here.
              </Text>
            </View>
          ) : (
            deliveryAgents.map((agent) => (
              <View key={agent.id} style={[styles.agentRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={[styles.agentAvatar, { backgroundColor: "#4299E118" }]}>
                  <Text style={styles.agentAvatarText}>{agent.name.charAt(0).toUpperCase()}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.agentName, { color: colors.foreground }]}>{agent.name}</Text>
                  <Text style={[styles.agentPhone, { color: colors.mutedForeground }]}>{agent.phone || agent.email}</Text>
                </View>
                <View style={[styles.agentStatusBadge, { backgroundColor: "#2D9E6B18" }]}>
                  <View style={styles.agentStatusDot} />
                  <Text style={styles.agentStatusText}>Available</Text>
                </View>
              </View>
            ))
          )}

          <Text style={[styles.sectionTitle, { color: colors.foreground, marginTop: 8 }]}>Recent Activity</Text>
          {myDonations.slice(0, 8).map((d) => (
            <TouchableOpacity
              key={d.id}
              style={[styles.actRow, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => router.push(`/donation/${d.id}` as any)}
            >
              <Text style={{ fontSize: 20 }}>{CATEGORY_EMOJI[d.category] || "📦"}</Text>
              <View style={{ flex: 1 }}>
                <Text style={[styles.actTitle, { color: colors.foreground }]}>{d.title}</Text>
                <Text style={[styles.actSub, { color: colors.mutedForeground }]}>
                  {d.donorName} · {d.quantity}
                  {d.deliveryName ? ` · ${d.deliveryName}` : ""}
                </Text>
              </View>
              <StatusBadge status={d.status} size="sm" />
            </TouchableOpacity>
          ))}
          {myDonations.length === 0 && (
            <Text style={[styles.emptySub, { color: colors.mutedForeground, textAlign: "center", paddingTop: 20 }]}>
              No activity yet
            </Text>
          )}
        </ScrollView>
      )}
    </View>
  );
}

const picker = StyleSheet.create({
  overlay: { flex: 1, justifyContent: "flex-end" },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.5)" },
  sheet: {
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: 20, paddingBottom: 40,
    maxHeight: "80%",
    shadowColor: "#000", shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.1, shadowRadius: 12,
    elevation: 20,
  },
  handle: { width: 40, height: 4, borderRadius: 2, alignSelf: "center", marginTop: 12, marginBottom: 4 },
  sheetHeader: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", paddingVertical: 14 },
  sheetTitle: { fontFamily: "Inter_700Bold", fontSize: 18 },
  sheetSub: { fontFamily: "Inter_400Regular", fontSize: 13, marginTop: 2, maxWidth: 260 },
  closeBtn: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  searchBar: {
    flexDirection: "row", alignItems: "center", gap: 8,
    borderRadius: 12, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 10,
    marginBottom: 10,
  },
  searchInput: { flex: 1, fontFamily: "Inter_400Regular", fontSize: 14, padding: 0, margin: 0 },
  list: { flexGrow: 0 },
  agentRow: {
    flexDirection: "row", alignItems: "center", gap: 12,
    paddingVertical: 14, borderBottomWidth: 1,
  },
  agentAvatar: {
    width: 46, height: 46, borderRadius: 23,
    alignItems: "center", justifyContent: "center",
  },
  agentAvatarText: { fontFamily: "Inter_700Bold", fontSize: 18, color: "#4299E1" },
  agentInfo: { flex: 1 },
  agentName: { fontFamily: "Inter_600SemiBold", fontSize: 15 },
  agentPhone: { fontFamily: "Inter_400Regular", fontSize: 12, marginTop: 2 },
  agentBadge: {
    flexDirection: "row", alignItems: "center", gap: 4,
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8,
  },
  agentBadgeText: { fontFamily: "Inter_600SemiBold", fontSize: 11, color: "#4299E1" },
  emptyBox: { alignItems: "center", paddingVertical: 40, gap: 10 },
  emptyTitle: { fontFamily: "Inter_600SemiBold", fontSize: 15 },
  emptySub: { fontFamily: "Inter_400Regular", fontSize: 13, textAlign: "center", maxWidth: 260 },
});

const styles = StyleSheet.create({
  container: { flex: 1 },
  assigningOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.4)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 100,
  },
  assigningBox: {
    borderRadius: 20, padding: 30,
    alignItems: "center", gap: 14,
    shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12,
    elevation: 10,
  },
  assigningText: { fontFamily: "Inter_600SemiBold", fontSize: 15 },
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
  tabs: { flexDirection: "row", borderBottomWidth: 1 },
  tab: { flex: 1, paddingVertical: 12, alignItems: "center" },
  tabText: { fontFamily: "Inter_600SemiBold", fontSize: 12 },
  listContent: { padding: 16, gap: 12 },
  filterSection: { gap: 10, marginBottom: 4 },
  searchBar: {
    flexDirection: "row", alignItems: "center", gap: 8,
    borderRadius: 12, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 10,
  },
  searchInput: { flex: 1, fontFamily: "Inter_400Regular", fontSize: 14, padding: 0, margin: 0 },
  categoryScroll: { marginHorizontal: -16 },
  categoryScrollContent: { paddingHorizontal: 16, gap: 8 },
  categoryChip: {
    flexDirection: "row", alignItems: "center", gap: 5,
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, borderWidth: 1,
  },
  categoryChipText: { fontFamily: "Inter_500Medium", fontSize: 12 },
  resultCount: { fontFamily: "Inter_400Regular", fontSize: 12 },
  statsGrid: { flexDirection: "row", gap: 12, marginBottom: 4 },
  sectionTitle: { fontFamily: "Inter_600SemiBold", fontSize: 16, marginTop: 4, marginBottom: 4 },
  agentRow: {
    flexDirection: "row", alignItems: "center", gap: 12,
    borderRadius: 14, borderWidth: 1, padding: 12,
  },
  agentAvatar: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  agentAvatarText: { fontFamily: "Inter_700Bold", fontSize: 18, color: "#4299E1" },
  agentName: { fontFamily: "Inter_600SemiBold", fontSize: 14 },
  agentPhone: { fontFamily: "Inter_400Regular", fontSize: 12, marginTop: 2 },
  agentStatusBadge: {
    flexDirection: "row", alignItems: "center", gap: 5,
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8,
  },
  agentStatusDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#2D9E6B" },
  agentStatusText: { fontFamily: "Inter_600SemiBold", fontSize: 11, color: "#2D9E6B" },
  agentEmptyBox: { borderRadius: 12, borderWidth: 1, padding: 16 },
  agentEmptyText: { fontFamily: "Inter_400Regular", fontSize: 13, lineHeight: 20 },
  donCard: { borderRadius: 16, borderWidth: 1, overflow: "hidden" },
  donHeader: { flexDirection: "row", alignItems: "center", padding: 14, gap: 12 },
  donEmoji: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  donInfo: { flex: 1 },
  donTitle: { fontFamily: "Inter_600SemiBold", fontSize: 15 },
  donSub: { fontFamily: "Inter_400Regular", fontSize: 12, marginTop: 2 },
  donRight: { alignItems: "flex-end", gap: 6 },
  donMeta: { flexDirection: "row", gap: 16, paddingHorizontal: 14, paddingBottom: 12 },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  metaText: { fontFamily: "Inter_400Regular", fontSize: 12 },
  expandedSection: { borderTopWidth: 1, padding: 14, gap: 12 },
  contactCard: { borderRadius: 12, padding: 12, gap: 8 },
  contactTitle: { fontFamily: "Inter_600SemiBold", fontSize: 10, letterSpacing: 0.5 },
  contactRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  contactName: { fontFamily: "Inter_600SemiBold", fontSize: 14, flex: 1 },
  contactPhone: { fontFamily: "Inter_400Regular", fontSize: 14, flex: 1 },
  contactAddr: { fontFamily: "Inter_400Regular", fontSize: 13, flex: 1 },
  callBtn: {
    flexDirection: "row", alignItems: "center", gap: 4,
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8,
  },
  callText: { fontFamily: "Inter_600SemiBold", fontSize: 12 },
  description: { fontFamily: "Inter_400Regular", fontSize: 13, lineHeight: 19 },
  actionRow: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  actionBtn: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 6, borderRadius: 10, paddingVertical: 11,
  },
  actionBtnText: { fontFamily: "Inter_600SemiBold", color: "#FFF", fontSize: 14 },
  actionBtnOutline: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 6, borderRadius: 10, paddingVertical: 11, borderWidth: 1.5,
  },
  actionBtnOutlineText: { fontFamily: "Inter_600SemiBold", fontSize: 14 },
  actRow: {
    borderRadius: 12, borderWidth: 1, padding: 12,
    flexDirection: "row", alignItems: "center", gap: 10,
  },
  actTitle: { fontFamily: "Inter_600SemiBold", fontSize: 14 },
  actSub: { fontFamily: "Inter_400Regular", fontSize: 12 },
  empty: { alignItems: "center", paddingTop: 60, gap: 10 },
  emptyTitle: { fontFamily: "Inter_600SemiBold", fontSize: 16 },
  emptySub: { fontFamily: "Inter_400Regular", fontSize: 13, textAlign: "center", maxWidth: 260 },
  freshnessPill: {
    flexDirection: "row", alignItems: "center", gap: 3,
    paddingHorizontal: 7, paddingVertical: 2, borderRadius: 20,
  },
  freshnessPillText: { fontFamily: "Inter_600SemiBold", fontSize: 11 },
});
