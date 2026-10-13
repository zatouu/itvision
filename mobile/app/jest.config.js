module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'json'],
  testMatch: ['**/__tests__/**/*.test.ts'],
  globals: {
    __DEV__: true,
  },
  moduleNameMapper: {
    '^@react-native-async-storage/async-storage$': '<rootDir>/src/__mocks__/async-storage.ts',
    '^@react-native-community/netinfo$': '<rootDir>/src/__mocks__/netinfo.ts',
    '^@sentry/react-native$': '<rootDir>/src/__mocks__/sentry-react-native.ts',
    '^react-native$': '<rootDir>/src/__mocks__/react-native.ts',
    '^expo-router$': '<rootDir>/src/__mocks__/expo-router.ts',
    '^expo-constants$': '<rootDir>/src/__mocks__/expo-constants.ts',
    '^expo-device$': '<rootDir>/src/__mocks__/expo-device.ts',
    '^expo-file-system$': '<rootDir>/src/__mocks__/expo-file-system.ts',
    '^expo-notifications$': '<rootDir>/src/__mocks__/expo-notifications.ts',
    '^expo-secure-store$': '<rootDir>/src/__mocks__/expo-secure-store.ts',
    '^expo-task-manager$': '<rootDir>/src/__mocks__/expo-task-manager.ts',
  },
}
