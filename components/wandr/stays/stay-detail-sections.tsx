import { CaretDown, CaretUp, Star } from 'phosphor-react-native';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { WandrAvatar } from '@/components/wandr/avatar';
import { darkSheetPalette } from '@/components/wandr/stays/stay-detail-model';
import { styles } from '@/components/wandr/stays/stay-detail-screen.styles';
import { designSystem } from '@/constants/design-system';

export function SectionHeading({ title, subtitle, isDark }: { title: string; subtitle?: string; isDark: boolean }) {
  return (
    <View style={styles.sectionHeading}>
      <ThemedText style={[styles.sectionTitle, isDark && styles.sectionTitleDark]}>{title}</ThemedText>
      {subtitle ? (
        <ThemedText style={[styles.sectionSubtitle, isDark && styles.sectionSubtitleDark]}>{subtitle}</ThemedText>
      ) : null}
    </View>
  );
}

export function StayDetailsDropdown({
  isDark,
  items,
}: {
  isDark: boolean;
  items: readonly { label: string; value: string }[];
}) {
  const [openItemKey, setOpenItemKey] = useState<string | null>(null);
  const mutedColor = isDark ? darkSheetPalette.mutedText : designSystem.colors.warmDark;

  return (
    <View style={[styles.detailDropdown, isDark && styles.detailDropdownDark]}>
      {items.map((item, index) => {
        const itemKey = `${item.label}-${item.value}`;
        const open = openItemKey === itemKey;
        const Icon = open ? CaretUp : CaretDown;

        return (
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ expanded: open }}
            key={itemKey}
            onPress={() => setOpenItemKey(open ? null : itemKey)}
            style={[
              styles.detailDropdownRow,
              index < items.length - 1 ? styles.detailDropdownRowBorder : null,
              isDark && index < items.length - 1 ? styles.detailDropdownRowBorderDark : null,
            ]}
          >
            <View style={styles.detailDropdownSummary}>
              <ThemedText style={[styles.detailLabel, isDark && styles.detailLabelDark]}>
                {item.label}
              </ThemedText>
              <Icon color={mutedColor} size={18} weight="bold" />
            </View>
            {open ? (
              <ThemedText style={[styles.detailValue, isDark && styles.detailValueDark]}>
                {item.value}
              </ThemedText>
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
}

export function SelectionPill({
  isDark,
  active,
  label,
  onPress,
}: {
  isDark: boolean;
  active: boolean;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={[
        styles.selectionPill,
        isDark && styles.selectionPillDark,
        active && styles.selectionPillActive,
        isDark && active && styles.selectionPillActiveDark,
      ]}
      onPress={onPress}>
      <ThemedText
        style={[
          styles.selectionPillText,
          isDark && styles.selectionPillTextDark,
          active && styles.selectionPillTextActive,
          isDark && active && styles.selectionPillTextActiveDark,
        ]}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

export function SelectionRow({
  isDark,
  active,
  label,
  detail,
  onPress,
}: {
  isDark: boolean;
  active: boolean;
  label: string;
  detail: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={[styles.selectionRow, isDark && styles.selectionRowDark, active && styles.selectionRowActive]}
      onPress={onPress}>
      <View style={styles.selectionRowCopy}>
        <ThemedText
          style={[
            styles.selectionRowLabel,
            isDark && styles.selectionRowLabelDark,
            active && styles.selectionRowLabelActive,
            isDark && active && styles.selectionRowLabelActiveDark,
          ]}>
          {label}
        </ThemedText>
        <ThemedText
          style={[
            styles.selectionRowDetail,
            isDark && styles.selectionRowDetailDark,
            active && styles.selectionRowDetailActive,
            isDark && active && styles.selectionRowDetailActiveDark,
          ]}>
          {detail}
        </ThemedText>
      </View>
      <View style={[styles.selectionRowDot, isDark && styles.selectionRowDotDark, active && styles.selectionRowDotActive]} />
    </Pressable>
  );
}

export function CounterField({
  isDark,
  label,
  value,
  min,
  max,
  onChange,
}: {
  isDark: boolean;
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
}) {
  return (
    <View style={styles.counterRow}>
      <ThemedText style={[styles.counterLabel, isDark && styles.counterLabelDark]}>{label}</ThemedText>
      <View style={styles.counterControls}>
        <Pressable
          style={[styles.counterButton, isDark && styles.counterButtonDark]}
          disabled={value <= min}
          onPress={() => onChange(Math.max(min, value - 1))}>
          <ThemedText style={[styles.counterButtonText, isDark && styles.counterButtonTextDark]}>-</ThemedText>
        </Pressable>
        <ThemedText style={[styles.counterValue, isDark && styles.counterValueDark]}>{value}</ThemedText>
        <Pressable
          style={[styles.counterButton, isDark && styles.counterButtonDark]}
          disabled={value >= max}
          onPress={() => onChange(Math.min(max, value + 1))}>
          <ThemedText style={[styles.counterButtonText, isDark && styles.counterButtonTextDark]}>+</ThemedText>
        </Pressable>
      </View>
    </View>
  );
}

export function ReviewCard({
  avatarUri,
  name,
  visitedAt,
  quote,
  isDark,
  rating,
  regionLabel,
}: {
  avatarUri?: string | null;
  name: string;
  visitedAt: string;
  quote: string;
  isDark: boolean;
  rating?: number;
  regionLabel?: string;
}) {
  return (
    <View style={[styles.reviewCard, isDark && styles.reviewCardDark]}>
      <View style={styles.reviewHeader}>
        <View style={styles.reviewAvatar}>
          <WandrAvatar name={name} size={42} uri={avatarUri} />
        </View>
        <View>
          <ThemedText style={[styles.reviewName, isDark && styles.reviewNameDark]}>{name}</ThemedText>
          <View style={styles.reviewMetaRow}>
            <ThemedText style={styles.reviewVisited}>{visitedAt}</ThemedText>
            {regionLabel ? <ThemedText style={styles.reviewVisited}>• {regionLabel}</ThemedText> : null}
          </View>
        </View>
      </View>
      {rating ? (
        <View style={styles.reviewRatingRow}>
          {[1, 2, 3, 4, 5].map((value) => (
            <Star
              key={value}
              size={14}
              weight={value <= rating ? 'fill' : 'regular'}
              color={value <= rating ? designSystem.colors.lime : isDark ? designSystem.colors.darkMutedText : designSystem.colors.gray}
            />
          ))}
        </View>
      ) : null}
      {quote ? <ThemedText style={[styles.reviewQuote, isDark && styles.reviewQuoteDark]}>{quote}</ThemedText> : null}
    </View>
  );
}
