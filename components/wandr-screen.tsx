import { Link } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { WandrActionCard } from '@/components/wandr/action-card';
import { WandrBulletRow } from '@/components/wandr/bullet-row';
import { WandrHeader } from '@/components/wandr/header';
import { WandrSection } from '@/components/wandr/section';
import { appContent, type WandrScreenContent, type WandrScreenKey } from '@/constants/app-content';
import { designSystem } from '@/constants/design-system';

type WandrScreenProps = {
  screen: WandrScreenKey;
};

export function WandrScreen({ screen }: WandrScreenProps) {
  const content = appContent[screen] as WandrScreenContent;
  const { header, eyebrow, title, description, actions = [], actionsTitle = 'Child screens', sections = [] } =
    content;

  return (
    <ThemedView style={styles.root}>
      <WandrHeader config={header} />
      <ScrollView contentContainerStyle={styles.content}>
        <ThemedView
          lightColor={designSystem.colors.surfaceMuted}
          darkColor={designSystem.colors.darkSurface}
          style={styles.hero}
        >
          <ThemedText style={styles.eyebrow}>{eyebrow}</ThemedText>
          <View style={styles.heroCopy}>
            <ThemedText type="title" style={styles.heroTitle}>{title}</ThemedText>
            <ThemedText>{description}</ThemedText>
          </View>
        </ThemedView>

        {actions.length > 0 ? (
          <WandrSection title={actionsTitle}>
            <View style={styles.cardList}>
              {actions.map((action) => (
                <Link href={action.href} key={action.label} asChild>
                  <WandrActionCard title={action.label} description={action.description} />
                </Link>
              ))}
            </View>
          </WandrSection>
        ) : null}

        {sections.map((section) => (
          <WandrSection title={section.title} key={section.title}>
            <ThemedView
              lightColor={designSystem.colors.surface}
              darkColor={designSystem.colors.darkSurface}
              style={styles.panel}
            >
              {section.items.map((item) => (
                <WandrBulletRow key={item}>{item}</WandrBulletRow>
              ))}
            </ThemedView>
          </WandrSection>
        ))}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  content: {
    padding: designSystem.layout.screenPadding,
    paddingBottom: designSystem.spacing.xxxl,
    gap: designSystem.layout.sectionGap,
  },
  cardList: {
    gap: designSystem.layout.cardGap,
  },
  hero: {
    padding: designSystem.spacing.xl,
    borderRadius: designSystem.radii.hero,
    gap: designSystem.spacing.sm,
  },
  eyebrow: {
    ...designSystem.type.eyebrow,
    color: designSystem.colors.darkGreen,
  },
  heroCopy: {
    gap: designSystem.spacing.sm,
  },
  heroTitle: designSystem.type.title,
  panel: {
    borderRadius: designSystem.radii.panel,
    padding: designSystem.layout.cardPadding,
    gap: designSystem.spacing.sm,
  },
});
