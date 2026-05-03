import { BlurView } from 'expo-blur';
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import { DotsThree, PaperPlaneTilt } from 'phosphor-react-native';
import { Keyboard, Platform, Pressable, StyleSheet, View } from 'react-native';
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
  const isAndroid = Platform.OS === 'android';
  const composerRadius = isMultilineDraft ? 28 : designSystem.radii.pill;
  const iconColor = isDark ? designSystem.colors.white : designSystem.colors.darkGreen;
  const composerSurfaceColor = isAndroid
    ? (isDark ? designSystem.colors.darkSurface : designSystem.colors.surfaceRaised)
    : (isDark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.03)');
  const composerBorderColor = isAndroid
    ? (isDark ? designSystem.colors.darkBorder : designSystem.colors.lightSurfaceAlt)
    : (isDark ? designSystem.colors.whiteOverlayBarely : 'rgba(255,255,255,0.54)');
  const handleOpenTools = () => {
    Keyboard.dismiss();
    onOpenTools();
  };

  return (
    <View style={styles.wrap}>
      <Animated.View
        layout={LinearTransition.duration(180)}
        style={[styles.composerShell, !isAndroid ? styles.composerFloat : null, { borderRadius: composerRadius }]}>
        <View style={[styles.composerGlassClip, { borderRadius: composerRadius }]}>
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
                backgroundColor: composerSurfaceColor,
                borderColor: composerBorderColor,
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
                  onPress={handleOpenTools}>
                  <DotsThree color={iconColor} size={22} weight="bold" />
                </Pressable>
              </Animated.View>
            ) : null}

            <Animated.View layout={LinearTransition.duration(180)} style={styles.inputSlot}>
              <GlassInput
                accessibilityLabel={placeholder}
                autoCapitalize="sentences"
                autoCorrect
                containerStyle={[styles.inputContainer, isMultilineDraft ? styles.inputContainerMultiline : null]}
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
                style={[styles.inlineButton, isSending ? (isAndroid ? styles.sendDisabledAndroid : styles.sendDisabled) : null]}>
                <PaperPlaneTilt color={iconColor} size={20} weight="fill" />
              </Pressable>
            </Animated.View>
          </Animated.View>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 12,
  },
  composerShell: {
    minHeight: 52,
    maxHeight: 144,
  },
  composerFloat: {
    shadowColor: designSystem.colors.shadow,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.18,
    shadowRadius: 26,
  },
  composerGlassClip: {
    minHeight: 52,
    maxHeight: 144,
    overflow: 'hidden',
  },
  composerTint: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 1,
  },
  composerContent: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingLeft: 6,
    paddingRight: 6,
    paddingVertical: 4,
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
    width: 40,
    height: 40,
  },
  inputSlot: {
    flex: 1,
    minWidth: 0,
  },
  inputContainer: {
    height: 22,
    minHeight: 22,
  },
  inputContainerMultiline: {
    height: 66,
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
    width: 40,
    height: 40,
  },
  inlineButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendDisabled: {
    opacity: 0.7,
  },
  sendDisabledAndroid: {
    backgroundColor: designSystem.colors.lightSurfaceAlt,
    borderRadius: 22,
  },
});
