import BottomSheet, { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { BlurView } from 'expo-blur';
import { FunnelSimple } from 'phosphor-react-native';
import { useMemo, useRef } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { ExploreActivityCard } from '@/components/wandr/explore/activity-card';
import { ExploreMapHero } from '@/components/wandr/explore/map-hero';
import { appContent } from '@/constants/app-content';
import { designSystem } from '@/constants/design-system';
import { exploreHomeContent } from '@/constants/explore-content';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function ExploreScreen() {
  const screen = appContent.exploreHome;
  const sheetRef = useRef<BottomSheet>(null);
  const insets = useSafeAreaInsets();
  const snapPoints = useMemo(() => ['34%', '64%', '90%', '100%'], []);
  const mapTopInset = insets.top;
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const handleMapInteract = () => {
    sheetRef.current?.snapToIndex(0);
  };

  return (
    <ThemedView style={styles.root}>
      <View style={styles.body}>
        <View style={styles.mapLayer}>
          <ExploreMapHero
            centerCoordinate={exploreHomeContent.hero.centerCoordinate}
            locationLabel={exploreHomeContent.hero.locationLabel}
            markers={exploreHomeContent.hero.markers}
            topInset={mapTopInset}
            onInteract={handleMapInteract}
          />
        </View>

        <BottomSheet
          backgroundComponent={(props) => (
            <BlurView
              {...props}
              tint={isDark ? 'dark' : 'light'}
              intensity={80}
              style={[
                props.style,
                styles.sheetBackground,
                { backgroundColor: isDark ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.5)' }
              ]}
            />
          )}
          enableContentPanningGesture
          enableHandlePanningGesture
          handleIndicatorStyle={styles.handleIndicator}
          index={0}
          ref={sheetRef}
          snapPoints={snapPoints}>
          <BottomSheetScrollView
            contentContainerStyle={styles.sheetContent}
            showsVerticalScrollIndicator={false}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionCopy}>
                <ThemedText style={styles.eyebrow}>{exploreHomeContent.section.eyebrow}</ThemedText>
                <ThemedText style={styles.sectionTitle}>{exploreHomeContent.section.title}</ThemedText>
              </View>
              <Pressable style={({ pressed }) => [styles.filterButton, pressed && { opacity: 0.8 }]}>
                <BlurView intensity={80} tint={isDark ? 'dark' : 'light'} style={styles.filterButtonInner}>
                  <FunnelSimple color={isDark ? '#fff' : designSystem.colors.warmDark} size={18} weight="bold" />
                </BlurView>
              </Pressable>
            </View>

            <View style={styles.cardList}>
              {exploreHomeContent.activities.map((activity) => (
                <ExploreActivityCard card={activity} key={activity.title} />
              ))}
            </View>
          </BottomSheetScrollView>
        </BottomSheet>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  body: {
    flex: 1,
    position: 'relative',
  },
  mapLayer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  sheetBackground: {
    borderTopLeftRadius: designSystem.radii.sheet,
    borderTopRightRadius: designSystem.radii.sheet,
    overflow: 'hidden',
  },
  handleIndicator: {
    width: 42,
    height: 4,
    backgroundColor: 'rgba(14,15,12,0.16)',
  },
  sheetContent: {
    paddingHorizontal: designSystem.spacing.lg,
    paddingBottom: 132,
    gap: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 16,
  },
  sectionCopy: {
    flex: 1,
    gap: 4,
  },
  eyebrow: {
    fontSize: 11,
    lineHeight: 12,
    fontWeight: '900',
    letterSpacing: 1.1,
    textTransform: 'uppercase',
    color: designSystem.colors.darkGreen,
  },
  sectionTitle: {
    fontSize: 28,
    lineHeight: 30,
    fontWeight: '800',
    letterSpacing: -0.7,
  },
  filterButton: {
    width: 46,
    height: 46,
    borderRadius: designSystem.radii.pill,
    overflow: 'hidden',
  },
  filterButtonInner: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(244, 244, 241, 0.4)',
  },
  cardList: {
    gap: 16,
  },
});