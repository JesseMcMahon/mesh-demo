module.exports = {
  dependencies: {
    // Unity framework shipped here is iOS-device only; disable iOS autolinking
    // for simulator-focused investor demo development.
    "@azesmway/react-native-unity": {
      platforms: {
        ios: null,
      },
    },
  },
};

