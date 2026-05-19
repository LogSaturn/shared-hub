import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  SharedValue,
  useAnimatedStyle,
} from 'react-native-reanimated';
import { CompassDial } from './CompassDial';
import { ViceNeedle, NeedleVariant } from './ViceNeedle';
import { COLORS, TYPOGRAPHY } from '../../constants/colors';

interface Props {
  size?: number;
  needleRotation: SharedValue<number>;
  // Accumulated dial rotation in degrees. Pass useCompass(...).dialRotation.
  // The dial visually rotates by this value; cardinal letters are translated
  // along the same arc but kept upright so the user can always read them.
  dialRotation: SharedValue<number>;
  variant?: NeedleVariant;
  accent?: string;
}

const LABELS: { text: string; bearing: number }[] = [
  { text: 'N', bearing: 0 },
  { text: 'E', bearing: 90 },
  { text: 'S', bearing: 180 },
  { text: 'W', bearing: 270 },
];

const LABEL_BOX = 26;

export function CompassRose({
  size = 280,
  needleRotation,
  dialRotation,
  variant = 'subtle',
  accent,
}: Props) {
  // Place the labels just inside the gold cardinal ticks. The dial SVG uses
  // a 200-unit viewBox where tick outer = 96 and major-tick length = 14, so
  // the inner edge of a tick sits at radius (96 - 14) = 82 in viewBox units.
  // Labels go a touch further inward.
  const labelRadius = (size / 2) * (74 / 100);

  const dialStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${dialRotation.value}deg` }],
  }));
  const needleStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${needleRotation.value}deg` }],
  }));

  return (
    <View style={{ width: size, height: size }}>
      <Animated.View style={[StyleSheet.absoluteFill, dialStyle]}>
        <CompassDial size={size} />
      </Animated.View>

      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        {LABELS.map((l) => (
          <CardinalLabel
            key={l.text}
            text={l.text}
            bearing={l.bearing}
            radius={labelRadius}
            containerSize={size}
            dialRotation={dialRotation}
          />
        ))}
      </View>

      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          { alignItems: 'center', justifyContent: 'center' },
          needleStyle,
        ]}
      >
        <ViceNeedle size={size * 0.68} variant={variant} accent={accent} />
      </Animated.View>
    </View>
  );
}

function CardinalLabel({
  text,
  bearing,
  radius,
  containerSize,
  dialRotation,
}: {
  text: string;
  bearing: number;
  radius: number;
  containerSize: number;
  dialRotation: SharedValue<number>;
}) {
  // Position angle (CW from screen-up) = bearing + dialRotation, since
  // dialRotation = -heading and the world-bearing of this label is `bearing`.
  const animStyle = useAnimatedStyle(() => {
    const rad = ((bearing + dialRotation.value) * Math.PI) / 180;
    return {
      transform: [
        { translateX: radius * Math.sin(rad) },
        { translateY: -radius * Math.cos(rad) },
      ],
    };
  });

  // Center the label box at the dial's geometric center; the animated
  // translate then offsets it along the world-bearing arc.
  const baseLeft = containerSize / 2 - LABEL_BOX / 2;
  const baseTop = containerSize / 2 - LABEL_BOX / 2;

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          left: baseLeft,
          top: baseTop,
          width: LABEL_BOX,
          height: LABEL_BOX,
          alignItems: 'center',
          justifyContent: 'center',
        },
        animStyle,
      ]}
    >
      <Text style={styles.labelText}>{text}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  labelText: {
    color: COLORS.muted35,
    fontFamily: TYPOGRAPHY.fontFamilySemiBold,
    fontSize: 14,
    letterSpacing: 1.6,
  },
});
