/**
 * SyncContext — real-time multi-device sync via polling the API server.
 *
 * Uses REST polling (every 4 seconds) to sync donation data across all devices.
 * When local data changes, it pushes to the server immediately.
 * The server broadcasts changes; other devices pick them up on their next poll.
 *
 * Falls back gracefully if the server is unreachable.
 */
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { AppState } from "react-native";

export interface SyncState {
  connected: boolean;
  lastSynced: number | null;
  pushDonations: (donations: object[]) => void;
  serverDonations: object[] | null;
  syncError: string | null;
}

const SyncContext = createContext<SyncState>({
  connected: false,
  lastSynced: null,
  pushDonations: () => {},
  serverDonations: null,
  syncError: null,
});

function getApiBase(): string {
  // EXPO_PUBLIC_DOMAIN is injected by the workflow and points to the Replit proxy
  const domain = process.env.EXPO_PUBLIC_DOMAIN;
  if (domain) return `https://${domain}`;
  return "http://localhost:8080";
}

function getRestUrl(path: string): string {
  return `${getApiBase()}/api${path}`;
}

const POLL_INTERVAL = 4000; // 4 seconds — near real-time without hammering

export function SyncProvider({
  children,
  onServerDonations,
}: {
  children: React.ReactNode;
  onServerDonations?: (donations: object[]) => void;
}) {
  const [connected, setConnected] = useState(false);
  const [lastSynced, setLastSynced] = useState<number | null>(null);
  const [serverDonations, setServerDonations] = useState<object[] | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const pollTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastUpdatedRef = useRef<number>(0);
  const mountedRef = useRef(true);
  const onServerDonationsRef = useRef(onServerDonations);
  onServerDonationsRef.current = onServerDonations;

  const poll = useCallback(async () => {
    if (!mountedRef.current) return;
    try {
      const res = await fetch(getRestUrl("/sync/donations"), {
        headers: { "Cache-Control": "no-cache" },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const { donations, lastUpdated } = await res.json();

      if (!mountedRef.current) return;

      // Only apply update if server has newer data than last known state
      if (lastUpdated > lastUpdatedRef.current && Array.isArray(donations) && donations.length > 0) {
        lastUpdatedRef.current = lastUpdated;
        setServerDonations(donations);
        setLastSynced(lastUpdated);
        onServerDonationsRef.current?.(donations);
      }
      setConnected(true);
      setSyncError(null);
    } catch {
      if (mountedRef.current) {
        setConnected(false);
        setSyncError("Sync server unreachable — working offline");
      }
    }
  }, []);

  const startPolling = useCallback(() => {
    if (pollTimer.current) clearInterval(pollTimer.current);
    poll(); // immediate fetch on start
    pollTimer.current = setInterval(poll, POLL_INTERVAL);
  }, [poll]);

  useEffect(() => {
    mountedRef.current = true;
    startPolling();

    // Resume polling when app comes to foreground
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") startPolling();
      else if (state === "background" || state === "inactive") {
        if (pollTimer.current) clearInterval(pollTimer.current);
      }
    });

    return () => {
      mountedRef.current = false;
      sub.remove();
      if (pollTimer.current) clearInterval(pollTimer.current);
    };
  }, [startPolling]);

  const pushDonations = useCallback(async (donations: object[]) => {
    try {
      const res = await fetch(getRestUrl("/sync/donations"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ donations }),
      });
      if (res.ok) {
        const { lastUpdated } = await res.json();
        lastUpdatedRef.current = lastUpdated;
        setLastSynced(lastUpdated);
        setConnected(true);
        setSyncError(null);
      }
    } catch {
      // Silently fail — local data is preserved in AsyncStorage
    }
  }, []);

  return (
    <SyncContext.Provider value={{ connected, lastSynced, pushDonations, serverDonations, syncError }}>
      {children}
    </SyncContext.Provider>
  );
}

export function useSync() {
  return useContext(SyncContext);
}
