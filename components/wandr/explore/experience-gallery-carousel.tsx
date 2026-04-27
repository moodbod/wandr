import { Image } from 'expo-image';
import Carousel from 'react-native-reanimated-carousel';
import { StyleSheet, useWindowDimensions, View } from 'react-native';

type ExperienceGalleryCarouselProps = {
  images: readonly string[];
  height?: number;
};

export function ExperienceGalleryCarousel({
  images,
  height = 500,
}: ExperienceGalleryCarouselProps) {
  const { width: windowWidth } = useWindowDimensions();

  const cardWidth = Math.min(windowWidth - 76, 344);
  const itemGap = 18;
  const itemWidth = cardWidth + itemGap;

  if (images.length === 0) {
    return null;
  }

  return (
    <View style={[styles.shell, { height }]}>
      <View style={[styles.stage, { height }]}>
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
            parallaxScrollingScale: 0.96,
            parallaxScrollingOffset: Math.max((windowWidth - cardWidth) / 2 - 8, 28),
            parallaxAdjacentItemScale: 0.84,
          }}
          data={[...images]}
          renderItem={({ item }) => {
            return (
              <View style={[styles.slide, { width: itemWidth }]}>
                <View
                  style={[
                    styles.frame,
                    {
                      width: cardWidth,
                      height,
                    },
                  ]}>
                  <Image source={item} contentFit="cover" style={styles.image} />
                </View>
              </View>
            );
          }}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    width: '100%',
  },
  stage: {
    position: 'relative',
    justifyContent: 'center',
  },
  carousel: {
    width: '100%',
  },
  slide: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  frame: {
    overflow: 'hidden',
    borderRadius: 32,
  },
  image: {
    width: '100%',
    height: '100%',
  },
});
