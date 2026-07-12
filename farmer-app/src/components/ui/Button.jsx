import { Pressable, Text, ActivityIndicator } from 'react-native';
import { colors, radius, font, shadow } from '../../theme';
import Icon from './Icon';

const VARIANTS = {
  primary: { bg: colors.brand[600], fg: colors.white, press: colors.brand[700], shadow: true },
  harvest: { bg: colors.harvest[500], fg: colors.white, press: colors.harvest[600], shadow: true },
  secondary: { bg: colors.surface, fg: colors.text, press: '#f1f5f9', border: colors.border },
  ghost: { bg: 'transparent', fg: colors.brand[700], press: colors.brand[50] },
  danger: { bg: colors.danger, fg: colors.white, press: colors.dangerText, shadow: true },
  dangerGhost: { bg: 'transparent', fg: colors.danger, press: colors.dangerBg },
};
const SIZES = { sm: { h: 42, fs: 14, px: 16 }, md: { h: 52, fs: 16, px: 20 }, lg: { h: 56, fs: 17, px: 24 } };

export default function Button({ title, children, icon, onPress, disabled, loading, variant = 'primary', size = 'md', style }) {
  const v = VARIANTS[variant] || VARIANTS.primary;
  const s = SIZES[size] || SIZES.md;
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        {
          height: s.h,
          paddingHorizontal: s.px,
          borderRadius: radius.lg,
          backgroundColor: pressed ? v.press : v.bg,
          borderWidth: v.border ? 1 : 0,
          borderColor: v.border,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          opacity: disabled ? 0.5 : 1,
          transform: [{ scale: pressed ? 0.98 : 1 }],
        },
        v.shadow ? shadow.soft : null,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={v.fg} />
      ) : icon ? (
        <Icon name={icon} size={18} color={v.fg} strokeWidth={2.4} />
      ) : null}
      <Text style={{ color: v.fg, fontWeight: font.weight.semibold, fontSize: s.fs }}>{title || children}</Text>
    </Pressable>
  );
}
