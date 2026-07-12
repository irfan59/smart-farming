import { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import Screen from '../components/Screen';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Icon from '../components/ui/Icon';
import FadeIn from '../components/ui/FadeIn';
import EmptyState from '../components/ui/EmptyState';
import { usePlots } from '../features/farm/usePlots';
import { useCatalog } from '../features/catalog/useCatalog';
import { colors, font, spacing, radius } from '../theme';

const UNIT_FALLBACK = [{ unit: 'acre' }, { unit: 'bigha' }, { unit: 'guntha' }];

export default function PlotsScreen({ navigation }) {
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

  const unitOptions = units.data || UNIT_FALLBACK;

  return (
    <Screen>
      <FadeIn>
        <Text style={styles.h1}>My plots</Text>

        {!list.data ? (
          <Card><Text style={styles.muted}>Loading…</Text></Card>
        ) : list.data.length ? (
          <View style={{ gap: spacing.md }}>
            {list.data.map((p) => (
              <Card key={p.id}>
                <View style={styles.plotRow}>
                  <View style={styles.plotIcon}>
                    <Icon name="MapPin" size={18} color={colors.brand[600]} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.plotName}>{p.name}</Text>
                    <Text style={styles.muted}>{p.area.value} {p.area.unit} · ≈ {Number(p.area.normalizedAcres || 0).toFixed(2)} acres</Text>
                  </View>
                </View>
              </Card>
            ))}
          </View>
        ) : (
          <EmptyState icon="MapPin" title="No plots yet" text="Add your first plot below." />
        )}

        <Card style={{ marginTop: spacing.lg }}>
          <Text style={styles.sectionTitle}>Add plot</Text>
          <Input label="Name" value={name} onChangeText={setName} placeholder="e.g. North field" />
          <Input label="Area" value={value} onChangeText={setValue} keyboardType="number-pad" placeholder="e.g. 2" containerStyle={{ marginBottom: spacing.sm }} />
          <Text style={styles.fieldLabel}>Unit</Text>
          <View style={styles.chips}>
            {unitOptions.map((u) => {
              const active = unit === u.unit;
              return (
                <Pressable key={u.unit} accessibilityRole="button" onPress={() => setUnit(u.unit)} style={[styles.chip, active && styles.chipActive]}>
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>{u.unit}</Text>
                </Pressable>
              );
            })}
          </View>
          <Button title="Save plot" icon="Plus" onPress={add} loading={create.isPending} style={{ marginTop: spacing.md }} />
        </Card>

        <Button title="New crop cycle" variant="ghost" icon="Sprout" onPress={() => navigation?.navigate('CropCycleSetup')} style={{ marginTop: spacing.md }} />
      </FadeIn>
    </Screen>
  );
}

const styles = StyleSheet.create({
  h1: { fontSize: font.size.xxl, fontWeight: font.weight.bold, color: colors.text, marginBottom: spacing.md },
  muted: { color: colors.textMuted, fontSize: font.size.sm },
  plotRow: { flexDirection: 'row', gap: spacing.md, alignItems: 'center' },
  plotIcon: { width: 40, height: 40, borderRadius: radius.md, backgroundColor: colors.brand[50], alignItems: 'center', justifyContent: 'center' },
  plotName: { fontSize: font.size.md, fontWeight: font.weight.semibold, color: colors.text },
  sectionTitle: { fontSize: font.size.md, fontWeight: font.weight.semibold, color: colors.text, marginBottom: spacing.md },
  fieldLabel: { fontSize: font.size.sm, fontWeight: font.weight.medium, color: colors.text, marginBottom: 8 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: radius.pill, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  chipActive: { backgroundColor: colors.brand[50], borderColor: colors.brand[300] },
  chipText: { fontSize: font.size.sm, color: colors.textMuted, textTransform: 'capitalize' },
  chipTextActive: { color: colors.brand[700], fontWeight: font.weight.semibold },
});
