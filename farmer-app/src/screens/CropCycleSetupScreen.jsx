import { useState } from 'react';
import { View, Text, TextInput, Pressable } from 'react-native';
import Screen from '../components/Screen';
import PrimaryButton from '../components/PrimaryButton';
import { useCropCycles } from '../features/farm/useCropCycles';
import { usePlots } from '../features/farm/usePlots';
import { useCatalog } from '../features/catalog/useCatalog';

const inp = { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 8, marginBottom: 8 };
const Chip = ({ label, active, onPress }) => (
  <Pressable accessibilityRole="button" onPress={onPress}>
    <Text style={{ padding: 8, fontWeight: active ? '700' : '400' }}>{label}</Text>
  </Pressable>
);

export default function CropCycleSetupScreen({ navigation }) {
  const { create } = useCropCycles();
  const plots = usePlots();
  const crops = useCatalog('crops');
  const [plotId, setPlotId] = useState(null);
  const [cropId, setCropId] = useState(null);
  const [year, setYear] = useState('2025-26');
  const [value, setValue] = useState('');
  const [unit] = useState('acre');

  async function save() {
    await create.mutateAsync({ plotId, cropId, year, areaUsed: { value: Number(value), unit } });
    navigation.goBack();
  }

  return (
    <Screen>
      <Text style={{ fontSize: 20, fontWeight: '600' }}>New crop cycle</Text>
      <Text style={{ marginTop: 8 }}>Plot</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
        {(plots.list.data || []).map((p) => <Chip key={p.id} label={p.name} active={plotId === p.id} onPress={() => setPlotId(p.id)} />)}
      </View>
      <Text>Crop</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
        {(crops.data || []).map((c) => <Chip key={c.id} label={c.name} active={cropId === c.id} onPress={() => setCropId(c.id)} />)}
      </View>
      <Text>Year</Text>
      <TextInput value={year} onChangeText={setYear} style={inp} />
      <Text>Area used ({unit})</Text>
      <TextInput value={value} onChangeText={setValue} keyboardType="number-pad" style={inp} />
      <PrimaryButton title="Create" onPress={save} disabled={!plotId || !cropId || !value} />
    </Screen>
  );
}
