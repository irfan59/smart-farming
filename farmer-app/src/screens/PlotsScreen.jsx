import { useState } from 'react';
import { View, Text, TextInput, Pressable } from 'react-native';
import Screen from '../components/Screen';
import PrimaryButton from '../components/PrimaryButton';
import { usePlots } from '../features/farm/usePlots';
import { useCatalog } from '../features/catalog/useCatalog';

const inp = { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 8, marginBottom: 8 };

export default function PlotsScreen() {
  const { list, create } = usePlots();
  const units = useCatalog('land-units');
  const [name, setName] = useState('');
  const [value, setValue] = useState('');
  const [unit, setUnit] = useState('acre');

  async function add() {
    if (!name || !value) return;
    await create.mutateAsync({ name, area: { value: Number(value), unit } });
    setName('');
    setValue('');
  }

  return (
    <Screen>
      <Text style={{ fontSize: 20, fontWeight: '600' }}>My plots</Text>
      {list.data ? list.data.map((p) => (
        <View key={p.id} style={{ paddingVertical: 6 }}>
          <Text>{p.name} — {p.area.value} {p.area.unit} (≈ {Number(p.area.normalizedAcres || 0).toFixed(2)} acres)</Text>
        </View>
      )) : <Text>Loading…</Text>}

      <Text style={{ marginTop: 12, fontWeight: '600' }}>Add plot</Text>
      <TextInput placeholder="Name" value={name} onChangeText={setName} style={inp} />
      <TextInput placeholder="Area value" keyboardType="number-pad" value={value} onChangeText={setValue} style={inp} />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
        {(units.data || [{ unit: 'acre' }, { unit: 'bigha' }, { unit: 'guntha' }]).map((u) => (
          <Pressable key={u.unit} accessibilityRole="button" onPress={() => setUnit(u.unit)}>
            <Text style={{ padding: 8, fontWeight: unit === u.unit ? '700' : '400' }}>{u.unit}</Text>
          </Pressable>
        ))}
      </View>
      <PrimaryButton title="Save plot" onPress={add} disabled={create.isPending} />
    </Screen>
  );
}
