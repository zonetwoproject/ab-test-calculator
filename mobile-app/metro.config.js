const path = require('path');
const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '..');
const defaultConfig = getDefaultConfig(projectRoot);
const config = {
  watchFolders: [workspaceRoot],
};

module.exports = mergeConfig(defaultConfig, config);
