import { Link } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';

import { ThemedView } from '@/components/themed-view';
import { WandrActionCard } from '@/components/wandr/action-card';
import { WandrBulletRow } from '@/components/wandr/bullet-row';
import { WandrContentPanel } from '@/components/wandr/content-panel';
import { WandrHeader } from '@/components/wandr/header';
import { WandrScreenHero } from '@/components/wandr/screen-hero';
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
        <WandrScreenHero eyebrow={eyebrow} title={title} description={description} />

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
            <WandrContentPanel>
              {section.items.map((item) => (
                <WandrBulletRow key={item}>{item}</WandrBulletRow>
              ))}
            </WandrContentPanel>
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
});
