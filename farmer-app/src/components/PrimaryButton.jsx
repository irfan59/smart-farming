import { Pressable, Text } from 'react-native';

export default function PrimaryButton({ title, onPress, disabled }) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled}
      style={{ backgroundColor: disabled ? '#9FE1CB' : '#1d9e75', padding: 14, borderRadius: 10, alignItems: 'center', marginVertical: 6 }}
    >
      <Text style={{ color: '#fff', fontWeight: '600', fontSize: 16 }}>{title}</Text>
    </Pressable>
  );
}
