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
  const iconColor = isDarkCard ? designSystem.colors.lime : isAccentCard ? designSystem.colors.darkGreen : '#ffffff';

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
    backgroundColor: '#171915',
  },
  cardLight: {
    backgroundColor: '#f4f4ef',
  },
  cardAccent: {
    backgroundColor: '#9fe870',
  },
  iconBadge: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBadgeDark: {
    backgroundColor: 'rgba(159, 232, 112, 0.16)',
  },
  iconBadgeLight: {
    backgroundColor: '#11130f',
  },
  iconBadgeAccent: {
    backgroundColor: 'rgba(23, 25, 21, 0.08)',
  },
  labelDark: {
    flex: 1,
    textAlign: 'right',
    fontSize: 11,
    lineHeight: 12,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: 'rgba(249, 249, 246, 0.72)',
  },
  labelLight: {
    flex: 1,
    textAlign: 'right',
    fontSize: 11,
    lineHeight: 12,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: 'rgba(17, 19, 15, 0.44)',
  },
  valueDark: {
    fontSize: 46,
    lineHeight: 54,
    fontWeight: '700',
    letterSpacing: -2.2,
    textTransform: 'uppercase',
    includeFontPadding: false,
    color: '#f9f9f6',
  },
  valueLight: {
    fontSize: 46,
    lineHeight: 54,
    fontWeight: '700',
    letterSpacing: -2.2,
    textTransform: 'uppercase',
    includeFontPadding: false,
    color: '#11130f',
  },
  detailDark: {
    maxWidth: '92%',
    fontSize: 15,
    lineHeight: 21,
    fontWeight: '700',
    color: 'rgba(249, 249, 246, 0.72)',
  },
  detailLight: {
    maxWidth: '92%',
    fontSize: 15,
    lineHeight: 21,
    fontWeight: '700',
    color: 'rgba(17, 19, 15, 0.62)',
  },
});
