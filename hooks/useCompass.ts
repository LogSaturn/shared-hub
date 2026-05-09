import { useEffect, useRef } from 'react';
import { useSharedValue, withSpring, SharedValue } from 'react-native-reanimated';
import { Magnetometer, Gyroscope, Accelerometer } from 'expo-sensors';
import { CompassFilter, tiltCompensatedHeading } from '../lib/compassFilter';
import { shortestAngle } from '../lib/bearing';
import {
  COMPASS_FILTER_ALPHA,
  NEEDLE_SPRING,
  SENSOR_INTERVAL_ACCEL_MS,
  SENSOR_INTERVAL_GYRO_MS,
  SENSOR_INTERVAL_MAG_MS,
} from '../constants/config';

export interface UseCompassResult {
  // Accumulated needle rotation in degrees (NOT clamped to 0-360).
  // Pass directly to CompassRose.
  needleRotation: SharedValue<number>;
  // Accumulated dial rotation = -heading. The dial rotates so that N always
  // points to magnetic north (and E to east, etc.) regardless of phone bearing.
  dialRotation: SharedValue<number>;
  // Current filtered device heading in degrees (0-360). Updated on every
  // gyro tick. Read via .current — not reactive.
  deviceHeadingRef: React.MutableRefObject<number>;
}

// targetBearing is the absolute bearing (0-360, 0=N) to the target place.
// The needle's display rotation = targetBearing - filteredDeviceHeading, so
// the apex points at the world-fixed target as the user rotates the phone.
// The dial's display rotation = -filteredDeviceHeading, so its tick at world-N
// always sits on the screen position of magnetic north.
export function useCompass(targetBearing: number): UseCompassResult {
  const needleRotation = useSharedValue(0);
  const dialRotation = useSharedValue(0);
  const filter = useRef(new CompassFilter(COMPASS_FILTER_ALPHA));
  const latestMag = useRef({ x: 0, y: 0, z: 0 });
  const latestAccel = useRef({ x: 0, y: 0, z: -1 });
  const deviceHeadingRef = useRef(0);
  const targetRef = useRef(targetBearing);

  useEffect(() => {
    targetRef.current = targetBearing;
  }, [targetBearing]);

  useEffect(() => {
    Magnetometer.setUpdateInterval(SENSOR_INTERVAL_MAG_MS);
    Gyroscope.setUpdateInterval(SENSOR_INTERVAL_GYRO_MS);
    Accelerometer.setUpdateInterval(SENSOR_INTERVAL_ACCEL_MS);

    const magSub = Magnetometer.addListener(({ x, y, z }) => {
      latestMag.current = { x, y, z };
    });

    const accelSub = Accelerometer.addListener(({ x, y, z }) => {
      latestAccel.current = { x, y, z };
    });

    const gyroSub = Gyroscope.addListener(({ z }) => {
      const magHeading = tiltCompensatedHeading(
        latestMag.current,
        latestAccel.current,
      );
      const filtered = filter.current.update(z, magHeading, Date.now());
      deviceHeadingRef.current = filtered;

      const rawNeedle = targetRef.current - filtered;
      const nextNeedle = shortestAngle(needleRotation.value, rawNeedle);
      needleRotation.value = withSpring(nextNeedle, NEEDLE_SPRING);

      const rawDial = -filtered;
      const nextDial = shortestAngle(dialRotation.value, rawDial);
      dialRotation.value = withSpring(nextDial, NEEDLE_SPRING);
    });

    return () => {
      magSub.remove();
      accelSub.remove();
      gyroSub.remove();
      filter.current.reset();
    };
  }, [needleRotation, dialRotation]);

  return { needleRotation, dialRotation, deviceHeadingRef };
}
