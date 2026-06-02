import { StyleSheet } from 'react-native';

import { designSystem } from '@/constants/design-system';

export const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  rootDark: {
    backgroundColor: designSystem.colors.darkBackground,
  },
  largePanelDark: {
    backgroundColor: designSystem.colors.darkBackground,
    borderColor: designSystem.colors.darkSurfaceBorder,
  },
  largeBody: {
    flex: 1,
    flexDirection: 'row',
  },
  mainColumn: {
    flexShrink: 0,
    flexGrow: 0,
    minWidth: 340,
    borderRightWidth: 1,
  },
  mainColumnTablet: {
    width: 360,
  },
  mainColumnDesktop: {
    width: 420,
  },
  detailColumn: {
    flexShrink: 0,
    flexGrow: 0,
    borderRightWidth: 1,
  },
  detailColumnTablet: {
    width: 340,
  },
  detailColumnDesktop: {
    width: 430,
  },
  mapColumn: {
    flex: 1,
    minWidth: 0,
    backgroundColor: designSystem.colors.mapFallback,
    overflow: 'hidden',
    position: 'relative',
  },
  content: {
    paddingHorizontal: designSystem.spacing.lg,
    gap: designSystem.spacing.lg,
  },
  actionBtn: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  actionBtnPrimary: {
    backgroundColor: designSystem.colors.lime,
  },
  actionBtnDark: {
    backgroundColor: 'transparent',
  },
  actionBtnPrimaryText: {
    ...designSystem.type.bodyStrong,
    color: designSystem.colors.darkGreen,
  },
  actionDisabled: {
    opacity: 0.6,
  },
  sheetContent: {
    padding: 20,
    gap: 22,
  },
  sheetTitle: {
    ...designSystem.type.title,
    fontWeight: '700',
  },
  fieldGroup: {
    gap: 10,
  },
  fieldLabel: {
    ...designSystem.type.eyebrow,
    // Subtle, theme-aware section label (ThemedText remaps subtleText per theme),
    // instead of dark-green which was invisible on dark surfaces.
    color: designSystem.colors.subtleText,
  },
  input: {
    height: 52,
    borderRadius: 14,
    backgroundColor: designSystem.colors.surface,
    paddingHorizontal: 16,
    ...designSystem.type.body,
    color: designSystem.colors.ink,
  },
  inputDark: {
    backgroundColor: designSystem.colors.darkSurface,
    color: designSystem.colors.darkText,
  },
  visibilityRow: {
    gap: 12,
  },
  visibilityOption: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 14,
    backgroundColor: designSystem.colors.scrimFaint,
    borderWidth: 1,
    borderColor: designSystem.colors.borderSoft,
  },
  visibilityOptionActive: {
    backgroundColor: designSystem.colors.limeSoft,
    borderColor: designSystem.colors.borderAccent,
  },
  visibilityOptionDisabled: {
    opacity: 0.75,
  },
  visibilityCopy: {
    flex: 1,
    gap: 2,
  },
  visibilityTitle: {
    ...designSystem.type.bodyStrong,
    color: designSystem.colors.ink,
  },
  visibilityBody: {
    fontSize: 14,
    lineHeight: 20,
    color: designSystem.colors.gray,
  },
  helperText: {
    fontSize: 14,
    lineHeight: 20,
    color: designSystem.colors.gray,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  sectionHeaderCopy: {
    flex: 1,
    gap: 4,
  },
  emptyInviteState: {
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 14,
    backgroundColor: designSystem.colors.scrimFaint,
    gap: 4,
  },
  emptyInviteTitle: {
    ...designSystem.type.bodyStrong,
    color: designSystem.colors.ink,
  },
  emptyInviteBody: {
    fontSize: 14,
    lineHeight: 20,
    color: designSystem.colors.gray,
  },
  friendList: {
    gap: 12,
  },
  friendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  friendIdentity: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatarWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: designSystem.colors.surface,
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: designSystem.colors.surfaceMuted,
  },
  avatarFallbackText: {
    ...designSystem.type.bodyStrong,
    color: designSystem.colors.darkGreen,
  },
  friendCopy: {
    flex: 1,
    gap: 2,
  },
  friendName: {
    ...designSystem.type.bodyStrong,
    color: designSystem.colors.ink,
  },
  friendMeta: {
    fontSize: 14,
    lineHeight: 20,
    color: designSystem.colors.gray,
  },
  inviteButtonText: {
    fontSize: 12,
    lineHeight: 14,
    fontWeight: '600',
    color: designSystem.colors.darkGreen,
  },
  invitedButton: {
    opacity: 0.8,
  },
  invitedButtonText: {
    fontSize: 12,
    lineHeight: 14,
    fontWeight: '600',
    color: designSystem.colors.gray,
  },
  inlineActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  inlineActionText: {
    ...designSystem.type.bodyStrong,
  },
  loadingState: {
    minHeight: 180,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
