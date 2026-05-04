const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

const { resolver } = config;

resolver.extraNodeModules = {
  ...resolver.extraNodeModules,
  'react-async-hook': path.resolve(__dirname, 'node_modules/react-async-hook'),
};

resolver.sourceExts = [...resolver.sourceExts, 'mjs', 'cjs'];

resolver.blockList = [
  /node_modules\/react-native-country-picker-modal\/node_modules\/react-async-hook\/.*/,
];

module.exports = config;
