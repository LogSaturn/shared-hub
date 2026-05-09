import {
  bearingBetween,
  bearingToCardinal,
  distanceBetween,
  formatDistance,
  shortestAngle,
} from '../bearing';

const NYC = { lat: 40.7128, lng: -74.006 };
const LA = { lat: 34.0522, lng: -118.2437 };
const LONDON = { lat: 51.5074, lng: -0.1278 };
const NORTH_OF_NYC = { lat: 41.7128, lng: -74.006 };
const EAST_OF_NYC = { lat: 40.7128, lng: -73.006 };

describe('bearingBetween', () => {
  test('returns 0 for due north', () => {
    expect(bearingBetween(NYC.lat, NYC.lng, NORTH_OF_NYC.lat, NORTH_OF_NYC.lng)).toBeCloseTo(0, 1);
  });

  test('returns ~90 for due east', () => {
    expect(bearingBetween(NYC.lat, NYC.lng, EAST_OF_NYC.lat, EAST_OF_NYC.lng)).toBeCloseTo(90, 0);
  });

  test('returns value in [0, 360)', () => {
    const b = bearingBetween(NYC.lat, NYC.lng, LA.lat, LA.lng);
    expect(b).toBeGreaterThanOrEqual(0);
    expect(b).toBeLessThan(360);
  });

  test('NYC -> LA bearing is roughly west-southwest', () => {
    const b = bearingBetween(NYC.lat, NYC.lng, LA.lat, LA.lng);
    expect(b).toBeGreaterThan(255);
    expect(b).toBeLessThan(285);
  });

  test('NYC -> London bearing is roughly northeast', () => {
    const b = bearingBetween(NYC.lat, NYC.lng, LONDON.lat, LONDON.lng);
    expect(b).toBeGreaterThan(40);
    expect(b).toBeLessThan(75);
  });

  test('identical points return 0', () => {
    expect(bearingBetween(NYC.lat, NYC.lng, NYC.lat, NYC.lng)).toBe(0);
  });
});

describe('distanceBetween', () => {
  test('identical points return 0', () => {
    expect(distanceBetween(NYC.lat, NYC.lng, NYC.lat, NYC.lng)).toBeCloseTo(0, 5);
  });

  test('NYC -> LA is roughly 3940km', () => {
    const d = distanceBetween(NYC.lat, NYC.lng, LA.lat, LA.lng);
    expect(d).toBeGreaterThan(3_900_000);
    expect(d).toBeLessThan(3_990_000);
  });

  test('1 degree latitude is roughly 111km', () => {
    const d = distanceBetween(0, 0, 1, 0);
    expect(d).toBeGreaterThan(110_000);
    expect(d).toBeLessThan(112_000);
  });

  test('symmetric: d(a,b) === d(b,a)', () => {
    const ab = distanceBetween(NYC.lat, NYC.lng, LA.lat, LA.lng);
    const ba = distanceBetween(LA.lat, LA.lng, NYC.lat, NYC.lng);
    expect(ab).toBeCloseTo(ba, 3);
  });
});

describe('shortestAngle', () => {
  test('no wraparound: 10 -> 20 returns 20', () => {
    expect(shortestAngle(10, 20)).toBe(20);
  });

  test('CW wraparound: 350 -> 10 chooses short way (+20)', () => {
    expect(shortestAngle(350, 10)).toBe(370);
  });

  test('CCW wraparound: 10 -> 350 chooses short way (-20)', () => {
    expect(shortestAngle(10, 350)).toBe(-10);
  });

  test('preserves accumulated rotation across many turns', () => {
    let angle = 0;
    for (let i = 0; i < 5; i++) angle = shortestAngle(angle, (angle + 90) % 360);
    expect(angle).toBe(450);
  });

  test('exactly 180 picks the +180 direction (deterministic edge)', () => {
    expect(shortestAngle(0, 180)).toBe(180);
  });

  test('zero delta is a no-op', () => {
    expect(shortestAngle(123.456, 123.456)).toBeCloseTo(123.456, 6);
  });

  test('negative current angles still work', () => {
    expect(shortestAngle(-350, 10)).toBe(-350 + 0);
  });
});

describe('bearingToCardinal', () => {
  test.each([
    [0, 'N'],
    [22.5, 'NE'],
    [45, 'NE'],
    [90, 'E'],
    [135, 'SE'],
    [180, 'S'],
    [225, 'SW'],
    [270, 'W'],
    [315, 'NW'],
    [359.9, 'N'],
    [360, 'N'],
    [-1, 'N'],
    [720, 'N'],
  ])('%s° -> %s', (deg, expected) => {
    expect(bearingToCardinal(deg)).toBe(expected);
  });
});

describe('formatDistance', () => {
  test('miles default', () => {
    expect(formatDistance(1609.34, 'mi')).toBe('1.00 mi');
  });

  test('km mode', () => {
    expect(formatDistance(1000, 'km')).toBe('1.00 km');
  });

  test('rounds to two decimals', () => {
    expect(formatDistance(1234, 'km')).toBe('1.23 km');
  });

  test('zero distance', () => {
    expect(formatDistance(0, 'mi')).toBe('0.00 mi');
    expect(formatDistance(0, 'km')).toBe('0.00 km');
  });
});
