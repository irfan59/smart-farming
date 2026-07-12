/* Mock native modules so the JS/logic + component tests run headless (no device). */
jest.mock('react-native-keychain', () => {
  const store = {};
  return {
    setGenericPassword: jest.fn(async (u, p, o) => { store[o?.service || 'default'] = p; return true; }),
    getGenericPassword: jest.fn(async (o) => (store[o?.service || 'default'] ? { password: store[o?.service || 'default'] } : false)),
    resetGenericPassword: jest.fn(async (o) => { delete store[o?.service || 'default']; return true; }),
  };
});
jest.mock('react-native-image-picker', () => ({ launchCamera: jest.fn(), launchImageLibrary: jest.fn() }));
jest.mock('@react-native-firebase/messaging', () => () => ({
  requestPermission: jest.fn(async () => 1),
  getToken: jest.fn(async () => 'fcm-token'),
  onMessage: jest.fn(() => () => {}),
}));
jest.mock('react-native-share', () => ({ default: { open: jest.fn(async () => ({})) }, open: jest.fn(async () => ({})) }));
jest.mock('react-native-view-shot', () => ({ captureRef: jest.fn(async () => '/tmp/report.png') }));
jest.mock('react-native-safe-area-context', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    SafeAreaProvider: ({ children }) => React.createElement(React.Fragment, null, children),
    SafeAreaView: ({ children }) => React.createElement(View, null, children),
    useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
  };
});
// Icons render to null in tests (and never pull react-native-svg into jsdom).
jest.mock('lucide-react-native', () => new Proxy({ __esModule: true }, { get: (t, p) => (p === '__esModule' ? true : () => null) }));
