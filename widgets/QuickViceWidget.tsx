import * as React from 'react';
import { FlexWidget, TextWidget } from 'react-native-android-widget';
import { viceEmoji } from './vice-emoji';
import type { WidgetConfig } from './storage';

interface Props {
  widgetId: number;
  config: WidgetConfig | null;
}

const BG = '#1c1713';
const ACCENT = '#d4a574';
const RING = '#3a342e';

const SETUP_URI = (id: number) => `vice://widget-setup/QuickVice?widgetId=${id}`;
const OPEN_URI = (viceId: string, widgetId: number) =>
  `vice://vice/${viceId}?widgetId=${widgetId}&source=quick`;

export function QuickViceWidget({ widgetId, config }: Props) {
  if (!config) {
    return (
      <FlexWidget
        clickAction="OPEN_URI"
        clickActionData={{ uri: SETUP_URI(widgetId) }}
        style={{
          width: 'match_parent',
          height: 'match_parent',
          backgroundColor: BG,
          borderRadius: 999,
          alignItems: 'center',
          justifyContent: 'center',
          borderWidth: 2,
          borderColor: RING,
        }}
      >
        <TextWidget
          text="+"
          style={{ color: ACCENT, fontSize: 28, fontWeight: 'bold' }}
        />
      </FlexWidget>
    );
  }

  return (
    <FlexWidget
      clickAction="OPEN_URI"
      clickActionData={{ uri: OPEN_URI(config.viceId, widgetId) }}
      style={{
        width: 'match_parent',
        height: 'match_parent',
        backgroundColor: BG,
        borderRadius: 999,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <TextWidget
        text={viceEmoji(config.viceId)}
        style={{ fontSize: 30 }}
      />
    </FlexWidget>
  );
}
