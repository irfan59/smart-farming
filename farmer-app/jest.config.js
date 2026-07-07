module.exports = {
  preset: 'react-native',
  setupFiles: ['<rootDir>/__tests__/mocks/native.js'],
  // The RN preset's default transform matches .js/.ts/.tsx but NOT .jsx — override so
  // our .jsx sources/tests are transformed via babel-jest (uses babel.config.js RN preset).
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': 'babel-jest',
  },
  transformIgnorePatterns: [
    'node_modules/(?!(?:@react-native|react-native|@react-navigation|react-native-.*|@react-native-firebase|i18next|react-i18next)/)',
  ],
  moduleFileExtensions: ['js', 'jsx', 'json'],
  testMatch: ['<rootDir>/__tests__/**/*.test.{js,jsx}'],
  forceExit: true, // react-query bg timers keep the worker alive otherwise (tests all complete)
};
