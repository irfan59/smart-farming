import { View, Text, TextInput } from 'react-native';
import { colors, radius, font, spacing } from '../../theme';

export default function Input({ label, style, containerStyle, ...props }) {
  return (
    <View style={[{ marginBottom: spacing.md }, containerStyle]}>
      {label ? (
        <Text style={{ marginBottom: 6, fontSize: font.size.sm, fontWeight: font.weight.medium, color: colors.text }}>
          {label}
        </Text>
      ) : null}
      <TextInput
        placeholderTextColor={colors.textSubtle}
        style={[
          {
            height: 52,
            borderRadius: radius.md,
            backgroundColor: colors.surface,
            borderWidth: 1,
            borderColor: colors.border,
            paddingHorizontal: 14,
            fontSize: font.size.md,
            color: colors.text,
          },
          style,
        ]}
        {...props}
      />
    </View>
  );
}
