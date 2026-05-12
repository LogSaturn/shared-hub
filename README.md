# Vice

A React Native compass app that points you toward the nearest place to satisfy your vice (coffee, beer, boba, etc.).

## Stack
- React Native 0.81 + Expo SDK 54 (managed workflow, new architecture)
- Expo Router v6 (file-based navigation)
- TypeScript (strict)
- NativeWind v4 (Tailwind styling)
- Zustand (state, AsyncStorage persist)
- Reanimated v4 + react-native-worklets (UI-thread compass animation)
- expo-sensors (magnetometer + gyroscope + accelerometer)
- expo-location (GPS)
- expo-haptics, expo-linking, expo-updates
- @gorhom/bottom-sheet v5 (nearby + detail sheets)
- Supabase: Auth + Postgres + Edge Function (Google Places proxy)

## Architecture notes
- Compass heading lives in a Reanimated `sharedValue` — never in Zustand. Sensor → filter → spring all run on the UI thread.
- `CompassFilter` (complementary filter, α=0.98) fuses gyroscope + magnetometer for smooth, accurate heading.
- Always call `shortestAngle()` before updating needle rotation to prevent wrong-way spins.
- Google Places API key lives only in Supabase function secrets; the app calls the `places-proxy` edge function with the Supabase anon key.
- All Supabase tables are protected by RLS (`auth.uid() = user_id`). Profiles auto-create on signup via trigger.

---

## Running locally (developers)

```bash
npm install
npm start            # expo start
```

Then `i` for iOS sim, `a` for Android emulator, or scan the QR with Expo Go on a phone.

Useful scripts:

```bash
npm run typecheck    # tsc --noEmit
npm test             # jest (48 tests)
```

### Required env vars

`.env.local` (gitignored) must contain:

```
EXPO_PUBLIC_SUPABASE_URL=https://wuxdtsoihfcrtuxorzfz.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=...
```

For EAS builds, the same vars are stored as EAS project env (production + preview + development scope).

---

## Sending the app to testers

### Android — installable .apk (recommended)

Already set up. To cut a new build:

```bash
npm run build:preview      # eas build --profile preview --platform android
```

Takes ~12–18 min on EAS servers. Output: a build URL like
`https://expo.dev/accounts/sirhobbys-organization/projects/vices/builds/<id>`.

Send the URL to anyone you want testing. Their steps:
1. Open the link on their Android phone.
2. Tap **Install**.
3. Allow "installs from unknown sources" if prompted.
4. App icon appears in the drawer.

After the initial install, JS/asset changes ship via OTA in ~1 minute — no rebuild, no re-install:

```bash
npm run update:preview -- --message "What changed"
```

Testers' apps fetch the update on next launch.

**Rebuild required** when you bump app version, change native plugins, or add native dependencies.

### iOS — Expo Go via tunnel (no Apple Developer account needed)

Friend installs **Expo Go** from the App Store. You run:

```bash
npx expo start --tunnel
```

Share the QR code that appears (or the `exp+vice://...` URL). They scan it in Expo Go and the app loads.

Caveats:
- Your laptop must be running (the tunnel terminates with the dev server).
- Magic-link auth won't deep-link back to Expo Go without adding the `exp+vice://...` URL to Supabase → Authentication → URL Configuration → Redirect URLs.
- Sign-up with email/password works without any extra config.

### iOS — TestFlight via EAS (requires paid Apple Developer account)

Not configured yet. Path when ready:
1. Enroll at developer.apple.com ($99/year).
2. `npm run build:preview:ios` — builds a `.ipa`.
3. EAS Submit pushes to TestFlight; invitees get an email with an install link.

---

## Project structure

```
app/                  expo-router screens
  (auth)/             sign-in, check-email (route group)
  index.tsx           splash
  search.tsx          vice picker
  loading.tsx         "finding the nearest…" pulse
  compass.tsx         live compass + place sheets
  account.tsx         dashboard (avatar, stats, Places/Vices tabs)
  favorites.tsx       standalone favorites list (legacy entry, unlinked)
components/
  compass/            ViceNeedle, CompassDial, CompassRose
  sheets/             NearbySheet, PlaceDetailSheet
  ui/                 shared primitives (Label, …)
constants/            colors, spacing, vices catalog, config
hooks/                useCompass, useLocation, usePlaces, useSession,
                      useFavorites, useSessionSync
lib/
  bearing.ts          haversine + bearing math
  compassFilter.ts    sensor fusion
  placesApi.ts        nearby + details via edge function
  supabase.ts         client with AsyncStorage session
  auth.ts             signIn / signUp / signOut / magic link / OAuth
  profile.ts          read/write public.profiles
  favorites.ts        list/add/remove/toggle favorites
  viceSearches.ts     log + recent + stats
store/                Zustand store
types/                domain types
supabase/functions/   places-proxy edge function (Deno)
```

## Database

Public schema, all under RLS (`auth.uid()`):

- `profiles` — auto-created on signup. Typed columns for indexed fields (`username`, `units`, `entitlement`, `onboarding_completed`); `preferences jsonb` for everything personalized.
- `favorites` — `kind in ('place','vice')` discriminator, `ref_id`, `snapshot jsonb`. Unique per (user, kind, ref).
- `vice_searches` — append-only search log; powers "recents" and dashboard stats.

## Roadmap

See `progress.txt` for the full phase list:
- Phase 0–6 ✅ — bootstrap → compass → places → polish
- Phase 7 ✅ — auth, favorites, account dashboard
- Phase 8 — UI audit / fixes
- Phase 9 — onboarding / UX walkthrough
- Phase 10 — Play Store + App Store readiness
- Phase 11 — Ads + paywall
