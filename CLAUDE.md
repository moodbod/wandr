# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

<!-- convex-ai-start -->
This project uses [Convex](https://convex.dev) as its backend.

When working on Convex code, **always read `convex/_generated/ai/guidelines.md` first** for important guidelines on how to correctly use Convex APIs and patterns. The file contains rules that override what you may have learned about Convex from training data.

Convex agent skills for common tasks can be installed by running `npx convex ai-files install`.
<!-- convex-ai-end -->

## Commands

```bash
bun install              # Install dependencies
bun run start            # Start Expo dev server (opens in Expo Go — no prebuild needed)
bun run ios              # Run on iOS simulator (native build)
bun run android          # Run on Android emulator (native build)
bun run web              # Run web (single-page mode)
bun run build:web        # Export web build to dist/
bun run lint             # Expo lint (ESLint)
bun run typecheck        # TypeScript type check (no emit)
bun run convex:dev       # Start Convex dev server (run alongside Expo)
bun run test:convex      # Run Convex backend tests with Vitest
```

Run a single test file:
```bash
bunx vitest run tests/convex/someFile.test.ts
```

Before any PR: `bun run lint && bun run typecheck && bun run build:web`

## Stack

- **Expo SDK 56** / React Native 0.85.3 / React 19.2.3 / TypeScript 6.0.3
- **Expo Go** compatible — no custom dev client or prebuild required for development
- **Convex** backend (functions, schema, real-time queries)
- **mapbox-gl** for web maps; native maps show a placeholder (Expo Go constraint)
- **expo-router 56** with file-based routing and `NativeTabs` on iOS

## Architecture

**Wandr** is a travel discovery app (iOS, Android, web) from one codebase. Mobile is primary; web is layered in.

### Routing

Expo Router anchored at `app/(tabs)/`. The root layout (`app/_layout.tsx`) wraps everything in `ConvexAuthProvider`, `AuthSessionProvider`, and `AuthSheetProvider`. `AppShell` (`components/wandr/app-shell.tsx`) renders the Stack navigator.

Main tabs: `explore`, `trip`, `stays`, `friends`, `profile`. Modal and admin screens live at the root of `app/`.

### Tab Bar

On iOS: `NativeTabs` from `expo-router/unstable-native-tabs` with SF Symbols (`safari`, `map`, `house`, `person.2`, `person.circle`). On Android/Web: standard `Tabs` with Ionicons. Configured in `app/(tabs)/_layout.tsx`.

### Backend (Convex)

Schema tables are split under `convex/tables/` and assembled in `convex/schema.ts`.

Backend domain modules:
- `authSession.ts` / `authIdentity.ts` — session and identity
- `catalog.ts` — curated content (locations, experiences, stays) and admin ops
- `explore.ts` — explore queries, likes, saved places, group trips
- `trip.ts` — trip creation, bookings (experiences + stays), itinerary, arrivals
- `friends.ts` — connections, circles (group chats), DMs
- `notifications.ts` — in-app notices and push tokens
- `support.ts` — traveler support chat
- `admin.ts` / `adminAudit.ts` — admin dashboard and audit log
- `provider.ts` — service-provider self-management

### Convex Client (`lib/convex/`)

`lib/convex.ts` was split into domain files. Import from `@/lib/convex` (the barrel at `lib/convex/index.ts`) for backward compatibility, or from the specific domain file for new code:

```
lib/convex/
  index.ts          ← barrel, re-exports everything
  client.ts         ← ConvexReactClient instance + shared admin/provider types
  auth.ts           ← auth session refs
  explore.ts        ← explore refs
  trip.ts           ← trip, booking, stay refs
  profile.ts        ← profile, settings refs + UserSettings type
  friends.ts        ← friends, circles, DMs refs
  notifications.ts  ← notice and push token refs
  catalog.ts        ← catalog admin refs
  admin.ts          ← admin dashboard refs
  provider.ts       ← provider self-management refs
  photos.ts         ← photo upload refs
  support.ts        ← support chat refs
  shared-locations.ts ← location sharing refs + SharedUserLocation type
```

All Convex function refs use `makeFunctionReference`. **Use these refs** — never construct string references inline. Users are identified by `travelerSlug` (not document ID) throughout.

### Auth and Identity

`@convex-dev/auth`. Roles: `traveler`, `serviceProvider`, `admin`. `AuthSessionProvider` (`providers/auth-session.tsx`) exposes the session. `AuthSheetProvider` (`providers/auth-sheet.tsx`) manages the sign-in/sign-up sheet UI.

### Maps

- **Native**: `components/wandr/maps/map-preview.tsx` renders a placeholder (expo-maps requires a native build, incompatible with Expo Go). For full native maps, use `expo run:ios`.
- **Web**: `components/wandr/maps/map-preview.web.tsx` uses `mapbox-gl` with persistent map instance reuse (`persistKey` prop). Requires `EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN`.
- Route calculations use Mapbox Directions API with OSRM fallback (`lib/routing.ts`).
- Geocoding uses Mapbox Search Box API (`lib/mapbox-geocoding.ts`).

### Native iOS UI Patterns

The app targets native iOS feel:
- **Tab bar**: SF Symbols via `NativeTabs`, `blurEffect="systemMaterial"`, lime tint
- **Chat options**: `ActionSheetIOS` + `Alert.prompt` for rename — no custom sheets
- **Message long-press**: `ActionSheetIOS` (Reply / Delete)
- **Tools sheet** (GIFs/stickers): native `Modal` with `presentationStyle="pageSheet"`
- **Color scheme**: follows system dark/light via `hooks/use-color-scheme.ts`
- **Haptics**: `expo-haptics` on `GlassButton` press-in

### Glass Effect

`expo-glass-effect` is not Expo Go compatible and has been stubbed. `lib/glass-effect.ts` exports `isLiquidGlassAvailable = () => false` and `GlassView = View`. All components already have non-glass fallback paths guarded by `isLiquidGlassAvailable()`.

### Platform-Specific Files

`.web.ts` / `.web.tsx` for web-only. `.native.ts` / `.native.tsx` for mobile-only. Shared code in plain `.ts` / `.tsx`. Key examples:
- `hooks/use-color-scheme.ts` (native) / `hooks/use-color-scheme.web.ts` (web)
- `components/wandr/maps/map-preview.tsx` (native placeholder) / `map-preview.web.tsx` (mapbox-gl)

### Design System

`constants/design-system.ts` and `constants/theme.ts`. Near-black primary (`#0e0f0c`), lime-green accent (`#c6efae`), SF Pro system font (`system-ui` on iOS). The `DESIGN.md` file has the full visual spec.

### Path Alias

`@/` resolves to the project root. Always use `@/` for cross-directory imports.

## Branch Strategy

- `dev` — shared team branch, direct pushes, triggers Preview Deployment
- `main` — production, PRs from `dev` only, requires approval

Vercel deploys automatically from GitHub. Do not deploy from local machines.
