module.exports = function(api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      'react-native-reanimated/plugin',
      [
        'module-resolver',
        {
          root: ['./src'],
          alias: {
            '@': './src',
            '@components': './src/components',
            '@screens': './src/screens',
            '@services': './src/services',
            '@hooks': './src/hooks',
            '@store': './src/store',
            '@constants': './src/constants',
            '@utils': './src/utils',
            '@navigation': './src/navigation',
            '@localization': './src/localization',
          },
        },
      ],
    ],
  };
};
