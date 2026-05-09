const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

const { resolver } = config;
const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const nestedReactAsyncHookPath = path.join(
  __dirname,
  'node_modules',
  'react-native-country-picker-modal',
  'node_modules',
  'react-async-hook'
);

resolver.extraNodeModules = {
  ...resolver.extraNodeModules,
  'react-async-hook': path.resolve(__dirname, 'node_modules/react-async-hook'),
};

resolver.sourceExts = [...resolver.sourceExts, 'mjs', 'cjs'];

resolver.blockList = [
  ...(Array.isArray(resolver.blockList) ? resolver.blockList : resolver.blockList ? [resolver.blockList] : []),
  new RegExp(`${escapeRegex(nestedReactAsyncHookPath)}[/\\\\].*`),
];

module.exports = config;
