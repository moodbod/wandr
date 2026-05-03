import BottomSheet, { BottomSheetScrollView, BottomSheetTextInput } from '@gorhom/bottom-sheet';
import { ChatsCircle, Gif, MagnifyingGlass, MapTrifold, SmileySticker, Sun } from 'phosphor-react-native';
import { type ReactNode, type RefObject, useMemo, useState } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { GlassBottomSheet } from '@/components/ui/glass-bottom-sheet';
import { designSystem } from '@/constants/design-system';
import { useColorScheme } from '@/hooks/use-color-scheme';

const stickerActions = [
  { key: 'mood', title: 'Mood stamp', icon: SmileySticker },
  { key: 'map-pin', title: 'Map pin', icon: MapTrifold },
  { key: 'check-in', title: 'Check-in', icon: ChatsCircle },
];

const gifActions = [
  { key: 'sunrise-gif', title: 'Sunrise', icon: Sun },
  { key: 'route-gif', title: 'Road trip', icon: Gif },
  { key: 'reply-gif', title: 'Quick reply', icon: ChatsCircle },
];

export function FriendChatToolsSheet({
  onChange,
  onQuickAction,
  onShareRoute,
  quickActions,
  sheetRef,
  showRouteButton = true,
}: {
  onChange?: (index: number) => void;
  onQuickAction: (key: string) => void;
  onShareRoute: () => void;
  quickActions: { key: string; label: string; description: string }[];
  sheetRef: RefObject<BottomSheet | null>;
  showRouteButton?: boolean;
}) {
  const sheetSnapPoints = useMemo(() => ['58%'], []);
  const [widgetSearch, setWidgetSearch] = useState('');
  const isDark = useColorScheme() === 'dark';
  const isAndroid = Platform.OS === 'android';
  const iconColor = isDark ? designSystem.colors.white : designSystem.colors.darkGreen;
  const androidSurfaceColor = isDark ? designSystem.colors.darkSurface : designSystem.colors.surfaceRaised;
  const androidBorderColor = isDark ? designSystem.colors.darkBorder : designSystem.colors.lightSurfaceAlt;

  const actionCards = useMemo(
    () =>
      quickActions
        .filter((action) => showRouteButton || action.key !== 'route')
        .map((action) => {
          if (action.key === 'route') {
            return {
              ...action,
              title: 'Trip map',
              description: 'Show the live route module in chat.',
              icon: MapTrifold,
              onPress: onShareRoute,
            };
          }

          if (action.key === 'sunrise') {
            return {
              ...action,
              title: 'Sunrise plan',
              description: 'Drop the timing widget for the next early start.',
              icon: Sun,
              onPress: () => onQuickAction(action.key),
            };
          }

          return {
            ...action,
            title: 'Quick check-in',
            description: 'Ask the group what they need before the next leg.',
            icon: ChatsCircle,
            onPress: () => onQuickAction(action.key),
          };
        }),
    [onQuickAction, onShareRoute, quickActions, showRouteButton]
  );

  const normalizedWidgetSearch = widgetSearch.trim().toLowerCase();
  const filteredActionCards = useMemo(() => {
    if (!normalizedWidgetSearch) {
      return actionCards;
    }

    return actionCards.filter((action) =>
      [action.title, action.description, action.label].some((value) =>
        value.toLowerCase().includes(normalizedWidgetSearch)
      )
    );
  }, [actionCards, normalizedWidgetSearch]);

  const filteredStickerActions = useMemo(
    () => stickerActions.filter((action) => action.title.toLowerCase().includes(normalizedWidgetSearch)),
    [normalizedWidgetSearch]
  );

  const filteredGifActions = useMemo(
    () => gifActions.filter((action) => action.title.toLowerCase().includes(normalizedWidgetSearch)),
    [normalizedWidgetSearch]
  );

  return (
    <GlassBottomSheet
      ref={sheetRef}
      index={-1}
      onChange={onChange}
      snapPoints={sheetSnapPoints}
      enablePanDownToClose>
      <BottomSheetScrollView contentContainerStyle={styles.sheetContent}>
        <View
          style={[
            styles.sheetSearch,
            {
              backgroundColor: isAndroid
                ? androidSurfaceColor
                : (isDark ? designSystem.colors.darkGlassHeader : designSystem.colors.whiteOverlayFaint),
              borderColor: isAndroid
                ? androidBorderColor
                : (isDark ? designSystem.colors.whiteOverlayBarely : designSystem.colors.borderSoft),
            },
          ]}>
          <MagnifyingGlass
            color={isDark ? designSystem.colors.darkMutedText : designSystem.colors.gray}
            size={20}
            weight="bold"
          />
          <BottomSheetTextInput
            value={widgetSearch}
            onChangeText={setWidgetSearch}
            placeholder="Search widgets, stickers, GIFs"
            placeholderTextColor={isDark ? designSystem.colors.darkPlaceholderText : designSystem.colors.placeholderText}
            style={[styles.sheetSearchInput, isDark ? styles.sheetSearchInputDark : null]}
          />
        </View>

        {filteredActionCards.length > 0 ? (
          <WidgetSheetSection title="Widgets">
            {filteredActionCards.map((action) => {
              const Icon = action.icon;

              return (
                <WidgetSheetButton
                  key={action.key}
                  icon={<Icon color={iconColor} size={18} weight="bold" />}
                  isDark={isDark}
                  title={action.title}
                  onPress={() => {
                    sheetRef.current?.close();
                    action.onPress();
                  }}
                />
              );
            })}
          </WidgetSheetSection>
        ) : null}

        {filteredStickerActions.length > 0 ? (
          <WidgetSheetSection title="Stickers">
            {filteredStickerActions.map((action) => {
              const Icon = action.icon;

              return (
                <WidgetSheetButton
                  key={action.key}
                  icon={<Icon color={iconColor} size={18} weight="bold" />}
                  isDark={isDark}
                  title={action.title}
                  onPress={() => sheetRef.current?.close()}
                />
              );
            })}
          </WidgetSheetSection>
        ) : null}

        {filteredGifActions.length > 0 ? (
          <WidgetSheetSection title="GIFs">
            {filteredGifActions.map((action) => {
              const Icon = action.icon;

              return (
                <WidgetSheetButton
                  key={action.key}
                  icon={<Icon color={iconColor} size={18} weight="bold" />}
                  isDark={isDark}
                  title={action.title}
                  onPress={() => sheetRef.current?.close()}
                />
              );
            })}
          </WidgetSheetSection>
        ) : null}
      </BottomSheetScrollView>
    </GlassBottomSheet>
  );
}

function WidgetSheetSection({
  children,
  title,
}: {
  children: ReactNode;
  title: string;
}) {
  return (
    <View style={styles.sheetSection}>
      <ThemedText
        lightColor={designSystem.colors.ink}
        darkColor={designSystem.colors.white}
        style={styles.sheetSectionTitle}>
        {title}
      </ThemedText>
      <View style={styles.sheetButtonGrid}>{children}</View>
    </View>
  );
}

function WidgetSheetButton({
  icon,
  isDark,
  onPress,
  title,
}: {
  icon: ReactNode;
  isDark: boolean;
  onPress: () => void;
  title: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.sheetButton,
        {
          backgroundColor: Platform.OS === 'android'
            ? (isDark ? designSystem.colors.darkSurface : designSystem.colors.surfaceRaised)
            : designSystem.colors.transparentWhite,
          borderColor: Platform.OS === 'android'
            ? (isDark ? designSystem.colors.darkBorder : designSystem.colors.lightSurfaceAlt)
            : (isDark ? designSystem.colors.whiteOverlayBarely : designSystem.colors.borderSoft),
        },
      ]}>
      <View style={[styles.widgetIconWrap, isDark ? styles.widgetIconWrapDark : null]}>{icon}</View>
      <ThemedText style={[styles.widgetTitle, isDark ? styles.widgetTitleDark : null]}>{title}</ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  widgetIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: designSystem.colors.limeSoft,
  },
  widgetIconWrapDark: {
    backgroundColor: Platform.OS === 'android' ? designSystem.colors.darkCard : designSystem.colors.whiteOverlayBarely,
  },
  widgetTitle: {
    fontSize: 14,
    lineHeight: 17,
    fontWeight: '600',
    color: designSystem.colors.ink,
  },
  widgetTitleDark: {
    color: designSystem.colors.white,
  },
  sheetContent: {
    paddingHorizontal: designSystem.spacing.lg,
    paddingTop: 24,
    paddingBottom: 48,
    gap: 22,
  },
  sheetSearch: {
    minHeight: 56,
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  sheetSearchInput: {
    flex: 1,
    fontSize: 18,
    lineHeight: 22,
    fontWeight: '500',
    color: designSystem.colors.ink,
    paddingVertical: 0,
  },
  sheetSearchInputDark: {
    color: designSystem.colors.white,
  },
  sheetSection: {
    gap: 12,
  },
  sheetSectionTitle: {
    fontSize: 22,
    lineHeight: 26,
    fontWeight: '600',
  },
  sheetButtonGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  sheetButton: {
    minHeight: 44,
    borderRadius: 22,
    paddingLeft: 10,
    paddingRight: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
  },
});
