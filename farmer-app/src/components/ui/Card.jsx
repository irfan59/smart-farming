import { View } from 'react-native';
import { colors, radius, shadow, spacing } from '../../theme';

export default function Card({ children, style, padded = true }) {
  return (
    <View
      style={[
        {
          backgroundColor: colors.surface,
          borderRadius: radius.lg,
          borderWidth: 1,
          borderColor: colors.borderLight,
          padding: padded ? spacing.lg : 0,
        },
        shadow.card,
        style,
      ]}
    >
      {children}
    </View>
  );
}
