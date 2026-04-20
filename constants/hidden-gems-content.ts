export type HiddenGemDetailSection = {
  title: string;
  body: string;
};

export type HiddenGemDetailContent = {
  slug: string;
  title: string;
  badge: string;
  locationLabel: string;
  summary: string;
  tripFit: readonly {
    label: string;
    value: string;
    detail: string;
    icon: 'compass' | 'clock' | 'users';
    tone?: 'dark' | 'light' | 'accent';
  }[];
  sectionsTitle: string;
  sections: readonly HiddenGemDetailSection[];
  visitTips: readonly string[];
  primaryLabel: string;
  secondaryLabel: string;
};

export const hiddenGemDetails: Record<string, HiddenGemDetailContent> = {
  'the-red-lighthouse': {
    slug: 'the-red-lighthouse',
    title: 'The Red Lighthouse',
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
    sectionsTitle: 'The Appeal',
    sections: [
      {
        title: 'Why it lands',
        body:
          'The appeal is less about ticking off a landmark and more about the mood around it. The lighthouse gives you open sky, a strong silhouette, and just enough distance from the busier parts of town to feel like a real break in tempo.',
      },
      {
        title: 'Best moment to go',
        body:
          'Aim for late blue hour into early night. You keep the color in the sky, the tower reads beautifully on camera, and the place feels calm instead of empty.',
      },
      {
        title: 'How to fold it into the day',
        body:
          'Use it as the final note after a coastal dinner or as the scenic pause between town and wherever the night is heading next. It works best when it is part of a sequence, not the whole plan.',
      },
    ],
    visitTips: ['Bring a light layer', 'Best after dinner', 'Good photo stop without a long time commitment'],
    primaryLabel: 'Add to evening plan',
    secondaryLabel: 'Back to gems',
  },
  'pink-salt-pans': {
    slug: 'pink-salt-pans',
    title: 'Pink Salt Pans',
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
    sectionsTitle: 'The Draw',
    sections: [
      {
        title: 'Why it lands',
        body:
          'The salt pans feel transportive because the colors and openness are doing the work. It is not polished or heavily programmed, which is exactly why it reads as a discovery instead of a packaged stop.',
      },
      {
        title: 'Best moment to go',
        body:
          'Morning is strongest. The air feels cleaner, the light is softer, and the outing can still leave the rest of the day open for town or the coast.',
      },
      {
        title: 'How to fold it into the day',
        body:
          'Use it as the first commitment of the day, then come back into town for brunch or a lighter cultural stretch. It works best when you contrast the openness with somewhere more social afterward.',
      },
    ],
    visitTips: ['Go early for softer light', 'Pair with a late breakfast back in town', 'Worth it when you want a more unusual photo set'],
    primaryLabel: 'Add to day route',
    secondaryLabel: 'Back to gems',
  },
  'art-alleyway': {
    slug: 'art-alleyway',
    title: 'Art Alleyway',
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
    sectionsTitle: 'Why You Should Go',
    sections: [
      {
        title: 'Why it lands',
        body:
          'This is the kind of place that makes the town feel lived in instead of staged. The payoff is in the details: murals, textures, and the sense that you found a pocket others might walk straight past.',
      },
      {
        title: 'Best moment to go',
        body:
          'Late afternoon works best when the town has relaxed a bit and you can wander without treating it like a timed stop.',
      },
      {
        title: 'How to fold it into the day',
        body:
          'Pair it with coffee, browsing, or an easy lunch nearby. It is strongest as one note in a slow town sequence rather than a standalone destination.',
      },
    ],
    visitTips: ['Keep it casual and unhurried', 'Best paired with coffee or shopping', 'Ideal for a slower in-town afternoon'],
    primaryLabel: 'Save to town loop',
    secondaryLabel: 'Back to gems',
  },
};

export function getHiddenGemSlug(title: string) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
