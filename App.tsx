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

function App(): React.JSX.Element {
  return (
    <Provider store={store}>
      <AuthProvider>
        <StatusBar barStyle={'dark-content'} />
        <GlobalSyncListeners />
        <AppNavigator />
      </AuthProvider>
    </Provider>
  );
}

export default App;
