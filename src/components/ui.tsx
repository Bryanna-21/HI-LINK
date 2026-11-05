import { ReactNode } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemeColors, useTheme } from '../theme/ThemeProvider';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

/** Shared building blocks so every new screen uses the same black/white/green/blue identity. */

export function ScreenHeader({
  title,
  subtitle,
  right,
  onBack,
}: {
  title: string;
  subtitle?: string;
  right?: ReactNode;
  onBack?: () => void;
}) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = createStyles(colors);

  return (
    <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
      <Pressable
        onPress={onBack ?? (() => (router.canGoBack() ? router.back() : router.replace('/(tabs)/home')))}
        style={styles.backButton}
        accessibilityRole="button"
        accessibilityLabel="Go back"
      >
        <Ionicons name="arrow-back" size={24} color={colors.text} />
      </Pressable>

      <View style={styles.headerText}>
        <Text style={styles.headerTitle} numberOfLines={1} accessibilityRole="header">
          {title}
        </Text>
        {subtitle ? (
          <Text style={styles.headerSubtitle} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>

      {right}
    </View>
  );
}

export function Card({
  children,
  onPress,
  style,
  accessibilityLabel,
}: {
  children: ReactNode;
  onPress?: () => void;
  style?: ViewStyle;
  accessibilityLabel?: string;
}) {
  const { colors } = useTheme();
  const styles = createStyles(colors);

  if (!onPress) {
    return <View style={[styles.card, style]}>{children}</View>;
  }

  return (
    <Pressable
      onPress={onPress}
      style={[styles.card, style]}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
    >
      {children}
    </Pressable>
  );
}

export function Button({
  label,
  onPress,
  icon,
  variant = 'primary',
  disabled,
  loading,
}: {
  label: string;
  onPress: () => void;
  icon?: IconName;
  variant?: 'primary' | 'secondary' | 'danger';
  disabled?: boolean;
  loading?: boolean;
}) {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const blocked = disabled || loading;
  const background =
    variant === 'primary' ? colors.accent : variant === 'danger' ? colors.danger : colors.card;
  const foreground = variant === 'secondary' ? colors.text : colors.background;

  return (
    <Pressable
      onPress={onPress}
      disabled={blocked}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: blocked, busy: loading }}
      style={[
        styles.button,
        { backgroundColor: background, opacity: blocked ? 0.5 : 1 },
        variant === 'secondary' && { borderWidth: 1, borderColor: colors.border },
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={foreground} />
      ) : icon ? (
        <Ionicons name={icon} size={18} color={foreground} />
      ) : null}
      <Text style={[styles.buttonText, { color: foreground }]}>{label}</Text>
    </Pressable>
  );
}

export function Chip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected?: boolean;
  onPress?: () => void;
}) {
  const { colors } = useTheme();
  const styles = createStyles(colors);

  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityState={{ selected: Boolean(selected) }}
      style={[styles.chip, selected && { backgroundColor: colors.accentSoft, borderColor: colors.accent }]}
    >
      <Text style={[styles.chipText, selected && { color: colors.accent }]}>{label}</Text>
    </Pressable>
  );
}

export function Field({
  label,
  hint,
  ...input
}: TextInputProps & { label: string; hint?: string }) {
  const { colors } = useTheme();
  const styles = createStyles(colors);

  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        placeholderTextColor={colors.muted}
        accessibilityLabel={label}
        {...input}
        style={[styles.input, input.multiline && styles.inputMultiline]}
      />
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
}

export function SectionTitle({ children }: { children: ReactNode }) {
  const { colors } = useTheme();

  return (
    <Text
      accessibilityRole="header"
      style={{ color: colors.text, fontSize: 18, fontWeight: '800', marginTop: 22, marginBottom: 10 }}
    >
      {children}
    </Text>
  );
}

export function EmptyState({
  icon,
  title,
  body,
  action,
}: {
  icon: IconName;
  title: string;
  body?: string;
  action?: ReactNode;
}) {
  const { colors } = useTheme();
  const styles = createStyles(colors);

  return (
    <View style={styles.empty}>
      <Ionicons name={icon} size={32} color={colors.muted} />
      <Text style={styles.emptyTitle}>{title}</Text>
      {body ? <Text style={styles.emptyBody}>{body}</Text> : null}
      {action ? <View style={{ marginTop: 14 }}>{action}</View> : null}
    </View>
  );
}

export function LoadingState({ label = 'Loading...' }: { label?: string }) {
  const { colors } = useTheme();
  const styles = createStyles(colors);

  return (
    <View style={styles.empty} accessibilityLiveRegion="polite">
      <ActivityIndicator size="small" color={colors.accent} />
      <Text style={styles.emptyBody}>{label}</Text>
    </View>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <EmptyState
      icon="alert-circle-outline"
      title="Something went wrong"
      body={message}
      action={onRetry ? <Button label="Try again" variant="secondary" onPress={onRetry} /> : undefined}
    />
  );
}

export function Avatar({
  uri,
  name,
  size = 44,
}: {
  uri?: string;
  name?: string;
  size?: number;
}) {
  const { colors } = useTheme();

  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: colors.accentSoft,
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
      }}
    >
      {uri ? (
        <Image source={{ uri }} style={{ width: '100%', height: '100%' }} />
      ) : (
        <Text style={{ color: colors.accent, fontWeight: '900', fontSize: size * 0.4 }}>
          {(name ?? '?').trim().charAt(0).toUpperCase() || '?'}
        </Text>
      )}
    </View>
  );
}

export function Badge({ label, tone = 'accent' }: { label: string; tone?: 'accent' | 'blue' | 'danger' | 'orange' }) {
  const { colors } = useTheme();
  const color =
    tone === 'blue' ? colors.blue : tone === 'danger' ? colors.danger : tone === 'orange' ? colors.orange : colors.accent;

  return (
    <View style={{ borderRadius: 999, borderWidth: 1, borderColor: color, paddingHorizontal: 8, paddingVertical: 2 }}>
      <Text style={{ color, fontSize: 11, fontWeight: '800' }}>{label}</Text>
    </View>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingBottom: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      backgroundColor: colors.background,
      gap: 10,
    },
    backButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
    headerText: { flex: 1, minWidth: 0 },
    headerTitle: { color: colors.text, fontSize: 20, fontWeight: '900' },
    headerSubtitle: { color: colors.muted, fontSize: 12, marginTop: 2 },
    card: {
      backgroundColor: colors.card,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 14,
      marginBottom: 10,
    },
    button: {
      minHeight: 46,
      borderRadius: 14,
      paddingHorizontal: 18,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
    },
    buttonText: { fontSize: 15, fontWeight: '800' },
    chip: {
      borderRadius: 999,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 12,
      paddingVertical: 7,
      marginRight: 8,
      marginBottom: 8,
      backgroundColor: colors.card,
    },
    chipText: { color: colors.textSecondary, fontSize: 13, fontWeight: '700' },
    field: { marginBottom: 14 },
    fieldLabel: { color: colors.textSecondary, fontSize: 13, fontWeight: '700', marginBottom: 6 },
    input: {
      minHeight: 48,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card,
      color: colors.text,
      paddingHorizontal: 14,
      fontSize: 15,
    },
    inputMultiline: { minHeight: 100, paddingTop: 12, textAlignVertical: 'top' },
    hint: { color: colors.muted, fontSize: 12, marginTop: 5 },
    empty: {
      alignItems: 'center',
      padding: 28,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card,
      gap: 6,
    },
    emptyTitle: { color: colors.text, fontSize: 16, fontWeight: '800', marginTop: 6, textAlign: 'center' },
    emptyBody: { color: colors.muted, fontSize: 13, lineHeight: 19, textAlign: 'center' },
  });
