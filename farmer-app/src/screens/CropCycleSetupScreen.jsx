import { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import Screen from '../components/Screen';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import FadeIn from '../components/ui/FadeIn';
import { useCropCycles } from '../features/farm/useCropCycles';
import { usePlots } from '../features/farm/usePlots';
import { useCatalog } from '../features/catalog/useCatalog';
import { colors, font, spacing, radius } from '../theme';

function Chip({ label, active, onPress }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={[styles.chip, active && styles.chipActive]}>
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </Pressable>
  );
}

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
      <FadeIn>
        <Text style={styles.h1}>New crop cycle</Text>
        <Card style={{ marginTop: spacing.md }}>
          <Text style={styles.fieldLabel}>Plot</Text>
          <View style={styles.chips}>
            {(plots.list.data || []).map((p) => (
              <Chip key={p.id} label={p.name} active={plotId === p.id} onPress={() => setPlotId(p.id)} />
            ))}
          </View>

          <Text style={[styles.fieldLabel, { marginTop: spacing.md }]}>Crop</Text>
          <View style={styles.chips}>
            {(crops.data || []).map((c) => (
              <Chip key={c.id} label={c.name} active={cropId === c.id} onPress={() => setCropId(c.id)} />
            ))}
          </View>

          <View style={{ marginTop: spacing.md }}>
            <Input label="Year" value={year} onChangeText={setYear} />
            <Input label={`Area used (${unit})`} value={value} onChangeText={setValue} keyboardType="number-pad" containerStyle={{ marginBottom: 0 }} />
          </View>
        </Card>
        <Button title="Create crop cycle" icon="Sprout" onPress={save} disabled={!plotId || !cropId || !value} loading={create.isPending} style={{ marginTop: spacing.lg }} />
      </FadeIn>
    </Screen>
  );
}

const styles = StyleSheet.create({
  h1: { fontSize: font.size.xxl, fontWeight: font.weight.bold, color: colors.text },
  fieldLabel: { fontSize: font.size.sm, fontWeight: font.weight.medium, color: colors.text, marginBottom: 8 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: radius.pill, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  chipActive: { backgroundColor: colors.brand[50], borderColor: colors.brand[300] },
  chipText: { fontSize: font.size.sm, color: colors.textMuted },
  chipTextActive: { color: colors.brand[700], fontWeight: font.weight.semibold },
});
