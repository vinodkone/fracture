const nextJest = require('next/jest');

const createJestConfig = nextJest({
  dir: './',
});

const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testEnvironment: 'jest-environment-jsdom',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^uuid$': require.resolve('uuid'),
  },
  testPathIgnorePatterns: ['<rootDir>/e2e/'],
};

module.exports = async () => {
  const jestConfig = await createJestConfig(customJestConfig)();
  // Override transformIgnorePatterns to include uuid
  jestConfig.transformIgnorePatterns = [
    '/node_modules/(?!(uuid)/)',
    '^.+\\.module\\.(css|sass|scss)$',
  ];
  return jestConfig;
};
