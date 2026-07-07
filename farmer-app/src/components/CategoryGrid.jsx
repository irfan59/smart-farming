import { View, Text, Pressable } from 'react-native';

export default function CategoryGrid({ categories, onSelect, selectedId }) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
      {categories.map((c) => (
        <Pressable
          key={c.id}
          accessibilityRole="button"
          onPress={() => onSelect(c)}
          style={{
            width: '33.33%', padding: 14, alignItems: 'center',
            backgroundColor: selectedId === c.id ? '#E1F5EE' : 'transparent', borderRadius: 8,
          }}
        >
          <Text style={{ textAlign: 'center' }}>{c.name}</Text>
        </Pressable>
      ))}
    </View>
  );
}
