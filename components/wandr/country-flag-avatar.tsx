import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

type CountryFlagAvatarProps = {
  countryCode: string;
  size: number;
  style?: StyleProp<ViewStyle>;
};

export function CountryFlagAvatar({ countryCode, size, style }: CountryFlagAvatarProps) {
  const flag = getCountryFlagEmoji(countryCode);

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
      <Text allowFontScaling={false} style={[styles.flag, { fontSize: Math.round(size * 0.82), lineHeight: size }]}>
        {flag}
      </Text>
    </View>
  );
}

function getCountryFlagEmoji(countryCode: string) {
  const normalizedCode = countryCode.trim().toUpperCase();

  if (!/^[A-Z]{2}$/.test(normalizedCode)) {
    return normalizedCode;
  }

  const regionalIndicatorOffset = 0x1f1e6 - 65;
  return String.fromCodePoint(
    normalizedCode.charCodeAt(0) + regionalIndicatorOffset,
    normalizedCode.charCodeAt(1) + regionalIndicatorOffset
  );
}

const styles = StyleSheet.create({
  frame: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  flag: {
    includeFontPadding: false,
    textAlign: 'center',
  },
});
