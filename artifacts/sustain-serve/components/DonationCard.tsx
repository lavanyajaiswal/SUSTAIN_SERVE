import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Donation } from "@/context/DonationsContext";
import { useColors } from "@/hooks/useColors";
import { StatusBadge } from "./StatusBadge";

const CATEGORY_ICONS: Record<string, string> = {
  vegetables: "🥦",
  fruits: "🍎",
  cooked: "🍲",
  bakery: "🍞",
  dairy: "🥛",
  grains: "🌾",
  other: "📦",
};

interface Props {
  donation: Donation;
  onPress?: () => void;
  showActions?: boolean;
  actionLabel?: string;
  onAction?: () => void;
}

export function DonationCard({
  donation,
  onPress,
  showActions,
  actionLabel,
  onAction,
}: Props) {
  const colors = useColors();
  const emoji = CATEGORY_ICONS[donation.category] || "📦";
  const isExpired = new Date(donation.expiryDate) < new Date();
  const hoursLeft = Math.max(
    0,
    Math.round(
      (new Date(donation.expiryDate).getTime() - Date.now()) / (1000 * 60 * 60)
    )
  );

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      <View style={styles.header}>
        <View style={[styles.emoji, { backgroundColor: colors.secondary }]}> 
          <Text style={styles.emojiText}>{emoji}</Text>
        </View>
        <View style={styles.headerInfo}>
          <Text style={[styles.title, { color: colors.foreground }]} numberOfLines={1}>
            {donation.title}
          </Text>
          <Text style={[styles.donor, { color: colors.mutedForeground }]}>
            by {donation.donorName}
          </Text>
        </View>
        <StatusBadge status={donation.status} size="sm" />
      </View>

      <View style={styles.details}>
        <View style={styles.detail}>
          <Feather name="package" size={13} color={colors.mutedForeground} />
          <Text style={[styles.detailText, { color: colors.mutedForeground }]}> 
            {donation.quantity}
          </Text>
        </View>
        <View style={styles.detail}>
          <Feather name="map-pin" size={13} color={colors.mutedForeground} />
          <Text
            style={[styles.detailText, { color: colors.mutedForeground }]}
            numberOfLines={1}
          >
            {donation.pickupAddress}
          </Text>
        </View>
        <View style={styles.detail}>
          <Feather
            name="clock"
            size={13}
            color={isExpired ? colors.destructive : colors.mutedForeground}
          />
          <Text
            style={[
              styles.detailText,
              { color: isExpired ? colors.destructive : colors.mutedForeground },
            ]}
          >
            {isExpired ? "Expired" : `${hoursLeft}h left`}
          </Text>
        </View>
      </View>

      {showActions && actionLabel && (
        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: colors.primary }]}
          onPress={onAction}
        >
          <Text style={styles.actionBtnText}>{actionLabel}</Text>
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
    gap: 12,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  emoji: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  emojiText: {
    fontSize: 22,
  },
  headerInfo: {
    flex: 1,
  },
  title: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
  },
  donor: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    marginTop: 2,
  },
  details: {
    gap: 6,
  },
  detail: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  detailText: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    flex: 1,
  },
  actionBtn: {
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: "center",
  },
  actionBtnText: {
    fontFamily: "Inter_600SemiBold",
    color: "#FFFFFF",
    fontSize: 14,
  },
});
