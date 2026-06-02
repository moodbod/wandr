import { Image as ExpoImage } from 'expo-image';
import { ChatsCircle, MagnifyingGlass, MapTrifold, Sun, X } from 'phosphor-react-native';
import { type ReactNode, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { Input } from '@/components/ui/input';
import { designSystem } from '@/constants/design-system';
import { useColorScheme } from '@/hooks/use-color-scheme';

type MediaMode = 'stickers' | 'gifs';
type MediaAction = { body: string; id: string; title: string; uri: string };

const TENOR_API_KEY = process.env.EXPO_PUBLIC_TENOR_API_KEY;
const TENOR_DEFAULT_QUERY: Record<MediaMode, string> = {
  stickers: 'travel tourist vacation',
  gifs: 'travel vacation road trip',
};

function encodeMediaBody(mode: MediaMode, result: Pick<MediaAction, 'id' | 'title' | 'uri'>) {
  return `wandr:media:${encodeURIComponent(JSON.stringify({ id: result.id, kind: mode === 'stickers' ? 'sticker' : 'gif', title: result.title, uri: result.uri }))}`;
}

async function searchTenorMedia({ mode, pos, query, signal }: { mode: MediaMode; pos?: string; query: string; signal: AbortSignal }) {
  if (!TENOR_API_KEY) return { actions: [], next: null };

  const params = new URLSearchParams({
    ar_range: 'standard', client_key: 'wandr', contentfilter: 'medium',
    key: TENOR_API_KEY, limit: '48', locale: 'en_US', media_filter: 'gif,tinygif', q: query,
  });
  if (mode === 'stickers') params.set('searchfilter', 'sticker');
  if (pos) params.set('pos', pos);

  const response = await fetch(`https://tenor.googleapis.com/v2/search?${params.toString()}`, { signal });
  if (!response.ok) throw new Error('Could not load media.');

  type TenorResult = { content_description?: string; id: string; media_formats?: { gif?: { url?: string }; tinygif?: { url?: string } }; title?: string };
  const payload = (await response.json()) as { next?: string; results?: TenorResult[] };
  const actions = (payload.results ?? []).map((result) => {
    const uri = result.media_formats?.tinygif?.url ?? result.media_formats?.gif?.url;
    if (!uri) return null;
    const title = result.content_description || result.title || (mode === 'stickers' ? 'Sticker' : 'GIF');
    return { body: encodeMediaBody(mode, { id: result.id, title, uri }), id: `${mode}:${result.id}`, title, uri };
  }).filter((item): item is MediaAction => item !== null);

  return { actions, next: payload.next ?? null };
}

export function FriendChatToolsSheet({
  visible,
  onClose,
  onQuickAction,
  onGifAction,
  onShareRoute,
  onStickerAction,
  quickActions,
  showRouteButton = true,
}: {
  visible: boolean;
  onClose: () => void;
  onGifAction?: (body: string) => void;
  onQuickAction: (key: string) => void;
  onShareRoute: () => void;
  onStickerAction?: (body: string) => void;
  quickActions: { key: string; label: string; description: string }[];
  showRouteButton?: boolean;
}) {
  const insets = useSafeAreaInsets();
  const isDark = useColorScheme() === 'dark';
  const iconColor = isDark ? designSystem.colors.white : designSystem.colors.darkGreen;
  const [widgetSearch, setWidgetSearch] = useState('');
  const [mediaMode, setMediaMode] = useState<MediaMode>('stickers');
  const [mediaActions, setMediaActions] = useState<MediaAction[]>([]);
  const [isMediaLoading, setIsMediaLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [mediaError, setMediaError] = useState<string | null>(null);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [recentKeys, setRecentKeys] = useState<string[]>([]);

  const actionCards = useMemo(() => {
    const base = showRouteButton && !quickActions.some((a) => a.key === 'route')
      ? [{ key: 'route', label: 'Trip map', description: 'Show the live route module in chat.' }, ...quickActions]
      : quickActions;

    return base.filter((a) => showRouteButton || a.key !== 'route').map((action) => {
      if (action.key === 'route') return { ...action, title: 'Trip map', icon: MapTrifold, onPress: onShareRoute };
      if (action.key === 'sunrise') return { ...action, title: 'Sunrise plan', icon: Sun, onPress: () => onQuickAction(action.key) };
      return { ...action, title: 'Quick check-in', icon: ChatsCircle, onPress: () => onQuickAction(action.key) };
    });
  }, [onQuickAction, onShareRoute, quickActions, showRouteButton]);

  const normalizedSearch = widgetSearch.trim().toLowerCase();
  const filteredActionCards = useMemo(() => {
    if (!normalizedSearch) return actionCards;
    return actionCards.filter((a) => [a.title, a.description, a.label].some((v) => v.toLowerCase().includes(normalizedSearch)));
  }, [actionCards, normalizedSearch]);

  useEffect(() => {
    if (!visible) return;
    const controller = new AbortController();
    const query = widgetSearch.trim() || TENOR_DEFAULT_QUERY[mediaMode];
    setIsMediaLoading(true);
    setMediaError(null);
    const timeout = setTimeout(() => {
      void searchTenorMedia({ mode: mediaMode, query, signal: controller.signal })
        .then((r) => { setMediaActions(r.actions); setNextCursor(r.next); })
        .catch((e) => { if (!controller.signal.aborted) { setMediaActions([]); setMediaError(e instanceof Error ? e.message : 'Could not load media.'); } })
        .finally(() => { if (!controller.signal.aborted) setIsMediaLoading(false); });
    }, 220);
    return () => { clearTimeout(timeout); controller.abort(); };
  }, [mediaMode, widgetSearch, visible]);

  const handleLoadMore = async () => {
    if (!nextCursor || isLoadingMore) return;
    setIsLoadingMore(true);
    try {
      const query = widgetSearch.trim() || TENOR_DEFAULT_QUERY[mediaMode];
      const r = await searchTenorMedia({ mode: mediaMode, pos: nextCursor, query, signal: new AbortController().signal });
      setMediaActions((cur) => { const ids = new Set(cur.map((i) => i.id)); return [...cur, ...r.actions.filter((i) => !ids.has(i.id))]; });
      setNextCursor(r.next);
    } catch { /* ignore */ } finally { setIsLoadingMore(false); }
  };

  const sortedMedia = useMemo(() => {
    return [...mediaActions].sort((a, b) => {
      const ai = recentKeys.indexOf(a.id), bi = recentKeys.indexOf(b.id);
      if (ai === -1 && bi === -1) return 0;
      if (ai === -1) return 1;
      if (bi === -1) return -1;
      return ai - bi;
    });
  }, [mediaActions, recentKeys]);

  const handleMediaPress = (action: MediaAction) => {
    setRecentKeys((cur) => [action.id, ...cur.filter((k) => k !== action.id)].slice(0, 24));
    onClose();
    if (mediaMode === 'stickers') { onStickerAction?.(action.body); return; }
    onGifAction?.(action.body);
  };

  const bg = isDark ? designSystem.semantic.dark.background : designSystem.semantic.light.background;

  return (
    <Modal
      visible={visible}
      onRequestClose={onClose}
      animationType="slide"
      presentationStyle={Platform.OS === 'ios' ? 'pageSheet' : 'overFullScreen'}
      transparent={Platform.OS !== 'ios'}
    >
      {Platform.OS !== 'ios' ? (
        <Pressable style={[styles.backdrop, { backgroundColor: 'rgba(0,0,0,0.4)' }]} onPress={onClose} />
      ) : null}
      <View style={[styles.sheet, { backgroundColor: bg, paddingBottom: Math.max(insets.bottom, 16) + 8 }]}>
        <View style={styles.handle} />
        {Platform.OS !== 'ios' ? (
          <Pressable style={styles.closeButton} onPress={onClose} accessibilityRole="button" accessibilityLabel="Close">
            <X color={isDark ? designSystem.colors.darkMutedText : designSystem.colors.gray} size={20} weight="bold" />
          </Pressable>
        ) : null}

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
          <Input
            value={widgetSearch}
            onChangeText={setWidgetSearch}
            placeholder="Search stickers & GIFs"
            containerStyle={styles.searchInput}
            leftIcon={
              <MagnifyingGlass
                color={isDark ? designSystem.colors.darkPlaceholderText : designSystem.colors.placeholderText}
                size={18}
                weight="regular"
              />
            }
            radius={14}
          />

          {filteredActionCards.length > 0 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.actionRail}>
              {filteredActionCards.map((action) => {
                const Icon = action.icon;
                return (
                  <Pressable
                    key={action.key}
                    onPress={() => { onClose(); action.onPress(); }}
                    style={({ pressed }) => [styles.actionButton, { opacity: pressed ? 0.7 : 1 }]}
                  >
                    <View style={[styles.actionIcon, isDark ? styles.actionIconDark : null]}>
                      <Icon color={iconColor} size={18} weight="bold" />
                    </View>
                    <ThemedText style={styles.actionLabel}>{action.title}</ThemedText>
                  </Pressable>
                );
              })}
            </ScrollView>
          ) : null}

          <View style={[styles.segmentedControl, isDark ? styles.segmentedControlDark : null]}>
            {(['stickers', 'gifs'] as const).map((mode) => (
              <Pressable
                key={mode}
                accessibilityRole="button"
                accessibilityState={{ selected: mediaMode === mode }}
                onPress={() => setMediaMode(mode)}
                style={[styles.segment, mediaMode === mode ? (isDark ? styles.segmentActiveDark : styles.segmentActive) : null]}
              >
                <ThemedText style={[styles.segmentText, mediaMode === mode ? (isDark ? styles.segmentTextActiveDark : styles.segmentTextActive) : styles.segmentTextInactive]}>
                  {mode === 'stickers' ? 'Stickers' : 'GIFs'}
                </ThemedText>
              </Pressable>
            ))}
          </View>

          {isMediaLoading ? (
            <View style={styles.loading}>
              <ActivityIndicator color={isDark ? designSystem.colors.white : designSystem.colors.darkGreen} />
            </View>
          ) : sortedMedia.length > 0 ? (
            <View style={styles.mediaGrid}>
              {sortedMedia.map((action) => (
                <Pressable
                  key={action.id}
                  accessibilityLabel={`Send ${action.title}`}
                  onPress={() => handleMediaPress(action)}
                  style={({ pressed }) => [styles.mediaItem, { opacity: pressed ? 0.7 : 1 }]}
                >
                  <ExpoImage source={{ uri: action.uri }} style={styles.mediaImage} contentFit="contain" />
                  <ThemedText style={[styles.mediaLabel, isDark ? { color: designSystem.colors.darkMutedText } : null]} numberOfLines={1}>
                    {action.title}
                  </ThemedText>
                </Pressable>
              ))}
              {nextCursor ? (
                <Pressable onPress={handleLoadMore} disabled={isLoadingMore} style={styles.loadMore}>
                  {isLoadingMore ? <ActivityIndicator color={isDark ? designSystem.colors.white : designSystem.colors.darkGreen} /> : <ThemedText style={styles.loadMoreText}>More</ThemedText>}
                </Pressable>
              ) : null}
            </View>
          ) : (
            <ThemedText style={styles.emptyText}>{mediaError ?? `No ${mediaMode === 'stickers' ? 'stickers' : 'GIFs'} found.`}</ThemedText>
          )}

          <ThemedText style={styles.attribution}>Powered by Tenor</ThemedText>
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 },
  sheet: {
    flex: 1,
    borderTopLeftRadius: Platform.OS === 'ios' ? 0 : 16,
    borderTopRightRadius: Platform.OS === 'ios' ? 0 : 16,
    marginTop: Platform.OS === 'ios' ? 0 : 'auto',
    maxHeight: Platform.OS === 'ios' ? undefined : '75%',
  },
  handle: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(128,128,128,0.3)',
    marginTop: 10,
    marginBottom: 4,
  },
  closeButton: {
    position: 'absolute',
    top: 10,
    right: 16,
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: { paddingHorizontal: 20, paddingTop: 14, paddingBottom: 24, gap: 20 },
  searchInput: { height: 48 },
  actionRail: { flexDirection: 'row', gap: 10 },
  actionButton: { alignItems: 'center', gap: 6, minWidth: 64 },
  actionIcon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: designSystem.colors.limeSoft },
  actionIconDark: { backgroundColor: designSystem.colors.whiteOverlayBarely },
  actionLabel: { fontSize: 12, lineHeight: 14, fontWeight: '600', color: designSystem.colors.ink, textAlign: 'center' },
  segmentedControl: { height: 40, borderRadius: 20, padding: 3, flexDirection: 'row', backgroundColor: designSystem.colors.surface },
  segmentedControlDark: { backgroundColor: designSystem.colors.darkCard },
  segment: { flex: 1, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  segmentActive: { backgroundColor: designSystem.colors.white },
  segmentActiveDark: { backgroundColor: designSystem.colors.darkSurface },
  segmentText: { fontSize: 14, lineHeight: 17, fontWeight: '600' },
  segmentTextActive: { color: designSystem.colors.ink },
  segmentTextActiveDark: { color: designSystem.colors.white },
  segmentTextInactive: { color: designSystem.colors.gray },
  loading: { minHeight: 100, alignItems: 'center', justifyContent: 'center' },
  mediaGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  mediaItem: { width: '22%', alignItems: 'center', gap: 4 },
  mediaImage: { width: 60, height: 60 },
  mediaLabel: { fontSize: 11, lineHeight: 13, fontWeight: '500', color: designSystem.colors.ink, textAlign: 'center' },
  loadMore: { width: '22%', minHeight: 60, borderRadius: 14, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: designSystem.colors.borderSoft },
  loadMoreText: { fontSize: 13, fontWeight: '700', color: designSystem.colors.darkGreen },
  emptyText: { fontSize: 14, fontWeight: '500', color: designSystem.colors.gray, textAlign: 'center', paddingVertical: 20 },
  attribution: { fontSize: 11, fontWeight: '600', color: designSystem.colors.subtleText, textAlign: 'center' },
});
