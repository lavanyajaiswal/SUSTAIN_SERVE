import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from "@expo-google-fonts/inter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import { AuthProvider } from "@/context/AuthContext";
import { Donation, DonationsProvider, useDonations } from "@/context/DonationsContext";
import { NotificationsProvider } from "@/context/NotificationsContext";
import { SyncProvider, useSync } from "@/context/SyncContext";
import { UsersProvider } from "@/context/UsersContext";

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

/**
 * SyncBridgeInner — uses both useDonations + useSync.
 * Lives inside both DonationsProvider and SyncProvider so both hooks work.
 */
function SyncBridgeInner({ children }: { children: React.ReactNode }) {
  const { mergeFromServer, setPushFn } = useDonations();
  const { pushDonations } = useSync();

  useEffect(() => {
    setPushFn((donations: Donation[]) => pushDonations(donations));
    return () => setPushFn(null);
  }, [pushDonations, setPushFn]);

  return <>{children}</>;
}

/**
 * SyncBridge — wraps children in SyncProvider (which establishes the WebSocket)
 * then renders SyncBridgeInner inside it so the bridge can use useSync.
 */
function SyncBridge({ children }: { children: React.ReactNode }) {
  const { mergeFromServer } = useDonations();

  return (
    <SyncProvider
      onServerDonations={(serverDonations) => {
        mergeFromServer(serverDonations as Donation[]);
      }}
    >
      <SyncBridgeInner>{children}</SyncBridgeInner>
    </SyncProvider>
  );
}

function RootLayoutNav() {
  return (
    <Stack screenOptions={{ headerShown: false, animation: "slide_from_right" }}>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="landing" options={{ headerShown: false, animation: "none" }} />
      <Stack.Screen name="auth/login" options={{ headerShown: false }} />
      <Stack.Screen name="auth/register" options={{ headerShown: false }} />
      <Stack.Screen name="dashboard/admin" options={{ headerShown: false }} />
      <Stack.Screen name="dashboard/donor" options={{ headerShown: false }} />
      <Stack.Screen name="dashboard/ngo" options={{ headerShown: false }} />
      <Stack.Screen name="dashboard/delivery" options={{ headerShown: false }} />
      <Stack.Screen name="donation/create" options={{ headerShown: false }} />
      <Stack.Screen name="donation/[id]" options={{ headerShown: false }} />
      <Stack.Screen name="notifications" options={{ headerShown: false, presentation: "modal" }} />
      <Stack.Screen name="profile" options={{ headerShown: false, presentation: "modal" }} />
      <Stack.Screen name="ai-chat" options={{ headerShown: false, presentation: "modal" }} />
      <Stack.Screen name="ai-suggest" options={{ headerShown: false, presentation: "modal" }} />
    </Stack>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <GestureHandlerRootView style={{ flex: 1 }}>
            <KeyboardProvider>
              <AuthProvider>
                <DonationsProvider>
                  <UsersProvider>
                    <NotificationsProvider>
                      <SyncBridge>
                        <RootLayoutNav />
                      </SyncBridge>
                    </NotificationsProvider>
                  </UsersProvider>
                </DonationsProvider>
              </AuthProvider>
            </KeyboardProvider>
          </GestureHandlerRootView>
        </QueryClientProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
