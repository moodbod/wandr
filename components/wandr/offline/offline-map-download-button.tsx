import { MapTrifold } from 'phosphor-react-native';
import { ActivityIndicator, Platform, Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { GlassButton } from '@/components/ui/glass-button';
import { designSystem } from '@/constants/design-system';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useOfflineMapDownloads } from '@/hooks/use-offline-map-downloads';
import { getOfflineMapWebPackRegion, type OfflineMapRegion } from '@/lib/offline-map-regions';

type OfflineMapDownloadButtonProps = {
  compact?: boolean;
  region: OfflineMapRegion | null;
  style?: StyleProp<ViewStyle>;
};

export function OfflineMapHeaderButton({ region }: { region: OfflineMapRegion | null }) {
  const isDark = useColorScheme() === 'dark';
  const { download, getRecord } = useOfflineMapDownloads();
  const actionRegion = getDownloadableRegion(region);
  const record = actionRegion ? getRecord(actionRegion.id) : null;
  const isDownloading = record?.status === 'downloading';
  const isDownloaded = record?.status === 'downloaded' || record?.status === 'stale';
  const color = isDownloaded
    ? designSystem.colors.lime
    : isDark
      ? designSystem.colors.darkText
      : designSystem.colors.ink;

  if (!actionRegion) {
    return null;
  }

  return (
    <GlassButton
      accessibilityLabel={isDownloaded ? `${actionRegion.label} downloaded` : `Download ${actionRegion.label}`}
      height={48}
      onPress={!isDownloading && !isDownloaded ? () => void download(actionRegion) : undefined}
      width={48}
    >
      {isDownloading ? (
        <ActivityIndicator color={color} />
      ) : (
        <View>
          <MapTrifold color={color} size={20} weight={isDownloaded ? 'fill' : 'bold'} />
          {isDownloaded ? <View style={styles.headerDot} /> : null}
        </View>
      )}
    </GlassButton>
  );
}

export function OfflineMapDownloadButton({ compact = false, region, style }: OfflineMapDownloadButtonProps) {
  const isDark = useColorScheme() === 'dark';
  const { download, getRecord, remove } = useOfflineMapDownloads();
  const actionRegion = getDownloadableRegion(region);
  const record = actionRegion ? getRecord(actionRegion.id) : null;
  const isDownloading = record?.status === 'downloading';
  const isDownloaded = record?.status === 'downloaded' || record?.status === 'stale';
  const isUnavailable = !actionRegion;
  const progressLabel = isDownloading ? `${Math.round(record?.progress ?? 0)}%` : null;

  if (!region) {
    return null;
  }

  if (compact) {
    return <OfflineMapHeaderButton region={region} />;
  }

  const actionLabel = actionRegion?.label ?? region.label;
  const actionSizeLabel = actionRegion?.estimatedSizeLabel ?? region.estimatedSizeLabel;

  return (
    <Pressable
      accessibilityRole="button"
      disabled={isDownloading || isUnavailable}
      onPress={isDownloaded && actionRegion ? () => void remove(actionRegion.id) : actionRegion ? () => void download(actionRegion) : undefined}
      style={[
        styles.rowButton,
        {
          backgroundColor: isDark ? designSystem.colors.darkGlassHeader : designSystem.colors.surfaceRaised,
          borderColor: isDark ? designSystem.colors.darkSurfaceBorder : designSystem.colors.borderSoft,
        },
        style,
      ]}
    >
      <View style={styles.iconWrap}>
        {isDownloading ? (
          <ActivityIndicator color={designSystem.colors.lime} />
        ) : (
          <MapTrifold
            color={isDownloaded ? designSystem.colors.lime : isDark ? designSystem.colors.darkText : designSystem.colors.ink}
            size={20}
            weight={isDownloaded ? 'fill' : 'bold'}
          />
        )}
      </View>
      <View style={styles.copy}>
        <ThemedText style={styles.title}>
          {isUnavailable
            ? `${region.label} unavailable`
            : isDownloaded
              ? `${actionLabel} downloaded`
              : `Download ${actionLabel}`}
        </ThemedText>
        <ThemedText style={[styles.meta, { color: isDark ? designSystem.colors.darkTextSoft : designSystem.colors.mutedText }]}>
          {isUnavailable
            ? 'No PWA pack for this area'
            : progressLabel ?? (isDownloaded ? 'Tap to remove' : `${actionSizeLabel} offline map`)}
        </ThemedText>
        {record?.error ? <ThemedText style={styles.error}>{record.error}</ThemedText> : null}
      </View>
    </Pressable>
  );
}

function getDownloadableRegion(region: OfflineMapRegion | null) {
  if (Platform.OS !== 'web') {
    return region;
  }

  return getOfflineMapWebPackRegion(region);
}

const styles = StyleSheet.create({
  copy: {
    flex: 1,
    gap: 2,
    minWidth: 0,
  },
  error: {
    color: designSystem.colors.liked,
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 16,
  },
  headerDot: {
    backgroundColor: designSystem.colors.lime,
    borderRadius: 4,
    bottom: -2,
    height: 8,
    position: 'absolute',
    right: -3,
    width: 8,
  },
  iconWrap: {
    alignItems: 'center',
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  meta: {
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 16,
  },
  rowButton: {
    alignItems: 'center',
    borderRadius: 22,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
    minHeight: 56,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 18,
  },
});
