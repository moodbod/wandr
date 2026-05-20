# Wandr

Wandr is an Expo app for travel discovery, stays, trips, friends, and real-time planning. The same codebase supports iOS, Android, web, and a Convex backend, so changes should be made with care: a web-only tweak can still affect the mobile app if it touches shared files.

## Tech Stack

- Expo and React Native
- Expo Router for file-based routing
- React Native Web for browser support
- Convex for backend functions and data
- Mapbox and native map integrations
- LiveKit for calls and real-time experiences

## Getting Started

Install dependencies:

```bash
bun install
```

Start the Expo dev server:

```bash
bun run start
```

Run a specific target:

```bash
bun run ios
bun run android
bun run web
```

Start Convex locally:

```bash
bun run convex:dev
```

## Project Map

- `app/` contains Expo Router screens and layouts.
- `components/` contains shared UI and Wandr feature components.
- `hooks/` contains shared app hooks, including platform-specific variants.
- `lib/` contains app services, helpers, routing, notifications, maps, and Convex client setup.
- `constants/` contains design tokens and app content.
- `types/` contains shared TypeScript models.
- `convex/` contains backend schema, tables, queries, mutations, and actions.
- `public/`, `app/+html.tsx`, `*.web.tsx`, and `vercel.json` are web-facing surfaces.

## Working Safely

This is a mobile app first, with web support layered in. If you are working on the web version, prefer web-specific files:

```text
*.web.tsx
public/
app/+html.tsx
vercel.json
```

Be careful with shared files such as:

```text
app/
components/
hooks/
lib/
constants/
types/
app.json
package.json
metro.config.js
```

If a web change needs shared code, keep the edit small and test the affected app flow. Avoid broad refactors, dependency changes, and app configuration changes unless they are required for the task.

## Convex Notes

Before editing anything in `convex/`, read:

```text
convex/_generated/ai/guidelines.md
```

Those project guidelines override generic Convex advice. Schema and data model changes should be treated as app-wide changes, because they can affect mobile, web, and backend behavior at the same time.

## Development Pipeline

GitHub is the source of truth for deploys. Do not deploy the web app from local machines or the Vercel CLI.

Use two long-lived branches:

```text
dev  -> shared team branch and internal build
main -> production branch
```

Developers work directly on `dev`:

```bash
git switch dev
git pull
git add .
git commit -m "Describe the change"
git push origin dev
```

GitHub Actions runs after every push to `dev` and `main`:

```bash
bun install --frozen-lockfile
bun run lint
bun run typecheck
bun run build:web
```

If `dev` is red, fix `dev` before opening a release PR.

Release production by opening a pull request:

```text
dev -> main
```

Vercel should be connected to GitHub with:

```text
Production branch: main
Install: bun install --frozen-lockfile
Build: bun run build:web
Output: dist
```

Vercel will create an internal Preview Deployment for `dev`, and it will deploy production only when `main` changes.

GitHub rules for `dev`:

- Allow the development team to push to `dev`.
- Keep force pushes disabled.
- Keep branch deletion disabled.
- Do not require pull requests into `dev`.
- Do not require status checks on `dev`.
- Watch the Actions result after each push.

GitHub rules for `main`:

- Require pull requests before merging.
- Require at least one approval.
- Require conversation resolution.
- Keep force pushes disabled.
- Keep branch deletion disabled.
- Do not allow direct pushes to `main`.
- Merge only release PRs from `dev` into `main`.

After GitHub has seen one completed Actions run on `main`, enable required status checks for `main` and select:

```text
Web CI / Lint, typecheck, and build web
```

Then also enable `Require branches to be up to date before merging`.

## Checks Before a PR

Run these before asking for review:

```bash
bun run lint
bun run typecheck
bun run build:web
```

For native app changes, also run the affected platform:

```bash
bun run ios
# or
bun run android
```

For UI changes, include screenshots or a short recording. For backend changes, describe the data impact and whether a migration is needed.

## Useful Scripts

```bash
bun run start       # Start Expo
bun run ios         # Run iOS
bun run android     # Run Android
bun run web         # Run web
bun run build:web   # Export web build
bun run lint        # Run Expo lint
bun run typecheck   # Run TypeScript
bun run convex:dev  # Start Convex dev
```
