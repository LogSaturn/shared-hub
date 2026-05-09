import { Units } from '../types';

const DEG = Math.PI / 180;

export function bearingBetween(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const phi1 = lat1 * DEG;
  const phi2 = lat2 * DEG;
  const dLambda = (lng2 - lng1) * DEG;
  const y = Math.sin(dLambda) * Math.cos(phi2);
  const x =
    Math.cos(phi1) * Math.sin(phi2) -
    Math.sin(phi1) * Math.cos(phi2) * Math.cos(dLambda);
  const theta = Math.atan2(y, x);
  return ((theta / DEG) + 360) % 360;
}

export function distanceBetween(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 6371000;
  const phi1 = lat1 * DEG;
  const phi2 = lat2 * DEG;
  const dPhi = (lat2 - lat1) * DEG;
  const dLambda = (lng2 - lng1) * DEG;
  const a =
    Math.sin(dPhi / 2) ** 2 +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(dLambda / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Picks the shortest signed delta between current and target angles, then
// returns current + delta. Without this the needle takes the long way around
// 359°→1° transitions.
export function shortestAngle(current: number, target: number): number {
  let diff = (((target - current) % 360) + 360) % 360;
  if (diff > 180) diff -= 360;
  return current + diff;
}

export function bearingToCardinal(deg: number): string {
  const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  const normalized = ((deg % 360) + 360) % 360;
  return dirs[Math.round(normalized / 45) % 8];
}

export function formatDistance(meters: number, units: Units): string {
  if (units === 'km') return `${(meters / 1000).toFixed(2)} km`;
  return `${(meters / 1609.34).toFixed(2)} mi`;
}
