import { useEffect, useRef } from 'react';
import type React from 'react';
import {
  Button,
  Form,
  HStack,
  Host,
  LabeledContent,
  Picker,
  Section,
  Spacer,
  Text as SwiftText,
  TextField,
  Toggle,
  useNativeState,
  VStack,
} from '@expo/ui/swift-ui';
import {
  buttonStyle,
  disabled as swiftDisabled,
  foregroundStyle,
  listStyle,
  multilineTextAlignment,
  tag,
  textFieldStyle,
} from '@expo/ui/swift-ui/modifiers';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { designSystem } from '@/constants/design-system';
import { useColorScheme } from '@/hooks/use-color-scheme';

type ProfileSettingScreenProps = {
  title: string;
  description?: string;
  bottomNote?: string;
  children: React.ReactNode;
  presentation?: 'form' | 'plain';
  wrapInSection?: boolean;
};

export function ProfileSettingScreen({
  bottomNote,
  children,
  description,
  presentation = 'form',
  title,
  wrapInSection = true,
}: ProfileSettingScreenProps) {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const formColorScheme = colorScheme === 'dark' ? 'dark' : 'light';
  const colors = formColorScheme === 'dark' ? designSystem.semantic.dark : designSystem.semantic.light;

  if (presentation === 'plain') {
    return (
      <ThemedView style={[styles.root, { backgroundColor: colors.background }]}>
        <ScrollView
          contentInsetAdjustmentBehavior="automatic"
          contentContainerStyle={[
            styles.content,
            {
              paddingTop: 16,
              paddingBottom: insets.bottom + 64,
            },
          ]}
          showsVerticalScrollIndicator={false}>
          {description ? (
            <ThemedText style={[styles.description, { color: colors.textSubtle }]}>{description}</ThemedText>
          ) : null}

          <View style={styles.section}>{children}</View>
          {bottomNote ? (
            <ThemedText style={[styles.bottomNote, { color: colors.textSubtle }]}>{bottomNote}</ThemedText>
          ) : null}
        </ScrollView>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={[styles.root, { backgroundColor: colors.background }]}>
      <Host colorScheme={formColorScheme} style={styles.host} useViewportSizeMeasurement>
        <Form modifiers={[listStyle('insetGrouped')]}>
          {wrapInSection ? (
            <SettingFormSection bottomNote={bottomNote} description={description} title={title}>
              {children}
            </SettingFormSection>
          ) : (
            children
          )}
        </Form>
      </Host>
    </ThemedView>
  );
}

type SettingFormSectionProps = {
  bottomNote?: string;
  children: React.ReactNode;
  description?: string;
  title: string;
};

export function SettingFormSection({ bottomNote, children, description, title }: SettingFormSectionProps) {
  return (
    <Section title={title} footer={<SectionFooter bottomNote={bottomNote} description={description} />}>
      {children}
    </Section>
  );
}

function SectionFooter({ bottomNote, description }: { bottomNote?: string; description?: string }) {
  if (!description && !bottomNote) {
    return null;
  }

  return (
    <VStack spacing={4}>
      {description ? (
        <SwiftText modifiers={[foregroundStyle({ type: 'hierarchical', style: 'secondary' })]}>
          {description}
        </SwiftText>
      ) : null}
      {bottomNote ? (
        <SwiftText modifiers={[foregroundStyle({ type: 'hierarchical', style: 'secondary' })]}>
          {bottomNote}
        </SwiftText>
      ) : null}
    </VStack>
  );
}

type SettingFieldProps = {
  label: string;
  value: string;
};

export function SettingField({ label, value }: SettingFieldProps) {
  return <SettingRow label={label} value={value || 'Not set'} />;
}

type SettingTextInputProps = {
  label: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  value: string;
};

export function SettingTextInput({ label, onChangeText, placeholder, value }: SettingTextInputProps) {
  const textState = useNativeState(value);
  const lastValueRef = useRef(value);

  /* eslint-disable react-hooks/immutability -- Expo UI ObservableState is intentionally synced through its mutable value field. */
  useEffect(() => {
    if (value !== lastValueRef.current && value !== textState.value) {
      textState.value = value;
    }
    lastValueRef.current = value;
  }, [textState, value]);
  /* eslint-enable react-hooks/immutability */

  const handleChangeText = (nextValue: string) => {
    lastValueRef.current = nextValue;
    onChangeText(nextValue);
  };

  return (
    <LabeledContent label={label}>
      <TextField
        modifiers={[textFieldStyle('plain'), multilineTextAlignment('trailing')]}
        onTextChange={handleChangeText}
        placeholder={placeholder}
        text={textState}
      />
    </LabeledContent>
  );
}

type SettingOption<T extends string> = {
  label: string;
  value: T;
};

type SettingOptionGroupProps<T extends string> = {
  disabled?: boolean;
  label: string;
  onChange: (value: T) => void;
  options: readonly SettingOption<T>[];
  value: T;
};

export function SettingOptionGroup<T extends string>({
  disabled = false,
  label,
  onChange,
  options,
  value,
}: SettingOptionGroupProps<T>) {
  return (
    <Picker
      label={label}
      modifiers={[swiftDisabled(disabled)]}
      onSelectionChange={(nextValue) => {
        onChange(nextValue);
      }}
      selection={value}>
      {options.map((option) => (
        <SwiftText key={option.value} modifiers={[tag(option.value)]}>
          {option.label}
        </SwiftText>
      ))}
    </Picker>
  );
}

type SettingActionButtonProps = {
  disabled?: boolean;
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary';
};

export function SettingActionButton({ disabled = false, label, onPress, variant = 'primary' }: SettingActionButtonProps) {
  const colorScheme = useColorScheme();
  const colors = colorScheme === 'dark' ? designSystem.semantic.dark : designSystem.semantic.light;
  const isPrimary = variant === 'primary';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={[
        styles.actionButton,
        {
          backgroundColor: isPrimary ? colors.text : colors.surface,
          borderColor: colors.borderSoft,
          opacity: disabled ? 0.58 : 1,
        },
      ]}>
      <ThemedText style={[styles.actionButtonText, { color: isPrimary ? colors.background : colors.text }]}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

type SettingActionRowProps = {
  disabled?: boolean;
  destructive?: boolean;
  label: string;
  onPress: () => void;
  value?: string;
};

export function SettingActionRow({ disabled = false, destructive = false, label, onPress, value }: SettingActionRowProps) {
  return (
    <Button
      modifiers={[buttonStyle('plain'), swiftDisabled(disabled)]}
      onPress={disabled ? undefined : onPress}
      role={destructive ? 'destructive' : 'default'}>
      <HStack alignment="center" spacing={12}>
        <SwiftText modifiers={destructive ? [foregroundStyle('red')] : undefined}>{label}</SwiftText>
        {value ? (
          <>
            <Spacer />
            <SwiftText modifiers={[foregroundStyle({ type: 'hierarchical', style: 'secondary' })]}>
              {value}
            </SwiftText>
          </>
        ) : null}
      </HStack>
    </Button>
  );
}

type SettingRowProps = {
  label: string;
  description?: string;
  value?: string;
};

export function SettingRow({ description, label, value }: SettingRowProps) {
  return (
    <LabeledContent label={label}>
      <SwiftText modifiers={[foregroundStyle({ type: 'hierarchical', style: 'secondary' })]}>
        {value || description || ''}
      </SwiftText>
    </LabeledContent>
  );
}

type SettingSwitchRowProps = {
  description?: string;
  disabled?: boolean;
  label: string;
  onValueChange: (value: boolean) => void;
  value: boolean;
};

export function SettingSwitchRow({ disabled = false, label, onValueChange, value }: SettingSwitchRowProps) {
  return (
    <Toggle
      isOn={value}
      label={label}
      modifiers={[swiftDisabled(disabled)]}
      onIsOnChange={onValueChange}
    />
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  content: {
    gap: 18,
    paddingHorizontal: designSystem.spacing.lg,
  },
  host: {
    flex: 1,
  },
  description: {
    fontSize: 15,
    lineHeight: 22,
  },
  section: {
    gap: 0,
  },
  actionButton: {
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 16,
    paddingHorizontal: 18,
    marginVertical: 8,
    width: '100%',
  },
  actionButtonText: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '700',
  },
  bottomNote: {
    fontSize: 12,
    lineHeight: 18,
  },
});
