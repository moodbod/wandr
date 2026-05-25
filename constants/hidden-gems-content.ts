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

export function getHiddenGemSlug(title: string, explicitSlug?: string) {
  return (explicitSlug ?? title)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
