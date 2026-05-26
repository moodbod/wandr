import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ProfileSettingScreen } from '@/components/wandr/profile/profile-setting-screen';
import { designSystem } from '@/constants/design-system';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useOfflineMapDownloads } from '@/hooks/use-offline-map-downloads';
import type { OfflineMapPackRecord, OfflineMapPackStatus } from '@/lib/offline-map-types';

export default function OfflineMapsSettingsScreen() {
  const isDark = useColorScheme() === 'dark';
  const { download, records, remove } = useOfflineMapDownloads();
  const colors = isDark ? designSystem.semantic.dark : designSystem.semantic.light;

  return (
    <ProfileSettingScreen
      title="Downloaded maps"
      bottomNote="PWA downloads require a published tile pack. Native downloads use the Mapbox offline SDK in a development or production build."
    >
      <View style={styles.list}>
        {records.map((record) => {
          const isDownloaded = record.status === 'downloaded' || record.status === 'stale';
          const isDownloading = record.status === 'downloading';
          const isUnavailable = record.status === 'unavailable';
          const primaryLabel = getActionLabel(record.status);
          const statusLabel = getStatusLabel(record);

          return (
            <View
              key={record.region.id}
              style={[
                styles.row,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.borderSoft,
                },
              ]}
            >
              <View style={styles.copy}>
                <ThemedText style={styles.title}>{record.region.label}</ThemedText>
                <ThemedText style={[styles.meta, { color: colors.textSubtle }]}>{statusLabel}</ThemedText>
                {record.error ? <ThemedText style={styles.error}>{record.error}</ThemedText> : null}
              </View>
              <View style={styles.actions}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ disabled: isDownloading || isUnavailable }}
                  disabled={isDownloading || isUnavailable}
                  onPress={() => void download(record.region)}
                  style={[
                    styles.actionButton,
                    styles.primaryButton,
                    isDownloading || isUnavailable ? styles.disabledButton : null,
                  ]}
                >
                  {isDownloading ? (
                    <ActivityIndicator color={designSystem.colors.darkGreen} />
                  ) : (
                    <ThemedText style={styles.primaryButtonText}>{primaryLabel}</ThemedText>
                  )}
                </Pressable>
                {isDownloaded ? (
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => void remove(record.region.id)}
                    style={[styles.actionButton, styles.secondaryButton, { borderColor: colors.borderSoft }]}
                  >
                    <ThemedText style={[styles.secondaryButtonText, { color: colors.text }]}>Delete</ThemedText>
                  </Pressable>
                ) : null}
              </View>
            </View>
          );
        })}
      </View>
    </ProfileSettingScreen>
  );
}

function getActionLabel(status: OfflineMapPackStatus) {
  if (status === 'downloaded') {
    return 'Update';
  }

  if (status === 'stale') {
    return 'Update';
  }

  if (status === 'error') {
    return 'Retry';
  }

  if (status === 'unavailable') {
    return 'Unavailable';
  }

  return 'Download';
}

function getStatusLabel(record: OfflineMapPackRecord) {
  if (record.status === 'downloading') {
    return `${Math.round(record.progress)}%`;
  }

  if (record.status === 'downloaded') {
    return [record.region.estimatedSizeLabel, formatBytes(record.bytesDownloaded), 'Ready offline']
      .filter(Boolean)
      .join(' - ');
  }

  if (record.status === 'stale') {
    return 'Update available';
  }

  if (record.status === 'unavailable') {
    return record.error ?? 'Unavailable on this build';
  }

  if (record.status === 'error') {
    return record.error ?? 'Download failed';
  }

  return `${record.region.estimatedSizeLabel} offline map`;
}

function formatBytes(bytes?: number) {
  if (!bytes || !Number.isFinite(bytes)) {
    return null;
  }

  if (bytes < 1024 * 1024) {
    return `${Math.round(bytes / 1024)} KB`;
  }

  return `${Math.round(bytes / (1024 * 1024))} MB`;
}

const styles = StyleSheet.create({
  actionButton: {
    alignItems: 'center',
    borderRadius: 999,
    justifyContent: 'center',
    minHeight: 38,
    minWidth: 92,
    paddingHorizontal: 14,
  },
  actions: {
    alignItems: 'flex-end',
    gap: 8,
  },
  copy: {
    flex: 1,
    gap: 4,
    minWidth: 0,
  },
  disabledButton: {
    opacity: 0.55,
  },
  error: {
    color: designSystem.colors.liked,
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 16,
  },
  list: {
    gap: 12,
  },
  meta: {
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
  },
  primaryButton: {
    backgroundColor: designSystem.colors.lime,
  },
  primaryButtonText: {
    color: designSystem.colors.darkGreen,
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 16,
  },
  row: {
    alignItems: 'center',
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    gap: 14,
    padding: 16,
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: StyleSheet.hairlineWidth,
  },
  secondaryButtonText: {
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 16,
  },
  title: {
    color: designSystem.colors.ink,
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 20,
  },
});
