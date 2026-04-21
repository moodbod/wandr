# Namibia Experience Seed Roadmap

## Goal

Grow the Convex-backed `explorePages` seed from a small starter set into a researched Namibia-wide catalog with **at least 100 entries**, added in batches so the data stays reviewable.

## Current State

- The current seed in `convex/seedData.ts` is a starter expansion.
- Next steps should replace ad-hoc entries with web-researched items in batches.
- We should keep each batch small enough to review, ideally **15 to 25 entries at a time**.

## Batch Plan

1. Batch 1: Khomas + Windhoek launch set
   - Target: 20 entries
   - Focus: city tours, craft/culture, nearby wildlife, food experiences
2. Batch 2: Erongo coast
   - Target: 20 entries
   - Focus: Swakopmund, Walvis Bay, Sandwich Harbour, Pelican Point, Spitzkoppe
3. Batch 3: Namib desert + Hardap
   - Target: 20 entries
   - Focus: Sossusvlei, Sesriem, Naukluft, desert drives, canyon walks
4. Batch 4: North and wildlife corridor
   - Target: 20 entries
   - Focus: Etosha, Waterberg, Otjiwarongo, Damaraland, Brandberg
5. Batch 5: South and northeast
   - Target: 20 to 25 entries
   - Focus: Fish River Canyon, Ai-Ais, Zambezi, river safaris, cultural routes

## Coverage Targets

These are planning targets, not final counts:

- `Khomas`: 12
- `Erongo`: 20
- `Hardap`: 12
- `Oshikoto` / Etosha corridor: 12
- `Otjozondjupa`: 8
- `Kunene` / Damaraland: 12
- `Karas`: 10
- `Zambezi`: 8
- `Kavango East` / `Kavango West`: 6
- Multi-region or multi-day Namibia routes: 10

Total target: **110**

## Source Pools

These are the live source pools already identified for mining structured entries.

### Windhoek / Khomas

- [Viator: Windhoek City Tour](https://www.viator.com/tours/Windhoek/Windhoek-City-Tour/d5574-36236P3)
- [Viator: Windhoek City Tour with Penduka and township stops](https://www.viator.com/tours/Windhoek/Windhoek-City-Tour/d5574-21724P17)

### Walvis Bay / Swakopmund / Erongo

- [Pelican Point Kayaking](https://www.pelican-point-kayaking.com/pelicanpointkayaktour)
- [Viator: Pelican Point Kayaking Half-Day Tour](https://www.viator.com/tours/Walvis-Bay/Pelican-Point-Kayaking-Half-Day-Tour/d4467-10475P1)
- [Viator: Seal Kayak Adventure at Pelican Point](https://www.viator.com/en-ZA/tours/Walvis-Bay/Seal-Kayak-Adventure-at-Pelican-Point-Half-Day/d4467-325576P1)
- [GetYourGuide: Spitzkoppe tours and activities](https://www.getyourguide.com/spitzkoppe-l143530/)

### Sossusvlei / Sesriem / Naukluft / Hardap

- [Namibia Wildlife Resorts: Sossus Dune Lodge](https://www.nwr.com.na/resorts/sossus-dune-lodge/)
- [Namibia Wildlife Resorts: Sesriem Campsite](https://www.nwr.com.na/resorts/sesriem-campsite/)
- [Namibia Wildlife Resorts: Naukluft Camp](https://www.nwr.com.na/resorts/naukluft-camp/)
- [GetYourGuide: Sossusvlei tours and activities](https://www.getyourguide.com/sossusvlei-l118795/)

### Etosha / North

- [Namibia Wildlife Resorts: Onkoshi Resort](https://www.nwr.com.na/resorts/onkoshi-resort/)
- [Viator: 4-Day Namibia Etosha Safari](https://www.viator.com/tours/Windhoek/4-Day-Namibia-Etosha-Safari-from-Windhoek-or-Swakopmund/d5574-2382STE4)

### South / Karas

- [Namibia Wildlife Resorts: Hobas Lodge](https://www.nwr.com.na/resorts/hobas-lodge/)

### Skeleton Coast / Additional park activity pool

- [Namibia Wildlife Resorts: Torra Bay Campsite](https://www.nwr.com.na/resorts/torra-bay-campsite/)

### Multi-day Namibia route pools

- [Viator: 4-Day Swakopmund and Sossusvlei Adventure from Windhoek](https://www.viator.com/tours/Windhoek/4-day-Swakopmund-Sossusvlei-Adventure/d5574-9289P4)
- [Viator: 4-Day Etosha and Swakopmund Adventure from Windhoek](https://www.viator.com/tours/Windhoek/4-Day-Etosha-Swakopmund/d5574-9289P3)
- [Viator: 6 Days Sossusvlei, Swakopmund and Etosha National Park Lodging](https://www.viator.com/tours/Windhoek/6-Day-Namibia-Desert-and-Etosha-National-Park-Camping/d5574-72576P7)
- [Swakopmund Namibia: 6-Day Namibia Safari](https://www.swakopmundnamibia.com/6-day-namibia-safari-tour/)
- [Swakopmund Namibia: 7-Day Namibia Safari](https://www.swakopmundnamibia.com/7-day-namibia-safari-tour/)
- [GetYourGuide: Namibia 6-Day Guided Tour listings from Sossusvlei hub](https://www.getyourguide.com/sossusvlei-l118795/)

## Data Rules for Seed Batches

For each seeded experience we should capture:

- `slug`
- `title`
- `subtitle`
- `description`
- `category`
- `price`
- `priceSuffix`
- `coordinate`
- `geography.region`
- `geography.town`
- `locationLabel`
- `durationLabel`
- `groupSizeLabel`
- `includes`
- at least one `sourceUrl` in working notes before the row is added

## Suggested Workflow

1. Mine 20 candidate entries from one region.
2. Normalize titles and slugs.
3. Deduplicate near-identical variants across Viator / GetYourGuide / operator sites.
4. Keep the strongest canonical version per experience.
5. Add the batch to `convex/seedData.ts`.
6. Update map markers and featured cards only after the batch is in place.

## Next Concrete Step

Build **Batch 1** from live Windhoek / Khomas sources and add the first 20 researched entries to the seed.
