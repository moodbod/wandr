import { Link, type Href } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

type ActionLink = {
  href: Href;
  label: string;
  description: string;
};

type ContentSection = {
  title: string;
  items: string[];
};

type WandrScreenProps = {
  eyebrow: string;
  title: string;
  description: string;
  actions?: ActionLink[];
  sections?: ContentSection[];
};

export function WandrScreen({
  eyebrow,
  title,
  description,
  actions = [],
  sections = [],
}: WandrScreenProps) {
  return (
    <ThemedView style={styles.root}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.hero}>
          <ThemedText style={styles.eyebrow}>{eyebrow}</ThemedText>
          <ThemedText type="title" style={styles.title}>
            {title}
          </ThemedText>
          <ThemedText style={styles.description}>{description}</ThemedText>
        </View>

        {actions.length > 0 ? (
          <View style={styles.block}>
            <ThemedText type="subtitle" style={styles.sectionTitle}>
              Child screens
            </ThemedText>
            <View style={styles.cardList}>
              {actions.map((action) => (
                <Link href={action.href} key={action.label} asChild>
                  <ThemedView style={styles.card}>
                    <ThemedText type="defaultSemiBold" style={styles.cardTitle}>
                      {action.label}
                    </ThemedText>
                    <ThemedText style={styles.cardDescription}>{action.description}</ThemedText>
                  </ThemedView>
                </Link>
              ))}
            </View>
          </View>
        ) : null}

        {sections.map((section) => (
          <View style={styles.block} key={section.title}>
            <ThemedText type="subtitle" style={styles.sectionTitle}>
              {section.title}
            </ThemedText>
            <ThemedView style={styles.panel}>
              {section.items.map((item) => (
                <View key={item} style={styles.row}>
                  <View style={styles.dot} />
                  <ThemedText style={styles.rowText}>{item}</ThemedText>
                </View>
              ))}
            </ThemedView>
          </View>
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
    padding: 20,
    paddingBottom: 40,
    gap: 24,
  },
  hero: {
    gap: 10,
    padding: 24,
    borderRadius: 28,
    backgroundColor: '#eef7e7',
  },
  eyebrow: {
    textTransform: 'uppercase',
    letterSpacing: 1.1,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '700',
    color: '#47672d',
  },
  title: {
    fontSize: 34,
    lineHeight: 38,
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
  },
  block: {
    gap: 12,
  },
  sectionTitle: {
    fontSize: 22,
  },
  cardList: {
    gap: 12,
  },
  card: {
    borderRadius: 24,
    padding: 18,
    backgroundColor: '#f4f4f1',
  },
  cardTitle: {
    fontSize: 18,
    marginBottom: 4,
  },
  cardDescription: {
    fontSize: 15,
    lineHeight: 22,
  },
  panel: {
    borderRadius: 24,
    padding: 18,
    backgroundColor: '#f4f4f1',
    gap: 14,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 999,
    backgroundColor: '#9fe870',
    marginTop: 8,
  },
  rowText: {
    flex: 1,
    fontSize: 15,
    lineHeight: 22,
  },
});
