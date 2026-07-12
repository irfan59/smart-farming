import { View, Text } from 'react-native';
import { colors, radius, font } from '../../theme';

const MAP = {
  trial: { bg: colors.blueBg, fg: colors.blue },
  active: { bg: colors.brand[50], fg: colors.brand[700] },
  pending_approval: { bg: colors.harvest[50], fg: colors.harvest[700] },
  grace: { bg: '#fff7ed', fg: '#c2410c' },
  expired: { bg: '#f1f5f9', fg: '#475569' },
  suspended: { bg: colors.dangerBg, fg: colors.dangerText },
};

export default function Badge({ status, label }) {
  const m = MAP[status] || MAP.expired;
  return (
    <View
      style={{
        alignSelf: 'flex-start',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: m.bg,
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: radius.pill,
      }}
    >
      <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: m.fg }} />
      <Text style={{ color: m.fg, fontSize: font.size.xs, fontWeight: font.weight.semibold, textTransform: 'capitalize' }}>
        {label || String(status).replace(/_/g, ' ')}
      </Text>
    </View>
  );
}
