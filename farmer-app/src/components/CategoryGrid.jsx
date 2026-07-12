import { View, Text, Pressable } from 'react-native';
import { colors, radius, font } from '../theme';

export default function CategoryGrid({ categories, onSelect, selectedId }) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -5 }}>
      {categories.map((c) => {
        const active = selectedId === c.id;
        return (
          <View key={c.id} style={{ width: '33.33%', padding: 5 }}>
            <Pressable
              accessibilityRole="button"
              onPress={() => onSelect(c)}
              style={({ pressed }) => ({
                minHeight: 78,
                padding: 10,
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: radius.md,
                backgroundColor: active ? colors.brand[50] : colors.surface,
                borderWidth: 1,
                borderColor: active ? colors.brand[300] : colors.borderLight,
                opacity: pressed ? 0.85 : 1,
              })}
            >
              <Text
                style={{
                  textAlign: 'center',
                  fontSize: font.size.sm,
                  fontWeight: active ? font.weight.semibold : font.weight.regular,
                  color: active ? colors.brand[700] : colors.text,
                }}
              >
                {c.name}
              </Text>
            </Pressable>
          </View>
        );
      })}
    </View>
  );
}
