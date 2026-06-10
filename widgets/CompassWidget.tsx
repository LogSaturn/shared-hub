import * as React from 'react';
import {
  FlexWidget,
  OverlapWidget,
  SvgWidget,
  TextWidget,
} from 'react-native-android-widget';
import { VICE_CATEGORIES } from '../constants/vices';
import { COLORS } from '../constants/colors';
import { bearingToCardinal, formatDistance } from '../lib/bearing';
import { dialFaceSvg, dialLabelsSvg, needleSvg } from './compass-svg';
import type { CompassCache, WidgetConfig } from './storage';

interface Props {
  widgetId: number;
  config: WidgetConfig | null;
  cache: CompassCache | null;
}

const BG = COLORS.card; // #17181b
const RING = '#241f1b';
const BTN_BG = '#0e0f11'; // matches COLORS.bg — a touch darker than the card
const FG = COLORS.fg;
const MUTED = '#94897e';
const KICKER = COLORS.gold;

export const REFRESH_ACTION = 'REFRESH_COMPASS';

const SETUP_URI = (id: number) => `vice://widget-setup/Compass?widgetId=${id}`;
const OPEN_URI = (viceId: string, widgetId: number) =>
  `vice://vice/${viceId}?widgetId=${widgetId}&source=compass`;

// Google Maps universal nav URL — opens the Maps app if installed, falls
// back to the web client otherwise.
const NAV_URI = (lat: number, lng: number) =>
  `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=walking`;

const DIAL_FACE_SVG = dialFaceSvg();
const NEEDLE_SVG = needleSvg();

export function CompassWidget({ widgetId, config, cache }: Props) {
  if (!config) {
    return (
      <FlexWidget
        clickAction="OPEN_URI"
        clickActionData={{ uri: SETUP_URI(widgetId) }}
        style={{
          width: 'match_parent',
          height: 'match_parent',
          backgroundColor: BG,
          borderRadius: 18,
          padding: 16,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          borderWidth: 1,
          borderColor: RING,
        }}
      >
        <TextWidget
          text="Tap to choose a vice"
          style={{ color: FG, fontSize: 14, fontWeight: '600' }}
        />
      </FlexWidget>
    );
  }

  const vice = VICE_CATEGORIES.find((v) => v.id === config.viceId);
  const label = (vice?.label ?? 'Vice').toUpperCase();
  const targetBearing = cache?.bearing ?? 0;
  const phoneHeading = cache?.phoneHeading ?? null;
  const dialRotation = phoneHeading !== null ? -phoneHeading : 0;
  const needleRotation =
    phoneHeading !== null ? targetBearing - phoneHeading : targetBearing;
  const labelsSvg = dialLabelsSvg(phoneHeading);
  const cardinal = cache ? bearingToCardinal(targetBearing) : '—';
  const distance = cache ? formatDistance(cache.distanceMeters, 'mi') : '—';
  const placeName = cache?.placeName ?? 'Searching nearby…';
  const ageMs = cache ? Date.now() - cache.updatedAt : null;
  const justRefreshed = ageMs !== null && ageMs < 5000;
  const bearingLabel = cache ? `${cardinal} ${Math.round(targetBearing)}°` : '—';

  const canNavigate =
    cache != null &&
    typeof cache.placeLat === 'number' &&
    typeof cache.placeLng === 'number';

  return (
    <FlexWidget
      style={{
        width: 'match_parent',
        height: 'match_parent',
        backgroundColor: BG,
        borderRadius: 18,
        borderWidth: 1,
        borderColor: RING,
        flexDirection: 'row',
      }}
    >
      {/* Left half — dial face + upright labels + needle. Tap = refresh. */}
      <FlexWidget
        clickAction={REFRESH_ACTION}
        clickActionData={{ widgetId }}
        accessibilityLabel="Refresh compass"
        style={{
          flex: 1,
          height: 'match_parent',
          padding: 6,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <OverlapWidget
          style={{ width: 'match_parent', height: 'match_parent' }}
        >
          <SvgWidget
            svg={DIAL_FACE_SVG}
            style={{
              width: 'match_parent',
              height: 'match_parent',
              rotation: Math.round(dialRotation),
            }}
          />
          {/* Labels render UNROTATED — their positions track world N/E/S/W
              via dialLabelsSvg(phoneHeading), so the letters stay upright. */}
          <SvgWidget
            svg={labelsSvg}
            style={{ width: 'match_parent', height: 'match_parent' }}
          />
          <SvgWidget
            svg={NEEDLE_SVG}
            style={{
              width: 'match_parent',
              height: 'match_parent',
              rotation: Math.round(needleRotation),
            }}
          />
        </OverlapWidget>
      </FlexWidget>

      {/* Right half — split vertically: info on top, Navigate on bottom. */}
      <FlexWidget
        style={{
          flex: 1,
          height: 'match_parent',
          flexDirection: 'column',
          paddingLeft: 6,
          paddingRight: 10,
          paddingVertical: 14,
        }}
      >
        {/* Upper region — info. Tap opens the app at this vice. */}
        <FlexWidget
          clickAction="OPEN_URI"
          clickActionData={{ uri: OPEN_URI(config.viceId, widgetId) }}
          accessibilityLabel={`Open ${label} in Vices`}
          style={{
            flex: 1,
            flexDirection: 'column',
            justifyContent: 'center',
          }}
        >
          <TextWidget
            text={label}
            maxLines={1}
            truncate="END"
            style={{
              color: KICKER,
              fontSize: 11,
              fontWeight: 'bold',
              letterSpacing: 2,
            }}
          />
          <TextWidget
            text={placeName}
            maxLines={1}
            truncate="END"
            style={{
              color: FG,
              fontSize: 15,
              fontWeight: '600',
              marginTop: 3,
            }}
          />
          <TextWidget
            text={`${bearingLabel}  ·  ${distance}`}
            maxLines={1}
            style={{
              color: justRefreshed ? KICKER : MUTED,
              fontSize: 12,
              marginTop: 3,
              letterSpacing: 0.4,
            }}
          />
        </FlexWidget>

        {/* Lower region — Navigate button. Tap opens Google Maps nav. */}
        <FlexWidget
          clickAction={canNavigate ? 'OPEN_URI' : undefined}
          clickActionData={
            canNavigate && cache
              ? { uri: NAV_URI(cache.placeLat, cache.placeLng) }
              : undefined
          }
          accessibilityLabel="Navigate with Google Maps"
          style={{
            backgroundColor: BTN_BG,
            borderRadius: 999,
            borderWidth: 1,
            borderColor: RING,
            paddingVertical: 7,
            paddingHorizontal: 10,
            alignItems: 'center',
            justifyContent: 'center',
            marginTop: 6,
          }}
        >
          <TextWidget
            text="↗  Navigate"
            maxLines={1}
            style={{
              color: KICKER,
              fontSize: 12,
              fontWeight: 'bold',
              letterSpacing: 1.5,
            }}
          />
        </FlexWidget>
      </FlexWidget>
    </FlexWidget>
  );
}
