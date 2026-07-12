import { View, Text } from 'react-native';
import { colors, radius, font, spacing } from '../theme';

const MAP = {
  trial: { msg: 'Free trial active', bg: colors.blueBg, fg: colors.blue },
  active: { msg: 'Subscription active', bg: colors.brand[50], fg: colors.brand[700] },
  grace: { msg: 'Renew to add new entries', bg: colors.harvest[50], fg: colors.harvest[700] },
  expired: { msg: 'Subscription expired — renew to continue', bg: colors.dangerBg, fg: colors.dangerText },
};

export default function StatusBanner({ subscription }) {
  const m = MAP[subscription?.status];
  if (!m) return null;
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: m.bg,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.md,
        borderRadius: radius.md,
        marginBottom: spacing.lg,
      }}
    >
      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: m.fg }} />
      <Text style={{ color: m.fg, fontWeight: font.weight.medium, fontSize: font.size.sm, flex: 1 }}>{m.msg}</Text>
    </View>
  );
}
