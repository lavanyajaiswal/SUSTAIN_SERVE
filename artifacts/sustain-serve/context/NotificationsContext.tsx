import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useContext, useEffect, useState } from "react";

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: "info" | "success" | "warning" | "error";
  forRole?: string;
  forUserId?: string;
  donationId?: string;
  read: boolean;
  createdAt: string;
}

interface NotificationsContextType {
  notifications: AppNotification[];
  unreadCount: number;
  addNotification: (n: Omit<AppNotification, "id" | "read" | "createdAt">) => void;
  markRead: (id: string) => void;
  markAllRead: () => void;
  getForUser: (userId: string, role: string) => AppNotification[];
}

const NotificationsContext = createContext<NotificationsContextType | null>(null);
const KEY = "@sustainserve_notifications";

export function NotificationsProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  useEffect(() => {
    AsyncStorage.getItem(KEY).then((raw) => {
      if (raw) setNotifications(JSON.parse(raw));
    });
  }, []);

  const save = async (data: AppNotification[]) => {
    setNotifications(data);
    await AsyncStorage.setItem(KEY, JSON.stringify(data));
  };

  const addNotification = (n: Omit<AppNotification, "id" | "read" | "createdAt">) => {
    const newN: AppNotification = {
      ...n,
      id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
      read: false,
      createdAt: new Date().toISOString(),
    };
    setNotifications((prev) => {
      const updated = [newN, ...prev].slice(0, 50);
      AsyncStorage.setItem(KEY, JSON.stringify(updated));
      return updated;
    });
  };

  const markRead = (id: string) => {
    setNotifications((prev) => {
      const updated = prev.map((n) => (n.id === id ? { ...n, read: true } : n));
      AsyncStorage.setItem(KEY, JSON.stringify(updated));
      return updated;
    });
  };

  const markAllRead = () => {
    setNotifications((prev) => {
      const updated = prev.map((n) => ({ ...n, read: true }));
      AsyncStorage.setItem(KEY, JSON.stringify(updated));
      return updated;
    });
  };

  const getForUser = (userId: string, role: string) =>
    notifications.filter(
      (n) =>
        (!n.forUserId && !n.forRole) ||
        n.forUserId === userId ||
        n.forRole === role
    );

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <NotificationsContext.Provider
      value={{ notifications, unreadCount, addNotification, markRead, markAllRead, getForUser }}
    >
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationsContext);
  if (!ctx) throw new Error("useNotifications must be used within NotificationsProvider");
  return ctx;
}
