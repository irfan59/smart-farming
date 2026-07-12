import { SafeAreaView } from 'react-native-safe-area-context';
import { ScrollView, View } from 'react-native';
import { colors, spacing } from '../theme';

export default function Screen({ children, scroll = true, contentStyle }) {
  const inner = <View style={[{ padding: spacing.xl, flexGrow: 1 }, contentStyle]}>{children}</View>;
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.canvas }} edges={['top', 'bottom']}>
      {scroll ? (
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ flexGrow: 1 }} showsVerticalScrollIndicator={false}>
          {inner}
        </ScrollView>
      ) : (
        inner
      )}
    </SafeAreaView>
  );
}
