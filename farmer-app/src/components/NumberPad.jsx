import { View, Text, Pressable } from 'react-native';
import { colors, radius, font } from '../theme';

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', 'back'];

export default function NumberPad({ value, onChange }) {
  const press = (k) => {
    const cur = String(value ?? '');
    if (k === 'back') onChange(cur.slice(0, -1));
    else onChange((cur === '0' ? '' : cur) + k);
  };
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -5 }}>
      {KEYS.map((k) => (
        <View key={k} style={{ width: '33.33%', padding: 5 }}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`key-${k}`}
            onPress={() => press(k)}
            style={({ pressed }) => ({
              paddingVertical: 16,
              alignItems: 'center',
              borderRadius: radius.md,
              backgroundColor: pressed ? colors.brand[50] : colors.surface,
              borderWidth: 1,
              borderColor: pressed ? colors.brand[200] : colors.borderLight,
            })}
          >
            <Text style={{ fontSize: 24, fontWeight: font.weight.medium, color: k === 'back' ? colors.textMuted : colors.text }}>
              {k === 'back' ? '⌫' : k}
            </Text>
          </Pressable>
        </View>
      ))}
    </View>
  );
}
