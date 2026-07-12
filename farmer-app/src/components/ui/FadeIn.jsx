import { useEffect, useRef } from 'react';
import { Animated } from 'react-native';

// Subtle entrance: fade + slide up. Renders children immediately (present in the tree even
// mid-animation), so it never affects tests — only the on-device feel.
export default function FadeIn({ children, delay = 0, offset = 12, style }) {
  const progress = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(progress, { toValue: 1, duration: 320, delay, useNativeDriver: true }).start();
  }, [progress, delay]);
  const translateY = progress.interpolate({ inputRange: [0, 1], outputRange: [offset, 0] });
  return <Animated.View style={[{ opacity: progress, transform: [{ translateY }] }, style]}>{children}</Animated.View>;
}
