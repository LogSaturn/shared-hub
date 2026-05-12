import '../global.css';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import * as Linking from 'expo-linking';
import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { exchangeCodeForSession } from '../lib/auth';
import { useSessionSync } from '../hooks/useSessionSync';

SplashScreen.preventAutoHideAsync().catch(() => {
  // already prevented or unavailable — ignore
});

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    // Vector-icons v15 lazy-loads. Under New Architecture in Expo Go the
    // icon font isn't auto-registered when an icon is first rendered, so
    // glyphs come out as tofu boxes. Preload it here explicitly.
    ...MaterialCommunityIcons.font,
  });

  useSessionSync();

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [fontsLoaded]);

  useEffect(() => {
    // Handle magic-link / OAuth callbacks: vice://auth/callback?code=...
    function handle(url: string | null) {
      if (!url) return;
      const parsed = Linking.parse(url);
      if (parsed.path !== 'auth/callback') return;
      exchangeCodeForSession(url).then((r) => {
        if (!r.ok) console.warn('[auth] exchange failed:', r.error);
      });
    }
    Linking.getInitialURL().then(handle);
    const sub = Linking.addEventListener('url', ({ url }) => handle(url));
    return () => sub.remove();
  }, []);

  if (!fontsLoaded) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <BottomSheetModalProvider>
          <StatusBar style="light" />
          <Stack screenOptions={{ headerShown: false, animation: 'fade' }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="loading" />
            <Stack.Screen name="compass" />
            <Stack.Screen name="favorites" />
            <Stack.Screen name="(auth)" />
          </Stack>
        </BottomSheetModalProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
