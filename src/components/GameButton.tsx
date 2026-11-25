import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Theme } from '../theme/themes';
import { play } from '../audio/sfx';

type Props = {
  label: string;
  icon?: string;
  badge?: string; // e.g. "AD" or "3"
  onPress: () => void;
  theme: Theme;
  variant?: 'primary' | 'ghost';
  disabled?: boolean;
  big?: boolean;
  compact?: boolean;
  iconOnly?: boolean;
  accessibilityLabel?: string;
};

export default function GameButton({
  label,
  icon,
  badge,
  onPress,
  theme,
  variant = 'ghost',
  disabled,
  big,
  compact,
  iconOnly,
  accessibilityLabel,
}: Props) {
  const primary = variant === 'primary';
  return (
    <Pressable
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      onPress={() => {
        play('tap');
        onPress();
      }}
      style={({ pressed }) => [
        styles.btn,
        big && styles.big,
        compact && styles.compact,
        iconOnly && styles.iconOnly,
        {
          backgroundColor: primary ? theme.accent : theme.surface,
          opacity: disabled ? 0.4 : pressed ? 0.75 : 1,
          transform: [{ scale: pressed ? 0.96 : 1 }],
          userSelect: 'none',
        },
      ]}
    >
      {icon ? <Text selectable={false} style={[styles.icon, big && { fontSize: 22 }]}>{icon}</Text> : null}
      {!iconOnly ? <Text selectable={false} style={[styles.label, big && styles.bigLabel, { color: primary ? '#1A1A1A' : theme.text }]}>{label}</Text> : null}
      {badge ? (
        <View style={[styles.badge, { backgroundColor: theme.accent }]}>
          <Text selectable={false} style={styles.badgeText}>{badge}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    minWidth: 64,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  compact: { flex: 1, maxWidth: 90, minWidth: 0, paddingHorizontal: 6 },
  iconOnly: { minWidth: 0, paddingHorizontal: 6 },
  big: { paddingVertical: 16, paddingHorizontal: 28, borderRadius: 22, flexDirection: 'row', gap: 8 },
  icon: { fontSize: 20 },
  label: { fontSize: 12, fontWeight: '700', marginTop: 2 },
  bigLabel: { fontSize: 18, marginTop: 0 },
  badge: { position: 'absolute', top: -6, right: -6, borderRadius: 10, paddingHorizontal: 6, paddingVertical: 2 },
  badgeText: { fontSize: 10, fontWeight: '800', color: '#1A1A1A' },
});
