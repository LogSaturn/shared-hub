import { Svg, Circle, Line, G } from 'react-native-svg';
import { COLORS } from '../../constants/colors';

interface Props {
  size?: number;
}

// Body of the compass dial: 72 ticks + outer ring + inner dashed ring.
// Cardinal labels are rendered separately by CompassRose so they can stay
// upright while this whole element rotates with device heading.
export function CompassDial({ size = 280 }: Props) {
  const cx = 100;
  const cy = 100;
  const tickOuter = 96;

  const ticks = [];
  for (let i = 0; i < 72; i++) {
    const angle = i * 5;
    const isMajor = i % 18 === 0;
    const isMid = !isMajor && i % 9 === 0;
    const length = isMajor ? 14 : isMid ? 8 : 4;
    const stroke = isMajor ? COLORS.gold : COLORS.muted18;
    const strokeWidth = isMajor ? 1.6 : 1;
    ticks.push(
      <Line
        key={`tick-${i}`}
        x1={cx}
        y1={cy - tickOuter}
        x2={cx}
        y2={cy - tickOuter + length}
        stroke={stroke}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        transform={`rotate(${angle} ${cx} ${cy})`}
      />,
    );
  }

  return (
    <Svg width={size} height={size} viewBox="0 0 200 200">
      <Circle
        cx={cx}
        cy={cy}
        r={tickOuter}
        stroke={COLORS.border06}
        strokeWidth={1}
        fill="none"
      />
      <Circle
        cx={cx}
        cy={cy}
        r={tickOuter - 28}
        stroke={COLORS.border04}
        strokeWidth={1}
        strokeDasharray="2 4"
        fill="none"
      />
      <G>{ticks}</G>
    </Svg>
  );
}
