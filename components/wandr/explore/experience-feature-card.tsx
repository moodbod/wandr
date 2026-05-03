import { ClockCountdown, Compass, UsersThree } from 'phosphor-react-native';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { designSystem } from '@/constants/design-system';

export type ExperienceFeatureCardItem = {
  label: string;
  value: string;
  detail: string;
  icon: 'compass' | 'clock' | 'users';
  tone?: 'dark' | 'light' | 'accent';
};

function renderIcon(icon: ExperienceFeatureCardItem['icon'], color: string) {
  switch (icon) {
    case 'clock':
      return <ClockCountdown color={color} size={22} weight="fill" />;
    case 'users':
      return <UsersThree color={color} size={22} weight="fill" />;
    case 'compass':
    default:
      return <Compass color={color} size={22} weight="fill" />;
  }
}

export function ExperienceFeatureCard({ label, value, detail, icon, tone = 'light' }: ExperienceFeatureCardItem) {
  const isDarkCard = tone === 'dark';
  const isAccentCard = tone === 'accent';
  const cardStyle = isDarkCard ? styles.cardDark : isAccentCard ? styles.cardAccent : styles.cardLight;
  const iconBadgeStyle = isDarkCard
    ? styles.iconBadgeDark
    : isAccentCard
      ? styles.iconBadgeAccent
      : styles.iconBadgeLight;
  const iconColor = isDarkCard ? designSystem.colors.lime : isAccentCard ? designSystem.colors.darkGreen : designSystem.colors.white;

  return (
    <View style={[styles.card, cardStyle]}>
      <View style={styles.cardTop}>
        <View style={[styles.iconBadge, iconBadgeStyle]}>{renderIcon(icon, iconColor)}</View>
        <ThemedText style={isDarkCard ? styles.labelDark : styles.labelLight}>{label}</ThemedText>
      </View>
      <View style={styles.cardBottom}>
        <ThemedText
          adjustsFontSizeToFit
          minimumFontScale={0.78}
          numberOfLines={2}
          style={isDarkCard ? styles.valueDark : styles.valueLight}>
          {value}
        </ThemedText>
        <ThemedText style={isDarkCard ? styles.detailDark : styles.detailLight}>{detail}</ThemedText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    minHeight: 214,
    borderRadius: designSystem.radii.feature,
    padding: 22,
    justifyContent: 'space-between',
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 16,
  },
  cardBottom: {
    gap: 12,
    marginTop: 28,
  },
  cardDark: {
    backgroundColor: designSystem.colors.charcoal,
  },
  cardLight: {
    backgroundColor: designSystem.colors.lightSurfaceWarm,
  },
  cardAccent: {
    backgroundColor: designSystem.colors.lime,
  },
  iconBadge: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBadgeDark: {
    backgroundColor: designSystem.colors.limeSoft,
  },
  iconBadgeLight: {
    backgroundColor: designSystem.colors.darkBackground,
  },
  iconBadgeAccent: {
    backgroundColor: designSystem.colors.charcoalGlass,
  },
  labelDark: {
    flex: 1,
    textAlign: 'right',
    fontSize: 11,
    lineHeight: 12,
    fontWeight: '600',
    color: designSystem.colors.darkTextSoft,
  },
  labelLight: {
    flex: 1,
    textAlign: 'right',
    fontSize: 11,
    lineHeight: 12,
    fontWeight: '600',
    color: designSystem.colors.subtleText,
  },
  valueDark: {
    fontSize: 30,
    lineHeight: 34,
    fontWeight: '600',
    includeFontPadding: false,
    color: designSystem.colors.background,
  },
  valueLight: {
    fontSize: 30,
    lineHeight: 34,
    fontWeight: '600',
    includeFontPadding: false,
    color: designSystem.colors.darkBackground,
  },
  detailDark: {
    maxWidth: '92%',
    fontSize: 15,
    lineHeight: 21,
    fontWeight: '600',
    color: designSystem.colors.darkTextSoft,
  },
  detailLight: {
    maxWidth: '92%',
    fontSize: 15,
    lineHeight: 21,
    fontWeight: '600',
    color: designSystem.colors.mutedText,
  },
});
