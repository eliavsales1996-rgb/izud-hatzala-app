const { getDefaultConfig } = require('@expo/metro-config');

const config = getDefaultConfig(__dirname);

// תיקון ספציפי לשגיאת node:sea בווינדוס
config.resolver.blockList = [
  /.*\.expo\/metro\/externals\/node:sea.*/,
  /.*node:sea.*/
];

module.exports = config;