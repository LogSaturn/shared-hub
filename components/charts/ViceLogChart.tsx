import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, LayoutChangeEvent } from 'react-native';
import Svg, {
  Path,
  Circle,
  Line,
  Text as SvgText,
  Defs,
  LinearGradient,
  Stop,
} from 'react-native-svg';
import { COLORS, TYPOGRAPHY, SPACING } from '../../constants';
import type { ViceLog, TimeRange } from '../../lib/viceLogs';

const CHART_COLORS = [
  '#d9b370',
  '#7eb8f7',
  '#85e89d',
  '#f97583',
  '#b392f0',
  '#f6ad55',
  '#76e4f7',
];

const CHART_H = 180;
const PAD = { top: 20, right: 16, bottom: 40, left: 38 };
const GRID_LINES = 4;

// ─── bucket helpers ───────────────────────────────────────────────────────────

type Bucket = { label: string; key: string };

function getBuckets(range: TimeRange, logs: ViceLog[]): Bucket[] {
  const now = new Date();
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  if (range === 'wtd') {
    const sunday = new Date(now);
    sunday.setDate(now.getDate() - now.getDay());
    sunday.setHours(0, 0, 0, 0);
    const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return DAY_NAMES.map((label, i) => {
      const d = new Date(sunday);
      d.setDate(sunday.getDate() + i);
      return { label, key: d.toISOString().slice(0, 10) };
    });
  }

  if (range === 'mtd') {
    const y = now.getFullYear();
    const m = now.getMonth();
    const days = new Date(y, m + 1, 0).getDate();
    return Array.from({ length: days }, (_, i) => {
      const d = new Date(y, m, i + 1);
      return { label: String(i + 1), key: d.toISOString().slice(0, 10) };
    });
  }

  if (range === 'ytd') {
    const y = now.getFullYear();
    return Array.from({ length: now.getMonth() + 1 }, (_, m) => ({
      label: MONTHS[m],
      key: `${y}-${String(m + 1).padStart(2, '0')}`,
    }));
  }

  // 'all' — months from earliest log to today
  if (logs.length === 0) return [];
  const first = new Date(logs[0].logged_at);
  const start = new Date(first.getFullYear(), first.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth(), 1);
  const buckets: Bucket[] = [];
  const cur = new Date(start);
  while (cur <= end) {
    const y = cur.getFullYear();
    const m = cur.getMonth();
    const yearSuffix = y !== now.getFullYear() ? ` '${String(y).slice(2)}` : '';
    buckets.push({ label: `${MONTHS[m]}${yearSuffix}`, key: `${y}-${String(m + 1).padStart(2, '0')}` });
    cur.setMonth(cur.getMonth() + 1);
  }
  return buckets;
}

function logBucketKey(log: ViceLog, range: TimeRange): string {
  const d = new Date(log.logged_at);
  if (range === 'wtd' || range === 'mtd') return d.toISOString().slice(0, 10);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

// ─── series builder ───────────────────────────────────────────────────────────

type Series = {
  viceId: string;
  label: string;
  color: string;
  points: number[];
};

function buildSeries(logs: ViceLog[], buckets: Bucket[], range: TimeRange): Series[] {
  const byVice = new Map<string, { label: string; byBucket: Map<string, number> }>();

  for (const log of logs) {
    if (!byVice.has(log.vice_id)) {
      byVice.set(log.vice_id, { label: log.vice_label, byBucket: new Map() });
    }
    const key = logBucketKey(log, range);
    const entry = byVice.get(log.vice_id)!;
    entry.byBucket.set(key, (entry.byBucket.get(key) ?? 0) + log.quantity);
  }

  return Array.from(byVice.entries()).map(([viceId, { label, byBucket }], idx) => ({
    viceId,
    label,
    color: CHART_COLORS[idx % CHART_COLORS.length],
    points: buckets.map((b) => byBucket.get(b.key) ?? 0),
  }));
}

// ─── SVG path helpers ─────────────────────────────────────────────────────────

type Pt = { x: number; y: number };

function catmullRomPath(pts: Pt[]): string {
  if (pts.length === 0) return '';
  if (pts.length === 1) return `M ${pts[0].x} ${pts[0].y}`;

  const n = pts.length;
  let d = `M ${pts[0].x.toFixed(2)} ${pts[0].y.toFixed(2)}`;

  for (let i = 0; i < n - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[Math.min(n - 1, i + 2)];

    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;

    d += ` C ${cp1x.toFixed(2)} ${cp1y.toFixed(2)}, ${cp2x.toFixed(2)} ${cp2y.toFixed(2)}, ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`;
  }

  return d;
}

function areaPath(pts: Pt[], baseline: number): string {
  if (pts.length === 0) return '';
  const line = catmullRomPath(pts);
  const last = pts[pts.length - 1];
  const first = pts[0];
  return `${line} L ${last.x.toFixed(2)} ${baseline.toFixed(2)} L ${first.x.toFixed(2)} ${baseline.toFixed(2)} Z`;
}

// ─── label stride ─────────────────────────────────────────────────────────────

function labelStride(count: number): number {
  if (count <= 8) return 1;
  if (count <= 16) return 2;
  if (count <= 31) return 7;
  return Math.ceil(count / 6);
}

// ─── Chart component ──────────────────────────────────────────────────────────

interface Props {
  logs: ViceLog[];
  range: TimeRange;
}

export function ViceLogChart({ logs, range }: Props) {
  const [chartWidth, setChartWidth] = useState(0);

  const onLayout = (e: LayoutChangeEvent) => {
    setChartWidth(e.nativeEvent.layout.width);
  };

  const { buckets, series, maxVal, innerW, innerH, baseline } = useMemo(() => {
    const buckets = getBuckets(range, logs);
    const series = buildSeries(logs, buckets, range);
    const maxVal = Math.max(1, ...series.flatMap((s) => s.points));
    const innerW = Math.max(0, chartWidth - PAD.left - PAD.right);
    const innerH = CHART_H - PAD.top - PAD.bottom;
    const baseline = PAD.top + innerH;
    return { buckets, series, maxVal, innerW, innerH, baseline };
  }, [logs, range, chartWidth]);

  // Points for a series
  function seriesPoints(points: number[]): Pt[] {
    if (buckets.length === 0 || innerW === 0) return [];
    return points.map((val, i) => ({
      x: PAD.left + (buckets.length > 1 ? (i / (buckets.length - 1)) * innerW : innerW / 2),
      y: PAD.top + (1 - val / maxVal) * innerH,
    }));
  }

  const stride = labelStride(buckets.length);

  if (logs.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>No logs in this period</Text>
      </View>
    );
  }

  return (
    <View>
      <View onLayout={onLayout} style={styles.svgContainer}>
        {chartWidth > 0 && (
          <Svg width={chartWidth} height={CHART_H}>
            <Defs>
              {series.map((s) => (
                <LinearGradient key={s.viceId} id={`grad-${s.viceId}`} x1="0" y1="0" x2="0" y2="1">
                  <Stop offset="0%" stopColor={s.color} stopOpacity={0.28} />
                  <Stop offset="100%" stopColor={s.color} stopOpacity={0} />
                </LinearGradient>
              ))}
            </Defs>

            {/* Horizontal grid lines */}
            {Array.from({ length: GRID_LINES }, (_, i) => {
              const y = PAD.top + (i / (GRID_LINES - 1)) * innerH;
              const val = maxVal - (maxVal / (GRID_LINES - 1)) * i;
              return (
                <React.Fragment key={i}>
                  <Line
                    x1={PAD.left}
                    y1={y}
                    x2={PAD.left + innerW}
                    y2={y}
                    stroke="rgba(255,255,255,0.07)"
                    strokeWidth={1}
                  />
                  <SvgText
                    x={PAD.left - 6}
                    y={y + 4}
                    fontSize={9}
                    fill="rgba(245,235,220,0.4)"
                    textAnchor="end"
                    fontFamily={TYPOGRAPHY.fontFamily}
                  >
                    {Math.round(val)}
                  </SvgText>
                </React.Fragment>
              );
            })}

            {/* X-axis labels */}
            {buckets.map((b, i) => {
              if (i % stride !== 0 && i !== buckets.length - 1) return null;
              const x =
                PAD.left +
                (buckets.length > 1 ? (i / (buckets.length - 1)) * innerW : innerW / 2);
              return (
                <SvgText
                  key={b.key}
                  x={x}
                  y={baseline + 14}
                  fontSize={9}
                  fill="rgba(245,235,220,0.4)"
                  textAnchor="middle"
                  fontFamily={TYPOGRAPHY.fontFamily}
                >
                  {b.label}
                </SvgText>
              );
            })}

            {/* Area fills */}
            {series.map((s) => {
              const pts = seriesPoints(s.points);
              if (pts.length < 2) return null;
              return (
                <Path
                  key={`area-${s.viceId}`}
                  d={areaPath(pts, baseline)}
                  fill={`url(#grad-${s.viceId})`}
                />
              );
            })}

            {/* Lines */}
            {series.map((s) => {
              const pts = seriesPoints(s.points);
              if (pts.length < 2) return null;
              return (
                <Path
                  key={`line-${s.viceId}`}
                  d={catmullRomPath(pts)}
                  fill="none"
                  stroke={s.color}
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              );
            })}

            {/* Dots at data points */}
            {series.map((s) => {
              const pts = seriesPoints(s.points);
              return pts.map((pt, i) => {
                if (s.points[i] === 0) return null;
                return (
                  <Circle
                    key={`dot-${s.viceId}-${i}`}
                    cx={pt.x}
                    cy={pt.y}
                    r={3.5}
                    fill={s.color}
                    stroke={COLORS.bg}
                    strokeWidth={1.5}
                  />
                );
              });
            })}
          </Svg>
        )}
      </View>

      {/* Legend */}
      {series.length > 0 && (
        <View style={styles.legend}>
          {series.map((s) => (
            <View key={s.viceId} style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: s.color }]} />
              <Text style={styles.legendLabel} numberOfLines={1}>
                {s.label}
              </Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  svgContainer: {
    width: '100%',
    height: CHART_H,
  },
  empty: {
    height: 120,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    color: COLORS.muted40,
    fontFamily: TYPOGRAPHY.fontFamily,
    fontSize: 13,
  },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    paddingHorizontal: SPACING.xs,
    marginTop: SPACING.xs,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendLabel: {
    color: COLORS.muted55,
    fontFamily: TYPOGRAPHY.fontFamily,
    fontSize: 11,
  },
});
