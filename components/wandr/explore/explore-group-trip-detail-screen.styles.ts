import { StyleSheet } from 'react-native';

import { designSystem } from '@/constants/design-system';

export const styles = StyleSheet.create({
  root: { flex: 1 },
  content: {
    gap: designSystem.spacing.xxxl,
  },
  carouselContainer: {
    width: '100%',
  },
  paddedContent: {
    paddingHorizontal: designSystem.spacing.lg,
    gap: designSystem.spacing.xxxl,
  },
  header: {
    gap: 10,
  },
  title: {
    fontSize: 28,
    lineHeight: 32,
    fontWeight: '600',
    color: designSystem.colors.ink,
  },
  subtitle: {
    fontSize: 18,
    lineHeight: 22,
    fontWeight: '600',
    color: designSystem.colors.ink,
  },
  meta: {
    fontSize: 15,
    lineHeight: 22,
    color: designSystem.colors.warmDark,
  },
  joinButton: {
    minHeight: 52,
    borderRadius: designSystem.radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: designSystem.colors.lime,
    borderWidth: 1,
    borderColor: designSystem.colors.borderAccent,
  },
  joinButtonPressed: {
    opacity: 0.86,
  },
  joinButtonDisabled: {
    opacity: 0.68,
  },
  joinButtonText: {
    fontSize: 13,
    lineHeight: 16,
    fontWeight: '600',
    color: designSystem.colors.darkGreen,
  },
  section: {
    gap: 12,
  },
  sectionTitle: {
    fontSize: 24,
    lineHeight: 24,
    fontWeight: '600',
    color: designSystem.colors.ink,
  },
  summary: {
    fontSize: 15,
    lineHeight: 22,
    color: designSystem.colors.warmDark,
  },
  itineraryList: {
    gap: 14,
  },
  itineraryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingRight: 4,
  },
  itineraryImage: {
    width: 76,
    height: 76,
    borderRadius: 22,
  },
  itineraryCopy: {
    flex: 1,
    gap: 2,
  },
  itineraryIndex: {
    ...designSystem.type.eyebrow,
    color: designSystem.colors.darkGreen,
  },
  itineraryTitle: {
    fontSize: 18,
    lineHeight: 20,
    fontWeight: '600',
    color: designSystem.colors.ink,
  },
  itineraryMeta: {
    fontSize: 14,
    lineHeight: 19,
    color: designSystem.colors.warmDark,
  },
});
