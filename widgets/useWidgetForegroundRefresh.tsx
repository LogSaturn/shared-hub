import * as React from 'react';
import { useEffect, useRef } from 'react';
import { AppState, type AppStateStatus, Platform } from 'react-native';
import { requestWidgetUpdate } from 'react-native-android-widget';
import { CompassWidget } from './CompassWidget';
import { QuickViceWidget } from './QuickViceWidget';
import { fetchCompassData } from './data';
import {
  getCompassCache,
  getWidgetConfig,
  setCompassCache,
} from './storage';

// Skip re-fetching compass widgets if we refreshed in the last THROTTLE_MS.
// Foreground events fire on every app resume; without this we'd hit the
// places-proxy on every quick app switch.
const THROTTLE_MS = 30 * 1000;

export function useWidgetForegroundRefresh() {
  const lastRefreshRef = useRef(0);

  useEffect(() => {
    if (Platform.OS !== 'android') return;

    let mounted = true;

    async function refreshCompassWidgets() {
      const now = Date.now();
      if (now - lastRefreshRef.current < THROTTLE_MS) return;
      lastRefreshRef.current = now;

      try {
        await requestWidgetUpdate({
          widgetName: 'Compass',
          renderWidget: async (info) => {
            if (!mounted) return <CompassWidget widgetId={info.widgetId} config={null} cache={null} />;
            const config = await getWidgetConfig('Compass', info.widgetId);
            let cache = await getCompassCache(info.widgetId);
            if (config) {
              const fresh = await fetchCompassData(config.viceId).catch(() => null);
              if (fresh) {
                await setCompassCache(info.widgetId, fresh);
                cache = fresh;
              }
            }
            return <CompassWidget widgetId={info.widgetId} config={config} cache={cache} />;
          },
          widgetNotFound: () => {},
        });
      } catch (err) {
        console.warn('[widget] foreground compass refresh failed', err);
      }
    }

    async function refreshQuickWidgets() {
      try {
        await requestWidgetUpdate({
          widgetName: 'QuickVice',
          renderWidget: async (info) => {
            const config = await getWidgetConfig('QuickVice', info.widgetId);
            return <QuickViceWidget widgetId={info.widgetId} config={config} />;
          },
          widgetNotFound: () => {},
        });
      } catch (err) {
        console.warn('[widget] foreground quick refresh failed', err);
      }
    }

    function onAppStateChange(state: AppStateStatus) {
      if (state === 'active') {
        void refreshCompassWidgets();
        void refreshQuickWidgets();
      }
    }

    // Fire once on mount to cover cold-start case.
    void refreshCompassWidgets();
    void refreshQuickWidgets();

    const sub = AppState.addEventListener('change', onAppStateChange);
    return () => {
      mounted = false;
      sub.remove();
    };
  }, []);
}
