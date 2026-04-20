export const defaultExplorePageSeed = {
  slug: 'default',
  content: {
    home: {
      hero: {
        title: 'Explore',
        locationLabel: 'Erongo Region, NA',
        centerCoordinate: [14.5266, -22.6784],
        markers: [
          {
            id: 'tandem-skydive',
            coordinate: [14.513, -22.682],
            experienceSlug: 'tandem-skydive',
            imageUri:
              'https://lh3.googleusercontent.com/aida-public/AB6AXuBBtfFbx9Hxjs7g3GkzDVpEWx9aqpns22anS7muKu-SPG-PGqg-iyo3gXW4yoiCyW-q2h0lrRrL1IMDArraoamsxBwHMQO8i4_UYQXBMCFn7_0Ta2B-VIbTtuwCqoBsFMq1Z5SRsOoxtCEabmseOnWRw-6j-MDgV1wizNi1MdpjZzzLIGeSwayEOOBjAnl7CF2CfEANJfcZMJTPqJJGeMmepv7iFPzUL0tesS0BEPp5CXZeOgRh7fl7igTIESOPjuh9jXyrZKPQ9dQ',
            label: 'Skydive',
            tone: 'accent',
          },
          {
            id: 'quad-sandboard',
            coordinate: [14.543, -22.667],
            experienceSlug: 'quad-sandboard',
            imageUri:
              'https://lh3.googleusercontent.com/aida-public/AB6AXuCKYdhOl4BZwNRIgtwmgTzMBOFCqRQHfe6Dt55uex7GmKnMAxv5C2O32HnN_30lQGYaaOu4jZ_L7pPe8gQS4cEpFYOWyxdHcOcGbJPbXYLi5S_832Sza2QipVFnZs6DKgjLONvzwG1yrojTImsSRS1As5bKLztnVFXXq0QFCyDmKev3p-rVhfZAu5HZMRiaS2uXuCZUwO3sd9c4-3sF4MkmSqP-cj9w26WAOZkT1k9bUQYFVHNDuPNhJ7Lk841-wTrDuPBdpkn35PA',
            label: 'Sandboard',
            tone: 'dark',
          },
        ],
      },
      section: {
        eyebrow: 'Adventure Hub',
        title: 'Today in the Dunes',
      },
      activities: [
        {
          experienceSlug: 'tandem-skydive',
          badge: 'Top Rated',
          badgeTone: 'accent',
          ctaLabel: 'Book Experience',
          imageUri:
            'https://lh3.googleusercontent.com/aida-public/AB6AXuBBtfFbx9Hxjs7g3GkzDVpEWx9aqpns22anS7muKu-SPG-PGqg-iyo3gXW4yoiCyW-q2h0lrRrL1IMDArraoamsxBwHMQO8i4_UYQXBMCFn7_0Ta2B-VIbTtuwCqoBsFMq1Z5SRsOoxtCEabmseOnWRw-6j-MDgV1wizNi1MdpjZzzLIGeSwayEOOBjAnl7CF2CfEANJfcZMJTPqJJGeMmepv7iFPzUL0tesS0BEPp5CXZeOgRh7fl7igTIESOPjuh9jXyrZKPQ9dQ',
          price: 'EUR 180',
          priceSuffix: 'Per person',
          subtitle: 'Freefall over the Namib Desert',
          title: 'Tandem Skydive',
        },
        {
          experienceSlug: 'quad-sandboard',
          badge: 'Best Value',
          badgeTone: 'soft',
          ctaLabel: 'Book Experience',
          imageUri:
            'https://lh3.googleusercontent.com/aida-public/AB6AXuCKYdhOl4BZwNRIgtwmgTzMBOFCqRQHfe6Dt55uex7GmKnMAxv5C2O32HnN_30lQGYaaOu4jZ_L7pPe8gQS4cEpFYOWyxdHcOcGbJPbXYLi5S_832Sza2QipVFnZs6DKgjLONvzwG1yrojTImsSRS1As5bKLztnVFXXq0QFCyDmKev3p-rVhfZAu5HZMRiaS2uXuCZUwO3sd9c4-3sF4MkmSqP-cj9w26WAOZkT1k9bUQYFVHNDuPNhJ7Lk841-wTrDuPBdpkn35PA',
          price: 'EUR 65',
          priceSuffix: 'Per person',
          subtitle: '4-Hour desert adventure',
          title: 'Quad + Sandboard',
        },
      ],
    },
    search: {
      intro: {
        title: 'Explore',
        description: 'Uncover the raw beauty of the Erongo coast through curated kinetic experiences.',
        tags: ['Namibia', 'Active Search'],
        searchPlaceholder: 'Search experiences, spots...',
      },
      featured: {
        hero: {
          experienceSlug: 'desert-adrenaline',
          badge: 'Adrenaline',
          title: 'Desert Adrenaline',
          description: 'Conquer the dunes of the Namib via 4x4 or high-speed sandboarding.',
          imageUri:
            'https://lh3.googleusercontent.com/aida-public/AB6AXuDP0wm5QppAYT1Y59Xf-t7Q8NjKOdQ3-1zbNaAKkUBFT7qlGx5lF3-HOvxHyYk56VsuncX4xuRuF7jkAdUWMXQ2tSg3ZYJjrueufiAq_zJIwBh0ZiynWwX2lAXETq5bYVMe-Pbg1JfD6SM67ZQdjxcMnfSpgfCnqFxlwtb5s8RIr9antErPacM3N0xtwD6CasUVxbKq012XAcU08p4qXob6ZsskdGdCzkdK_1w7_pq_vMLqPo4p9YBNX-EQQFwibYwFffcdWyU70EQ',
          ctaLabel: 'Book Experience',
        },
        detail: {
          experienceSlug: 'taste-of-swakop',
          category: 'Gastronomy',
          title: 'Taste of Swakop',
          description: 'The freshest Atlantic oysters paired with local craft brews at the Jetty.',
          price: 'USD 45',
          priceSuffix: '/pp',
          imageUri:
            'https://lh3.googleusercontent.com/aida-public/AB6AXuBJddW1UqyZ1RaFB7sRKZ94sGChYpjH1dDAXWD1tJTszBNUSM63gTe_-VY_leNsGeY4DglaeBwdXV_QcQJ8-ImEIp3sZWUiTQTCWjQ91cjbnvS8jFBRYWI11ZkyZFJFLLc1tsYXWDSGcQ6QZz1OKyTlyWwZ7J5BxoGEqrX4B5L4Pip6vpjhe6w1x3QPIbfj01fPy_bVMusTNgM7lvGZlDumVx0CUXk-2PYcuW00nj7tyao1NB8Z9KgqYJWub5RPI1zkHLdfK647xtc',
          ctaLabel: 'Book Experience',
        },
      },
      hiddenGems: {
        title: 'Hidden Gems',
        ctaLabel: 'View All',
        items: [
          {
            title: 'The Red Lighthouse',
            description: 'A nocturnal tour of the historic 1902 beacon and its hidden chambers.',
            imageUri:
              'https://lh3.googleusercontent.com/aida-public/AB6AXuCBFjeeT3dJYW6Jp2cHVCA7XVcup2uuU0vPoniYX1qDhn9DQcWTr0rUzojiNGWk5P2JdxqBEexWXWnBs5iZHZScgi9GugsIIgbJW8PRnoE4TTtaBxG1EqyezRcZitnLjBSF8o0Fu8EyF684C2pLITOOOD832cGT3pzyd3xXHGq9WNq1OFXre-sanXlu_Iq2Tz2vMxsr4GGY2hq72wbVr9Sh-vea_6HXnC9MIvxxqneRuKVPA3aA2ZMtyV4buJ27bGFXRElQZ7TBKy8',
            geography: { region: 'Erongo', town: 'Swakopmund' },
            badge: 'Night Pick',
            locationLabel: 'Jetty edge',
            summary:
              'A quieter coastal stop that feels cinematic after dark, especially when you want the day to end with something memorable but not overproduced.',
            tripFit: [
              {
                label: 'Best vibe',
                value: 'SUNSET DRIFT',
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
                body: 'The appeal is less about ticking off a landmark and more about the mood around it. The lighthouse gives you open sky, a strong silhouette, and just enough distance from the busier parts of town to feel like a real break in tempo.',
              },
              {
                title: 'Best moment to go',
                body: 'Aim for late blue hour into early night. You keep the color in the sky, the tower reads beautifully on camera, and the place feels calm instead of empty.',
              },
              {
                title: 'How to fold it into the day',
                body: 'Use it as the final note after a coastal dinner or as the scenic pause between town and wherever the night is heading next. It works best when it is part of a sequence, not the whole plan.',
              },
            ],
            visitTips: ['Bring a light layer', 'Best after dinner', 'Good photo stop without a long time commitment'],
            primaryLabel: 'Add to evening plan',
            secondaryLabel: 'Back to gems',
          },
          {
            title: 'Pink Salt Pans',
            description: 'Discover where the desert meets the sea in a surreal landscape of pink water.',
            imageUri:
              'https://lh3.googleusercontent.com/aida-public/AB6AXuC7DswLY8zqOIb9iDcjyR1gG8VJjEKdRFZrONWpG8BXd6nBiuL_h2BzdWJUxH4rP35v-vFX_1oUm9ntWI9HvsR8B0b20HkXBNDHS4rV6PH0YMrN9jZQvbzOK5VxPNo3lW9XpLq4s2HFRIwUw8PdwFbxyXjFbwQKe_pF1cn1_DdgUX6DKzmZk11PW8GDqy8YcaisPHABd_pK8G-bfdJxENgrdCdtGjjxiPByEpCIOMKU3FyMwTIj4MDwk8CNPrAEjR82Uj6yP6lmcv0',
            geography: { region: 'Erongo', town: 'Walvis Bay' },
            badge: 'Off Grid',
            locationLabel: 'Outside town',
            summary:
              'A strange, graphic landscape that feels like a detour worth making when the trip needs a little distance, texture, and something that does not read as standard sightseeing.',
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
                body: 'The salt pans feel transportive because the colors and openness are doing the work. It is not polished or heavily programmed, which is exactly why it reads as a discovery instead of a packaged stop.',
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
            visitTips: ['Go early for softer light', 'Pair with a late breakfast back in town', 'Worth it when you want a more unusual photo set'],
            primaryLabel: 'Add to day route',
            secondaryLabel: 'Back to gems',
          },
          {
            title: 'Art Alleyway',
            description: 'Guided walk through the evolving street art scene in the downtown district.',
            imageUri:
              'https://lh3.googleusercontent.com/aida-public/AB6AXuCo-PHRiyIgPnNeHOoWN9VibSom9bcCeDOK9Ey3acqY_lwZJ7DBJrvlZHVTSrVR6wxsBsgK21e0Vr9X9XeS5N1e83aaRPbgrm26dPC0o5hihzm3fDCjQKy_bnjsM-YYraH-1fCpq6ydObN7VseNYW2YjqvPLoXoaV6zDd-mdCTm6m6L5rksLF6rL4aZ2ZjxfWinelc2nnQpNKbUIr5KlmyGmGEJw8yu471FXs29EiQlGHNg56NvfVGvz71YYuuHqwIyNUwekC6rCdTc',
            geography: { region: 'Erongo', town: 'Swakopmund' },
            badge: 'Town Find',
            locationLabel: 'Town center',
            summary:
              'A smaller, more local-feeling pocket of town that pays off when you want detail, character, and something easy to blend into a walkable afternoon.',
            tripFit: [
              {
                label: 'Best vibe',
                value: 'LOCAL TEXTURE',
                detail: 'Great when the trip needs something intimate and less obviously tourist-led.',
                icon: 'compass',
                tone: 'dark',
              },
              {
                label: 'Time ask',
                value: '30 MIN',
                detail: 'An easy add-on between coffee, shopping, or an unhurried lunch.',
                icon: 'clock',
                tone: 'accent',
              },
              {
                label: 'Who it suits',
                value: 'ANY PACE',
                detail: 'Works whether you are solo, in a pair, or just filling a small gap in the day.',
                icon: 'users',
                tone: 'light',
              },
            ],
            sections: [
              {
                title: 'Why it lands',
                body: 'This is the kind of place that makes the town feel lived in instead of staged. The payoff is in the details: murals, textures, and the sense that you found a pocket others might walk straight past.',
              },
              {
                title: 'Best moment to go',
                body: 'Late afternoon works best when the town has relaxed a bit and you can wander without treating it like a timed stop.',
              },
              {
                title: 'How to fold it into the day',
                body: 'Pair it with coffee, browsing, or an easy lunch nearby. It is strongest as one note in a slow town sequence rather than a standalone destination.',
              },
            ],
            visitTips: ['Keep it casual and unhurried', 'Best paired with coffee or shopping', 'Ideal for a slower in-town afternoon'],
            primaryLabel: 'Save to town loop',
            secondaryLabel: 'Back to gems',
          },
        ],
      },
      map: {
        title: 'Live Map',
        description: '42 active experiences available nearby.',
        ctaLabel: 'Expand View',
        centerCoordinate: [14.5266, -22.6784],
        markers: [
          {
            id: 'taste-of-swakop',
            coordinate: [14.514, -22.673],
            experienceSlug: 'taste-of-swakop',
            imageUri:
              'https://lh3.googleusercontent.com/aida-public/AB6AXuBJddW1UqyZ1RaFB7sRKZ94sGChYpjH1dDAXWD1tJTszBNUSM63gTe_-VY_leNsGeY4DglaeBwdXV_QcQJ8-ImEIp3sZWUiTQTCWjQ91cjbnvS8jFBRYWI11ZkyZFJFLLc1tsYXWDSGcQ6QZz1OKyTlyWwZ7J5BxoGEqrX4B5L4Pip6vpjhe6w1x3QPIbfj01fPy_bVMusTNgM7lvGZlDumVx0CUXk-2PYcuW00nj7tyao1NB8Z9KgqYJWub5RPI1zkHLdfK647xtc',
            label: 'Jetty',
            tone: 'accent',
          },
          {
            id: 'desert-adrenaline',
            coordinate: [14.538, -22.689],
            experienceSlug: 'desert-adrenaline',
            imageUri:
              'https://lh3.googleusercontent.com/aida-public/AB6AXuDP0wm5QppAYT1Y59Xf-t7Q8NjKOdQ3-1zbNaAKkUBFT7qlGx5lF3-HOvxHyYk56VsuncX4xuRuF7jkAdUWMXQ2tSg3ZYJjrueufiAq_zJIwBh0ZiynWwX2lAXETq5bYVMe-Pbg1JfD6SM67ZQdjxcMnfSpgfCnqFxlwtb5s8RIr9antErPacM3N0xtwD6CasUVxbKq012XAcU08p4qXob6ZsskdGdCzkdK_1w7_pq_vMLqPo4p9YBNX-EQQFwibYwFffcdWyU70EQ',
            label: 'Dunes',
            tone: 'dark',
          },
        ],
      },
    },
    experiences: [
      {
        slug: 'tandem-skydive',
        badge: 'Top Rated',
        badgeTone: 'accent',
        ctaLabel: 'Reserve experience',
        title: 'Tandem Skydive',
        subtitle: 'Freefall over the Namib Desert',
        description:
          'Jump into a guided tandem skydive with wide-open views of the dunes, the Atlantic edge, and the full Swakopmund coastline before landing back near the desert strip.',
        imageUri:
          'https://lh3.googleusercontent.com/aida-public/AB6AXuBBtfFbx9Hxjs7g3GkzDVpEWx9aqpns22anS7muKu-SPG-PGqg-iyo3gXW4yoiCyW-q2h0lrRrL1IMDArraoamsxBwHMQO8i4_UYQXBMCFn7_0Ta2B-VIbTtuwCqoBsFMq1Z5SRsOoxtCEabmseOnWRw-6j-MDgV1wizNi1MdpjZzzLIGeSwayEOOBjAnl7CF2CfEANJfcZMJTPqJJGeMmepv7iFPzUL0tesS0BEPp5CXZeOgRh7fl7igTIESOPjuh9jXyrZKPQ9dQ',
        price: 'EUR 180',
        priceSuffix: 'Per person',
        category: 'Adventure',
        coordinate: [14.513, -22.682],
        geography: { region: 'Erongo', town: 'Swakopmund' },
        locationLabel: 'Swakopmund Airfield',
        durationLabel: '3 hours',
        groupSizeLabel: '2 people per jump',
        tripFit: [
          {
            label: 'Category',
            value: 'ADVENTURE',
            detail: 'Built for travelers chasing one headline moment in the desert.',
            icon: 'compass',
            tone: 'dark',
          },
          {
            label: 'Duration',
            value: '3 HOURS',
            detail: 'Easy to slot into a half-day plan without losing the rest of the trip.',
            icon: 'clock',
            tone: 'accent',
          },
          {
            label: 'Group Size',
            value: '2 PER JUMP',
            detail: 'Best when you want a tight tandem setup and fast movement on the ground.',
            icon: 'users',
            tone: 'light',
          },
        ],
        galleryImages: [
          'https://lh3.googleusercontent.com/aida-public/AB6AXuBBtfFbx9Hxjs7g3GkzDVpEWx9aqpns22anS7muKu-SPG-PGqg-iyo3gXW4yoiCyW-q2h0lrRrL1IMDArraoamsxBwHMQO8i4_UYQXBMCFn7_0Ta2B-VIbTtuwCqoBsFMq1Z5SRsOoxtCEabmseOnWRw-6j-MDgV1wizNi1MdpjZzzLIGeSwayEOOBjAnl7CF2CfEANJfcZMJTPqJJGeMmepv7iFPzUL0tesS0BEPp5CXZeOgRh7fl7igTIESOPjuh9jXyrZKPQ9dQ',
          'https://lh3.googleusercontent.com/aida-public/AB6AXuDP0wm5QppAYT1Y59Xf-t7Q8NjKOdQ3-1zbNaAKkUBFT7qlGx5lF3-HOvxHyYk56VsuncX4xuRuF7jkAdUWMXQ2tSg3ZYJjrueufiAq_zJIwBh0ZiynWwX2lAXETq5bYVMe-Pbg1JfD6SM67ZQdjxcMnfSpgfCnqFxlwtb5s8RIr9antErPacM3N0xtwD6CasUVxbKq012XAcU08p4qXob6ZsskdGdCzkdK_1w7_pq_vMLqPo4p9YBNX-EQQFwibYwFffcdWyU70EQ',
        ],
        travelerMomentum: {
          countryCode: 'DE',
          countryLabel: 'Germany',
          visitorCount: 42,
          summary: '42 travelers from Germany booked this drop zone recently.',
        },
        booking: {
          availabilityLabel: 'Next opening: Tomorrow at 09:00',
          confirmMode: 'Instant confirmation',
          addToTripLabel: 'Add to trip',
          continueWithoutTripLabel: 'Book without trip',
        },
        includes: ['Hotel pickup on request', 'Tandem instructor and safety gear', 'Pre-jump briefing', 'Landing transfer back to town'],
      },
      {
        slug: 'quad-sandboard',
        badge: 'Best Value',
        badgeTone: 'soft',
        ctaLabel: 'Reserve experience',
        title: 'Quad + Sandboard',
        subtitle: '4-Hour desert adventure',
        description:
          'Ride deep into the dunes by quad bike, stop for guided sandboarding runs, and settle into a slower scenic return with enough time to pair this with the rest of the day.',
        imageUri:
          'https://lh3.googleusercontent.com/aida-public/AB6AXuCKYdhOl4BZwNRIgtwmgTzMBOFCqRQHfe6Dt55uex7GmKnMAxv5C2O32HnN_30lQGYaaOu4jZ_L7pPe8gQS4cEpFYOWyxdHcOcGbJPbXYLi5S_832Sza2QipVFnZs6DKgjLONvzwG1yrojTImsSRS1As5bKLztnVFXXq0QFCyDmKev3p-rVhfZAu5HZMRiaS2uXuCZUwO3sd9c4-3sF4MkmSqP-cj9w26WAOZkT1k9bUQYFVHNDuPNhJ7Lk841-wTrDuPBdpkn35PA',
        price: 'EUR 65',
        priceSuffix: 'Per person',
        category: 'Adventure',
        coordinate: [14.543, -22.667],
        geography: { region: 'Erongo', town: 'Swakopmund' },
        locationLabel: 'Dune belt outside Swakopmund',
        durationLabel: '4 hours',
        groupSizeLabel: 'Up to 8 riders',
        tripFit: [
          {
            label: 'Category',
            value: 'ADVENTURE',
            detail: 'A more social desert session with motion from start to finish.',
            icon: 'compass',
            tone: 'dark',
          },
          {
            label: 'Duration',
            value: '4 HOURS',
            detail: 'Long enough to feel like a proper outing, short enough for a flexible day.',
            icon: 'clock',
            tone: 'light',
          },
          {
            label: 'Group Size',
            value: 'UP TO 8',
            detail: 'Works well for friends or mixed groups who want one shared booking.',
            icon: 'users',
            tone: 'accent',
          },
        ],
        galleryImages: [
          'https://lh3.googleusercontent.com/aida-public/AB6AXuCKYdhOl4BZwNRIgtwmgTzMBOFCqRQHfe6Dt55uex7GmKnMAxv5C2O32HnN_30lQGYaaOu4jZ_L7pPe8gQS4cEpFYOWyxdHcOcGbJPbXYLi5S_832Sza2QipVFnZs6DKgjLONvzwG1yrojTImsSRS1As5bKLztnVFXXq0QFCyDmKev3p-rVhfZAu5HZMRiaS2uXuCZUwO3sd9c4-3sF4MkmSqP-cj9w26WAOZkT1k9bUQYFVHNDuPNhJ7Lk841-wTrDuPBdpkn35PA',
          'https://lh3.googleusercontent.com/aida-public/AB6AXuDP0wm5QppAYT1Y59Xf-t7Q8NjKOdQ3-1zbNaAKkUBFT7qlGx5lF3-HOvxHyYk56VsuncX4xuRuF7jkAdUWMXQ2tSg3ZYJjrueufiAq_zJIwBh0ZiynWwX2lAXETq5bYVMe-Pbg1JfD6SM67ZQdjxcMnfSpgfCnqFxlwtb5s8RIr9antErPacM3N0xtwD6CasUVxbKq012XAcU08p4qXob6ZsskdGdCzkdK_1w7_pq_vMLqPo4p9YBNX-EQQFwibYwFffcdWyU70EQ',
        ],
        travelerMomentum: {
          countryCode: 'ZA',
          countryLabel: 'South Africa',
          visitorCount: 19,
          summary: '19 travelers from South Africa added this ride to their desert day.',
        },
        booking: {
          availabilityLabel: 'Open this afternoon',
          confirmMode: 'Guide approval within 1 hour',
          addToTripLabel: 'Add to trip',
          continueWithoutTripLabel: 'Book without trip',
        },
        includes: ['Guide-led desert route', 'Quad and sandboard rental', 'Protective gear', 'Water and cool-down stop'],
      },
      {
        slug: 'desert-adrenaline',
        badge: 'Adrenaline',
        ctaLabel: 'Reserve experience',
        title: 'Desert Adrenaline',
        subtitle: '4x4 dunes and high-speed sandboarding',
        description:
          'A fast, visual desert session built around dune driving, short adrenaline bursts, and enough flexibility to drop neatly into a trip day without turning into an editorial detour.',
        imageUri:
          'https://lh3.googleusercontent.com/aida-public/AB6AXuDP0wm5QppAYT1Y59Xf-t7Q8NjKOdQ3-1zbNaAKkUBFT7qlGx5lF3-HOvxHyYk56VsuncX4xuRuF7jkAdUWMXQ2tSg3ZYJjrueufiAq_zJIwBh0ZiynWwX2lAXETq5bYVMe-Pbg1JfD6SM67ZQdjxcMnfSpgfCnqFxlwtb5s8RIr9antErPacM3N0xtwD6CasUVxbKq012XAcU08p4qXob6ZsskdGdCzkdK_1w7_pq_vMLqPo4p9YBNX-EQQFwibYwFffcdWyU70EQ',
        price: 'N$1,850',
        priceSuffix: 'Per rider',
        category: 'Adventure',
        coordinate: [14.538, -22.689],
        geography: { region: 'Erongo', town: 'Swakopmund' },
        locationLabel: 'Namib dune corridor',
        durationLabel: 'Half day',
        groupSizeLabel: 'Small group',
        tripFit: [
          {
            label: 'Category',
            value: 'ADRENALINE',
            detail: 'For travelers who want speed, dunes, and a more cinematic route.',
            icon: 'compass',
            tone: 'accent',
          },
          {
            label: 'Duration',
            value: 'HALF DAY',
            detail: 'A bigger outing that still leaves room for a slower evening booking.',
            icon: 'clock',
            tone: 'dark',
          },
          {
            label: 'Group Size',
            value: 'SMALL GROUP',
            detail: 'Keeps the pace fast without turning the trip into a crowd experience.',
            icon: 'users',
            tone: 'light',
          },
        ],
        galleryImages: [
          'https://lh3.googleusercontent.com/aida-public/AB6AXuDP0wm5QppAYT1Y59Xf-t7Q8NjKOdQ3-1zbNaAKkUBFT7qlGx5lF3-HOvxHyYk56VsuncX4xuRuF7jkAdUWMXQ2tSg3ZYJjrueufiAq_zJIwBh0ZiynWwX2lAXETq5bYVMe-Pbg1JfD6SM67ZQdjxcMnfSpgfCnqFxlwtb5s8RIr9antErPacM3N0xtwD6CasUVxbKq012XAcU08p4qXob6ZsskdGdCzkdK_1w7_pq_vMLqPo4p9YBNX-EQQFwibYwFffcdWyU70EQ',
          'https://lh3.googleusercontent.com/aida-public/AB6AXuCKYdhOl4BZwNRIgtwmgTzMBOFCqRQHfe6Dt55uex7GmKnMAxv5C2O32HnN_30lQGYaaOu4jZ_L7pPe8gQS4cEpFYOWyxdHcOcGbJPbXYLi5S_832Sza2QipVFnZs6DKgjLONvzwG1yrojTImsSRS1As5bKLztnVFXXq0QFCyDmKev3p-rVhfZAu5HZMRiaS2uXuCZUwO3sd9c4-3sF4MkmSqP-cj9w26WAOZkT1k9bUQYFVHNDuPNhJ7Lk841-wTrDuPBdpkn35PA',
          'https://lh3.googleusercontent.com/aida-public/AB6AXuBBtfFbx9Hxjs7g3GkzDVpEWx9aqpns22anS7muKu-SPG-PGqg-iyo3gXW4yoiCyW-q2h0lrRrL1IMDArraoamsxBwHMQO8i4_UYQXBMCFn7_0Ta2B-VIbTtuwCqoBsFMq1Z5SRsOoxtCEabmseOnWRw-6j-MDgV1wizNi1MdpjZzzLIGeSwayEOOBjAnl7CF2CfEANJfcZMJTPqJJGeMmepv7iFPzUL0tesS0BEPp5CXZeOgRh7fl7igTIESOPjuh9jXyrZKPQ9dQ',
        ],
        travelerMomentum: {
          countryCode: 'DE',
          countryLabel: 'Germany',
          visitorCount: 42,
          summary: '42 travelers from Germany are visiting this week.',
        },
        booking: {
          availabilityLabel: 'Next opening: Sunset slot',
          confirmMode: 'Instant confirmation',
          addToTripLabel: 'Add to trip',
          continueWithoutTripLabel: 'Book without trip',
        },
        includes: ['4x4 dune transfer', 'Sandboard gear', 'Guide and safety briefing', 'Sunset ridge stop'],
      },
      {
        slug: 'taste-of-swakop',
        badge: 'Gastronomy',
        ctaLabel: 'Reserve table',
        title: 'Taste of Swakop',
        subtitle: 'Atlantic oysters and local craft brews',
        description:
          'A slower booking anchored around seafood, local pours, and the Jetty edge of town, ideal when the traveler wants one concrete reservation instead of a story-led browse.',
        imageUri:
          'https://lh3.googleusercontent.com/aida-public/AB6AXuBJddW1UqyZ1RaFB7sRKZ94sGChYpjH1dDAXWD1tJTszBNUSM63gTe_-VY_leNsGeY4DglaeBwdXV_QcQJ8-ImEIp3sZWUiTQTCWjQ91cjbnvS8jFBRYWI11ZkyZFJFLLc1tsYXWDSGcQ6QZz1OKyTlyWwZ7J5BxoGEqrX4B5L4Pip6vpjhe6w1x3QPIbfj01fPy_bVMusTNgM7lvGZlDumVx0CUXk-2PYcuW00nj7tyao1NB8Z9KgqYJWub5RPI1zkHLdfK647xtc',
        price: 'USD 45',
        priceSuffix: '/pp',
        category: 'Gastronomy',
        coordinate: [14.514, -22.673],
        geography: { region: 'Erongo', town: 'Swakopmund' },
        locationLabel: 'Swakopmund Jetty',
        durationLabel: '2 hours',
        groupSizeLabel: 'Tables from 2 to 6',
        tripFit: [
          {
            label: 'Category',
            value: 'DINING',
            detail: 'A calmer reservation for travelers who want one solid evening anchor.',
            icon: 'compass',
            tone: 'light',
          },
          {
            label: 'Duration',
            value: '2 HOURS',
            detail: 'Easy to layer after a beach day or before a quieter night in town.',
            icon: 'clock',
            tone: 'accent',
          },
          {
            label: 'Group Size',
            value: '2 TO 6',
            detail: 'Flexible for couples, small friend groups, or an easy celebration meal.',
            icon: 'users',
            tone: 'dark',
          },
        ],
        galleryImages: [
          'https://lh3.googleusercontent.com/aida-public/AB6AXuBJddW1UqyZ1RaFB7sRKZ94sGChYpjH1dDAXWD1tJTszBNUSM63gTe_-VY_leNsGeY4DglaeBwdXV_QcQJ8-ImEIp3sZWUiTQTCWjQ91cjbnvS8jFBRYWI11ZkyZFJFLLc1tsYXWDSGcQ6QZz1OKyTlyWwZ7J5BxoGEqrX4B5L4Pip6vpjhe6w1x3QPIbfj01fPy_bVMusTNgM7lvGZlDumVx0CUXk-2PYcuW00nj7tyao1NB8Z9KgqYJWub5RPI1zkHLdfK647xtc',
          'https://lh3.googleusercontent.com/aida-public/AB6AXuC7DswLY8zqOIb9iDcjyR1gG8VJjEKdRFZrONWpG8BXd6nBiuL_h2BzdWJUxH4rP35v-vFX_1oUm9ntWI9HvsR8B0b20HkXBNDHS4rV6PH0YMrN9jZQvbzOK5VxPNo3lW9XpLq4s2HFRIwUw8PdwFbxyXjFbwQKe_pF1cn1_DdgUX6DKzmZk11PW8GDqy8YcaisPHABd_pK8G-bfdJxENgrdCdtGjjxiPByEpCIOMKU3FyMwTIj4MDwk8CNPrAEjR82Uj6yP6lmcv0',
        ],
        travelerMomentum: {
          countryCode: 'GB',
          countryLabel: 'United Kingdom',
          visitorCount: 11,
          summary: '11 travelers from the United Kingdom reserved tables near the Jetty.',
        },
        booking: {
          availabilityLabel: 'Dinner tables open tonight',
          confirmMode: 'Restaurant confirmation',
          addToTripLabel: 'Add dinner to trip',
          continueWithoutTripLabel: 'Reserve without trip',
        },
        includes: ['Reserved table', 'Oyster tasting flight', 'Craft pairing option', 'Jetty-side seating request'],
      },
    ],
  },
} as const;

export const demoExploreTravelers = [
  { slug: 'local-demo-traveler', name: 'Lea', countryCode: 'DE', countryLabel: 'Germany' },
  { slug: 'anna-berlin', name: 'Anna', countryCode: 'DE', countryLabel: 'Germany' },
  { slug: 'jonas-hamburg', name: 'Jonas', countryCode: 'DE', countryLabel: 'Germany' },
  { slug: 'mia-munich', name: 'Mia', countryCode: 'DE', countryLabel: 'Germany' },
  { slug: 'liam-cape-town', name: 'Liam', countryCode: 'ZA', countryLabel: 'South Africa' },
  { slug: 'ava-joburg', name: 'Ava', countryCode: 'ZA', countryLabel: 'South Africa' },
  { slug: 'noah-london', name: 'Noah', countryCode: 'GB', countryLabel: 'United Kingdom' },
] as const;

export const demoExploreBookings = [
  { experienceSlug: 'desert-adrenaline', travelerSlug: 'anna-berlin' },
  { experienceSlug: 'desert-adrenaline', travelerSlug: 'jonas-hamburg' },
  { experienceSlug: 'desert-adrenaline', travelerSlug: 'mia-munich' },
  { experienceSlug: 'quad-sandboard', travelerSlug: 'liam-cape-town' },
  { experienceSlug: 'quad-sandboard', travelerSlug: 'ava-joburg' },
  { experienceSlug: 'taste-of-swakop', travelerSlug: 'noah-london' },
] as const;
