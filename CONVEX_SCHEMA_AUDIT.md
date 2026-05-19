# Convex Schema Cleanup

Date: 2026-05-19

## Result

The Convex schema has been trimmed and renamed to short table keys while keeping the public app API/function names stable. User profile, auth, and preference data now live on the single `users` table.

Dead profile/OTP schema pieces were removed:

- `travelerProfiles`
- `friendProfiles`
- `phoneOtps`
- `phoneOtpVerifications`
- `userSettings` / `settings`

User settings were folded into `users`:

- currency, distance, and temperature preferences
- privacy visibility and sharing flags
- notification preference flags
- `settingsUpdatedAt`

Long internal table names were shortened:

- `appNotifications` -> `notices`
- `devicePushTokens` -> `tokens`
- `experienceBookings` -> `bookings`
- `experienceRatings` -> `ratings`
- `friendCalls` -> `calls`
- `friendCircleMembers` -> `members`
- `friendCircleReadStates` -> `reads`
- `friendCircles` -> `circles`
- `friendConnections` -> `connections`
- `friendDirectMessages` -> `dms`
- `friendDirectReadStates` -> `receipts`
- `friendDirectThreads` -> `threads`
- `friendMatchActions` -> `matches`
- `friendMessages` -> `messages`
- `hiddenGems` -> `gems`
- `locationLikes` -> `likes`
- `locationPhotos` -> `photos`
- `stayBookings` -> `reservations`
- `stayRatings` -> `reviews`
- `tripInvites` -> `invites`
- `tripVisits` -> `visits`

Kept as-is because they are already short and central:

- `users`
- `trips`
- `experiences`
- `stays`
- `regions`
- Convex Auth system tables

## Dev Data Cleanup

The dev deployment was migrated after the rename:

- copied `bookings`: 2 rows
- copied `likes`: 1 row
- copied `reservations`: 1 row
- copied `reviews`: 1 row
- deleted stale `appUsers`: 1 row
- deleted stale `friendProfiles`: 1 row
- deleted stale `travelerProfiles`: 1 row
- deleted old long-name table rows after copying

The temporary cleanup mutation was removed after it ran, so there is no maintenance endpoint left in the app bundle.

Empty obsolete table records were then removed from the dev deployment with a filtered `npx convex import --replace-all` snapshot. The pre-delete backup was saved at `/private/tmp/wandr-convex-before-table-delete.zip`.

## Verification

- `npx convex codegen` completed after the schema changes.
- `npx convex dev --once` completed after the dev table deletion.
- `bun run typecheck` passes.
- `bun run lint` passes.

## Follow-Up

The app still preserves existing product behavior. A deeper normalization pass can still merge concepts like `ratings`/`reviews`, group/direct chat tables, and itinerary `bookings` versus `reservations`, but those should be separate migrations because they change data relationships rather than just table names.
