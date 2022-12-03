module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  transform: {
    "^.+\\.(ts|tsx)$": ['ts-jest', { tsconfig: 'tsconfig.json' }]
  },
  modulePathIgnorePatterns: ['<rootDir>/dist', '<rootDir>/runner', '<rootDir>/out']
}