const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// react-native-web exports that mirror react-native internals
const RN_WEB_EXPORTS = new Set([
  'AccessibilityInfo','ActivityIndicator','Alert','Animated','Appearance',
  'AppRegistry','AppState','BackHandler','Button','Clipboard',
  'DeviceEventEmitter','Dimensions','Easing','findNodeHandle','FlatList',
  'I18nManager','Image','ImageBackground','InteractionManager','Keyboard',
  'KeyboardAvoidingView','LayoutAnimation','Linking','Modal',
  'NativeEventEmitter','NativeModules','PanResponder','PermissionsAndroid',
  'PixelRatio','Platform','Pressable','processColor','ProgressBarAndroid',
  'ProgressViewIOS','RefreshControl','SafeAreaView','ScrollView','SectionList',
  'Settings','Share','StatusBar','StyleSheet','Switch','Systrace','Text',
  'TextInput','ToastAndroid','TouchableHighlight','TouchableNativeFeedback',
  'TouchableOpacity','TouchableWithoutFeedback','UIManager','Vibration','View',
  'VirtualizedList','YellowBox','useColorScheme','useWindowDimensions',
]);

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (platform === 'web') {
    // Node crypto → Web Crypto API shim
    if (moduleName === 'crypto') {
      return { filePath: require.resolve('./shims/crypto.web.js'), type: 'sourceFile' };
    }

    // react-native-maps → no-op stub on web
    if (moduleName === 'react-native-maps') {
      return { filePath: require.resolve('./shims/react-native-maps.web.js'), type: 'sourceFile' };
    }

    // Direct react-native package import
    if (moduleName === 'react-native') {
      return { filePath: require.resolve('react-native-web'), type: 'sourceFile' };
    }

    // Absolute imports like 'react-native/Libraries/Utilities/Platform'
    if (moduleName.startsWith('react-native/')) {
      const last = moduleName.split('/').pop() || '';
      if (RN_WEB_EXPORTS.has(last)) {
        try {
          return { filePath: require.resolve(`react-native-web/dist/exports/${last}`), type: 'sourceFile' };
        } catch {}
      }
      // Fallback to react-native-web entry
      return { filePath: require.resolve('react-native-web'), type: 'sourceFile' };
    }

    // Relative requires FROM within react-native on web
    if (context.originModulePath && /node_modules[\\/]react-native[\\/]/.test(context.originModulePath)) {
      const last = moduleName.split('/').pop() || '';
      if (last && RN_WEB_EXPORTS.has(last)) {
        try {
          return { filePath: require.resolve(`react-native-web/dist/exports/${last}`), type: 'sourceFile' };
        } catch {}
      }
    }
  }

  // Default Metro resolution
  const MetroResolver = require('metro-resolver');
  const { resolveRequest, ...rest } = context;
  return MetroResolver.resolve(rest, moduleName, platform);
};

module.exports = config;
