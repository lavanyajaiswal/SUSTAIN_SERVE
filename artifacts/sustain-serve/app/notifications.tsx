import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React from "react";
import {
  FlatList,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppNotification, useNotifications } from "@/context/NotificationsContext";
import { useColors } from "@/hooks/useColors";

const TYPE_CONFIG = {
  info: { icon: "info", color: "#4299E1" },
  success: { icon: "check-circle", color: "#2D9E6B" },
  warning: { icon: "alert-triangle", color: "#E67E22" },
  error: { icon: "x-circle", color: "#E53E3E" },
};

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  return `${Math.floor(hr / 24)}d ago`;
}

export default function NotificationsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { notifications, markRead, markAllRead } = useNotifications();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const renderItem = ({ item }: { item: AppNotification }) => {
    const cfg = TYPE_CONFIG[item.type];
    return (
      <TouchableOpacity
        style={[
          styles.item,
          {
            backgroundColor: item.read ? colors.card : cfg.color + "0A",
            borderColor: item.read ? colors.border : cfg.color + "30",
          },
        ]}
        onPress={() => {
          markRead(item.id);
          Haptics.selectionAsync();
          if (item.donationId) router.push(`/donation/${item.donationId}` as any);
        }}
      >
        <View style={[styles.iconWrap, { backgroundColor: cfg.color + "18" }]}>
          <Feather name={cfg.icon as any} size={20} color={cfg.color} />
        </View>
        <View style={styles.itemContent}>
          <View style={styles.itemHeader}>
            <Text style={[styles.itemTitle, { color: colors.foreground }]} numberOfLines={1}>
              {item.title}
            </Text>
            {!item.read && <View style={[styles.unreadDot, { backgroundColor: cfg.color }]} />}
          </View>
          <Text style={[styles.itemMsg, { color: colors.mutedForeground }]} numberOfLines={2}>
            {item.message}
          </Text>
          <Text style={[styles.itemTime, { color: colors.mutedForeground }]}>
            {timeAgo(item.createdAt)}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border, paddingTop: topPad + 12 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Notifications</Text>
        <TouchableOpacity onPress={() => { markAllRead(); Haptics.selectionAsync(); }}>
          <Text style={[styles.markAll, { color: colors.primary }]}>Mark all read</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={notifications}
        keyExtractor={(n) => n.id}
        renderItem={renderItem}
        contentContainerStyle={[styles.list, { paddingBottom: bottomPad + 20 }]}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Feather name="bell-off" size={48} color={colors.mutedForeground} />
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No notifications yet</Text>
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
  backBtn: { width: 40, height: 40, justifyContent: "center" },
  headerTitle: { fontFamily: "Inter_600SemiBold", fontSize: 18, flex: 1, textAlign: "center" },
  markAll: { fontFamily: "Inter_500Medium", fontSize: 13 },
  list: { padding: 16, gap: 10 },
  item: { borderRadius: 14, borderWidth: 1, padding: 14, flexDirection: "row", gap: 12 },
  iconWrap: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  itemContent: { flex: 1, gap: 3 },
  itemHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  itemTitle: { fontFamily: "Inter_600SemiBold", fontSize: 14, flex: 1 },
  unreadDot: { width: 8, height: 8, borderRadius: 4 },
  itemMsg: { fontFamily: "Inter_400Regular", fontSize: 13, lineHeight: 18 },
  itemTime: { fontFamily: "Inter_400Regular", fontSize: 11, marginTop: 2 },
  empty: { alignItems: "center", paddingTop: 80, gap: 12 },
  emptyText: { fontFamily: "Inter_400Regular", fontSize: 15 },
});
