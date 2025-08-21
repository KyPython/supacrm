module.exports = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/test/test-setup.js'],
  moduleFileExtensions: ['js', 'jsx', 'json'],
  transform: {
    '^.+\\.jsx?$': 'babel-jest'
  },
  testMatch: ['<rootDir>/test/**/*.test.jsx'],
  testPathIgnorePatterns: ['/node_modules/', '/dist/']
};
