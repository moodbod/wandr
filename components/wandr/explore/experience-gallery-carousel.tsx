import { Image } from 'expo-image';
import { ImagesSquare, X } from 'phosphor-react-native';
import { useState } from 'react';
import Carousel from 'react-native-reanimated-carousel';
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { designSystem } from '@/constants/design-system';

export type GalleryImageItem = {
  uri: string;
  source?: 'host' | 'visitor';
};

type ExperienceGalleryCarouselProps = {
  images: readonly (string | GalleryImageItem)[];
  cardHorizontalInset?: number;
  frameBorderRadius?: number;
  height?: number;
  maxCardWidth?: number;
};

export function ExperienceGalleryCarousel({
  cardHorizontalInset = 24,
  frameBorderRadius = 32,
  images,
  height = 500,
  maxCardWidth = 344,
}: ExperienceGalleryCarouselProps) {
  const { height: windowHeight, width: windowWidth } = useWindowDimensions();
  const [containerWidth, setContainerWidth] = useState(0);
  const [activeIndex, setActiveIndex] = useState(0);
  const [galleryVisible, setGalleryVisible] = useState(false);
  const [fullscreenVisible, setFullscreenVisible] = useState(false);

  const availableWidth = containerWidth || windowWidth;
  const cardWidth = Math.min(Math.max(availableWidth - cardHorizontalInset * 2, 240), maxCardWidth);
  const itemGap = 18;
  const itemWidth = cardWidth + itemGap;
  const normalizedImages = images.map((image) => (typeof image === 'string' ? { uri: image, source: 'host' as const } : image));
  const previewImages = normalizedImages.slice(0, 6);
  const renderPreviewSlide = (item: GalleryImageItem, index: number) => (
    <View style={[styles.slide, { width: itemWidth }]}>
      <Pressable
        accessibilityLabel={`Open photo ${index + 1} of ${normalizedImages.length}`}
        accessibilityRole="imagebutton"
        onPress={() => {
          setActiveIndex(index);
          setGalleryVisible(true);
        }}
        style={[
          styles.frame,
          {
            borderRadius: frameBorderRadius,
            width: cardWidth,
            height,
          },
        ]}>
        <Image source={item.uri} contentFit="cover" style={styles.image} />
        {item.source === 'visitor' ? (
          <View style={styles.visitorTag}>
            <ThemedText style={styles.visitorTagText}>Visitor</ThemedText>
          </View>
        ) : null}
        <View style={styles.photoCountPill}>
          <ImagesSquare color={designSystem.colors.white} size={15} weight="bold" />
          <ThemedText style={styles.photoCountText}>
            {index + 1}/{normalizedImages.length}
          </ThemedText>
        </View>
        {index === previewImages.length - 1 && normalizedImages.length > previewImages.length ? (
          <View style={styles.morePhotosOverlay}>
            <ThemedText style={styles.morePhotosText}>+{normalizedImages.length - previewImages.length}</ThemedText>
          </View>
        ) : null}
      </Pressable>
    </View>
  );
  const handleWebScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    setActiveIndex(Math.round(event.nativeEvent.contentOffset.x / itemWidth));
  };

  if (images.length === 0) {
    return null;
  }

  return (
    <View
      onLayout={(event) => setContainerWidth(event.nativeEvent.layout.width)}
      style={[styles.shell, { height }]}
    >
      <View style={[styles.stage, { height }]}>
        {containerWidth > 0 && Platform.OS === 'web' ? (
          <ScrollView
            horizontal
            decelerationRate="fast"
            keyboardShouldPersistTaps="handled"
            onScroll={handleWebScroll}
            scrollEventThrottle={16}
            showsHorizontalScrollIndicator={false}
            snapToInterval={itemWidth}
            snapToAlignment="center"
            style={[styles.carousel, { width: availableWidth }]}
            contentContainerStyle={[
              styles.webCarouselContent,
              {
                paddingLeft: Math.max((availableWidth - cardWidth) / 2, cardHorizontalInset),
                paddingRight: Math.max((availableWidth - cardWidth) / 2, cardHorizontalInset),
              },
            ]}
            {...({
              onWheel: (event: WheelEvent) => {
                const target = event.currentTarget as HTMLElement;
                target.scrollLeft += Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
              },
            } as any)}
          >
            {previewImages.map((item, index) => (
              <View key={`${item.uri}-${index}`}>{renderPreviewSlide(item, index)}</View>
            ))}
          </ScrollView>
        ) : containerWidth > 0 ? (
          <Carousel
            loop={false}
            width={itemWidth}
            height={height}
            pagingEnabled
            snapEnabled
            overscrollEnabled={false}
            style={[styles.carousel, { width: availableWidth }]}
            mode="parallax"
            modeConfig={{
              parallaxScrollingScale: 0.96,
              parallaxScrollingOffset: Math.max((availableWidth - cardWidth) / 2, cardHorizontalInset),
              parallaxAdjacentItemScale: 0.84,
            }}
            data={previewImages}
            onSnapToItem={setActiveIndex}
            renderItem={({ index, item }) => renderPreviewSlide(item, index)}
          />
        ) : null}
      </View>
      <Modal
        animationType="slide"
        presentationStyle="fullScreen"
        statusBarTranslucent
        visible={galleryVisible}
        onRequestClose={() => {
          setFullscreenVisible(false);
          setGalleryVisible(false);
        }}
      >
        <View style={styles.galleryRoot}>
          <View style={styles.galleryTopBar}>
            <Pressable
              accessibilityLabel="Close gallery"
              accessibilityRole="button"
              onPress={() => {
                setFullscreenVisible(false);
                setGalleryVisible(false);
              }}
              style={styles.fullscreenIconButton}
            >
              <X color={designSystem.colors.white} size={22} weight="bold" />
            </Pressable>
            <View style={styles.fullscreenCountPill}>
              <ImagesSquare color={designSystem.colors.white} size={16} weight="bold" />
              <ThemedText style={styles.fullscreenCountText}>{normalizedImages.length} photos</ThemedText>
            </View>
          </View>
          <ScrollView contentContainerStyle={styles.galleryGrid} showsVerticalScrollIndicator={false}>
            {normalizedImages.map((imageUri, index) => (
              <Pressable
                accessibilityLabel={`View photo ${index + 1} full screen`}
                accessibilityRole="imagebutton"
                key={`${imageUri.uri}-${index}`}
                onPress={() => {
                  setActiveIndex(index);
                  setFullscreenVisible(true);
                }}
                style={[styles.galleryTile, { width: (windowWidth - 42) / 2 }]}
              >
                <Image source={imageUri.uri} contentFit="cover" style={styles.galleryTileImage} />
                {imageUri.source === 'visitor' ? (
                  <View style={styles.galleryVisitorTag}>
                    <ThemedText style={styles.visitorTagText}>Visitor</ThemedText>
                  </View>
                ) : null}
              </Pressable>
            ))}
          </ScrollView>
        </View>
      </Modal>
      <Modal
        animationType="fade"
        presentationStyle="fullScreen"
        statusBarTranslucent
        visible={fullscreenVisible}
        onRequestClose={() => setFullscreenVisible(false)}
      >
        <View style={styles.fullscreenRoot}>
          <Carousel
            loop={false}
            width={windowWidth}
            height={windowHeight}
            pagingEnabled
            snapEnabled
            defaultIndex={activeIndex}
            data={normalizedImages}
            onSnapToItem={setActiveIndex}
            renderItem={({ item }) => (
              <View style={[styles.fullscreenSlide, { width: windowWidth, height: windowHeight }]}>
                <Image source={item.uri} contentFit="contain" style={styles.fullscreenImage} />
                {item.source === 'visitor' ? (
                  <View style={styles.fullscreenVisitorTag}>
                    <ThemedText style={styles.visitorTagText}>Visitor</ThemedText>
                  </View>
                ) : null}
              </View>
            )}
          />
          <View style={styles.fullscreenTopBar}>
            <Pressable
              accessibilityLabel="Close photo viewer"
              accessibilityRole="button"
              onPress={() => setFullscreenVisible(false)}
              style={styles.fullscreenIconButton}
            >
              <X color={designSystem.colors.white} size={22} weight="bold" />
            </Pressable>
            <View style={styles.fullscreenCountPill}>
              <ImagesSquare color={designSystem.colors.white} size={16} weight="bold" />
              <ThemedText style={styles.fullscreenCountText}>
                {activeIndex + 1} / {normalizedImages.length}
              </ThemedText>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    width: '100%',
    overflow: 'hidden',
  },
  stage: {
    position: 'relative',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  carousel: {
    overflow: 'hidden',
  },
  webCarouselContent: {
    alignItems: 'center',
  },
  slide: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  frame: {
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  photoCountPill: {
    position: 'absolute',
    right: 14,
    bottom: 14,
    minHeight: 32,
    borderRadius: designSystem.radii.pill,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 11,
    backgroundColor: designSystem.colors.scrimStrong,
  },
  photoCountText: {
    fontSize: 12,
    lineHeight: 15,
    fontWeight: '600',
    color: designSystem.colors.white,
  },
  visitorTag: {
    position: 'absolute',
    left: 14,
    bottom: 14,
    minHeight: 32,
    borderRadius: designSystem.radii.pill,
    justifyContent: 'center',
    paddingHorizontal: 11,
    backgroundColor: designSystem.colors.lime,
  },
  visitorTagText: {
    fontSize: 12,
    lineHeight: 15,
    fontWeight: '600',
    color: designSystem.colors.darkGreen,
  },
  morePhotosOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: designSystem.colors.scrimSoft,
  },
  morePhotosText: {
    fontSize: 28,
    lineHeight: 32,
    fontWeight: '600',
    color: designSystem.colors.white,
  },
  galleryRoot: {
    flex: 1,
    backgroundColor: designSystem.colors.black,
  },
  galleryTopBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 2,
    paddingHorizontal: 18,
    paddingTop: 62,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  galleryGrid: {
    paddingTop: 124,
    paddingHorizontal: 14,
    paddingBottom: 34,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
  },
  galleryTile: {
    aspectRatio: 0.78,
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: designSystem.colors.charcoalSoft,
  },
  galleryTileImage: {
    width: '100%',
    height: '100%',
  },
  galleryVisitorTag: {
    position: 'absolute',
    left: 10,
    bottom: 10,
    minHeight: 28,
    borderRadius: designSystem.radii.pill,
    justifyContent: 'center',
    paddingHorizontal: 10,
    backgroundColor: designSystem.colors.lime,
  },
  fullscreenRoot: {
    flex: 1,
    backgroundColor: designSystem.colors.black,
  },
  fullscreenSlide: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullscreenImage: {
    width: '100%',
    height: '100%',
  },
  fullscreenVisitorTag: {
    position: 'absolute',
    left: 18,
    bottom: 44,
    minHeight: 36,
    borderRadius: designSystem.radii.pill,
    justifyContent: 'center',
    paddingHorizontal: 14,
    backgroundColor: designSystem.colors.lime,
  },
  fullscreenTopBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 18,
    paddingTop: 62,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  fullscreenIconButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: designSystem.colors.blackOverlay,
    borderWidth: 1,
    borderColor: designSystem.colors.whiteOverlayThin,
  },
  fullscreenCountPill: {
    minHeight: 40,
    borderRadius: designSystem.radii.pill,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    backgroundColor: designSystem.colors.blackOverlay,
    borderWidth: 1,
    borderColor: designSystem.colors.whiteOverlayThin,
  },
  fullscreenCountText: {
    fontSize: 13,
    lineHeight: 16,
    fontWeight: '600',
    color: designSystem.colors.white,
  },
});
