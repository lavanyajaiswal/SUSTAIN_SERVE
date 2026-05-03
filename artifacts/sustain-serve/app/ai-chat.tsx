import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/context/AuthContext";
import { useDonations } from "@/context/DonationsContext";
import { useColors } from "@/hooks/useColors";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: number;
}

function getApiBase(): string {
  const domain = process.env.EXPO_PUBLIC_DOMAIN;
  if (domain) return `https://${domain}`;
  return "http://localhost:8080";
}

const QUICK_PROMPTS = [
  "How do I donate food?",
  "What items are accepted?",
  "How to track my donation?",
  "Food safety tips",
  "How do NGOs use this?",
];

export default function AIChatScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { stats } = useDonations();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content: `Hi ${user?.name?.split(" ")[0] || "there"}! 👋 I'm SustainBot, your AI assistant for SustainServe.\n\nI can help you with donation queries, food safety tips, NGO guidance, and more. What can I help you with today?`,
      timestamp: Date.now(),
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [predicting, setPredicting] = useState(false);
  const [prediction, setPrediction] = useState<string | null>(null);
  const listRef = useRef<FlatList>(null);

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const sendMessage = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;
    Haptics.selectionAsync();

    const userMsg: Message = {
      id: Date.now().toString(),
      role: "user",
      content: trimmed,
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const history = [...messages, userMsg]
        .filter((m) => m.id !== "welcome")
        .map((m) => ({ role: m.role, content: m.content }));

      const res = await fetch(`${getApiBase()}/api/ai/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history }),
      });

      const data = await res.json();
      const reply = data.reply ?? "Sorry, I couldn't get a response right now.";

      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString() + "_ai",
          role: "assistant",
          content: reply,
          timestamp: Date.now(),
        },
      ]);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString() + "_err",
          role: "assistant",
          content: "I'm having trouble connecting right now. Please check your connection and try again.",
          timestamp: Date.now(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  }, [messages, loading]);

  const fetchPrediction = async () => {
    setPredicting(true);
    setPrediction(null);
    try {
      const res = await fetch(`${getApiBase()}/api/ai/predict`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category: "general food",
          history: [
            { date: "Mon", count: stats.pending },
            { date: "Tue", count: stats.total },
            { date: "Wed", count: stats.delivered },
          ],
        }),
      });
      const data = await res.json();
      setPrediction(data.prediction ?? "No prediction available.");
    } catch {
      setPrediction("Could not fetch prediction. Check your connection.");
    } finally {
      setPredicting(false);
    }
  };

  useEffect(() => {
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
  }, [messages]);

  const renderMessage = ({ item }: { item: Message }) => {
    const isUser = item.role === "user";
    return (
      <View style={[styles.msgRow, isUser && styles.msgRowUser]}>
        {!isUser && (
          <View style={[styles.botAvatar, { backgroundColor: colors.primary + "20" }]}>
            <Feather name="cpu" size={14} color={colors.primary} />
          </View>
        )}
        <View
          style={[
            styles.bubble,
            isUser
              ? [styles.bubbleUser, { backgroundColor: colors.primary }]
              : [styles.bubbleBot, { backgroundColor: colors.card, borderColor: colors.border }],
          ]}
        >
          <Text style={[styles.bubbleText, { color: isUser ? "#FFF" : colors.foreground }]}>
            {item.content}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={0}
    >
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border, paddingTop: topPad + 12 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <View style={[styles.botDot, { backgroundColor: colors.primary }]} />
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>SustainBot</Text>
          <Text style={[styles.headerSub, { color: colors.mutedForeground }]}>AI Assistant</Text>
        </View>
        <TouchableOpacity
          style={[styles.predictBtn, { backgroundColor: "#7C3AED18", borderColor: "#7C3AED30" }]}
          onPress={fetchPrediction}
        >
          <Feather name="trending-up" size={14} color="#7C3AED" />
          <Text style={styles.predictBtnText}>Predict</Text>
        </TouchableOpacity>
      </View>

      {/* Demand Prediction Banner */}
      {(predicting || prediction) && (
        <View style={[styles.predictionBanner, { backgroundColor: "#7C3AED0A", borderColor: "#7C3AED30" }]}>
          <View style={styles.predictionHeader}>
            <Feather name="trending-up" size={14} color="#7C3AED" />
            <Text style={styles.predictionTitle}>AI Demand Forecast</Text>
          </View>
          {predicting ? (
            <ActivityIndicator size="small" color="#7C3AED" />
          ) : (
            <Text style={[styles.predictionText, { color: colors.foreground }]}>{prediction}</Text>
          )}
        </View>
      )}

      {/* Messages */}
      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(m) => m.id}
        renderItem={renderMessage}
        contentContainerStyle={[styles.messagesList, { paddingBottom: 16 }]}
        showsVerticalScrollIndicator={false}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
      />

      {/* Loading indicator */}
      {loading && (
        <View style={[styles.typingRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.botAvatar, { backgroundColor: colors.primary + "20" }]}>
            <Feather name="cpu" size={14} color={colors.primary} />
          </View>
          <View style={[styles.typingBubble, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={[styles.typingText, { color: colors.mutedForeground }]}>Thinking…</Text>
          </View>
        </View>
      )}

      {/* Quick prompts */}
      {messages.length <= 1 && (
        <View style={styles.quickPrompts}>
          <FlatList
            data={QUICK_PROMPTS}
            horizontal
            showsHorizontalScrollIndicator={false}
            keyExtractor={(p) => p}
            contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[styles.quickChip, { backgroundColor: colors.secondary, borderColor: colors.border }]}
                onPress={() => sendMessage(item)}
              >
                <Text style={[styles.quickChipText, { color: colors.foreground }]}>{item}</Text>
              </TouchableOpacity>
            )}
          />
        </View>
      )}

      {/* Input */}
      <View style={[styles.inputBar, { backgroundColor: colors.card, borderTopColor: colors.border, paddingBottom: bottomPad + 8 }]}>
        <TextInput
          style={[styles.input, { backgroundColor: colors.muted, borderColor: colors.border, color: colors.foreground }]}
          value={input}
          onChangeText={setInput}
          placeholder="Ask SustainBot anything…"
          placeholderTextColor={colors.mutedForeground}
          multiline
          maxLength={500}
          onSubmitEditing={() => sendMessage(input)}
          returnKeyType="send"
        />
        <TouchableOpacity
          style={[styles.sendBtn, { backgroundColor: input.trim() ? colors.primary : colors.muted }]}
          onPress={() => sendMessage(input)}
          disabled={!input.trim() || loading}
        >
          <Feather name="send" size={18} color={input.trim() ? "#FFF" : colors.mutedForeground} />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 16, paddingBottom: 14, borderBottomWidth: 1,
  },
  backBtn: { width: 40, height: 40, justifyContent: "center" },
  headerCenter: { flex: 1, alignItems: "center", gap: 2 },
  botDot: { width: 8, height: 8, borderRadius: 4, marginBottom: 2 },
  headerTitle: { fontFamily: "Inter_600SemiBold", fontSize: 16 },
  headerSub: { fontFamily: "Inter_400Regular", fontSize: 11 },
  predictBtn: {
    flexDirection: "row", alignItems: "center", gap: 4,
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, borderWidth: 1,
  },
  predictBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 12, color: "#7C3AED" },
  predictionBanner: {
    margin: 12, borderRadius: 12, borderWidth: 1, padding: 12, gap: 8,
  },
  predictionHeader: { flexDirection: "row", alignItems: "center", gap: 6 },
  predictionTitle: { fontFamily: "Inter_600SemiBold", fontSize: 13, color: "#7C3AED" },
  predictionText: { fontFamily: "Inter_400Regular", fontSize: 13, lineHeight: 19 },
  messagesList: { padding: 16, gap: 12 },
  msgRow: { flexDirection: "row", alignItems: "flex-end", gap: 8 },
  msgRowUser: { flexDirection: "row-reverse" },
  botAvatar: { width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  bubble: { maxWidth: "78%", borderRadius: 18, padding: 12 },
  bubbleUser: { borderBottomRightRadius: 4 },
  bubbleBot: { borderBottomLeftRadius: 4, borderWidth: 1 },
  bubbleText: { fontFamily: "Inter_400Regular", fontSize: 14, lineHeight: 20 },
  typingRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 16, paddingVertical: 8 },
  typingBubble: {
    flexDirection: "row", alignItems: "center", gap: 8,
    borderRadius: 16, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 10,
  },
  typingText: { fontFamily: "Inter_400Regular", fontSize: 13 },
  quickPrompts: { paddingVertical: 8 },
  quickChip: {
    borderRadius: 20, borderWidth: 1,
    paddingHorizontal: 14, paddingVertical: 8,
  },
  quickChipText: { fontFamily: "Inter_400Regular", fontSize: 13 },
  inputBar: {
    flexDirection: "row", alignItems: "flex-end", gap: 10,
    paddingHorizontal: 16, paddingTop: 10, borderTopWidth: 1,
  },
  input: {
    flex: 1, borderRadius: 20, borderWidth: 1, paddingHorizontal: 16,
    paddingVertical: 10, fontFamily: "Inter_400Regular", fontSize: 15,
    maxHeight: 100, minHeight: 44,
  },
  sendBtn: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
});
