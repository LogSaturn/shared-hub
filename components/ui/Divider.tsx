import { View, ViewStyle } from 'react-native';
import { COLORS } from '../../constants/colors';

interface Props {
  color?: string;
  style?: ViewStyle;
}

export function Divider({ color = COLORS.border06, style }: Props) {
  return <View style={[{ height: 1, backgroundColor: color }, style]} />;
}
