module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'json'],
  testMatch: ['**/__tests__/**/*.test.ts'],
  moduleNameMapper: {
    '^@react-native-async-storage/async-storage$': '<rootDir>/src/__mocks__/async-storage.ts',
    '^@react-native-community/netinfo$': '<rootDir>/src/__mocks__/netinfo.ts',
    '^react-native$': '<rootDir>/src/__mocks__/react-native.ts',
  },
}
