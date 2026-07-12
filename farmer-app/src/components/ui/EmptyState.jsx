import { View, Text } from 'react-native';
import { colors, font, spacing, radius } from '../../theme';
import Icon from './Icon';

export default function EmptyState({ icon, title, text }) {
  return (
    <View style={{ alignItems: 'center', paddingVertical: spacing.xxxl, paddingHorizontal: spacing.lg }}>
      {icon ? (
        <View
          style={{
            width: 56,
            height: 56,
            borderRadius: radius.pill,
            backgroundColor: colors.brand[50],
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: spacing.md,
          }}
        >
          <Icon name={icon} size={26} color={colors.brand[500]} />
        </View>
      ) : null}
      <Text style={{ fontSize: font.size.md, fontWeight: font.weight.semibold, color: colors.text }}>{title}</Text>
      {text ? <Text style={{ marginTop: 4, fontSize: font.size.sm, color: colors.textMuted, textAlign: 'center' }}>{text}</Text> : null}
    </View>
  );
}
