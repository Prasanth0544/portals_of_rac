module.exports = {
    testEnvironment: 'node',
    testMatch: ['**/tests/**/*.test.js'],
    verbose: true,
    collectCoverage: false,
    coverageDirectory: 'coverage',
    coverageReporters: ['text', 'lcov'],
    testTimeout: 10000,
    moduleFileExtensions: ['js', 'json'],
    // Ignore node_modules
    testPathIgnorePatterns: ['/node_modules/'],
    // Clear mocks between tests
    clearMocks: true,
    resetMocks: true
};
