import { Text, TextStyle } from 'react-native';
import { COLORS, TYPOGRAPHY } from '../../constants/colors';

interface Props {
  children: string;
  size?: number;
  tracking?: number;
  color?: string;
  style?: TextStyle;
}

export function Label({
  children,
  size = 11,
  tracking = TYPOGRAPHY.trackingWide,
  color = COLORS.muted55,
  style,
}: Props) {
  return (
    <Text
      style={[
        {
          color,
          fontSize: size,
          letterSpacing: tracking,
          fontFamily: TYPOGRAPHY.fontFamilyMedium,
          textTransform: 'uppercase',
        },
        style,
      ]}
    >
      {children}
    </Text>
  );
}
