import { View, Text, Pressable } from 'react-native';

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', 'back'];

export default function NumberPad({ value, onChange }) {
  const press = (k) => {
    const cur = String(value ?? '');
    if (k === 'back') onChange(cur.slice(0, -1));
    else onChange((cur === '0' ? '' : cur) + k);
  };
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
      {KEYS.map((k) => (
        <Pressable
          key={k}
          accessibilityRole="button"
          accessibilityLabel={`key-${k}`}
          onPress={() => press(k)}
          style={{ width: '33.33%', paddingVertical: 18, alignItems: 'center' }}
        >
          <Text style={{ fontSize: 26 }}>{k === 'back' ? '⌫' : k}</Text>
        </Pressable>
      ))}
    </View>
  );
}
