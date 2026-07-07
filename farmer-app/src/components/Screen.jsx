import { SafeAreaView } from 'react-native-safe-area-context';
import { ScrollView, View } from 'react-native';

export default function Screen({ children, scroll = true }) {
  const inner = <View style={{ padding: 16, flex: 1 }}>{children}</View>;
  return (
    <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
      {scroll ? <ScrollView keyboardShouldPersistTaps="handled">{inner}</ScrollView> : inner}
    </SafeAreaView>
  );
}
