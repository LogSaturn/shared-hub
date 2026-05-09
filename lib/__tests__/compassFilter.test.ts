import { CompassFilter, tiltCompensatedHeading } from '../compassFilter';

const FLAT = { x: 0, y: 0, z: 1 };
const FACE_UP = { x: 0, y: 0, z: 1 };

describe('tiltCompensatedHeading', () => {
  test('phone flat, mag pointing +Y -> heading 0 (north)', () => {
    const h = tiltCompensatedHeading({ x: 0, y: 24, z: 0 }, FLAT);
    expect(h).toBeCloseTo(0, 1);
  });

  test('phone flat, mag pointing -X -> heading 90 (east)', () => {
    const h = tiltCompensatedHeading({ x: -25, y: 0, z: 0 }, FLAT);
    expect(h).toBeCloseTo(90, 1);
  });

  test('phone flat, mag pointing -Y -> heading 180 (south)', () => {
    const h = tiltCompensatedHeading({ x: 0, y: -24, z: 0 }, FLAT);
    expect(h).toBeCloseTo(180, 1);
  });

  test('phone flat, mag pointing +X -> heading 270 (west)', () => {
    const h = tiltCompensatedHeading({ x: 25, y: 0, z: 0 }, FLAT);
    expect(h).toBeCloseTo(270, 1);
  });

  test('returns 0 for zero accel (degenerate)', () => {
    const h = tiltCompensatedHeading({ x: 1, y: 0, z: 0 }, { x: 0, y: 0, z: 0 });
    expect(h).toBe(0);
  });

  test('always returns value in [0, 360)', () => {
    for (const ax of [-1, 0, 1]) {
      for (const ay of [-1, 0, 1]) {
        const h = tiltCompensatedHeading({ x: 1, y: 1, z: 0 }, { x: ax, y: ay, z: 1 });
        expect(h).toBeGreaterThanOrEqual(0);
        expect(h).toBeLessThan(360);
      }
    }
  });

  test('tilt does not break heading sign convention', () => {
    // Tilt the phone slightly forward (pitch). Heading toward +Y should still
    // be near 0 once the projection corrects.
    const tilted = { x: 0, y: -0.2, z: 0.98 }; // slight pitch
    const h = tiltCompensatedHeading({ x: 0, y: 24, z: 0 }, tilted);
    expect(Math.abs(h - 0) < 5 || Math.abs(h - 360) < 5).toBe(true);
  });
});

describe('CompassFilter', () => {
  test('first update seeds heading from magnetometer', () => {
    const f = new CompassFilter(0.98);
    expect(f.update(0, 123.4, 1000)).toBeCloseTo(123.4, 6);
  });

  test('alpha=1.0 ignores magnetometer entirely', () => {
    const f = new CompassFilter(1.0);
    f.update(0, 100, 1000);
    // Pure gyro path: 1 rad/s for 100ms = 5.7296 degrees added.
    // (Stay inside the 100ms dt clamp so the assertion is exact.)
    const result = f.update(1, 999, 1100);
    expect(result).toBeCloseTo(100 + (180 / Math.PI) * 0.1, 3);
  });

  test('alpha=0 uses magnetometer only', () => {
    const f = new CompassFilter(0);
    f.update(0, 100, 1000);
    const result = f.update(0, 200, 2000);
    expect(result).toBeCloseTo(200, 3);
  });

  test('output is normalized to [0, 360)', () => {
    const f = new CompassFilter(0.5);
    f.update(0, 350, 1000);
    const r = f.update(2, 10, 2000); // gyro pushes past 360
    expect(r).toBeGreaterThanOrEqual(0);
    expect(r).toBeLessThan(360);
  });

  test('handles 359 -> 1 wraparound without flipping', () => {
    const f = new CompassFilter(0.5);
    f.update(0, 359, 1000);
    const r = f.update(0, 1, 2000); // mag wraps; combined should be ~0
    // Without proper wrap handling we'd average to ~180
    expect(r > 350 || r < 10).toBe(true);
  });

  test('reset clears state', () => {
    const f = new CompassFilter(0.98);
    f.update(0, 90, 1000);
    f.update(0, 95, 2000);
    f.reset();
    expect(f.update(0, 270, 3000)).toBeCloseTo(270, 6);
  });

  test('clamps dt to 100ms so JS-thread stalls do not integrate huge gyro deltas', () => {
    const f = new CompassFilter(1.0); // pure gyro path so the clamp is observable
    f.update(0, 0, 1000);
    // Pretend 5 seconds elapsed during a stall while gyro reports 1 rad/s.
    // Without a clamp, prediction would be 0 + 1*(180/π)*5 ≈ 286.5°.
    // With a 100ms clamp, prediction is 0 + 1*(180/π)*0.1 ≈ 5.73°.
    const r = f.update(1, 0, 6000);
    expect(r).toBeLessThan(10);
    expect(r).toBeGreaterThan(0);
  });
});
