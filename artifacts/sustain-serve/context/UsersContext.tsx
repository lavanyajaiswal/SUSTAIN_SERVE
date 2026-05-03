import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { User } from "./AuthContext";

interface UsersContextType {
  users: User[];
  deliveryAgents: User[];
  approveUser: (userId: string) => Promise<void>;
  rejectUser: (userId: string) => Promise<void>;
  blockUser: (userId: string) => Promise<void>;
  refreshUsers: () => Promise<void>;
  syncUsersToServer: (userList?: User[]) => Promise<void>;
}

const UsersContext = createContext<UsersContextType | null>(null);
const USERS_KEY = "@sustainserve_users";
const POLL_INTERVAL = 15000; // 15 seconds

function getApiBase(): string {
  const domain = process.env.EXPO_PUBLIC_DOMAIN;
  if (domain) return `https://${domain}`;
  return "http://localhost:8080";
}

export function UsersProvider({ children }: { children: React.ReactNode }) {
  const [users, setUsers] = useState<User[]>([]);
  const mountedRef = useRef(true);
  const pollTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    mountedRef.current = true;
    refreshUsers();
    startPolling();
    return () => {
      mountedRef.current = false;
      if (pollTimer.current) clearInterval(pollTimer.current);
    };
  }, []);

  const startPolling = () => {
    if (pollTimer.current) clearInterval(pollTimer.current);
    pollTimer.current = setInterval(pollFromServer, POLL_INTERVAL);
  };

  const refreshUsers = async () => {
    const raw = await AsyncStorage.getItem(USERS_KEY);
    if (raw) {
      const localUsers: User[] = JSON.parse(raw);
      if (mountedRef.current) setUsers(localUsers);
      // Push local users to server so cross-device visibility works
      syncUsersToServer(localUsers);
    }
    // Also pull from server to get delivery agents registered on other devices
    await pollFromServer();
  };

  const pollFromServer = async () => {
    if (!mountedRef.current) return;
    try {
      const res = await fetch(`${getApiBase()}/api/sync/users`, {
        headers: { "Cache-Control": "no-cache" },
      });
      if (!res.ok) return;
      const { users: serverUsers }: { users: User[] } = await res.json();
      if (!Array.isArray(serverUsers) || serverUsers.length === 0) return;

      // Merge server users into local store (server may have users from other devices)
      const raw = await AsyncStorage.getItem(USERS_KEY);
      const local: User[] = raw ? JSON.parse(raw) : [];

      let changed = false;
      const merged = [...local];
      for (const su of serverUsers) {
        const idx = merged.findIndex((u) => u.id === su.id);
        if (idx < 0) {
          merged.push(su);
          changed = true;
        }
        // Don't overwrite local approval status from server for admin safety
      }

      if (changed) {
        await AsyncStorage.setItem(USERS_KEY, JSON.stringify(merged));
      }
      if (mountedRef.current) setUsers(merged);
    } catch {
      // Server unreachable — local data still works
    }
  };

  const syncUsersToServer = useCallback(async (userList?: User[]) => {
    const list = userList ?? users;
    if (!list.length) return;
    try {
      await fetch(`${getApiBase()}/api/sync/users`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ users: list }),
      });
    } catch {
      // Silently fail — local data preserved
    }
  }, [users]);

  const updateUser = async (userId: string, updates: Partial<User>) => {
    const updated = users.map((u) =>
      u.id === userId ? { ...u, ...updates } : u
    );
    setUsers(updated);
    await AsyncStorage.setItem(USERS_KEY, JSON.stringify(updated));
    syncUsersToServer(updated);
  };

  const approveUser = (id: string) => updateUser(id, { isApproved: true });
  const rejectUser = (id: string) => updateUser(id, { isApproved: false });
  const blockUser = (id: string) => updateUser(id, { isApproved: false });

  const deliveryAgents = users.filter(
    (u) => u.role === "delivery" && u.isApproved
  );

  return (
    <UsersContext.Provider
      value={{
        users,
        deliveryAgents,
        approveUser,
        rejectUser,
        blockUser,
        refreshUsers,
        syncUsersToServer,
      }}
    >
      {children}
    </UsersContext.Provider>
  );
}

export function useUsers() {
  const ctx = useContext(UsersContext);
  if (!ctx) throw new Error("useUsers must be used within UsersProvider");
  return ctx;
}
