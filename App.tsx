/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 */

import React from 'react';
import { StatusBar } from 'react-native';
import { Provider } from 'react-redux';
import { store } from './src/store';
import { AuthProvider } from './src/auth/AuthContext';
import AppNavigator from './src/navigation/AppNavigator';
import GlobalSyncListeners from './src/app/GlobalSyncListeners';
import { ThemeProvider, useTheme } from './src/theme';

const ThemedStatusBar: React.FC = () => {
  const { isDark, colors } = useTheme();
  return (
    <StatusBar
      barStyle={isDark ? 'light-content' : 'dark-content'}
      backgroundColor={colors.background}
      translucent={false}
      animated
    />
  );
};

function App(): React.JSX.Element {
  return (
    <Provider store={store}>
      <ThemeProvider>
        <AuthProvider>
          <GlobalSyncListeners />
          <AppNavigator />
          <ThemedStatusBar />
        </AuthProvider>
      </ThemeProvider>
    </Provider>
  );
}

export default App;
