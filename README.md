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
- All Supabase tables are protected by RLS with `(select auth.uid()) = user_id` (subselect form caches the auth call per query rather than re-evaluating per row).
- Search state lives in one `SearchConfig` object (vice-or-query discriminator + filters), serialized via a versioned wrapper so future filter additions don't break stored saved searches.
- Tappable pill/chip components wrap their visual styling in an inner `View` (Pressable carries only touch). Fabric's clip layer drops borders/fills when styled directly on Pressable — see `components/filters/QuickFilterPills.tsx`.

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

`.env` (gitignored) must contain:

```
EXPO_PUBLIC_SUPABASE_URL=https://wuxdtsoihfcrtuxorzfz.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=...
EXPO_PUBLIC_SENTRY_DSN=          # get from sentry.io → project → Client Keys
```

For EAS builds, `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` are stored as EAS project env (preview + production). Add `EXPO_PUBLIC_SENTRY_DSN` there too once the Sentry project is created.

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
  (tabs)/             bottom tab navigator — landing surface
    _layout.tsx       three-tab bar (Coming Soon | Vices | Profile)
    index.tsx         Vices tab — search + quick pills + filter icon
    coming-soon.tsx   placeholder for social/friends feature
    profile.tsx       dashboard (avatar, stats, Places/Vices tabs)
  index.tsx           splash — preloads then auto-navigates to (tabs)
  loading.tsx         "finding the nearest…" pulse
  compass.tsx         live compass + place sheets (push from Vices)
  favorites.tsx       legacy standalone favorites (unlinked; profile tab covers this)
components/
  compass/            ViceNeedle, CompassDial, CompassRose
  filters/            QuickFilterPills (Vices tab pill row + filter icon)
  sheets/             NearbySheet, PlaceDetailSheet, FiltersSheet
  ui/                 shared primitives (Label, …)
constants/            colors, spacing, vices catalog, config, filters (presets/defaults/QUICK_FILTERS)
hooks/                useCompass, useLocation, usePlaces, useSession,
                      useFavorites, useSessionSync
lib/
  bearing.ts          haversine + bearing math
  compassFilter.ts    sensor fusion
  placesApi.ts        nearby + details via edge function (radius/openNow/minRating/priceLevels)
  searchConfig.ts     SearchConfig helpers — defaultFilters, fromVice/fromQuery,
                      toPlacesQuery, activeFilterCount, filtersEqual, serialize/parse (v:1)
  supabase.ts         client with AsyncStorage session
  auth.ts             signIn / signUp / signOut / magic link / OAuth
  profile.ts          read/write public.profiles
  favorites.ts        list/add/remove/toggle favorites
  savedSearches.ts    list/add/remove/touch/rename/reorder (scaffold; no UI yet)
  viceSearches.ts     log + recent + stats
store/                Zustand store — activeSearch, pendingFilters, lastUsedFilters,
                      recentViceIds, recentCustomQueries, units (persisted subset),
                      cachedProfile + profileReady (splash preload)
types/                domain types (includes types/search.ts — SearchConfig/SearchFilters)
supabase/functions/   places-proxy edge function (Deno)
```

## Database

Public schema, all under RLS using the subselect form `(select auth.uid()) = user_id`:

- `profiles` — auto-created on signup. Typed columns for indexed fields (`username`, `units`, `entitlement`, `onboarding_completed`); `preferences jsonb` for everything personalized.
- `favorites` — `kind in ('place','vice')` discriminator, `ref_id`, `snapshot jsonb`. Unique per (user, kind, ref).
- `vice_searches` — append-only search log; powers "recents" and dashboard stats.
- `vice_logs` — append-only indulgence log. `vice_id`, `vice_label`, `vice_icon`, `quantity`, `logged_at`. Queried with time-range filters (WTD/MTD/YTD/All) to power the Account tab chart. Migration SQL: `supabase-vice-logs.sql`.
- `saved_searches` — scaffolded for the future widget / saved-search UI. Stores a serialized `SearchConfig` (jsonb) plus `position` and `last_used_at`.

## Roadmap

See `progress.txt` for the full phase list — also has a "PICK UP HERE NEXT SESSION" block at the top for cross-session continuity.

- Phase 0–6 ✅ — bootstrap → compass → places → polish
- Phase 7 ✅ (partial) — auth, favorites, account dashboard. OAuth still hidden.
- Phase 8 ✅ — UI overhaul: bottom tabs, enhanced search, filter system, splash rework
- Phase 9 — Hardening + store audit prep (in progress: RLS optimized, awaiting assets/privacy policy/age rating)
- Phase 10 ✅ — UI audit / fixes; settings screen; username/avatar display
- Phase 11 ✅ — Onboarding flow (4 slides); Log a Vice feature; vice history chart
- Phase 12 ✅ — Store compliance (account deletion, privacy policy, ToS, Sentry);
                 UI audit; rotating Playfair Display titles with per-title sizing;
                 splash preload; updated app icon; preview APK shipped
- Phase 13 — Play Store + App Store submission
- Phase 14 — Ads + paywall
