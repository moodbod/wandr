import { Cloud, CloudFog, CloudRain, CloudSnow, Lightning, Sun } from 'phosphor-react-native';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { designSystem } from '@/constants/design-system';
import { useColorScheme } from '@/hooks/use-color-scheme';

type WeatherData = {
  temp: number;
  description: string;
  code: number;
};

const CARD_RADIUS = 30;
const CARD_PADDING = 18;

function getWeatherInfo(code: number) {
  if (code === 0) return { desc: 'Clear skies', Icon: Sun };
  if (code <= 3) return { desc: 'Partly cloudy', Icon: Cloud };
  if (code <= 48) return { desc: 'Foggy', Icon: CloudFog };
  if (code <= 55) return { desc: 'Drizzle', Icon: CloudRain };
  if (code <= 65) return { desc: 'Rain', Icon: CloudRain };
  if (code <= 75) return { desc: 'Snow', Icon: CloudSnow };
  if (code >= 95) return { desc: 'Thunderstorm', Icon: Lightning };
  return { desc: 'Clear skies', Icon: Sun };
}

type WeatherCardProps = {
  latitude?: number;
  longitude?: number;
};

export function WeatherCard({
  latitude = -22.68, // Default to Swakopmund
  longitude = 14.53,
}: WeatherCardProps) {
  const isDark = useColorScheme() === 'dark';
  const [weather, setWeather] = useState<WeatherData | null>(null);

  useEffect(() => {
    async function fetchWeather() {
      try {
        const res = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,weather_code`
        );
        const data = await res.json();
        if (data.current) {
          setWeather({
            temp: Math.round(data.current.temperature_2m),
            code: data.current.weather_code,
            description: getWeatherInfo(data.current.weather_code).desc,
          });
        }
      } catch (e) {
        console.warn('Failed to fetch weather', e);
      }
    }
    fetchWeather();
  }, [latitude, longitude]);

  const Info = weather ? getWeatherInfo(weather.code) : null;
  const Icon = Info?.Icon ?? Sun;

  return (
    <View style={[styles.card, isDark && styles.cardDark]}>
      {weather ? (
        <>
          <View style={styles.headerRow}>
            <View style={styles.iconWrap}>
              <Icon size={28} color="#ffffff" weight="fill" />
            </View>
          </View>

          <View style={styles.textStack}>
            <ThemedText style={styles.temp}>{weather.temp}°C</ThemedText>
            <ThemedText style={styles.desc}>{weather.description}</ThemedText>
          </View>
        </>
      ) : (
        <View style={styles.loadingBox}>
          <ActivityIndicator color="#ffffff" />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: designSystem.colors.darkGreen,
    borderRadius: CARD_RADIUS,
    padding: CARD_PADDING,
    justifyContent: 'space-between',
    minHeight: 172,
  },
  cardDark: {
    backgroundColor: designSystem.colors.darkSurface,
    borderWidth: 1,
    borderColor: designSystem.colors.darkBorder,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  eyebrow: {
    fontSize: 12,
    lineHeight: 14,
    fontWeight: '900',
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: 'rgba(255,255,255,0.88)',
  },
  textStack: {
    marginTop: 'auto',
    gap: 4,
  },
  temp: {
    color: '#fff',
    fontSize: 44,
    lineHeight: 44,
    fontWeight: '900',
    letterSpacing: -1.5,
  },
  desc: {
    color: 'rgba(255,255,255,0.72)',
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '700',
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
