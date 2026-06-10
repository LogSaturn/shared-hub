import * as React from 'react';
import type { WidgetTaskHandlerProps } from 'react-native-android-widget';
import { CompassWidget, REFRESH_ACTION } from './CompassWidget';
import { QuickViceWidget } from './QuickViceWidget';
import {
  deleteWidgetConfig,
  getCompassCache,
  getWidgetConfig,
  setCompassCache,
} from './storage';
import { fastRefreshHeading, fetchCompassData } from './data';

const COMPASS_TTL_MS = 5 * 60 * 1000;
// Cache is "warm enough" to skip the places API + GPS fix and just re-aim
// using last-known location + a fresh heading sample. Outside this window
// we do the full refresh to pick up any meaningful change in nearest place.
const FAST_PATH_TTL_MS = 90 * 1000;

export async function widgetTaskHandler(props: WidgetTaskHandlerProps): Promise<void> {
  const { widgetInfo, widgetAction, clickAction, renderWidget } = props;
  const { widgetName, widgetId } = widgetInfo;

  if (widgetAction === 'WIDGET_DELETED') {
    await deleteWidgetConfig(widgetName, widgetId);
    return;
  }

  // User tapped the dial → force-refresh the needle. We pick a path:
  //   Fast: cache is warm (< FAST_PATH_TTL_MS) AND has place coords → just
  //         re-aim from last-known location + fresh heading. ~200ms total.
  //   Slow: cache is cold or missing place coords → full GPS + places fetch.
  if (widgetAction === 'WIDGET_CLICK' && clickAction === REFRESH_ACTION) {
    const tapAt = Date.now();
    const config = await getWidgetConfig('Compass', widgetId);
    if (!config) {
      renderWidget(<CompassWidget widgetId={widgetId} config={null} cache={null} />);
      return;
    }
    let cache = await getCompassCache(widgetId);
    const canFastPath =
      cache != null &&
      typeof cache.placeLat === 'number' &&
      typeof cache.placeLng === 'number' &&
      Date.now() - cache.updatedAt < FAST_PATH_TTL_MS;

    console.log('[widget] REFRESH_COMPASS tap', {
      widgetId,
      path: canFastPath ? 'fast' : 'full',
    });

    if (canFastPath && cache) {
      const next = await fastRefreshHeading(cache).catch((err) => {
        console.warn('[widget] fast refresh failed, falling back', err);
        return null;
      });
      if (next) {
        await setCompassCache(widgetId, next);
        cache = next;
      } else if (cache) {
        cache = { ...cache, updatedAt: Date.now() };
        await setCompassCache(widgetId, cache);
      }
    } else {
      const fresh = await fetchCompassData(config.viceId).catch((err) => {
        console.warn('[widget] fetchCompassData failed during refresh', err);
        return null;
      });
      if (fresh) {
        await setCompassCache(widgetId, fresh);
        cache = fresh;
      } else if (cache) {
        cache = { ...cache, updatedAt: Date.now() };
        await setCompassCache(widgetId, cache);
      }
    }

    console.log('[widget] rendered in', Date.now() - tapAt, 'ms', {
      widgetId,
      bearing: cache?.bearing != null ? Math.round(cache.bearing) : null,
      heading: cache?.phoneHeading != null ? Math.round(cache.phoneHeading) : null,
      needle:
        cache?.bearing != null && cache?.phoneHeading != null
          ? Math.round(cache.bearing - cache.phoneHeading)
          : null,
    });
    renderWidget(<CompassWidget widgetId={widgetId} config={config} cache={cache} />);
    return;
  }

  const config = await getWidgetConfig(widgetName, widgetId);

  if (widgetName === 'QuickVice') {
    renderWidget(<QuickViceWidget widgetId={widgetId} config={config} />);
    return;
  }

  if (widgetName === 'Compass') {
    let cache = await getCompassCache(widgetId);

    if (config && widgetAction !== 'WIDGET_RESIZED') {
      const stale = !cache || Date.now() - cache.updatedAt > COMPASS_TTL_MS;
      if (stale) {
        try {
          const fresh = await fetchCompassData(config.viceId);
          if (fresh) {
            await setCompassCache(widgetId, fresh);
            cache = fresh;
          }
        } catch {
          // network/location failure — keep stale cache, widget shows last known
        }
      }
    }

    renderWidget(<CompassWidget widgetId={widgetId} config={config} cache={cache} />);
    return;
  }
}
