import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { forwardRef } from 'react';
import { GlobeHemisphereWest, LockSimple, PencilSimple, UsersThree } from 'phosphor-react-native';

import { ThemedText } from '@/components/themed-text';
import { GlassButton } from '@/components/ui/glass-button';
import { Sheet, SheetRef, SheetScrollView, SheetTextInput } from '@/components/ui/sheet';
import { WandrAvatar } from '@/components/wandr/avatar';
import { designSystem } from '@/constants/design-system';
import type { TripInviteFriend, TripSettings } from '@/types/trip';

type TripVisibility = TripSettings['visibility'];

type TripSettingsSheetProps = {
  insetsBottom: number;
  invitingFriendSlug: string | null;
  isDark: boolean;
  isSaving: boolean;
  name: string;
  tripSettings?: TripSettings;
  visibility: TripVisibility;
  onChangeName: (name: string) => void;
  onChangeVisibility: (visibility: TripVisibility) => void;
  onEditItinerary: () => void;
  onInviteFriend: (friendSlug: string) => void;
  onSave: () => void;
};

export const TripSettingsSheet = forwardRef<SheetRef, TripSettingsSheetProps>(function TripSettingsSheet(
  {
    insetsBottom,
    invitingFriendSlug,
    isDark,
    isSaving,
    name,
    tripSettings,
    visibility,
    onChangeName,
    onChangeVisibility,
    onEditItinerary,
    onInviteFriend,
    onSave,
  },
  ref
) {
  return (
    <Sheet ref={ref} index={-1} snapPoints={[520, 'full']} enablePanDownToClose>
      <SheetScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: Math.max(insetsBottom + 24, 36) },
        ]}
        showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <ThemedText style={styles.title}>Edit trip</ThemedText>
        </View>

        {!tripSettings ? (
          <View style={styles.loadingState}>
            <ActivityIndicator color={isDark ? designSystem.colors.lime : designSystem.colors.darkGreen} />
          </View>
        ) : (
          <View style={styles.formStack}>
            <View style={styles.fieldGroup}>
              <ThemedText style={styles.fieldLabel}>Trip name</ThemedText>
              <SheetTextInput
                style={[styles.input, isDark && styles.inputDark]}
                placeholder="Trip name"
                value={name}
                onChangeText={onChangeName}
              />
            </View>

            <View style={styles.fieldGroup}>
              <ThemedText style={styles.fieldLabel}>Visibility</ThemedText>
              <View style={styles.visibilityOptions}>
                <VisibilityOption
                  body="Only you see it until you open it up."
                  disabled={!tripSettings.canChangeVisibility}
                  icon="private"
                  isActive={visibility === 'private'}
                  isDark={isDark}
                  title="Private"
                  onPress={() => onChangeVisibility('private')}
                />
                <VisibilityOption
                  body="Lets you invite friends into this trip."
                  disabled={!tripSettings.canChangeVisibility}
                  icon="public"
                  isActive={visibility === 'public'}
                  isDark={isDark}
                  title="Public"
                  onPress={() => onChangeVisibility('public')}
                />
              </View>
              {!tripSettings.canChangeVisibility ? (
                <ThemedText style={styles.helperText}>This trip already has invited members, so it stays public.</ThemedText>
              ) : null}
            </View>

            {visibility === 'public' ? (
              <View style={styles.fieldGroup}>
                <View style={styles.sectionHeader}>
                  <ThemedText style={styles.fieldLabel}>Invite friends</ThemedText>
                  <UsersThree
                    size={18}
                    color={isDark ? designSystem.colors.lime : designSystem.colors.darkGreen}
                    weight="bold"
                  />
                </View>

                {tripSettings.friends.length === 0 ? (
                  <View style={[styles.emptyInviteState, isDark && styles.emptyInviteStateDark]}>
                    <ThemedText style={styles.emptyInviteTitle}>No friends yet</ThemedText>
                    <ThemedText style={styles.emptyInviteBody}>
                      Add people in Friends first, then they can be invited here.
                    </ThemedText>
                  </View>
                ) : (
                  <View style={styles.friendList}>
                    {tripSettings.friends.map((friend) => (
                      <FriendInviteRow
                        friend={friend}
                        invitingFriendSlug={invitingFriendSlug}
                        isInvited={tripSettings.invitedFriendSlugs.includes(friend.slug)}
                        key={friend.slug}
                        onInviteFriend={onInviteFriend}
                      />
                    ))}
                  </View>
                )}
              </View>
            ) : null}

            <View style={styles.actions}>
              <Pressable
                accessibilityRole="button"
                disabled={isSaving}
                onPress={onSave}
                style={[styles.primaryAction, isSaving && styles.disabledAction]}>
                <ThemedText style={styles.primaryActionText}>{isSaving ? 'Saving...' : 'Save trip settings'}</ThemedText>
              </Pressable>

              <GlassButton
                accessibilityLabel="Edit itinerary"
                height={52}
                onPress={onEditItinerary}
                radius={designSystem.radii.pill}
                style={styles.secondaryAction}
                width={320}>
                <View style={styles.secondaryActionContent}>
                  <PencilSimple size={18} color={isDark ? designSystem.colors.darkText : designSystem.colors.ink} weight="bold" />
                  <ThemedText style={styles.secondaryActionText}>Edit itinerary</ThemedText>
                </View>
              </GlassButton>
            </View>
          </View>
        )}
      </SheetScrollView>
    </Sheet>
  );
});

function VisibilityOption({
  body,
  disabled,
  icon,
  isActive,
  isDark,
  title,
  onPress,
}: {
  body: string;
  disabled: boolean;
  icon: 'private' | 'public';
  isActive: boolean;
  isDark: boolean;
  title: string;
  onPress: () => void;
}) {
  const Icon = icon === 'private' ? LockSimple : GlobeHemisphereWest;
  const iconColor = isActive
    ? designSystem.colors.darkGreen
    : isDark
      ? designSystem.colors.darkMutedText
      : designSystem.colors.gray;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled, selected: isActive }}
      disabled={disabled}
      onPress={onPress}
      style={[
        styles.visibilityOption,
        isDark && styles.visibilityOptionDark,
        isActive && styles.visibilityOptionActive,
        disabled && styles.disabledAction,
      ]}>
      <View style={[styles.visibilityIcon, isActive && styles.visibilityIconActive]}>
        <Icon size={18} weight="bold" color={iconColor} />
      </View>
      <View style={styles.visibilityCopy}>
        <ThemedText style={styles.visibilityTitle}>{title}</ThemedText>
        <ThemedText style={styles.visibilityBody}>{body}</ThemedText>
      </View>
    </Pressable>
  );
}

function FriendInviteRow({
  friend,
  invitingFriendSlug,
  isInvited,
  onInviteFriend,
}: {
  friend: TripInviteFriend;
  invitingFriendSlug: string | null;
  isInvited: boolean;
  onInviteFriend: (friendSlug: string) => void;
}) {
  const isBusy = invitingFriendSlug === friend.slug;

  return (
    <View style={styles.friendRow}>
      <View style={styles.friendIdentity}>
        <WandrAvatar
          name={friend.name || friend.slug || 'Traveler'}
          paletteKey={friend.slug}
          size={38}
          uri={friend.avatarUri}
          style={styles.avatarImage}
        />
        <View style={styles.friendCopy}>
          <ThemedText numberOfLines={1} style={styles.friendName}>{friend.name}</ThemedText>
          <ThemedText numberOfLines={1} style={styles.friendMeta}>{friend.baseLabel}</ThemedText>
        </View>
      </View>

      <GlassButton
        accessibilityLabel={isInvited ? `${friend.name} already invited` : `Invite ${friend.name}`}
        disabled={isInvited || isBusy}
        height={38}
        onPress={() => onInviteFriend(friend.slug)}
        radius={19}
        style={isInvited ? styles.invitedButton : null}
        variant={isInvited ? 'subtle' : 'primary'}
        width={92}>
        <ThemedText style={isInvited ? styles.invitedButtonText : styles.inviteButtonText}>
          {isBusy ? 'Sending' : isInvited ? 'Invited' : 'Invite'}
        </ThemedText>
      </GlassButton>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingTop: 12,
    paddingHorizontal: 20,
    gap: 18,
  },
  header: {
    paddingTop: 4,
  },
  title: {
    fontSize: 24,
    lineHeight: 29,
    fontWeight: '700',
  },
  formStack: {
    gap: 18,
  },
  fieldGroup: {
    gap: 8,
  },
  fieldLabel: {
    ...designSystem.type.eyebrow,
    color: designSystem.colors.subtleText,
  },
  input: {
    height: 52,
    borderRadius: designSystem.radii.pill,
  },
  inputDark: {
    backgroundColor: designSystem.colors.darkSurface,
  },
  visibilityOptions: {
    gap: 8,
  },
  visibilityOption: {
    minHeight: 74,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: designSystem.colors.scrimFaint,
    borderWidth: 1,
    borderColor: designSystem.colors.borderSoft,
  },
  visibilityOptionDark: {
    backgroundColor: designSystem.colors.darkSurface,
    borderColor: designSystem.colors.darkSurfaceBorder,
  },
  visibilityOptionActive: {
    backgroundColor: designSystem.colors.limeSoft,
    borderColor: designSystem.colors.lime,
  },
  visibilityIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  visibilityIconActive: {
    backgroundColor: 'rgba(255,255,255,0.35)',
  },
  visibilityCopy: {
    flex: 1,
    gap: 2,
  },
  visibilityTitle: {
    ...designSystem.type.bodyStrong,
  },
  visibilityBody: {
    fontSize: 14,
    lineHeight: 19,
    color: designSystem.colors.gray,
  },
  helperText: {
    fontSize: 13,
    lineHeight: 18,
    color: designSystem.colors.gray,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  emptyInviteState: {
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 13,
    backgroundColor: designSystem.colors.scrimFaint,
    gap: 3,
  },
  emptyInviteStateDark: {
    backgroundColor: designSystem.colors.darkSurface,
  },
  emptyInviteTitle: {
    ...designSystem.type.bodyStrong,
  },
  emptyInviteBody: {
    fontSize: 14,
    lineHeight: 19,
    color: designSystem.colors.gray,
  },
  friendList: {
    gap: 10,
  },
  friendRow: {
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  friendIdentity: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  avatarImage: {
    width: 38,
    height: 38,
  },
  friendCopy: {
    flex: 1,
    gap: 1,
  },
  friendName: {
    ...designSystem.type.bodyStrong,
  },
  friendMeta: {
    fontSize: 13,
    lineHeight: 17,
    color: designSystem.colors.gray,
  },
  inviteButtonText: {
    fontSize: 12,
    lineHeight: 14,
    fontWeight: '700',
    color: designSystem.colors.darkGreen,
  },
  invitedButton: {
    opacity: 0.75,
  },
  invitedButtonText: {
    fontSize: 12,
    lineHeight: 14,
    fontWeight: '700',
    color: designSystem.colors.gray,
  },
  actions: {
    gap: 10,
    paddingTop: 2,
  },
  primaryAction: {
    height: 54,
    borderRadius: designSystem.radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: designSystem.colors.lime,
  },
  primaryActionText: {
    ...designSystem.type.bodyStrong,
    color: designSystem.colors.darkGreen,
  },
  secondaryAction: {
    width: '100%',
  },
  secondaryActionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  secondaryActionText: {
    ...designSystem.type.bodyStrong,
  },
  disabledAction: {
    opacity: 0.62,
  },
  loadingState: {
    minHeight: 180,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
