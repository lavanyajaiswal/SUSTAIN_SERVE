import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router, useLocalSearchParams } from "expo-router";
import React from "react";
import {
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBadge } from "@/components/StatusBadge";
import { useAuth } from "@/context/AuthContext";
import { useDonations } from "@/context/DonationsContext";
import { useColors } from "@/hooks/useColors";

const STATUS_TIMELINE = [
  { status: "pending", label: "Donation Posted", icon: "package" },
  { status: "accepted", label: "Accepted by NGO", icon: "check" },
  { status: "assigned", label: "Delivery Assigned", icon: "truck" },
  { status: "picked", label: "Picked Up", icon: "map-pin" },
  { status: "on_way", label: "On the Way", icon: "navigation" },
  { status: "delivered", label: "Delivered", icon: "check-circle" },
];

const STATUS_ORDER = ["pending", "accepted", "assigned", "picked", "on_way", "delivered"];

export default function DonationDetailScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getDonation } = useDonations();
  const { user } = useAuth();

  const donation = getDonation(id as string);

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  if (!donation) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}> 
        <Text style={[styles.notFound, { color: colors.mutedForeground }]}>Donation not found</Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={[styles.backLink, { color: colors.primary }]}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const currentStatusIndex = STATUS_ORDER.indexOf(donation.status);
  const callPhone = (phone: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Linking.openURL(`tel:${phone}`);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}> 
      <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border, paddingTop: topPad + 12 }]}> 
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Donation Details</Text>
        <StatusBadge status={donation.status} />
      </View>

      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: bottomPad + 20 }]} showsVerticalScrollIndicator={false}>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}> 
          <Text style={[styles.cardTitle, { color: colors.foreground }]}>{donation.title}</Text>
          {donation.description ? (
            <Text style={[styles.desc, { color: colors.mutedForeground }]}>{donation.description}</Text>
          ) : null}

          <View style={styles.detailsGrid}>
            <View style={styles.detailItem}>
              <Feather name="package" size={14} color={colors.primary} />
              <Text style={[styles.detailLabel, { color: colors.mutedForeground }]}>Quantity</Text>
              <Text style={[styles.detailValue, { color: colors.foreground }]}>{donation.quantity}</Text>
            </View>
            <View style={styles.detailItem}>
              <Feather name="tag" size={14} color={colors.primary} />
              <Text style={[styles.detailLabel, { color: colors.mutedForeground }]}>Category</Text>
              <Text style={[styles.detailValue, { color: colors.foreground }]}>{donation.category}</Text>
            </View>
            <View style={styles.detailItem}>
              <Feather name="clock" size={14} color={colors.primary} />
              <Text style={[styles.detailLabel, { color: colors.mutedForeground }]}>Expires</Text>
              <Text style={[styles.detailValue, { color: colors.foreground }]}> 
                {new Date(donation.expiryDate).toLocaleDateString()}
              </Text>
            </View>
            <View style={styles.detailItem}>
              <Feather name="calendar" size={14} color={colors.primary} />
              <Text style={[styles.detailLabel, { color: colors.mutedForeground }]}>Posted</Text>
              <Text style={[styles.detailValue, { color: colors.foreground }]}> 
                {new Date(donation.createdAt).toLocaleDateString()}
              </Text>
            </View>
          </View>

          <View style={[styles.addressBox, { backgroundColor: colors.secondary }]}> 
            <Feather name="map-pin" size={16} color={colors.primary} />
            <Text style={[styles.address, { color: colors.foreground }]}>{donation.pickupAddress}</Text>
            <TouchableOpacity onPress={() => {
              const q = encodeURIComponent(donation.pickupAddress);
              Linking.openURL(`https://maps.google.com/?q=${q}`);
            }}>
              <Text style={[styles.mapLink, { color: colors.primary }]}>Map</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}> 
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Delivery Progress</Text>
          <View style={styles.timeline}>
            {STATUS_TIMELINE.map((step, i) => {
              const done = i <= currentStatusIndex;
              const active = i === currentStatusIndex;
              return (
                <View key={step.status} style={styles.timelineItem}>
                  <View style={styles.timelineLeft}>
                    <View style={[styles.timelineDot, { backgroundColor: done ? colors.primary : colors.muted, borderColor: done ? colors.primary : colors.border }]}>
                      <Feather name={step.icon as any} size={10} color={done ? "#FFF" : colors.mutedForeground} />
                    </View>
                    {i < STATUS_TIMELINE.length - 1 && (
                      <View style={[styles.timelineLine, { backgroundColor: done ? colors.primary : colors.border }]} />
                    )}
                  </View>
                  <Text style={[styles.timelineLabel, { color: done ? colors.foreground : colors.mutedForeground, fontFamily: active ? "Inter_600SemiBold" : "Inter_400Regular" }]}> 
                    {step.label}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>

        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}> 
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>People Involved</Text>

          <View style={styles.personRow}>
            <View style={[styles.personAvatar, { backgroundColor: "#2D9E6B18" }]}> 
              <Feather name="user" size={18} color="#2D9E6B" />
            </View>
            <View style={styles.personInfo}>
              <Text style={[styles.personName, { color: colors.foreground }]}>{donation.donorName}</Text>
              <Text style={[styles.personRole, { color: colors.mutedForeground }]}>Donor</Text>
            </View>
            {donation.donorPhone && (
              <TouchableOpacity style={[styles.callBtn, { backgroundColor: "#2D9E6B18" }]} onPress={() => callPhone(donation.donorPhone)}>
                <Feather name="phone" size={16} color="#2D9E6B" />
              </TouchableOpacity>
            )}
          </View>

          {donation.ngoName && (
            <View style={styles.personRow}>
              <View style={[styles.personAvatar, { backgroundColor: "#E67E2218" }]}> 
                <Feather name="home" size={18} color="#E67E22" />
              </View>
              <View style={styles.personInfo}>
                <Text style={[styles.personName, { color: colors.foreground }]}>{donation.ngoName}</Text>
                <Text style={[styles.personRole, { color: colors.mutedForeground }]}>NGO</Text>
              </View>
            </View>
          )}

          {donation.deliveryName && (
            <View style={styles.personRow}>
              <View style={[styles.personAvatar, { backgroundColor: "#4299E118" }]}> 
                <Feather name="truck" size={18} color="#4299E1" />
              </View>
              <View style={styles.personInfo}>
                <Text style={[styles.personName, { color: colors.foreground }]}>{donation.deliveryName}</Text>
                <Text style={[styles.personRole, { color: colors.mutedForeground }]}>Delivery Partner</Text>
              </View>
              {donation.deliveryPhone && (
                <TouchableOpacity style={[styles.callBtn, { backgroundColor: "#4299E118" }]} onPress={() => callPhone(donation.deliveryPhone!)}>
                  <Feather name="phone" size={16} color="#4299E1" />
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  notFound: { fontFamily: "Inter_500Medium", fontSize: 16 },
  backLink: { fontFamily: "Inter_600SemiBold", fontSize: 15 },
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 20, paddingBottom: 16, borderBottomWidth: 1,
  },
  backBtn: { width: 40, height: 40, justifyContent: "center" },
  headerTitle: { fontFamily: "Inter_600SemiBold", fontSize: 18, flex: 1, textAlign: "center" },
  scroll: { padding: 20, gap: 16 },
  card: { borderRadius: 16, borderWidth: 1, padding: 16, gap: 14 },
  cardTitle: { fontFamily: "Inter_700Bold", fontSize: 20 },
  desc: { fontFamily: "Inter_400Regular", fontSize: 14, lineHeight: 20 },
  detailsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  detailItem: { width: "47%", gap: 2 },
  detailLabel: { fontFamily: "Inter_400Regular", fontSize: 11 },
  detailValue: { fontFamily: "Inter_600SemiBold", fontSize: 14 },
  addressBox: { flexDirection: "row", alignItems: "center", gap: 8, borderRadius: 10, padding: 12 },
  address: { fontFamily: "Inter_400Regular", fontSize: 13, flex: 1 },
  mapLink: { fontFamily: "Inter_600SemiBold", fontSize: 13 },
  sectionTitle: { fontFamily: "Inter_600SemiBold", fontSize: 16 },
  timeline: { gap: 0 },
  timelineItem: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  timelineLeft: { alignItems: "center", width: 24 },
  timelineDot: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, alignItems: "center", justifyContent: "center" },
  timelineLine: { width: 2, height: 24, marginVertical: 2 },
  timelineLabel: { fontSize: 14, paddingTop: 4, paddingBottom: 12, flex: 1 },
  personRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  personAvatar: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  personInfo: { flex: 1 },
  personName: { fontFamily: "Inter_600SemiBold", fontSize: 15 },
  personRole: { fontFamily: "Inter_400Regular", fontSize: 12 },
  callBtn: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
});
