import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { requestWidgetUpdateById } from 'react-native-android-widget';
import { VICE_CATEGORIES } from '../../constants/vices';
import { COLORS } from '../../constants';
import {
  getCompassCache,
  getWidgetConfig,
  setCompassCache,
  setWidgetConfig,
} from '../../widgets/storage';
import { CompassWidget } from '../../widgets/CompassWidget';
import { QuickViceWidget } from '../../widgets/QuickViceWidget';
import { fetchCompassData } from '../../widgets/data';
import type { ViceId } from '../../types';

export default function WidgetSetupScreen() {
  const params = useLocalSearchParams<{ name: string; widgetId: string }>();
  const router = useRouter();
  const widgetName = params.name ?? 'Compass';
  const widgetId = Number(params.widgetId ?? 0);
  const [saving, setSaving] = useState<ViceId | null>(null);

  const isCompass = widgetName === 'Compass';

  async function pickVice(viceId: ViceId) {
    if (saving || !widgetId) return;
    setSaving(viceId);

    await setWidgetConfig(widgetName, widgetId, { viceId });

    try {
      if (isCompass) {
        const fresh = await fetchCompassData(viceId).catch(() => null);
        if (fresh) await setCompassCache(widgetId, fresh);
        const cache = await getCompassCache(widgetId);
        const cfg = await getWidgetConfig(widgetName, widgetId);
        await requestWidgetUpdateById({
          widgetName: 'Compass',
          widgetId,
          renderWidget: () => (
            <CompassWidget widgetId={widgetId} config={cfg} cache={cache} />
          ),
        });
      } else {
        const cfg = await getWidgetConfig(widgetName, widgetId);
        await requestWidgetUpdateById({
          widgetName: 'QuickVice',
          widgetId,
          renderWidget: () => (
            <QuickViceWidget widgetId={widgetId} config={cfg} />
          ),
        });
      }
    } catch (err) {
      console.warn('[widget-setup] refresh failed', err);
    }

    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)');
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.kicker}>
          {isCompass ? 'COMPASS WIDGET' : 'QUICK VICE WIDGET'}
        </Text>
        <Text style={styles.heading}>Choose a vice</Text>
        <Text style={styles.sub}>
          {isCompass
            ? 'Your compass widget will point at the nearest place for this vice.'
            : 'Tap the widget to open the app directly at this vice.'}
        </Text>
        <View style={styles.grid}>
          {VICE_CATEGORIES.map((v) => {
            const active = saving === v.id;
            return (
              <Pressable
                key={v.id}
                style={[styles.tile, active && styles.tileActive]}
                onPress={() => pickVice(v.id)}
                disabled={saving !== null}
              >
                <MaterialCommunityIcons
                  name={v.icon as any}
                  size={28}
                  color={COLORS.gold}
                />
                <Text style={styles.tileLabel}>{v.label}</Text>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  container: { padding: 20, paddingBottom: 60 },
  kicker: {
    color: COLORS.gold,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 2,
    marginTop: 8,
  },
  heading: {
    color: COLORS.fg,
    fontSize: 28,
    fontWeight: '700',
    marginTop: 6,
  },
  sub: { color: COLORS.muted70, fontSize: 14, marginTop: 8, marginBottom: 24 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  tile: {
    width: '31%',
    aspectRatio: 1,
    backgroundColor: COLORS.card,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  tileActive: { borderColor: COLORS.gold },
  tileLabel: {
    color: COLORS.fg,
    fontSize: 12,
    marginTop: 6,
    textAlign: 'center',
  },
});
