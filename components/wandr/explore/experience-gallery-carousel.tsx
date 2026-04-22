import { Image } from 'expo-image';
import Carousel from 'react-native-reanimated-carousel';
import { StyleSheet, useWindowDimensions, View } from 'react-native';

type ExperienceGalleryCarouselProps = {
  images: readonly string[];
  height?: number;
};

export function ExperienceGalleryCarousel({
  images,
  height = 480,
}: ExperienceGalleryCarouselProps) {
  const { width: windowWidth } = useWindowDimensions();
  const itemGap = 16;
  const cardWidth = Math.min(windowWidth - 64, 340);
  const itemWidth = cardWidth + itemGap;

  if (images.length === 0) {
    return null;
  }

  return (
    <Carousel
      loop={false}
      width={itemWidth}
      height={height}
      pagingEnabled
      snapEnabled
      overscrollEnabled={false}
      style={styles.carousel}
      mode="parallax"
      modeConfig={{
        parallaxScrollingScale: 1,
        parallaxScrollingOffset: Math.max((windowWidth - cardWidth) / 2 - itemGap / 2, 24),
        parallaxAdjacentItemScale: 0.92,
      }}
      data={[...images]}
      renderItem={({ item }) => (
        <View style={[styles.slide, { paddingHorizontal: itemGap / 2 }]}>
          <View style={[styles.card, { width: cardWidth, height }]}>
            <Image source={item} contentFit="cover" style={styles.image} />
          </View>
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  carousel: {
    width: '100%',
  },
  slide: {
    flex: 1,
    alignItems: 'center',
  },
  card: {
    borderRadius: 32,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
});
