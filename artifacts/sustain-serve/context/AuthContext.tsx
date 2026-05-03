import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useContext, useEffect, useState } from "react";

export type UserRole = "admin" | "donor" | "ngo" | "delivery";

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  phone?: string;
  avatar?: string;
  isApproved: boolean;
  orgName?: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<User>;
  register: (data: RegisterData) => Promise<User>;
  logout: () => Promise<void>;
  updateUser: (data: Partial<User>) => void;
}

export interface RegisterData {
  name: string;
  email: string;
  password: string;
  role: UserRole;
  phone?: string;
  orgName?: string;
}

const AuthContext = createContext<AuthContextType | null>(null);

const STORAGE_KEY = "@sustainserve_user";
const USERS_KEY = "@sustainserve_users";

// Demo users — includes multiple delivery agents so NGO can pick from real agents
export const DEMO_USERS: User[] = [
  {
    id: "admin1",
    name: "Admin User",
    email: "admin@sustainserve.com",
    role: "admin",
    phone: "+1234567890",
    isApproved: true,
  },
  {
    id: "donor1",
    name: "Sarah Johnson",
    email: "donor@sustainserve.com",
    role: "donor",
    phone: "+1234567891",
    isApproved: true,
  },
  {
    id: "ngo1",
    name: "Hope Foundation",
    email: "ngo@sustainserve.com",
    role: "ngo",
    phone: "+1234567892",
    isApproved: true,
    orgName: "Hope Foundation NGO",
  },
  {
    id: "delivery1",
    name: "Mike Chen",
    email: "delivery@sustainserve.com",
    role: "delivery",
    phone: "+1234567893",
    isApproved: true,
  },
  {
    id: "delivery2",
    name: "Priya Sharma",
    email: "delivery2@sustainserve.com",
    role: "delivery",
    phone: "+1234567894",
    isApproved: true,
  },
  {
    id: "delivery3",
    name: "James Wilson",
    email: "delivery3@sustainserve.com",
    role: "delivery",
    phone: "+1234567895",
    isApproved: true,
  },
];

function getApiBase(): string {
  const domain = process.env.EXPO_PUBLIC_DOMAIN;
  if (domain) return `https://${domain}`;
  return "http://localhost:8080";
}

async function pushUsersToServer(users: User[]) {
  try {
    await fetch(`${getApiBase()}/api/sync/users`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ users }),
    });
  } catch {
    // Silently fail
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadUser();
    initDemoUsers();
  }, []);

  const initDemoUsers = async () => {
    const existing = await AsyncStorage.getItem(USERS_KEY);
    if (!existing) {
      await AsyncStorage.setItem(USERS_KEY, JSON.stringify(DEMO_USERS));
      pushUsersToServer(DEMO_USERS);
    } else {
      // Ensure demo delivery agents are always present (merge in any missing)
      const local: User[] = JSON.parse(existing);
      let changed = false;
      const merged = [...local];
      for (const demo of DEMO_USERS) {
        if (!merged.find((u) => u.id === demo.id)) {
          merged.push(demo);
          changed = true;
        }
      }
      if (changed) {
        await AsyncStorage.setItem(USERS_KEY, JSON.stringify(merged));
      }
      pushUsersToServer(merged);
    }
  };

  const loadUser = async () => {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEY);
      if (data) setUser(JSON.parse(data));
    } catch {}
    setIsLoading(false);
  };

  const login = async (email: string, password: string): Promise<User> => {
    const raw = await AsyncStorage.getItem(USERS_KEY);
    const users: User[] = raw ? JSON.parse(raw) : DEMO_USERS;
    const found = users.find(
      (u) => u.email.toLowerCase() === email.toLowerCase()
    );
    if (!found) throw new Error("User not found. Try the demo accounts.");
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(found));
    setUser(found);
    return found;
  };

  const register = async (data: RegisterData): Promise<User> => {
    if (data.role === "admin") {
      throw new Error("Admin accounts cannot be self-registered. Please contact the system administrator to get admin access.");
    }
    const raw = await AsyncStorage.getItem(USERS_KEY);
    const users: User[] = raw ? JSON.parse(raw) : [];
    const exists = users.find(
      (u) => u.email.toLowerCase() === data.email.toLowerCase()
    );
    if (exists) throw new Error("Email already registered.");
    const newUser: User = {
      id: Date.now().toString(),
      name: data.name,
      email: data.email,
      role: data.role,
      phone: data.phone,
      orgName: data.orgName,
      isApproved: data.role === "donor" || data.role === "delivery",
    };
    const updatedUsers = [...users, newUser];
    await AsyncStorage.setItem(USERS_KEY, JSON.stringify(updatedUsers));
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newUser));
    setUser(newUser);
    // Push updated users to server so other devices (NGOs) can see this delivery agent
    pushUsersToServer(updatedUsers);
    return newUser;
  };

  const logout = async () => {
    await AsyncStorage.removeItem(STORAGE_KEY);
    setUser(null);
  };

  const updateUser = (data: Partial<User>) => {
    if (!user) return;
    const updated = { ...user, ...data };
    setUser(updated);
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  };

  return (
    <AuthContext.Provider
      value={{ user, isLoading, login, register, logout, updateUser }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
