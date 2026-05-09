// Tilt compensation: without this, heading drifts badly when the phone is
// off-flat. Pitch + roll come from accelerometer, then we project the magnetic
// vector back onto the horizontal plane.
export function tiltCompensatedHeading(
  mag: { x: number; y: number; z: number },
  accel: { x: number; y: number; z: number },
): number {
  const norm = Math.sqrt(accel.x ** 2 + accel.y ** 2 + accel.z ** 2);
  if (norm === 0) return 0;

  const ax = accel.x / norm;
  const ay = accel.y / norm;
  const az = accel.z / norm;

  const pitch = Math.asin(-ax);
  const roll = Math.atan2(ay, az);

  const Xh = mag.x * Math.cos(pitch) + mag.z * Math.sin(pitch);
  const Yh =
    mag.x * Math.sin(roll) * Math.sin(pitch) +
    mag.y * Math.cos(roll) -
    mag.z * Math.sin(roll) * Math.cos(pitch);

  // Convention: heading 0 = top-of-phone (+Y axis) points to magnetic north.
  // For this we want atan2(-Xh, Yh): when Yh>0 and Xh≈0 (phone Y aligned
  // with field), the result is 0; rotating clockwise (top→E) makes Xh
  // negative, giving heading +90. Verified against on-device readings where
  // mag.y ≈ +24 when top→N and mag.x ≈ -25 when top→E on Android.
  let heading = Math.atan2(-Xh, Yh) * (180 / Math.PI);
  heading = ((heading % 360) + 360) % 360;
  return heading;
}

// Complementary filter. alpha=0.98 means: trust gyro 98% (responsive to fast
// physical spins), let magnetometer correct 2% per frame (cancels gyro drift).
// One instance per mounted compass — keep it alive across sensor ticks via useRef.
export class CompassFilter {
  private heading = 0;
  private lastTs: number | null = null;
  private readonly alpha: number;

  constructor(alpha = 0.98) {
    this.alpha = alpha;
  }

  update(gyroZ: number, magHeading: number, timestamp: number): number {
    if (this.lastTs === null) {
      this.heading = magHeading;
      this.lastTs = timestamp;
      return this.heading;
    }

    const dt = (timestamp - this.lastTs) / 1000;
    this.lastTs = timestamp;

    const gyroPrediction = this.heading + gyroZ * (180 / Math.PI) * dt;

    let diff = magHeading - gyroPrediction;
    while (diff > 180) diff -= 360;
    while (diff < -180) diff += 360;

    this.heading = gyroPrediction + (1 - this.alpha) * diff;
    this.heading = ((this.heading % 360) + 360) % 360;
    return this.heading;
  }

  reset() {
    this.lastTs = null;
    this.heading = 0;
  }
}
