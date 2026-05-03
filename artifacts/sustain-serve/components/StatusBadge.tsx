import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { DonationStatus } from "@/context/DonationsContext";
import { useColors } from "@/hooks/useColors";

const STATUS_CONFIG: Record<
  DonationStatus,
  { label: string; bg: string; text: string }
> = {
  pending: { label: "Pending", bg: "#FEF3C7", text: "#B45309" },
  accepted: { label: "Accepted", bg: "#D1FAE5", text: "#065F46" },
  assigned: { label: "Assigned", bg: "#DBEAFE", text: "#1E40AF" },
  picked: { label: "Picked Up", bg: "#EDE9FE", text: "#5B21B6" },
  on_way: { label: "On the Way", bg: "#FEE2E2", text: "#B91C1C" },
  delivered: { label: "Delivered", bg: "#D1FAE5", text: "#065F46" },
  expired: { label: "Expired", bg: "#F3F4F6", text: "#6B7280" },
};

interface Props {
  status: DonationStatus;
  size?: "sm" | "md";
}

export function StatusBadge({ status, size = "md" }: Props) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
  const isSmall = size === "sm";

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: config.bg,
          paddingHorizontal: isSmall ? 8 : 12,
          paddingVertical: isSmall ? 2 : 4,
          borderRadius: 20,
        },
      ]}
    >
      <Text
        style={[
          styles.text,
          { color: config.text, fontSize: isSmall ? 10 : 12 },
        ]}
      >
        {config.label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: "flex-start",
  },
  text: {
    fontFamily: "Inter_600SemiBold",
  },
});
