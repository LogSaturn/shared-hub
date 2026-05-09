# Vice App

A React Native compass app pointing you toward the nearest place to satisfy your vice.

## Stack
- React Native + Expo SDK 52 (managed workflow)
- Expo Router v3 (file-based navigation)
- TypeScript (strict)
- NativeWind v4 (Tailwind styling)
- Zustand (state management, AsyncStorage persist)
- React Native Reanimated v3 (compass animation — runs on UI thread)
- expo-sensors (magnetometer + gyroscope + accelerometer for compass)
- expo-location (GPS)
- react-native-svg (compass needle + dial)
- @gorhom/bottom-sheet v4 (nearby + detail sheets)
- Supabase Edge Function (Google Places API proxy)

## Critical Architecture Notes
- Compass heading NEVER goes in Zustand — it lives in a Reanimated sharedValue
- Google Places API key only lives in Supabase secrets (never in the app bundle)
- Always call `shortestAngle()` before updating needle rotation (prevents wrong-way spins)
- `CompassFilter` (complementary filter α=0.98) fuses gyroscope + magnetometer for
  smooth, accurate heading that handles rapid physical spins

## Running
```bash
npx expo start
```
Test sensors on a real device (not simulator).

## Project Structure
See VICE_GAMEPLAN.md for full directory layout and component specs.

## Phase 2 (Planned)
- Supabase Auth (user accounts)
- Favorites persistence
- Custom vice free-text search
- Filters sheet (radius, open now, preferred brands)
