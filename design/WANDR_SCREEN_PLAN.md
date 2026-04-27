# Wandr Design Screen Plan

This folder has been reorganized so each concept is named by product function instead of visual style labels like `wise`, `bold`, `kinetic`, or `final`.

The structure is now grouped by feature area:

- `design/system`
- `design/explore`
- `design/trip`
- `design/stays`
- `design/squad`
- `design/profile`

## Naming Convention

- Folder names now describe the intended `wandr` screen.
- `mockup.html` is the extracted HTML screen file.
- `preview.png` is the companion screenshot.
- `system/design-system_editorial-confidence/style-guide.md` holds the shared visual direction for the mockups.

## Screen Inventory

| Folder | Wandr screen | Suggested app route | Main content in the mockup | Notes |
| --- | --- | --- | --- | --- |
| `explore/explore_home` | Explore home / discovery landing | `/explore` | Brand header, hero intro, featured local story, category chips, bottom nav | Best candidate for the main Explore tab landing screen |
| `explore/explore_search-discovery` | Explore search + discovery results | `/explore/search` | Large Explore heading, search field, featured experience cards, hidden gems list, bottom nav | Feels like search/discovery after entering the Explore flow |
| `explore/explore_editorial-stories` | Explore editorial stories / curated inspiration | `/explore/stories` | Large immersive hero, “Hidden Waterfalls”, “Curated Stories”, CTA section | Good as a curated editorial sub-screen or campaign landing |
| `trip/trip_itinerary-day-plan` | Trip itinerary day planner | `/trip/day-plan` | Day title, scheduled activities, times, featured booking/action card, bottom nav | Best fit for a saved trip day agenda |
| `trip/trip_map-timeline` | Trip map + timeline | `/trip/map` | Trip title, map hero, route marker context, “Day 4 Timeline” section | Uses Swiss Alps sample content, but structurally this is still the trip map screen |
| `stays/stays_map-search` | Stays search map | `/stays` | Search field, map-first layout, nearby stay cards, pricing, bottom nav | Best fit for accommodation browsing |
| `stays/stay_details-reviews` | Stay detail + reviews | `/stays/:id` | Large property hero, description, guest journals/reviews, neighborhood section | Detail screen paired naturally with `stays_map-search` |
| `squad/squad_discovery` | Travel friends matching / people discovery | `/friends/discover` | Match headline, traveler cards, profile snippets, bottom nav | Best fit for finding travel companions |
| `squad/squad_chat` | Travel friends group chat | `/friends/chat` | Friends title, shared update cards, message composer, group feed | Natural follow-up once a group is formed |
| `profile/profile_overview` | Traveler profile overview | `/profile` | User identity, traveler level/status, profile stats and actions, bottom nav | Main profile/account screen |
| `system/design-system_editorial-confidence` | Shared design direction | n/a | Color tokens, typography, spacing, component behavior | Use this as the visual system reference for all screens |

## Suggested Product Grouping

### Explore

- `explore/explore_home`
- `explore/explore_search-discovery`
- `explore/explore_editorial-stories`

### Trip Planning

- `trip/trip_itinerary-day-plan`
- `trip/trip_map-timeline`

### Stays

- `stays/stays_map-search`
- `stays/stay_details-reviews`

### Friends / Social

- `squad/squad_discovery`
- `squad/squad_chat`

### Account

- `profile/profile_overview`

## Content Mapping Notes

- `explore/explore_home` and `explore/explore_search-discovery` are both Explore screens, but they serve different moments in the journey: landing vs search/browse.
- `explore/explore_editorial-stories` is less utilitarian and more inspirational. It should likely sit behind a featured story card or campaign entry point instead of replacing the main Explore feed.
- `trip/trip_itinerary-day-plan` is the strongest “daily itinerary” concept for Wandr-specific content.
- `trip/trip_map-timeline` appears to be a generic travel sample, not a Wandr-specific destination, so its layout is reusable even if the copy will need to be localized to Wandr.
- `stays/stays_map-search` and `stays/stay_details-reviews` are clearly a paired browse-to-detail flow.
- `squad/squad_discovery` and `squad/squad_chat` are clearly a paired match-to-conversation flow.
- `profile/profile_overview` is the only account/profile concept currently in the folder.

## Recommended Next Step

Convert these into product-facing implementation buckets:

1. Build the core navigation screens first: `explore/explore_home`, `trip/trip_itinerary-day-plan`, `stays/stays_map-search`, `squad/squad_discovery`, and `profile/profile_overview`.
2. Add supporting drill-down screens next: `explore/explore_search-discovery`, `stays/stay_details-reviews`, `squad/squad_chat`, and `trip/trip_map-timeline`.
3. Treat `explore/explore_editorial-stories` as a premium storytelling screen or campaign surface rather than a required core tab.
