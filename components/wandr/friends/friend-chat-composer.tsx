import { BlurView } from 'expo-blur';
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import { DotsThree, PaperPlaneTilt } from 'phosphor-react-native';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeInLeft, FadeOutLeft, LinearTransition } from 'react-native-reanimated';

import { GlassInput } from '@/components/ui/glass-input';
import { designSystem } from '@/constants/design-system';
import { useColorScheme } from '@/hooks/use-color-scheme';

export function FriendChatComposer({
  value,
  onChangeText,
  onSubmit,
  placeholder,
  isSending,
  onOpenTools,
  hasTools = true,
}: {
  value: string;
  onChangeText: (value: string) => void;
  onSubmit: () => void;
  placeholder: string;
  isSending: boolean;
  onOpenTools: () => void;
  hasTools?: boolean;
}) {
  const isDark = useColorScheme() === 'dark';
  const hasDraft = value.trim().length > 0;
  const isMultilineDraft = value.includes('\n') || value.length > 46;
  const shouldUseNativeGlass = Platform.OS === 'ios' && isLiquidGlassAvailable();
  const composerRadius = isMultilineDraft ? 28 : designSystem.radii.pill;
  const iconColor = isDark ? designSystem.colors.white : designSystem.colors.darkGreen;

  return (
    <View style={styles.wrap}>
      <Animated.View
        layout={LinearTransition.duration(180)}
        style={[styles.composerShell, { borderRadius: composerRadius }]}>
        {shouldUseNativeGlass ? (
          <GlassView
            style={[StyleSheet.absoluteFillObject, { borderRadius: composerRadius }]}
            glassEffectStyle="clear"
            tintColor={designSystem.colors.transparentWhite}
            isInteractive
          />
        ) : Platform.OS === 'ios' ? (
          <BlurView
            intensity={76}
            tint={isDark ? 'dark' : 'light'}
            style={[StyleSheet.absoluteFillObject, { borderRadius: composerRadius }]}
          />
        ) : null}

        <View
          pointerEvents="none"
          style={[
            styles.composerTint,
            {
              borderRadius: composerRadius,
              backgroundColor: isDark ? designSystem.colors.darkGlassHeader : designSystem.colors.whiteOverlayFaint,
              borderColor: isDark ? designSystem.colors.whiteOverlayBarely : designSystem.colors.borderSoft,
            },
          ]}
        />

        <Animated.View
          layout={LinearTransition.duration(180)}
          style={[
            styles.composerContent,
            hasDraft ? styles.composerContentTyping : null,
            isMultilineDraft ? styles.composerContentMultiline : null,
          ]}>
          {!hasDraft && hasTools ? (
            <Animated.View
              entering={FadeInLeft.duration(180)}
              exiting={FadeOutLeft.duration(140)}
              layout={LinearTransition.duration(180)}
              style={styles.menuSlot}>
              <Pressable
                style={styles.inlineButton}
                accessibilityLabel="Open chat tools"
                onPress={onOpenTools}>
                <DotsThree color={iconColor} size={22} weight="bold" />
              </Pressable>
            </Animated.View>
          ) : null}

          <Animated.View layout={LinearTransition.duration(180)} style={styles.inputSlot}>
            <GlassInput
              accessibilityLabel={placeholder}
              autoCapitalize="sentences"
              autoCorrect
              containerStyle={styles.inputContainer}
              leftIcon={null}
              multiline
              plain
              value={value}
              onChangeText={onChangeText}
              placeholder=""
              textAlignVertical={isMultilineDraft ? 'top' : 'center'}
              style={[
                styles.input,
                isMultilineDraft ? styles.inputMultiline : null,
                { color: isDark ? designSystem.colors.white : designSystem.colors.ink },
              ]}
              maxLength={1000}
            />
          </Animated.View>

          <Animated.View layout={LinearTransition.duration(180)} style={styles.sendSlot}>
            <Pressable
              accessibilityLabel="Send message"
              disabled={isSending}
              onPress={onSubmit}
              style={[styles.inlineButton, isSending ? styles.sendDisabled : null]}>
              <PaperPlaneTilt color={iconColor} size={20} weight="fill" />
            </Pressable>
          </Animated.View>
        </Animated.View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 12,
  },
  composerShell: {
    minHeight: 56,
    maxHeight: 144,
    overflow: 'hidden',
  },
  composerTint: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 1,
  },
  composerContent: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingLeft: 6,
    paddingRight: 6,
    paddingVertical: 6,
  },
  composerContentTyping: {
    paddingLeft: 18,
    paddingRight: 8,
  },
  composerContentMultiline: {
    alignItems: 'flex-end',
    paddingVertical: 12,
  },
  menuSlot: {
    width: 44,
    height: 44,
  },
  inputSlot: {
    flex: 1,
    minWidth: 0,
  },
  inputContainer: {
    minHeight: 22,
  },
  input: {
    minHeight: 22,
    maxHeight: 104,
    fontSize: 17,
    lineHeight: 22,
    fontWeight: '500',
    paddingTop: 0,
    paddingBottom: 0,
    includeFontPadding: false,
  },
  inputMultiline: {
    minHeight: 66,
  },
  sendSlot: {
    width: 44,
    height: 44,
  },
  inlineButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendDisabled: {
    opacity: 0.7,
  },
});
