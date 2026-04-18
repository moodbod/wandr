import { Image } from 'expo-image';
import { Link, useRouter } from 'expo-router';
import { CaretLeft } from 'phosphor-react-native';
import { ScrollView, StyleSheet, View, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { GlassButton } from '@/components/ui/glass-button';
import { designSystem } from '@/constants/design-system';
import { exploreExperienceBookingContent } from '@/constants/explore-content';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function ExploreStoriesScreen() {
  const content = exploreExperienceBookingContent;
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const isDark = useColorScheme() === 'dark';

  return (
    <ThemedView style={styles.root}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + designSystem.spacing.sm, paddingBottom: insets.bottom + designSystem.spacing.xxxl },
        ]}>
        <View style={styles.hero}>
          <Image source={content.heroImageUri} contentFit="cover" style={styles.heroImage} />
          <View style={styles.heroOverlay} />
          <View style={[styles.heroActions, { top: insets.top + designSystem.spacing.sm }]}>
            <GlassButton onPress={() => router.back()} width={48} height={48}>
              <CaretLeft color="#ffffff" size={22} weight="bold" />
            </GlassButton>
          </View>
          <View style={styles.heroCopy}>
            <View style={styles.badge}>
              <ThemedText style={styles.badgeText}>{content.badge}</ThemedText>
            </View>
            <ThemedText style={styles.heroTitle} lightColor="#ffffff" darkColor="#ffffff">
              {content.title}
            </ThemedText>
            <ThemedText style={styles.heroLocation} lightColor="rgba(255,255,255,0.82)" darkColor="rgba(255,255,255,0.82)">
              {content.location}
            </ThemedText>
          </View>
        </View>

        <ThemedView
          lightColor={designSystem.colors.surface}
          darkColor={designSystem.colors.darkSurface}
          style={[
            styles.socialProof,
            { borderColor: isDark ? designSystem.colors.darkBorder : designSystem.colors.border },
          ]}>
          <View style={styles.socialProofCopy}>
            <View style={styles.avatarStack}>
              <View style={styles.avatar} />
              <View style={[styles.avatar, styles.avatarOffset, { backgroundColor: '#dfe9d6' }]} />
              <View style={[styles.avatarCount, styles.avatarOffset]}>
                <ThemedText style={styles.avatarCountText}>+42</ThemedText>
              </View>
            </View>
            <ThemedText type="defaultSemiBold" style={styles.socialProofText}>
              {content.socialProof.summary}
            </ThemedText>
          </View>
          <View style={styles.marketPill}>
            <ThemedText style={styles.marketPillText}>{content.socialProof.market}</ThemedText>
          </View>
        </ThemedView>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <ThemedText style={styles.sectionTitle}>Why Book This</ThemedText>
            <View style={styles.pricePill}>
              <ThemedText style={styles.priceText}>{content.price}</ThemedText>
              <ThemedText style={styles.priceSuffix}>{content.priceSuffix}</ThemedText>
            </View>
          </View>
          <ThemedText style={styles.summary}>{content.summary}</ThemedText>
          <View style={styles.highlightGrid}>
            {content.highlights.map((item) => (
              <View
                key={item}
                style={[
                  styles.highlightChip,
                  { borderColor: isDark ? designSystem.colors.darkBorder : designSystem.colors.border },
                ]}>
                <ThemedText style={styles.highlightChipText}>{item}</ThemedText>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>What&apos;s Included</ThemedText>
          <View style={styles.cardColumn}>
            {content.inclusions.map((item) => (
              <ThemedView
                key={item}
                lightColor="#ffffff"
                darkColor={designSystem.colors.darkSurface}
                style={[
                  styles.infoCard,
                  { borderColor: isDark ? designSystem.colors.darkBorder : designSystem.colors.border },
                ]}>
                <View style={styles.bullet} />
                <ThemedText type="defaultSemiBold" style={styles.infoCardText}>
                  {item}
                </ThemedText>
              </ThemedView>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>Booking Flow</ThemedText>
          <View style={styles.cardColumn}>
            {content.bookingSteps.map((step, index) => (
              <ThemedView
                key={step.title}
                lightColor={index === 1 ? designSystem.colors.surfaceMuted : '#ffffff'}
                darkColor={designSystem.colors.darkSurface}
                style={[
                  styles.stepCard,
                  { borderColor: isDark ? designSystem.colors.darkBorder : designSystem.colors.border },
                ]}>
                <View style={styles.stepIndex}>
                  <ThemedText style={styles.stepIndexText}>{index + 1}</ThemedText>
                </View>
                <View style={styles.stepCopy}>
                  <ThemedText style={styles.stepTitle}>{step.title}</ThemedText>
                  <ThemedText style={styles.stepDescription}>{step.description}</ThemedText>
                </View>
              </ThemedView>
            ))}
          </View>
        </View>

        <ThemedView
          lightColor="#ffffff"
          darkColor={designSystem.colors.darkSurface}
          style={[
            styles.stayCard,
            { borderColor: isDark ? designSystem.colors.darkBorder : designSystem.colors.border },
          ]}>
          <Image source={content.nearbyStay.imageUri} contentFit="cover" style={styles.stayImage} />
          <View style={styles.stayCopy}>
            <ThemedText style={styles.stayEyebrow}>{content.nearbyStay.eyebrow}</ThemedText>
            <ThemedText style={styles.stayTitle}>{content.nearbyStay.title}</ThemedText>
            <ThemedText style={styles.stayDescription}>{content.nearbyStay.description}</ThemedText>
          </View>
        </ThemedView>

        <View style={styles.actions}>
          <Link href="/trip/day-plan" asChild>
            <Pressable style={styles.primaryAction}>
              <ThemedText style={styles.primaryActionLabel}>{content.primaryActionLabel}</ThemedText>
            </Pressable>
          </Link>
          <Link href="/stays/details" asChild>
            <Pressable
              style={[
                styles.secondaryAction,
                { borderColor: isDark ? designSystem.colors.darkBorder : designSystem.colors.border },
              ]}>
              <ThemedText style={styles.secondaryActionLabel}>{content.secondaryActionLabel}</ThemedText>
            </Pressable>
          </Link>
        </View>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  content: {
    paddingHorizontal: designSystem.spacing.lg,
    gap: designSystem.spacing.xl,
  },
  hero: {
    minHeight: 420,
    borderRadius: designSystem.radii.section,
    overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  heroImage: {
    ...StyleSheet.absoluteFillObject,
  },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.26)',
  },
  heroCopy: {
    padding: 28,
    gap: 8,
  },
  heroActions: {
    position: 'absolute',
    left: designSystem.spacing.lg,
    zIndex: 2,
  },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: designSystem.colors.lime,
    borderRadius: designSystem.radii.pill,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  badgeText: {
    fontSize: 11,
    lineHeight: 12,
    fontWeight: '900',
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: designSystem.colors.darkGreen,
  },
  heroTitle: {
    fontSize: 52,
    lineHeight: 46,
    fontWeight: '900',
    letterSpacing: -2,
    textTransform: 'uppercase',
  },
  heroLocation: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '700',
  },
  socialProof: {
    borderRadius: designSystem.radii.feature,
    borderWidth: 1,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
  },
  socialProofCopy: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  avatarStack: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: designSystem.colors.mint,
    borderWidth: 2,
    borderColor: designSystem.colors.surface,
  },
  avatarOffset: {
    marginLeft: -12,
  },
  avatarCount: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: designSystem.colors.lime,
    borderWidth: 2,
    borderColor: designSystem.colors.surface,
  },
  avatarCountText: {
    fontSize: 10,
    lineHeight: 10,
    fontWeight: '900',
    color: designSystem.colors.darkGreen,
  },
  socialProofText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 18,
  },
  marketPill: {
    borderRadius: designSystem.radii.card,
    backgroundColor: designSystem.colors.mint,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  marketPillText: {
    fontSize: 12,
    lineHeight: 12,
    fontWeight: '800',
    color: designSystem.colors.darkGreen,
    textTransform: 'uppercase',
  },
  section: {
    gap: 14,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 16,
  },
  sectionTitle: {
    fontSize: 30,
    lineHeight: 28,
    fontWeight: '900',
    letterSpacing: -1,
    textTransform: 'uppercase',
  },
  pricePill: {
    alignItems: 'flex-end',
  },
  priceText: {
    fontSize: 32,
    lineHeight: 30,
    fontWeight: '900',
    color: designSystem.colors.darkGreen,
  },
  priceSuffix: {
    fontSize: 12,
    lineHeight: 14,
    fontWeight: '800',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: designSystem.colors.gray,
  },
  summary: {
    fontSize: 17,
    lineHeight: 25,
    fontWeight: '600',
    color: designSystem.colors.warmDark,
  },
  highlightGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  highlightChip: {
    borderWidth: 1,
    borderRadius: designSystem.radii.pill,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: designSystem.colors.surface,
  },
  highlightChipText: {
    fontSize: 13,
    lineHeight: 16,
    fontWeight: '800',
  },
  cardColumn: {
    gap: 12,
  },
  infoCard: {
    borderWidth: 1,
    borderRadius: designSystem.radii.feature,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  bullet: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: designSystem.colors.lime,
  },
  infoCardText: {
    flex: 1,
    fontSize: 15,
    lineHeight: 22,
  },
  stepCard: {
    borderWidth: 1,
    borderRadius: designSystem.radii.feature,
    padding: 18,
    flexDirection: 'row',
    gap: 14,
  },
  stepIndex: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: designSystem.colors.lime,
  },
  stepIndexText: {
    fontSize: 14,
    lineHeight: 14,
    fontWeight: '900',
    color: designSystem.colors.darkGreen,
  },
  stepCopy: {
    flex: 1,
    gap: 6,
  },
  stepTitle: {
    fontSize: 18,
    lineHeight: 20,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: -0.4,
  },
  stepDescription: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '600',
    color: designSystem.colors.warmDark,
  },
  stayCard: {
    borderWidth: 1,
    borderRadius: designSystem.radii.section,
    overflow: 'hidden',
  },
  stayImage: {
    width: '100%',
    height: 220,
  },
  stayCopy: {
    padding: 20,
    gap: 8,
  },
  stayEyebrow: {
    fontSize: 11,
    lineHeight: 12,
    fontWeight: '900',
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: designSystem.colors.darkGreen,
  },
  stayTitle: {
    fontSize: 28,
    lineHeight: 28,
    fontWeight: '900',
    letterSpacing: -0.8,
    textTransform: 'uppercase',
  },
  stayDescription: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '600',
    color: designSystem.colors.warmDark,
  },
  actions: {
    gap: 12,
  },
  primaryAction: {
    borderRadius: designSystem.radii.pill,
    backgroundColor: designSystem.colors.lime,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
  },
  primaryActionLabel: {
    fontSize: 15,
    lineHeight: 16,
    fontWeight: '900',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: designSystem.colors.darkGreen,
  },
  secondaryAction: {
    borderRadius: designSystem.radii.pill,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    backgroundColor: '#ffffff',
  },
  secondaryActionLabel: {
    fontSize: 15,
    lineHeight: 16,
    fontWeight: '900',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
});
