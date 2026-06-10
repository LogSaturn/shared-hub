import { Accelerometer, Magnetometer } from 'expo-sensors';
import { tiltCompensatedHeading } from '../lib/compassFilter';

interface Vec3 {
  x: number;
  y: number;
  z: number;
}

const SAMPLE_INTERVAL_MS = 40;
const SAMPLES_NEEDED = 4; // ~160ms of readings — long enough to stabilize past the first spurious sample
const TIMEOUT_MS = 1500;

// One-shot magnetometer+accelerometer read in the widget headless context.
// Returns a tilt-compensated heading (0–360, 0 = phone top points magnetic
// north) or null if the sensors don't deliver in time.
//
// Mirrors what useCompass does live in-app, but takes a single snapshot
// instead of running a complementary filter against the gyro. That's fine
// here because the widget only needs one stable reading per tap.
export async function getPhoneHeading(): Promise<number | null> {
  return new Promise((resolve) => {
    const magBuf: Vec3[] = [];
    const accelBuf: Vec3[] = [];
    let resolved = false;

    function finish(value: number | null) {
      if (resolved) return;
      resolved = true;
      magSub.remove();
      accelSub.remove();
      clearTimeout(timer);
      resolve(value);
    }

    function tryFinish() {
      if (magBuf.length < SAMPLES_NEEDED || accelBuf.length < SAMPLES_NEEDED) return;
      const mag = average(magBuf.slice(-SAMPLES_NEEDED));
      const accel = average(accelBuf.slice(-SAMPLES_NEEDED));
      try {
        const heading = tiltCompensatedHeading(mag, accel);
        finish(heading);
      } catch (err) {
        console.warn('[widget] tiltCompensatedHeading threw', err);
        finish(null);
      }
    }

    Magnetometer.setUpdateInterval(SAMPLE_INTERVAL_MS);
    Accelerometer.setUpdateInterval(SAMPLE_INTERVAL_MS);

    const magSub = Magnetometer.addListener((data) => {
      magBuf.push(data);
      tryFinish();
    });
    const accelSub = Accelerometer.addListener((data) => {
      accelBuf.push(data);
      tryFinish();
    });

    const timer = setTimeout(() => {
      console.warn('[widget] heading sensors timed out', {
        magSamples: magBuf.length,
        accelSamples: accelBuf.length,
      });
      finish(null);
    }, TIMEOUT_MS);
  });
}

function average(samples: Vec3[]): Vec3 {
  const sum = samples.reduce(
    (acc, s) => ({ x: acc.x + s.x, y: acc.y + s.y, z: acc.z + s.z }),
    { x: 0, y: 0, z: 0 },
  );
  const n = samples.length;
  return { x: sum.x / n, y: sum.y / n, z: sum.z / n };
}
