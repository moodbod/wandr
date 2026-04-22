import {
  AI_AIS_IMAGE,
  BRANDBERG_IMAGE,
  CAPE_CROSS_IMAGE,
  CHEETAH_IMAGE,
  DUWISIB_IMAGE,
  EPUPA_FALLS_IMAGE,
  HOBA_IMAGE,
  KOLMANSKOP_IMAGE,
  NAMIBRAND_IMAGE,
  PETRIFIED_FOREST_IMAGE,
  POPA_FALLS_IMAGE,
  QUIVER_TREE_IMAGE,
  SALT_PANS_IMAGE,
  SANDWICH_HARBOUR_IMAGE,
  SWAKOP_FOOD_IMAGE,
  TWYFELFONTEIN_IMAGE,
  VINGERKLIP_IMAGE,
  WATERBERG_IMAGE,
  WINDHOEK_IMAGE
} from './constants';

export const seedHiddenGems = [
          // ── SWAKOPMUND / ERONGO COAST ──────────────────────────────────────
          {
            title: 'Swakopmund Jetty at Dusk',
            description: 'The 1912 iron jetty stretching 270 m into the Atlantic — best visited as the fog rolls in at golden hour.',
            imageUri: SWAKOP_FOOD_IMAGE,
            coordinate: [14.5040, -22.6780],
            geography: { region: 'Erongo', town: 'Swakopmund' },
            badge: 'Coastal Icon',
            locationLabel: 'Swakopmund seafront',
            summary:
              'An easy, atmospheric stop that trades adrenaline for mood. The jetty gives the town a cinematic frame and pairs perfectly with an evening seafood dinner nearby.',
            tripFit: [
              {
                label: 'Best vibe',
                value: 'GOLDEN HOUR DRIFT',
                detail: 'Works when the plan needs a softer landing instead of another packed activity block.',
                icon: 'compass',
                tone: 'dark',
              },
              {
                label: 'Time ask',
                value: '45 MIN',
                detail: 'Easy to layer onto dinner, a coastal walk, or one last scenic stop before turning in.',
                icon: 'clock',
                tone: 'accent',
              },
              {
                label: 'Who it suits',
                value: 'PAIRS OR SOLO',
                detail: 'Best when you want atmosphere, conversation, and a low-friction detour.',
                icon: 'users',
                tone: 'light',
              },
            ],
            sections: [
              {
                title: 'Why it lands',
                body: 'The appeal is less about ticking off a landmark and more about the mood around it. The jetty gives you open sky, a strong silhouette, and just enough distance from the busier parts of town to feel like a real break in tempo.',
              },
              {
                title: 'Best moment to go',
                body: 'Aim for late blue hour into early night. You keep the colour in the sky, the structure reads beautifully on camera, and the place feels calm instead of empty.',
              },
              {
                title: 'How to fold it into the day',
                body: 'Use it as the final note after a coastal dinner or as the scenic pause between town and wherever the night is heading next. It works best when it is part of a sequence, not the whole plan.',
              },
            ],
            visitTips: ['Bring a light layer — sea fog drops the temperature fast', 'Best after dinner or at sunset', 'Good photo stop without a long time commitment'],
            primaryLabel: 'Add to evening plan',
            secondaryLabel: 'Back to gems',
          },
          {
            title: 'Pink Salt Pans of Walvis Bay',
            description: 'Flamingo-pink lagoons where the desert meets the Atlantic in a surreal natural palette.',
            imageUri: SALT_PANS_IMAGE,
            coordinate: [14.5036, -22.9576],
            geography: { region: 'Erongo', town: 'Walvis Bay' },
            badge: 'Off Grid',
            locationLabel: 'Walvis Bay salt works',
            summary:
              'A strange, graphic landscape that feels like a worthwhile detour when the trip needs distance, texture, and something that does not read as standard sightseeing.',
            tripFit: [
              {
                label: 'Best vibe',
                value: 'WILD VISUALS',
                detail: 'A stronger fit for travelers who want something surreal, sparse, and a little out of the ordinary.',
                icon: 'compass',
                tone: 'dark',
              },
              {
                label: 'Time ask',
                value: '90 MIN',
                detail: 'Better as a committed side run than a quick in-town filler stop.',
                icon: 'clock',
                tone: 'accent',
              },
              {
                label: 'Who it suits',
                value: 'SMALL GROUP',
                detail: 'Works well with a couple of friends when everyone is happy to chase a weirder landscape moment.',
                icon: 'users',
                tone: 'light',
              },
            ],
            sections: [
              {
                title: 'Why it lands',
                body: 'The salt pans feel transportive because the colours and openness are doing the work. They are not polished or heavily programmed, which is exactly why they read as a discovery instead of a packaged stop.',
              },
              {
                title: 'Best moment to go',
                body: 'Morning is strongest. The air feels cleaner, the light is softer, and the outing can still leave the rest of the day open for town or the coast.',
              },
              {
                title: 'How to fold it into the day',
                body: 'Use it as the first commitment of the day, then come back into town for brunch or a lighter cultural stretch. It works best when you contrast the openness with somewhere more social afterward.',
              },
            ],
            visitTips: ['Go early for softer light', 'Pair with a late breakfast back in town', 'Worth it for an unusual photo set'],
            primaryLabel: 'Add to day route',
            secondaryLabel: 'Back to gems',
          },
          {
            title: 'Sandwich Harbour',
            description: 'Massive dunes tumbling directly into the Atlantic — accessible only by 4x4 and tidal window.',
            imageUri: SANDWICH_HARBOUR_IMAGE,
            coordinate: [14.4083, -23.3917],
            geography: { region: 'Erongo', town: 'Walvis Bay' },
            badge: 'Remote Icon',
            locationLabel: '50 km south of Walvis Bay',
            summary:
              'One of the most dramatic coastal landscapes in Africa — where star dunes over 100 m high crash straight into the ocean. Only reachable in a 4x4 and only when the tide cooperates.',
            tripFit: [
              {
                label: 'Best vibe',
                value: 'WILD REMOTE',
                detail: 'Ideal for travelers who want a genuine expedition feel, not a curated comfort stop.',
                icon: 'compass',
                tone: 'dark',
              },
              {
                label: 'Time ask',
                value: 'HALF DAY',
                detail: 'Tidal windows dictate the schedule — plan early and build buffer time.',
                icon: 'clock',
                tone: 'accent',
              },
              {
                label: 'Who it suits',
                value: '4X4 GROUPS',
                detail: 'Requires a proper 4x4 and ideally a guide familiar with the tidal crossing.',
                icon: 'users',
                tone: 'light',
              },
            ],
            sections: [
              {
                title: 'Why it lands',
                body: 'There is nowhere quite like it. Star dunes on one side, Atlantic surf on the other, and no infrastructure in between. It forces you to slow down and absorb something genuinely extraordinary.',
              },
              {
                title: 'Best moment to go',
                body: 'Sunrise runs are best — the light on the dune faces is extraordinary and the tidal window is usually more forgiving in the morning.',
              },
              {
                title: 'How to fold it into the day',
                body: 'Pair with Walvis Bay flamingos or a lagoon kayak the same day. The contrast between the still lagoon and the wild dune coast is one of the best one-day sequences on the Namibian coast.',
              },
            ],
            visitTips: ['Only accessible by 4x4 — no exceptions', 'Check tides before committing', 'Bring a guide who knows the beach crossing'],
            primaryLabel: 'Add to coastal route',
            secondaryLabel: 'Back to gems',
          },
          {
            title: 'Cape Cross Seal Reserve',
            description: 'One of the largest Cape fur seal colonies on Earth — hundreds of thousands of seals along the Skeleton Coast.',
            imageUri: CAPE_CROSS_IMAGE,
            coordinate: [13.9500, -21.7667],
            geography: { region: 'Erongo', town: 'Henties Bay' },
            badge: 'Wildlife Mass',
            locationLabel: 'Skeleton Coast, 120 km north of Swakopmund',
            summary:
              'An overwhelming, unforgettable experience — vast numbers of seals, constant noise, the smell of the ocean, and jackals patrolling the edge. Raw, unfiltered wildlife at scale.',
            tripFit: [
              {
                label: 'Best vibe',
                value: 'RAW NATURE',
                detail: 'For travelers who want wildlife that is not manicured — this is the opposite of a polished game drive.',
                icon: 'compass',
                tone: 'dark',
              },
              {
                label: 'Time ask',
                value: '2 HOURS',
                detail: 'Enough to absorb the scale without needing a longer stay.',
                icon: 'clock',
                tone: 'accent',
              },
              {
                label: 'Who it suits',
                value: 'COASTAL ROAD TRIPPERS',
                detail: 'Best folded into a self-drive route along the Skeleton Coast.',
                icon: 'users',
                tone: 'light',
              },
            ],
            sections: [
              {
                title: 'Why it lands',
                body: 'The sheer scale is what gets you. This is not a zoo or a curated wildlife experience — it is hundreds of thousands of animals living in a genuinely hostile, beautiful place.',
              },
              {
                title: 'Best moment to go',
                body: 'Early morning on a windier day reduces the smell and gives better light for photography.',
              },
              {
                title: 'How to fold it into the day',
                body: 'Combine with the drive up the Skeleton Coast toward the Hoanib River mouth or use it as a stop on a Swakopmund to Damaraland self-drive.',
              },
            ],
            visitTips: ['Go on a windy day — reduces the smell significantly', 'Open from 08:00', 'Pair with a Skeleton Coast drive'],
            primaryLabel: 'Add to coastal route',
            secondaryLabel: 'Back to gems',
          },
          // ── DAMARALAND / KUNENE ───────────────────────────────────────────
          {
            title: 'Twyfelfontein Rock Engravings',
            description: 'Over 2,000 San rock engravings at Namibia\'s first UNESCO World Heritage Site in Damaraland.',
            imageUri: TWYFELFONTEIN_IMAGE,
            coordinate: [14.3667, -20.5833],
            geography: { region: 'Kunene', town: 'Khorixas area' },
            badge: 'UNESCO',
            locationLabel: 'Damaraland, 110 km from Khorixas',
            summary:
              'A true open-air art gallery — San shamans carved these images into sandstone around 6,000 years ago. One of Africa\'s most significant concentrations of ancient rock art.',
            tripFit: [
              {
                label: 'Best vibe',
                value: 'DEEP HISTORY',
                detail: 'For travelers who want context, culture, and landscape woven together.',
                icon: 'compass',
                tone: 'dark',
              },
              {
                label: 'Time ask',
                value: '2–3 HOURS',
                detail: 'Worth spending proper time with a guide who can explain the iconography.',
                icon: 'clock',
                tone: 'accent',
              },
              {
                label: 'Who it suits',
                value: 'CULTURE SEEKERS',
                detail: 'Particularly rewarding for travelers who want more than landscapes alone.',
                icon: 'users',
                tone: 'light',
              },
            ],
            sections: [
              {
                title: 'Why it lands',
                body: 'The engravings are remarkable, but it is the landscape around them that gives the place its weight. Rugged red rock, absolute silence, and the sense of standing in a place people have returned to for millennia.',
              },
              {
                title: 'Best moment to go',
                body: 'Early morning when the light is lateral and the temperature is manageable. The site itself is exposed, so midday visits are uncomfortable.',
              },
              {
                title: 'How to fold it into the day',
                body: 'Combine with the Organ Pipes basalt columns and Burnt Mountain nearby — both within 10 km and collectively make a strong Damaraland geology and art half-day.',
              },
            ],
            visitTips: ['Guided tours only — this protects the engravings', 'Combine with Organ Pipes and Burnt Mountain nearby', 'Wear sun protection — very exposed site'],
            primaryLabel: 'Add to Damaraland route',
            secondaryLabel: 'Back to gems',
          },
          {
            title: 'Brandberg White Lady Hike',
            description: 'Trek to the famous San rock painting inside Namibia\'s highest mountain massif in Damaraland.',
            imageUri: BRANDBERG_IMAGE,
            coordinate: [14.6833, -21.1167],
            geography: { region: 'Erongo', town: 'Uis' },
            badge: 'Cultural Trek',
            locationLabel: 'Brandberg Massif, near Uis',
            summary:
              'A proper 4 km round-trip hike through a striking river gorge to see ancient San rock art that is over 2,000 years old — in the dramatic setting of the Brandberg, Namibia\'s highest peak at 2,573 m.',
            tripFit: [
              {
                label: 'Best vibe',
                value: 'ADVENTURE + CULTURE',
                detail: 'For travelers who want physical effort rewarded with genuine cultural discovery.',
                icon: 'compass',
                tone: 'dark',
              },
              {
                label: 'Time ask',
                value: '3 HOURS',
                detail: 'A committed morning outing best started before 08:00 to beat the heat.',
                icon: 'clock',
                tone: 'accent',
              },
              {
                label: 'Who it suits',
                value: 'ACTIVE PAIRS OR GROUPS',
                detail: 'Suitable for any reasonably fit traveler — the hike is not technical but demands attention in the heat.',
                icon: 'users',
                tone: 'light',
              },
            ],
            sections: [
              {
                title: 'Why it lands',
                body: 'The gorge itself is spectacular even before you reach the paintings. Large boulders, dry riverbed, and the towering Brandberg cliffs around you. The final painting site feels earned.',
              },
              {
                title: 'Best moment to go',
                body: 'Start at dawn. The heat inside the gorge builds quickly by mid-morning and the hike is far less enjoyable after 10:00.',
              },
              {
                title: 'How to fold it into the day',
                body: 'Position Uis as an overnight base and do the hike on day two, then continue north to Twyfelfontein or the Skeleton Coast. The road to Swakopmund from Uis is scenic and well graded.',
              },
            ],
            visitTips: ['Start before 08:00 to avoid extreme heat', 'A mandatory guide is required — hire at the site', 'Carry at least 2 litres of water per person'],
            primaryLabel: 'Add to Damaraland route',
            secondaryLabel: 'Back to gems',
          },
          {
            title: 'Petrified Forest',
            description: 'Ancient tree trunks over 300 million years old, lying scattered in open desert northwest of Khorixas.',
            imageUri: PETRIFIED_FOREST_IMAGE,
            coordinate: [14.0, -20.0],
            geography: { region: 'Kunene', town: 'Khorixas' },
            badge: 'Geological Wonder',
            locationLabel: '40 km west of Khorixas',
            summary:
              'An eerie, open landscape scattered with enormous fossilised tree trunks — some up to 30 m long — from forests that were here before the dinosaurs. A genuinely disorienting and beautiful place.',
            tripFit: [
              {
                label: 'Best vibe',
                value: 'DEEP TIME',
                detail: 'Best for travelers who enjoy geological wonder and ancient history in a raw setting.',
                icon: 'compass',
                tone: 'dark',
              },
              {
                label: 'Time ask',
                value: '1.5 HOURS',
                detail: 'A focused stop that fits neatly into a Damaraland driving day.',
                icon: 'clock',
                tone: 'accent',
              },
              {
                label: 'Who it suits',
                value: 'CURIOUS EXPLORERS',
                detail: 'Works for any traveler — the scale and strangeness of the site impresses everyone.',
                icon: 'users',
                tone: 'light',
              },
            ],
            sections: [
              {
                title: 'Why it lands',
                body: 'The trunks are genuinely enormous, and the openness of the landscape lets you grasp just how many there are. It looks like a forest simply fell asleep 300 million years ago and slowly turned to stone.',
              },
              {
                title: 'Best moment to go',
                body: 'Morning light highlights the mineral colours in the silicified wood and keeps the ground temperature manageable.',
              },
              {
                title: 'How to fold it into the day',
                body: 'Combine with Twyfelfontein — the two sites share the same corridor and together give a strong ancient-Damaraland half-day.',
              },
            ],
            visitTips: ['Guided entry only — protects the fossils', 'Welwitschia plants also grow here — look for them', 'Pair with Twyfelfontein on the same day'],
            primaryLabel: 'Add to Damaraland route',
            secondaryLabel: 'Back to gems',
          },
          {
            title: 'Vingerklip (Finger Rock)',
            description: 'A 35-metre solitary dolomite column rising from the Ugab Terraces — one of Namibia\'s most striking geological formations.',
            imageUri: VINGERKLIP_IMAGE,
            coordinate: [15.42, -20.37],
            geography: { region: 'Kunene', town: 'Outjo area' },
            badge: 'Rock Formation',
            locationLabel: '95 km west of Outjo',
            summary:
              'A monolith that looks completely improbable — a narrow 35-metre column of dolomite limestone standing alone in a vast terrace landscape. Spectacular at sunset when the rock turns deep orange.',
            tripFit: [
              {
                label: 'Best vibe',
                value: 'SCENIC DETOUR',
                detail: 'Works as a scenic anchor on a central-to-northwest Namibia drive.',
                icon: 'compass',
                tone: 'dark',
              },
              {
                label: 'Time ask',
                value: '1 HOUR',
                detail: 'A focused stop with big visual payoff — no need to linger longer.',
                icon: 'clock',
                tone: 'accent',
              },
              {
                label: 'Who it suits',
                value: 'ROAD TRIPPERS',
                detail: 'Ideal for self-drive travelers using the Outjo-to-Damaraland corridor.',
                icon: 'users',
                tone: 'light',
              },
            ],
            sections: [
              {
                title: 'Why it lands',
                body: 'The isolation of the formation is what makes it dramatic. It stands completely alone in a coloured terrace landscape and catches the eye long before you reach it.',
              },
              {
                title: 'Best moment to go',
                body: 'Late afternoon gives the dolomite its warmest colour. Sunset from the lodge terrace nearby is exceptional.',
              },
              {
                title: 'How to fold it into the day',
                body: 'Use it on the drive from Outjo to Khorixas or Twyfelfontein. The lodge at Vingerklip is also one of the most scenic overnight stops in Namibia.',
              },
            ],
            visitTips: ['Time for late afternoon light', 'The lodge terrace offers a spectacular view at no cost', 'Combine with Khorixas as a transit stop'],
            primaryLabel: 'Add to driving route',
            secondaryLabel: 'Back to gems',
          },
          {
            title: 'Epupa Falls & Himba Villages',
            description: 'Multi-strand cascades on the Kunene River, deep in the remote Kaokoveld, with Himba community access.',
            imageUri: EPUPA_FALLS_IMAGE,
            coordinate: [13.2458, -17.0006],
            geography: { region: 'Kunene', town: 'Epupa' },
            badge: 'Far North',
            locationLabel: '920 km northwest of Windhoek',
            summary:
              'Namibia\'s most remote major destination — cascading falls on the Kunene border river, baobab trees, and one of the last places to genuinely encounter Himba culture in its living context.',
            tripFit: [
              {
                label: 'Best vibe',
                value: 'TRUE EXPEDITION',
                detail: 'For travelers willing to commit serious road time for something utterly unordinary.',
                icon: 'compass',
                tone: 'dark',
              },
              {
                label: 'Time ask',
                value: '2–3 NIGHTS',
                detail: 'The distance demands an overnight stay — rushing it defeats the purpose.',
                icon: 'clock',
                tone: 'accent',
              },
              {
                label: 'Who it suits',
                value: '4X4 ADVENTURERS',
                detail: 'A 4x4 is essential. The road is corrugated gravel for the final 200 km.',
                icon: 'users',
                tone: 'light',
              },
            ],
            sections: [
              {
                title: 'Why it lands',
                body: 'The falls are spectacular, but the wider experience — baobabs, the Kunene River, Himba camps along the road, complete remoteness — is what separates this from everything else in Namibia.',
              },
              {
                title: 'Best moment to go',
                body: 'The dry season (May–October) gives better road conditions and higher water levels from upstream rain. Avoid January–March when roads can become impassable.',
              },
              {
                title: 'How to fold it into the day',
                body: 'Fly into Opuwo or Epupa airstrip if road time is a constraint. Several charter operators run scheduled flights from Windhoek. The fly-in turns a 2-day drive into 40 minutes.',
              },
            ],
            visitTips: ['4x4 essential — no exceptions', 'Fly-in option via charter from Windhoek', 'Carry fuel for 400+ km — limited supply en route'],
            primaryLabel: 'Plan the Kaokoveld route',
            secondaryLabel: 'Back to gems',
          },
          // ── SOUTHERN NAMIBIA ──────────────────────────────────────────────
          {
            title: 'Kolmanskop Ghost Town',
            description: 'A once-opulent diamond mining settlement now half-buried under Namib sand — 10 km from Lüderitz.',
            imageUri: KOLMANSKOP_IMAGE,
            coordinate: [15.2333, -26.7000],
            geography: { region: 'Karas', town: 'Lüderitz' },
            badge: 'Ghost Town',
            locationLabel: '10 km east of Lüderitz',
            summary:
              'One of Africa\'s most photographed ruins — a complete diamond-era German colonial town, abandoned in 1956, with sand dunes drifting through ballrooms, bowling alleys, and mansions. Cinematic and haunting.',
            tripFit: [
              {
                label: 'Best vibe',
                value: 'CINEMATIC RUIN',
                detail: 'For photographers and history lovers who want somewhere that genuinely stops them in their tracks.',
                icon: 'compass',
                tone: 'dark',
              },
              {
                label: 'Time ask',
                value: '2 HOURS',
                detail: 'The morning guided tour runs 09:30–11:00 and is the best-lit window for photography.',
                icon: 'clock',
                tone: 'accent',
              },
              {
                label: 'Who it suits',
                value: 'ANY TRAVELER',
                detail: 'Accessible and genuinely compelling for any traveler, regardless of interest in history.',
                icon: 'users',
                tone: 'light',
              },
            ],
            sections: [
              {
                title: 'Why it lands',
                body: 'The juxtaposition is the point. Edwardian architecture, a bowling alley, a hospital — all preserved by the dry climate and slowly being reclaimed by the desert. It does not feel staged because it genuinely is not.',
              },
              {
                title: 'Best moment to go',
                body: 'Morning entry (09:00) gives the best light inside the buildings and keeps the temperature manageable before the desert heat builds.',
              },
              {
                title: 'How to fold it into the day',
                body: 'Combine with Lüderitz town, the penguin colony at Halifax Island, and the coastal drive south. Lüderitz itself has good German colonial architecture and fresh seafood.',
              },
            ],
            visitTips: ['Tours run at 09:30 and 11:00 — book in advance', 'Photography is the main draw — bring a wide lens', 'Combine with Lüderitz town for a full southern day'],
            primaryLabel: 'Add to southern Namibia route',
            secondaryLabel: 'Back to gems',
          },
          {
            title: 'Quiver Tree Forest, Keetmanshoop',
            description: 'A surreal grove of 300-year-old aloe dichotoma trees standing golden in the southern Karas landscape.',
            imageUri: QUIVER_TREE_IMAGE,
            coordinate: [18.1500, -26.9667],
            geography: { region: 'Karas', town: 'Keetmanshoop' },
            badge: 'Desert Botanical',
            locationLabel: '14 km northeast of Keetmanshoop',
            summary:
              'One of Namibia\'s most distinctive landscapes — a grove of ancient quiver trees (Aloidendron dichotomum) glowing amber at dusk, set against a star-filled southern sky. A night photography icon.',
            tripFit: [
              {
                label: 'Best vibe',
                value: 'DUSK TO STARS',
                detail: 'The experience transforms completely from golden hour through to full dark — stay for both.',
                icon: 'compass',
                tone: 'dark',
              },
              {
                label: 'Time ask',
                value: '3 HOURS',
                detail: 'Arrive 90 minutes before sunset and stay through to stargazing.',
                icon: 'clock',
                tone: 'accent',
              },
              {
                label: 'Who it suits',
                value: 'PHOTOGRAPHERS + STARGAZERS',
                detail: 'Minimal light pollution and a photogenic landscape make this a standout night-sky stop.',
                icon: 'users',
                tone: 'light',
              },
            ],
            sections: [
              {
                title: 'Why it lands',
                body: 'The trees are remarkable on their own — ancient, architectural, and golden-barked. But the sky after dark is what people remember. The Milky Way over the grove is one of the great Namibia photography opportunities.',
              },
              {
                title: 'Best moment to go',
                body: 'Arrive at 16:00 for the warmest afternoon light, stay for sunset and then into stargazing as the sky darkens.',
              },
              {
                title: 'How to fold it into the day',
                body: 'Combine with the Giant\'s Playground rock formation 5 km away — an equally surreal landscape of stacked dolerite boulders. Together they form a strong Keetmanshoop half-day.',
              },
            ],
            visitTips: ['Camp overnight for the best stargazing window', 'The Giants Playground is 5 km away — combine both', 'Bring a tripod for night photography'],
            primaryLabel: 'Add to southern route',
            secondaryLabel: 'Back to gems',
          },
          {
            title: 'Ai-Ais Hot Springs & Fish River Canyon',
            description: 'Natural thermal springs at the bottom of Africa\'s largest canyon — a dramatic end to any southern Namibia route.',
            imageUri: AI_AIS_IMAGE,
            coordinate: [17.5167, -27.9167],
            geography: { region: 'Karas', town: 'Ai-Ais' },
            badge: 'Remote Spa',
            locationLabel: 'Fish River Canyon National Park south',
            summary:
              'Hot sulphur springs at the base of the Fish River Canyon — one of Africa\'s largest gorges. The resort here is the only accommodation inside the canyon itself, with pools fed by thermal water.',
            tripFit: [
              {
                label: 'Best vibe',
                value: 'CANYON + RECOVERY',
                detail: 'Perfect after the Fish River Canyon rim hike or as a standalone southern Namibia slow-stop.',
                icon: 'compass',
                tone: 'dark',
              },
              {
                label: 'Time ask',
                value: 'OVERNIGHT',
                detail: 'The springs are best appreciated in the morning after a night in the canyon.',
                icon: 'clock',
                tone: 'accent',
              },
              {
                label: 'Who it suits',
                value: 'ALL PACES',
                detail: 'Works for hikers finishing the Fish River trail and for anyone who just wants an unusual place to stop.',
                icon: 'users',
                tone: 'light',
              },
            ],
            sections: [
              {
                title: 'Why it lands',
                body: 'Soaking in hot springs inside a canyon that took 500 million years to carve is the kind of juxtaposition that makes travel memorable. The landscape is completely different from the north.',
              },
              {
                title: 'Best moment to go',
                body: 'Early morning in the hot pools before the day heats up. The canyon walls catch the first light and the steam from the springs makes for atmospheric photography.',
              },
              {
                title: 'How to fold it into the day',
                body: 'Combine with the canyon rim viewpoint at Hobas for a full south-canyon day. The two are 70 km apart — pair with an overnight at Ai-Ais to experience both.',
              },
            ],
            visitTips: ['Book accommodation in advance — limited capacity', 'Combine with Hobas canyon viewpoint', 'The Fish River 5-day hike ends here (May–August only)'],
            primaryLabel: 'Add to southern canyon route',
            secondaryLabel: 'Back to gems',
          },
          {
            title: "Giant's Playground",
            description: 'A chaotic landscape of stacked dolerite boulders near Keetmanshoop — free to explore on your own.',
            imageUri: HOBA_IMAGE,
            coordinate: [18.1500, -26.9667],
            geography: { region: 'Karas', town: 'Keetmanshoop' },
            badge: 'Free Access',
            locationLabel: '5 km from Quiver Tree Forest',
            summary:
              'Enormous black dolerite boulders piled in improbable formations across a wide plateau — the result of ancient lava cooling and cracking over millions of years. Completely free to walk through.',
            tripFit: [
              {
                label: 'Best vibe',
                value: 'STRANGE LANDSCAPE',
                detail: 'For travelers who enjoy geological oddities that require no explanation to appreciate.',
                icon: 'compass',
                tone: 'dark',
              },
              {
                label: 'Time ask',
                value: '1 HOUR',
                detail: 'A tight, satisfying stop that pairs perfectly with the Quiver Tree Forest.',
                icon: 'clock',
                tone: 'accent',
              },
              {
                label: 'Who it suits',
                value: 'SELF-DRIVE TRAVELERS',
                detail: 'Completely self-guided and free to enter — perfect for road trip detours.',
                icon: 'users',
                tone: 'light',
              },
            ],
            sections: [
              {
                title: 'Why it lands',
                body: 'The boulders look placed deliberately — enormous, rounded, and stacked up to 5 metres high. Walking through them feels like wandering through a sculptor\'s oversized studio.',
              },
              {
                title: 'Best moment to go',
                body: 'Late afternoon gives the black dolerite a warmer tone and the shadows between the rocks create strong contrast for photography.',
              },
              {
                title: 'How to fold it into the day',
                body: 'Combine with the Quiver Tree Forest 5 km away for a strong Keetmanshoop pairing — both are on the same road north of town.',
              },
            ],
            visitTips: ['No entrance fee — just drive in and walk', 'Combine with Quiver Tree Forest on the same stop', 'Late afternoon light works beautifully on the black rock'],
            primaryLabel: 'Add to Keetmanshoop stop',
            secondaryLabel: 'Back to gems',
          },
          // ── CENTRAL NAMIBIA ───────────────────────────────────────────────
          {
            title: 'Duwisib Castle',
            description: 'A baronial German colonial castle, improbably marooned in the remote Namib landscape south of Maltahöhe.',
            imageUri: DUWISIB_IMAGE,
            coordinate: [16.5444, -25.2611],
            geography: { region: 'Hardap', town: 'Maltahöhe' },
            badge: 'Colonial Curiosity',
            locationLabel: '72 km southwest of Maltahöhe',
            summary:
              'Built in 1908 by a German cavalry captain and his American heiress wife, then abandoned after World War I — Duwisib Castle sits in one of the most improbable settings imaginable. Empty, preserved, and strange.',
            tripFit: [
              {
                label: 'Best vibe',
                value: 'HISTORIC ODDITY',
                detail: 'For travelers who enjoy colonial history embedded in an unlikely desert landscape.',
                icon: 'compass',
                tone: 'dark',
              },
              {
                label: 'Time ask',
                value: '2 HOURS',
                detail: 'A solid stop that includes the castle interior museum and the surrounding farm.',
                icon: 'clock',
                tone: 'accent',
              },
              {
                label: 'Who it suits',
                value: 'HISTORY ENTHUSIASTS',
                detail: 'Particularly compelling for travelers interested in colonial Namibia and its architectural traces.',
                icon: 'users',
                tone: 'light',
              },
            ],
            sections: [
              {
                title: 'Why it lands',
                body: 'The castle is built entirely from local stone and filled with antique German furniture and weapons. The story of the couple who built it — and never returned after the war — gives it a genuinely melancholic weight.',
              },
              {
                title: 'Best moment to go',
                body: 'Morning visits are cooler and the interior rooms light up well. The castle is east-facing, so afternoon light on the exterior is particularly striking.',
              },
              {
                title: 'How to fold it into the day',
                body: 'Use it on the route between Sossusvlei and Fish River Canyon — it sits roughly midway and breaks up what would otherwise be a very long driving day.',
              },
            ],
            visitTips: ['A museum inside tells the full story of the castle\'s owners', 'Accommodation available on the farm for an overnight stop', 'Ideal mid-point on the Sossusvlei to Fish River Canyon route'],
            primaryLabel: 'Add to southern route',
            secondaryLabel: 'Back to gems',
          },
          {
            title: 'Waterberg Plateau Outlook',
            description: 'A quieter sandstone escarpment with broad red-rock panoramas and calmer foot traffic than the main parks.',
            imageUri: WATERBERG_IMAGE,
            coordinate: [17.2833, -20.4667],
            geography: { region: 'Otjozondjupa', town: 'Otjiwarongo' },
            badge: 'Plateau Detour',
            locationLabel: '67 km east of Otjiwarongo',
            summary:
              'A strong mid-trip altitude and silence reset — broad sandstone plateau, protected wildlife including white and black rhino, and viewpoints with dramatically different colour from the rest of central Namibia.',
            tripFit: [
              {
                label: 'Best vibe',
                value: 'SCENIC RESET',
                detail: 'Works when the itinerary needs one slower, more expansive viewpoint between busier park days.',
                icon: 'compass',
                tone: 'dark',
              },
              {
                label: 'Time ask',
                value: '2–3 HOURS',
                detail: 'Enough to feel the plateau without forcing an overnight.',
                icon: 'clock',
                tone: 'accent',
              },
              {
                label: 'Who it suits',
                value: 'ROAD TRIPPERS',
                detail: 'Good for self-drive travelers linking central and northern Namibia on the B1/C22.',
                icon: 'users',
                tone: 'light',
              },
            ],
            sections: [
              {
                title: 'Why it lands',
                body: 'The payoff is the perspective change. After flatter country and highway transfers, the plateau gives the trip a new rhythm and a genuine sense of elevation and colour.',
              },
              {
                title: 'Best moment to go',
                body: 'Late afternoon gives the cliff faces stronger colour and keeps any walking more comfortable.',
              },
              {
                title: 'How to fold it into the day',
                body: 'Treat it as a scenic anchor on a central Namibia road day — a real stop, not a rushed photo opportunity between longer drives.',
              },
            ],
            visitTips: ['Pack water for plateau walks', 'NWR manages the park — entry fees apply', 'Works well between Windhoek and Etosha on the B1'],
            primaryLabel: 'Add scenic stop',
            secondaryLabel: 'Back to gems',
          },
          {
            title: 'Cheetah Conservation Fund, Otjiwarongo',
            description: 'The world\'s largest cheetah conservation project — guided tours and ambassador animal encounters.',
            imageUri: CHEETAH_IMAGE,
            coordinate: [16.9333, -20.5667],
            geography: { region: 'Otjozondjupa', town: 'Otjiwarongo' },
            badge: 'Conservation',
            locationLabel: '44 km north of Otjiwarongo',
            summary:
              'Founded in 1990, the CCF runs the world\'s largest cheetah conservation program on a 100,000-acre research farm. Guided tours include cheetah encounters, livestock guarding dogs, and the education centre.',
            tripFit: [
              {
                label: 'Best vibe',
                value: 'IMPACT TRAVEL',
                detail: 'For travelers who want their experience to connect to genuine conservation work.',
                icon: 'compass',
                tone: 'dark',
              },
              {
                label: 'Time ask',
                value: '3–4 HOURS',
                detail: 'Tours run morning and afternoon — the morning run gives better light and cooler temperatures.',
                icon: 'clock',
                tone: 'accent',
              },
              {
                label: 'Who it suits',
                value: 'WILDLIFE ADVOCATES',
                detail: 'Particularly strong for families and travelers who want depth alongside the wildlife encounter.',
                icon: 'users',
                tone: 'light',
              },
            ],
            sections: [
              {
                title: 'Why it lands',
                body: 'You walk among ambassador cheetahs and learn why they are in conflict with Namibia\'s farming communities. It is a deeply considered experience — the context makes the animal encounter meaningful rather than performative.',
              },
              {
                title: 'Best moment to go',
                body: 'Morning tours (09:30) give the best cheetah activity and cooler conditions. Feeding time is part of the tour.',
              },
              {
                title: 'How to fold it into the day',
                body: 'Position it on the drive between Windhoek and Etosha — Otjiwarongo is almost exactly at the halfway point on the B1. A natural and worthwhile stop before or after Etosha.',
              },
            ],
            visitTips: ['Book tours online in advance — popular with groups', 'The onsite museum is excellent and worth the full time', 'Pairs well as a Windhoek-to-Etosha midpoint stop'],
            primaryLabel: 'Add to Etosha route',
            secondaryLabel: 'Back to gems',
          },
          {
            title: 'Hoba Meteorite, Grootfontein',
            description: 'The largest known meteorite on Earth — a 60-tonne iron mass sitting exactly where it landed 80,000 years ago.',
            imageUri: HOBA_IMAGE,
            coordinate: [17.9344, -19.5833],
            geography: { region: 'Otjozondjupa', town: 'Grootfontein' },
            badge: 'Cosmic Relic',
            locationLabel: '20 km west of Grootfontein',
            summary:
              'The Hoba Meteorite is the heaviest naturally occurring iron mass on Earth — 60 tonnes, over 2 metres across, and sitting in the same field where it hit 80,000 years ago. Strange, accessible, and genuinely awe-inspiring.',
            tripFit: [
              {
                label: 'Best vibe',
                value: 'COSMIC CURIOSITY',
                detail: 'For travelers who appreciate unusual, specific landmarks that require context to fully appreciate.',
                icon: 'compass',
                tone: 'dark',
              },
              {
                label: 'Time ask',
                value: '45 MIN',
                detail: 'A tightly contained stop that fits neatly into a Grootfontein–Etosha driving day.',
                icon: 'clock',
                tone: 'accent',
              },
              {
                label: 'Who it suits',
                value: 'CURIOUS TRAVELLERS',
                detail: 'Accessible from the tar road and genuinely impressive for any visitor.',
                icon: 'users',
                tone: 'light',
              },
            ],
            sections: [
              {
                title: 'Why it lands',
                body: 'There is something disorienting about standing next to a piece of space that fell to Earth 80,000 years ago and just stayed where it landed. It is not a manufactured experience — it is simply a rock from space in a field.',
              },
              {
                title: 'Best moment to go',
                body: 'Any time of day works — it is shaded by a small shelter and the site has good infrastructure for a brief visit.',
              },
              {
                title: 'How to fold it into the day',
                body: 'Use it on the drive from Etosha east gate to Grootfontein or Tsumeb. It adds under an hour to the journey and is one of Namibia\'s more genuinely weird stops.',
              },
            ],
            visitTips: ['Small entrance fee applies — managed by NHC', 'Good for families and curious travelers of all ages', 'Pairs well with the Lake Otjikoto sinkhole 20 km away'],
            primaryLabel: 'Add to Etosha east route',
            secondaryLabel: 'Back to gems',
          },
          // ── NORTHEAST / CAPRIVI STRIP ─────────────────────────────────────
          {
            title: 'Popa Falls, Divundu',
            description: 'A series of rapids and small falls on the Okavango River — lush, green, and completely unlike the rest of Namibia.',
            imageUri: POPA_FALLS_IMAGE,
            coordinate: [18.2167, -18.0833],
            geography: { region: 'Kavango East', town: 'Divundu' },
            badge: 'River Country',
            locationLabel: 'Divundu on the Okavango River',
            summary:
              'Not dramatic waterfalls — more a broad, rushing series of rapids that signal the transition from Namibia\'s dry interior to the lush Caprivi Strip. The greenery alone is a reason to stop.',
            tripFit: [
              {
                label: 'Best vibe',
                value: 'GREEN CONTRAST',
                detail: 'The vegetation here feels like a different country entirely from the Namib — a refreshing gear change.',
                icon: 'compass',
                tone: 'dark',
              },
              {
                label: 'Time ask',
                value: '1 HOUR',
                detail: 'A satisfying stop for anyone driving east through the Caprivi Strip.',
                icon: 'clock',
                tone: 'accent',
              },
              {
                label: 'Who it suits',
                value: 'TRANSIT TRAVELERS',
                detail: 'Best as a stretch stop on the long east drive toward Katima Mulilo.',
                icon: 'users',
                tone: 'light',
              },
            ],
            sections: [
              {
                title: 'Why it lands',
                body: 'The abrupt change of landscape from sand and scrub to dense riverine forest and rushing water is genuinely striking. After days of desert, the lushness feels earned.',
              },
              {
                title: 'Best moment to go',
                body: 'Morning is best — calm water, birds active, and good light on the rapids.',
              },
              {
                title: 'How to fold it into the day',
                body: 'Stop on the drive east from Rundu toward Bwabwata National Park. The short boardwalk and viewing point take under an hour and the campsite here is one of the most atmospheric in the Caprivi.',
              },
            ],
            visitTips: ['Good campsite here with birding access', 'Otters are regularly spotted in the early morning', 'Combine with Bwabwata on the same day'],
            primaryLabel: 'Add to Caprivi route',
            secondaryLabel: 'Back to gems',
          },
          {
            title: 'NamibRand Nature Reserve Stargazing',
            description: 'One of the world\'s first International Dark Sky Reserves — absolute darkness over a vast private reserve bordering Sossusvlei.',
            imageUri: NAMIBRAND_IMAGE,
            coordinate: [16.1000, -25.0500],
            geography: { region: 'Hardap', town: 'Sesriem area' },
            badge: 'Dark Sky Reserve',
            locationLabel: 'NamibRand, east of Sossusvlei',
            summary:
              'Africa\'s first International Dark Sky Reserve, covering 172,200 hectares bordering the Namib-Naukluft National Park. The combination of zero light pollution, high altitude desert air, and open dune landscape produces Milky Way views that are difficult to match anywhere in southern Africa.',
            tripFit: [
              {
                label: 'Best vibe',
                value: 'COSMIC STILLNESS',
                detail: 'For travelers who want the definitive Namibia night sky experience beyond just camping.',
                icon: 'compass',
                tone: 'dark',
              },
              {
                label: 'Time ask',
                value: 'OVERNIGHT',
                detail: 'The sky builds slowly after sunset and is best between 22:00 and 02:00.',
                icon: 'clock',
                tone: 'accent',
              },
              {
                label: 'Who it suits',
                value: 'NATURE LOVERS',
                detail: 'Works for any traveler — the sky is so dramatic that no prior astronomy knowledge is needed.',
                icon: 'users',
                tone: 'light',
              },
            ],
            sections: [
              {
                title: 'Why it lands',
                body: 'The absence of any light for 100 kilometres in every direction produces a sky that most people have never seen. The Milky Way throws a shadow. It is genuinely transformative.',
              },
              {
                title: 'Best moment to go',
                body: 'New moon nights in the dry season (May–October) give the best conditions. The reserve enforces strict dark-sky compliance — no white lights after dark.',
              },
              {
                title: 'How to fold it into the day',
                body: 'Combine with Sossusvlei — the reserve borders the national park. A Sossusvlei sunrise drive followed by an overnight at NamibRand is one of the best two-day sequences in Namibia.',
              },
            ],
            visitTips: ['New moon nights give the best conditions', 'Several lodges inside the reserve enforce dark-sky protocols', 'Combine with Sossusvlei on the same trip section'],
            primaryLabel: 'Add to Sossusvlei route',
            secondaryLabel: 'Back to gems',
          },
          // ── WINDHOEK AREA ─────────────────────────────────────────────────
          {
            title: 'Old Brewery Courtyard',
            description: 'A tucked-away Windhoek courtyard with local fashion rails, coffee, and design pop-ups.',
            imageUri: WINDHOEK_IMAGE,
            coordinate: [17.0832, -22.5700],
            geography: { region: 'Khomas', town: 'Windhoek' },
            badge: 'City Find',
            locationLabel: 'Windhoek West',
            summary:
              'The kind of easy capital stop that helps a first day feel grounded, especially when you want local texture before heading out into the wider country.',
            tripFit: [
              {
                label: 'Best vibe',
                value: 'SOFT START',
                detail: 'Ideal for easing into the trip without committing to a full-day outing.',
                icon: 'compass',
                tone: 'dark',
              },
              {
                label: 'Time ask',
                value: '60 MIN',
                detail: 'Long enough for coffee, shopping, and a reset before the next move.',
                icon: 'clock',
                tone: 'accent',
              },
              {
                label: 'Who it suits',
                value: 'ANYONE ARRIVING',
                detail: 'Best for travelers using Windhoek as the launch point into the rest of Namibia.',
                icon: 'users',
                tone: 'light',
              },
            ],
            sections: [
              {
                title: 'Why it lands',
                body: 'It provides a contemporary, structured side of Windhoek that feels connected to the city\'s maker culture. It is low-friction and rewarding for even a brief visit.',
              },
            ],
            visitTips: ['Good coffee on site', 'Look for local design pop-ups', 'Easy walk from Independence Avenue'],
            primaryLabel: 'Add to Windhoek day',
            secondaryLabel: 'Back to gems',
          },
        ];
