const nxPreset = require('@nx/jest/preset').default;

module.exports = {
  ...nxPreset,
  testEnvironmentOptions: {
    customExportConditions: ['node', 'require', 'default'],
  },
};
