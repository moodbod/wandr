module.exports = () => {
  const isSinglePageWebDev = process.env.EXPO_WEB_OUTPUT === 'single';

  return {
    name: 'wandr',
    slug: 'wandr',
    version: '1.0.0',
    description: 'Wandr helps travelers plan trips, coordinate with friends, and keep useful trip details close.',
    orientation: 'portrait',
    icon: './assets/ios/iOS-Dark-1024x1024@1x.png',
    scheme: 'wandr',
    userInterfaceStyle: 'automatic',

    ios: {
      supportsTablet: false,
      bundleIdentifier: 'agency.moodbod.wandr',
      bitcode: false,
      config: {
        usesNonExemptEncryption: false,
      },
      infoPlist: {
        NSLocationWhenInUseUsageDescription:
          'Wandr uses your location to show accurate live weather, maps, and nearby regions.',
        NSLocationAlwaysAndWhenInUseUsageDescription:
          'Wandr uses your location to show accurate live weather, maps, and nearby regions even when the app is in the background.',
        NSPhotoLibraryUsageDescription:
          'Wandr lets you choose photos from your library to share with places and stays.',
        NSCameraUsageDescription: 'Wandr uses your camera to add photos to places and stays.',
        NSMicrophoneUsageDescription: 'Wandr uses your microphone for audio recordings.',
        UIBackgroundModes: ['audio', 'location'],
      },
    },

    android: {
      package: 'com.moodbod.wandr',
      adaptiveIcon: {
        backgroundColor: '#E6F4FE',
        foregroundImage: './assets/images/android-icon-foreground.png',
        backgroundImage: './assets/images/android-icon-background.png',
        monochromeImage: './assets/images/android-icon-monochrome.png',
      },
      permissions: [
        'android.permission.ACCESS_COARSE_LOCATION',
        'android.permission.ACCESS_FINE_LOCATION',
        'android.permission.ACCESS_BACKGROUND_LOCATION',
        'android.permission.CAMERA',
        'android.permission.FOREGROUND_SERVICE',
        'android.permission.FOREGROUND_SERVICE_LOCATION',
        'android.permission.POST_NOTIFICATIONS',
        'android.permission.ACCESS_NETWORK_STATE',
        'android.permission.INTERNET',
        'android.permission.WAKE_LOCK',
      ],
    },

    web: {
      output: isSinglePageWebDev ? 'single' : 'static',
      favicon: './assets/images/icon.png',
    },

    plugins: [
      './plugins/with-ios-react-native-dependencies-embed',
      'expo-router',
      'expo-notifications',
      '@rnmapbox/maps',
      'expo-location',
      'expo-font',
      'expo-image',
      'expo-secure-store',
      'expo-status-bar',
      [
        'expo-splash-screen',
        {
          image: './assets/images/splash-icon.png',
          imageWidth: 200,
          resizeMode: 'contain',
          backgroundColor: '#111217',
          dark: { backgroundColor: '#111217' },
        },
      ],
      [
        'expo-image-picker',
        {
          photosPermission:
            'Wandr lets you choose photos from your library to share with places and stays.',
        },
      ],
      'expo-web-browser',
      'expo-audio',
    ],

    experiments: {
      typedRoutes: true,
      reactCompiler: !isSinglePageWebDev,
    },

    assetBundlePatterns: ['**/*'],

    extra: {
      router: {},
      eas: {
        projectId: 'f5830dae-4fb7-486c-bc5e-c7b4bac250b8',
      },
    },

    owner: 'moodbod.agency',
  };
};
