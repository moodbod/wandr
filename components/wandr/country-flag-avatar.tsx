import CountryFlag from 'react-native-country-flag';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

type CountryFlagAvatarProps = {
  countryCode: string;
  size: number;
  style?: StyleProp<ViewStyle>;
};

export function CountryFlagAvatar({ countryCode, size, style }: CountryFlagAvatarProps) {
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no"
      style={[
        styles.frame,
        {
          borderRadius: size / 2,
          height: size,
          width: size,
        },
        style,
      ]}
    >
      <CountryFlag isoCode={countryCode} size={size} style={styles.flag} />
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  flag: {
    resizeMode: 'cover',
  },
});
