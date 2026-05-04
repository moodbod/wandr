import BottomSheet, { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { Image as ExpoImage } from 'expo-image';
import { ChatsCircle, MapTrifold, Sun } from 'phosphor-react-native';
import { type ReactNode, type RefObject, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { GlassBottomSheet } from '@/components/ui/glass-bottom-sheet';
import { GlassInput } from '@/components/ui/glass-input';
import { designSystem } from '@/constants/design-system';
import { useColorScheme } from '@/hooks/use-color-scheme';

type MediaMode = 'stickers' | 'gifs';
type MediaAction = {
  body: string;
  id: string;
  title: string;
  uri: string;
};

const TENOR_API_KEY = process.env.EXPO_PUBLIC_TENOR_API_KEY || 'LIVDSRZULELA';
const TENOR_DEFAULT_QUERY: Record<MediaMode, string> = {
  stickers: 'travel tourist vacation',
  gifs: 'travel vacation road trip',
};

const FALLBACK_MEDIA_ACTIONS: Record<MediaMode, MediaAction[]> = {
  stickers: [
    {
      id: 'fallback-sticker:noto-map',
      title: 'Trip map',
      uri: 'https://raw.githubusercontent.com/googlefonts/noto-emoji/main/png/512/emoji_u1f5fa.png',
    },
    {
      id: 'fallback-sticker:noto-camera',
      title: 'Photo op',
      uri: 'https://raw.githubusercontent.com/googlefonts/noto-emoji/main/png/512/emoji_u1f4f8.png',
    },
    {
      id: 'fallback-sticker:noto-compass',
      title: 'Compass',
      uri: 'https://raw.githubusercontent.com/googlefonts/noto-emoji/main/png/512/emoji_u1f9ed.png',
    },
    {
      id: 'fallback-sticker:noto-beach',
      title: 'Beach day',
      uri: 'https://raw.githubusercontent.com/googlefonts/noto-emoji/main/png/512/emoji_u1f3d6.png',
    },
    {
      id: 'fallback-sticker:noto-landmark',
      title: 'Landmark',
      uri: 'https://raw.githubusercontent.com/googlefonts/noto-emoji/main/png/512/emoji_u1f3db.png',
    },
    {
      id: 'fallback-sticker:noto-luggage',
      title: 'Packed',
      uri: 'https://raw.githubusercontent.com/googlefonts/noto-emoji/main/png/512/emoji_u1f9f3.png',
    },
  ].map((item) => ({
    ...item,
    body: encodeMediaBody('stickers', item),
  })),
  gifs: [
    {
      id: 'fallback-gif:noto-sunrise',
      title: 'Sunrise',
      uri: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f305/512.gif',
    },
    {
      id: 'fallback-gif:noto-camp',
      title: 'Camping',
      uri: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f3d5_fe0f/512.gif',
    },
    {
      id: 'fallback-gif:noto-car',
      title: 'Road trip',
      uri: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f697/512.gif',
    },
    {
      id: 'fallback-gif:noto-globe',
      title: 'Explore',
      uri: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f30d/512.gif',
    },
  ].map((item) => ({
    ...item,
    body: encodeMediaBody('gifs', item),
  })),
};

type TenorMediaFormat = {
  url?: string;
};

type TenorResult = {
  content_description?: string;
  id: string;
  media_formats?: {
    gif?: TenorMediaFormat;
    tinygif?: TenorMediaFormat;
  };
  title?: string;
};

function encodeMediaBody(mode: MediaMode, result: Pick<MediaAction, 'id' | 'title' | 'uri'>) {
  return `wandr:media:${encodeURIComponent(
    JSON.stringify({
      id: result.id,
      kind: mode === 'stickers' ? 'sticker' : 'gif',
      title: result.title,
      uri: result.uri,
    })
  )}`;
}

async function searchTenorMedia({
  mode,
  pos,
  query,
  signal,
}: {
  mode: MediaMode;
  pos?: string;
  query: string;
  signal: AbortSignal;
}) {
  const params = new URLSearchParams({
    ar_range: 'standard',
    client_key: 'wandr',
    contentfilter: 'medium',
    key: TENOR_API_KEY,
    limit: '48',
    locale: 'en_US',
    media_filter: 'gif,tinygif',
    q: query,
  });

  if (mode === 'stickers') {
    params.set('searchfilter', 'sticker');
  }
  if (pos) {
    params.set('pos', pos);
  }

  const response = await fetch(`https://tenor.googleapis.com/v2/search?${params.toString()}`, { signal });
  if (!response.ok) {
    throw new Error('Could not load media.');
  }

  const payload = (await response.json()) as { next?: string; results?: TenorResult[] };
  const actions = (payload.results ?? [])
    .map((result) => {
      const uri = result.media_formats?.tinygif?.url ?? result.media_formats?.gif?.url;
      if (!uri) {
        return null;
      }

      const title = result.content_description || result.title || (mode === 'stickers' ? 'Sticker' : 'GIF');
      return {
        body: encodeMediaBody(mode, { id: result.id, title, uri }),
        id: `${mode}:${result.id}`,
        title,
        uri,
      };
    })
    .filter((item): item is MediaAction => item !== null);

  return {
    actions: actions.length > 0 ? actions : FALLBACK_MEDIA_ACTIONS[mode],
    next: payload.next ?? null,
  };
}

export function FriendChatToolsSheet({
  onChange,
  onQuickAction,
  onGifAction,
  onShareRoute,
  onStickerAction,
  quickActions,
  sheetRef,
  showRouteButton = true,
}: {
  onChange?: (index: number) => void;
  onGifAction?: (body: string) => void;
  onQuickAction: (key: string) => void;
  onShareRoute: () => void;
  onStickerAction?: (body: string) => void;
  quickActions: { key: string; label: string; description: string }[];
  sheetRef: RefObject<BottomSheet | null>;
  showRouteButton?: boolean;
}) {
  const sheetSnapPoints = useMemo(() => ['58%'], []);
  const [widgetSearch, setWidgetSearch] = useState('');
  const [mediaMode, setMediaMode] = useState<MediaMode>('stickers');
  const [mediaActions, setMediaActions] = useState<MediaAction[]>([]);
  const [isMediaLoading, setIsMediaLoading] = useState(false);
  const [isLoadingMoreMedia, setIsLoadingMoreMedia] = useState(false);
  const [mediaError, setMediaError] = useState<string | null>(null);
  const [nextMediaCursor, setNextMediaCursor] = useState<string | null>(null);
  const [recentMediaKeys, setRecentMediaKeys] = useState<string[]>([]);
  const isDark = useColorScheme() === 'dark';
  const iconColor = isDark ? designSystem.colors.white : designSystem.colors.darkGreen;

  const actionCards = useMemo(
    () => {
      const baseActions =
        showRouteButton && !quickActions.some((action) => action.key === 'route')
          ? [
              {
                key: 'route',
                label: 'Trip map',
                description: 'Show the live route module in chat.',
              },
              ...quickActions,
            ]
          : quickActions;

      return baseActions
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
        });
    },
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

  useEffect(() => {
    const controller = new AbortController();
    const query = widgetSearch.trim() || TENOR_DEFAULT_QUERY[mediaMode];
    setIsMediaLoading(true);
    setMediaError(null);

    const timeout = setTimeout(() => {
      void searchTenorMedia({ mode: mediaMode, query, signal: controller.signal })
        .then((result) => {
          setMediaActions(result.actions);
          setNextMediaCursor(result.next);
        })
        .catch((error) => {
          if (controller.signal.aborted) {
            return;
          }
          setMediaActions(FALLBACK_MEDIA_ACTIONS[mediaMode]);
          setMediaError(error instanceof Error ? error.message : 'Could not load media.');
        })
        .finally(() => {
          if (!controller.signal.aborted) {
            setIsMediaLoading(false);
          }
        });
    }, 220);

    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, [mediaMode, widgetSearch]);

  const handleLoadMoreMedia = async () => {
    if (!nextMediaCursor || isLoadingMoreMedia) {
      return;
    }

    setIsLoadingMoreMedia(true);
    setMediaError(null);
    try {
      const query = widgetSearch.trim() || TENOR_DEFAULT_QUERY[mediaMode];
      const result = await searchTenorMedia({
        mode: mediaMode,
        pos: nextMediaCursor,
        query,
        signal: new AbortController().signal,
      });
      setMediaActions((current) => {
        const existingIds = new Set(current.map((item) => item.id));
        return [...current, ...result.actions.filter((item) => !existingIds.has(item.id))];
      });
      setNextMediaCursor(result.next);
    } catch (error) {
      if (mediaActions.length === 0) {
        setMediaActions(FALLBACK_MEDIA_ACTIONS[mediaMode]);
      }
      setMediaError(error instanceof Error ? error.message : 'Could not load more media.');
    } finally {
      setIsLoadingMoreMedia(false);
    }
  };

  const filteredMediaActions = useMemo(() => {
    return [...mediaActions].sort((a, b) => {
      const aIndex = recentMediaKeys.indexOf(a.id);
      const bIndex = recentMediaKeys.indexOf(b.id);

      if (aIndex === -1 && bIndex === -1) {
        return 0;
      }

      if (aIndex === -1) {
        return 1;
      }

      if (bIndex === -1) {
        return -1;
      }

      return aIndex - bIndex;
    });
  }, [mediaActions, recentMediaKeys]);

  const handleMediaPress = (action: MediaAction) => {
    setRecentMediaKeys((current) => [action.id, ...current.filter((key) => key !== action.id)].slice(0, 24));
    sheetRef.current?.close();

    if (mediaMode === 'stickers') {
      onStickerAction?.(action.body);
      return;
    }

    onGifAction?.(action.body);
  };

  return (
    <GlassBottomSheet
      ref={sheetRef}
      index={-1}
      onChange={onChange}
      snapPoints={sheetSnapPoints}
      enablePanDownToClose>
      <BottomSheetScrollView contentContainerStyle={styles.sheetContent}>
        <GlassInput
          value={widgetSearch}
          onChangeText={setWidgetSearch}
          placeholder="Search widgets, stickers, GIFs"
          containerStyle={styles.sheetSearchInput}
          radius={18}
        />

        {filteredActionCards.length > 0 ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.widgetRail}>
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
          </ScrollView>
        ) : null}

        <View style={[styles.mediaSwitch, isDark ? styles.mediaSwitchDark : null]}>
          <MediaSwitchButton
            active={mediaMode === 'stickers'}
            isDark={isDark}
            label="Stickers"
            onPress={() => setMediaMode('stickers')}
          />
          <MediaSwitchButton
            active={mediaMode === 'gifs'}
            isDark={isDark}
            label="GIFs"
            onPress={() => setMediaMode('gifs')}
          />
        </View>

        {isMediaLoading ? (
          <View style={styles.mediaLoading}>
            <ActivityIndicator color={isDark ? designSystem.colors.white : designSystem.colors.darkGreen} />
            <ThemedText style={[styles.emptyMediaText, isDark ? styles.widgetTitleDark : null]}>
              Loading {mediaMode === 'stickers' ? 'stickers' : 'GIFs'}...
            </ThemedText>
          </View>
        ) : filteredMediaActions.length > 0 ? (
          <View style={styles.mediaGrid}>
            {filteredMediaActions.map((action) => (
              <StickerSheetButton
                key={action.id}
                isDark={isDark}
                title={action.title}
                uri={action.uri}
                onPress={() => handleMediaPress(action)}
              />
            ))}
            {nextMediaCursor ? (
              <Pressable
                accessibilityRole="button"
                disabled={isLoadingMoreMedia}
                onPress={handleLoadMoreMedia}
                style={styles.loadMoreButton}>
                {isLoadingMoreMedia ? (
                  <ActivityIndicator color={isDark ? designSystem.colors.white : designSystem.colors.darkGreen} />
                ) : (
                  <ThemedText style={[styles.loadMoreText, isDark ? styles.widgetTitleDark : null]}>More</ThemedText>
                )}
              </Pressable>
            ) : null}
          </View>
        ) : (
          <ThemedText style={[styles.emptyMediaText, isDark ? styles.widgetTitleDark : null]}>
            {mediaError ?? `No ${mediaMode === 'stickers' ? 'stickers' : 'GIFs'} match that search.`}
          </ThemedText>
        )}
        <ThemedText style={[styles.tenorAttribution, isDark ? styles.tenorAttributionDark : null]}>
          Powered by Tenor
        </ThemedText>
      </BottomSheetScrollView>
    </GlassBottomSheet>
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

function StickerSheetButton({
  isDark,
  onPress,
  title,
  uri,
}: {
  isDark: boolean;
  onPress: () => void;
  title: string;
  uri: string;
}) {
  return (
    <Pressable
      accessibilityLabel={`Send ${title} sticker`}
      accessibilityRole="button"
      onPress={onPress}
      style={styles.stickerButton}>
      <ExpoImage source={{ uri }} style={styles.stickerPreview} contentFit="contain" />
      <ThemedText style={[styles.stickerTitle, isDark ? styles.widgetTitleDark : null]}>{title}</ThemedText>
    </Pressable>
  );
}

function MediaSwitchButton({
  active,
  isDark,
  label,
  onPress,
}: {
  active: boolean;
  isDark: boolean;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={[
        styles.mediaSwitchButton,
        active ? styles.mediaSwitchButtonActive : null,
        active && isDark ? styles.mediaSwitchButtonActiveDark : null,
      ]}>
      <ThemedText
        style={[
          styles.mediaSwitchText,
          isDark ? styles.widgetTitleDark : null,
          active ? styles.mediaSwitchTextActive : null,
          active && isDark ? styles.mediaSwitchTextActiveDark : null,
        ]}>
        {label}
      </ThemedText>
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
  sheetSearchInput: {
    height: 56,
  },
  widgetRail: {
    flexDirection: 'row',
    gap: 10,
    paddingRight: designSystem.spacing.lg,
  },
  mediaSwitch: {
    height: 44,
    borderRadius: 22,
    padding: 4,
    flexDirection: 'row',
    backgroundColor: designSystem.colors.surface,
  },
  mediaSwitchDark: {
    backgroundColor: designSystem.colors.darkCard,
  },
  mediaSwitchButton: {
    flex: 1,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mediaSwitchButtonActive: {
    backgroundColor: designSystem.colors.white,
  },
  mediaSwitchButtonActiveDark: {
    backgroundColor: designSystem.colors.darkSurface,
  },
  mediaSwitchText: {
    fontSize: 14,
    lineHeight: 17,
    fontWeight: '600',
    color: designSystem.colors.gray,
  },
  mediaSwitchTextActive: {
    color: designSystem.colors.ink,
  },
  mediaSwitchTextActiveDark: {
    color: designSystem.colors.white,
  },
  mediaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 18,
  },
  mediaLoading: {
    minHeight: 112,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  stickerButton: {
    width: '23%',
    alignItems: 'center',
    gap: 6,
  },
  loadMoreButton: {
    width: '23%',
    minHeight: 84,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: designSystem.colors.borderSoft,
  },
  loadMoreText: {
    fontSize: 13,
    lineHeight: 16,
    fontWeight: '700',
    color: designSystem.colors.darkGreen,
  },
  stickerPreview: {
    width: 64,
    height: 64,
  },
  stickerTitle: {
    fontSize: 12,
    lineHeight: 15,
    fontWeight: '600',
    color: designSystem.colors.ink,
    textAlign: 'center',
  },
  emptyMediaText: {
    fontSize: 14,
    lineHeight: 19,
    fontWeight: '500',
    color: designSystem.colors.gray,
  },
  tenorAttribution: {
    marginTop: -8,
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '600',
    color: designSystem.colors.subtleText,
    textAlign: 'center',
  },
  tenorAttributionDark: {
    color: designSystem.colors.darkSubtleText,
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
