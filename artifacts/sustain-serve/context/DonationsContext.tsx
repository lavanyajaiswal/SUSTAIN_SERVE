import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useContext, useEffect, useRef, useState } from "react";

export type DonationStatus =
  | "pending"
  | "accepted"
  | "assigned"
  | "picked"
  | "on_way"
  | "delivered"
  | "expired";

export interface Donation {
  id: string;
  donorId: string;
  donorName: string;
  donorPhone: string;
  title: string;
  description: string;
  quantity: string;
  category: string;
  expiryDate: string;
  pickupAddress: string;
  status: DonationStatus;
  ngoId?: string;
  ngoName?: string;
  deliveryId?: string;
  deliveryName?: string;
  deliveryPhone?: string;
  createdAt: string;
  updatedAt: string;
  imageUri?: string;
  lat?: number;
  lng?: number;
  freshnessReport?: {
    score: number;
    label: "fresh" | "acceptable" | "poor" | "unsafe";
    summary: string;
    tips: string;
    analyzedAt: string;
  };
}

interface DonationsContextType {
  donations: Donation[];
  createDonation: (data: Partial<Donation>) => Promise<void>;
  updateDonation: (id: string, data: Partial<Donation>) => Promise<void>;
  deleteDonation: (id: string) => Promise<void>;
  getDonation: (id: string) => Donation | undefined;
  getDonationsByDonor: (donorId: string) => Donation[];
  getDonationsByNGO: (ngoId: string) => Donation[];
  getAvailableDonations: () => Donation[];
  /** Returns ONLY tasks assigned to the specific delivery agent — strict filtering */
  getDeliveryTasks: (deliveryId: string) => Donation[];
  mergeFromServer: (data: Donation[]) => void;
  setPushFn: (fn: ((d: Donation[]) => void) | null) => void;
  stats: {
    total: number;
    delivered: number;
    pending: number;
    active: number;
    foodSavedKg: number;
  };
}

const DonationsContext = createContext<DonationsContextType | null>(null);
const STORAGE_KEY = "@sustainserve_donations";

const SAMPLE_DONATIONS: Donation[] = [
  {
    id: "d1",
    donorId: "donor1",
    donorName: "Sarah Johnson",
    donorPhone: "+1234567891",
    title: "Fresh Vegetables",
    description: "Assorted fresh vegetables from local farm",
    quantity: "20 kg",
    category: "vegetables",
    expiryDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
    pickupAddress: "123 Green St, Eco City",
    status: "pending",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    lat: 40.7128,
    lng: -74.006,
  },
  {
    id: "d2",
    donorId: "donor1",
    donorName: "Sarah Johnson",
    donorPhone: "+1234567891",
    title: "Cooked Rice & Dal",
    description: "Freshly cooked food for 50 people",
    quantity: "15 servings",
    category: "cooked",
    expiryDate: new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString(),
    pickupAddress: "456 Oak Ave, Eco City",
    status: "accepted",
    ngoId: "ngo1",
    ngoName: "Hope Foundation NGO",
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date().toISOString(),
    lat: 40.7148,
    lng: -74.008,
  },
  {
    id: "d3",
    donorId: "donor1",
    donorName: "Sarah Johnson",
    donorPhone: "+1234567891",
    title: "Bakery Items",
    description: "Bread, pastries, and baked goods",
    quantity: "30 pieces",
    category: "bakery",
    expiryDate: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    pickupAddress: "789 Maple Rd, Eco City",
    status: "delivered",
    ngoId: "ngo1",
    ngoName: "Hope Foundation NGO",
    deliveryId: "delivery1",
    deliveryName: "Mike Chen",
    deliveryPhone: "+1234567893",
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date().toISOString(),
    lat: 40.7138,
    lng: -74.003,
  },
];

export function DonationsProvider({ children }: { children: React.ReactNode }) {
  const [donations, setDonations] = useState<Donation[]>([]);
  const pushFnRef = useRef<((d: Donation[]) => void) | null>(null);
  const fromServerRef = useRef(false);

  useEffect(() => {
    loadDonations();
  }, []);

  const loadDonations = async () => {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (raw) {
      setDonations(JSON.parse(raw));
    } else {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(SAMPLE_DONATIONS));
      setDonations(SAMPLE_DONATIONS);
    }
  };

  const save = async (data: Donation[]) => {
    setDonations(data);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    if (!fromServerRef.current && pushFnRef.current) {
      pushFnRef.current(data);
    }
  };

  const mergeFromServer = (incoming: Donation[]) => {
    if (!incoming || incoming.length === 0) return;
    fromServerRef.current = true;
    setDonations((prev) => {
      let updated = [...prev];
      for (const d of incoming) {
        const idx = updated.findIndex((x) => x.id === d.id);
        if (idx >= 0) {
          if (new Date(d.updatedAt) >= new Date(updated[idx].updatedAt)) {
            updated[idx] = d;
          }
        } else {
          updated.push(d);
        }
      }
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
    setTimeout(() => { fromServerRef.current = false; }, 50);
  };

  const setPushFn = (fn: ((d: Donation[]) => void) | null) => {
    pushFnRef.current = fn;
  };

  const createDonation = async (data: Partial<Donation>) => {
    const donation: Donation = {
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: "pending",
      donorId: data.donorId || "",
      donorName: data.donorName || "",
      donorPhone: data.donorPhone || "",
      title: data.title || "",
      description: data.description || "",
      quantity: data.quantity || "",
      category: data.category || "other",
      expiryDate: data.expiryDate || new Date().toISOString(),
      pickupAddress: data.pickupAddress || "",
      ...data,
    };
    await save([...donations, donation]);
  };

  const updateDonation = async (id: string, data: Partial<Donation>) => {
    const updated = donations.map((d) =>
      d.id === id ? { ...d, ...data, updatedAt: new Date().toISOString() } : d
    );
    await save(updated);
  };

  const deleteDonation = async (id: string) => {
    await save(donations.filter((d) => d.id !== id));
  };

  const getDonation = (id: string) => donations.find((d) => d.id === id);
  const getDonationsByDonor = (donorId: string) => donations.filter((d) => d.donorId === donorId);
  const getDonationsByNGO = (ngoId: string) => donations.filter((d) => d.ngoId === ngoId);
  const getAvailableDonations = () => donations.filter((d) => d.status === "pending");

  /**
   * Returns ONLY donations assigned to this specific delivery agent.
   * Strictly filters by deliveryId — agents never see other agents' tasks.
   */
  const getDeliveryTasks = (deliveryId: string) =>
    donations.filter(
      (d) =>
        d.deliveryId === deliveryId &&
        ["assigned", "picked", "on_way", "delivered"].includes(d.status)
    );

  const delivered = donations.filter((d) => d.status === "delivered");
  const stats = {
    total: donations.length,
    delivered: delivered.length,
    pending: donations.filter((d) => d.status === "pending").length,
    active: donations.filter((d) =>
      ["accepted", "assigned", "picked", "on_way"].includes(d.status)
    ).length,
    foodSavedKg: delivered.length * 12,
  };

  return (
    <DonationsContext.Provider
      value={{
        donations,
        createDonation,
        updateDonation,
        deleteDonation,
        getDonation,
        getDonationsByDonor,
        getDonationsByNGO,
        getAvailableDonations,
        getDeliveryTasks,
        mergeFromServer,
        setPushFn,
        stats,
      }}
    >
      {children}
    </DonationsContext.Provider>
  );
}

export function useDonations() {
  const ctx = useContext(DonationsContext);
  if (!ctx) throw new Error("useDonations must be used within DonationsProvider");
  return ctx;
}
