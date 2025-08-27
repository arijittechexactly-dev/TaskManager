import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../auth/AuthContext';
import LoginScreen from '../screens/LoginScreen';
import SignupScreen from '../screens/SignupScreen';
import HomeScreen from '../screens/HomeScreen';
import { useTheme } from '../theme';

export type AuthStackParamList = {
  Login: undefined;
  Signup: undefined;
};

export type AppStackParamList = {
  Home: undefined;
};

const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const AppStack = createNativeStackNavigator<AppStackParamList>();

const AuthStackNavigator = () => {
  const { colors, isDark } = useTheme();
  return (
    <AuthStack.Navigator
      screenOptions={{
        headerShown: false,
        statusBarStyle: isDark ? 'light' : 'dark',
      }}
    >
      <AuthStack.Screen name="Login" component={LoginScreen} options={{ title: 'Login' }} />
      <AuthStack.Screen name="Signup" component={SignupScreen} options={{ title: 'Sign Up' }} />
    </AuthStack.Navigator>
  );
};

const AppStackNavigator = () => {
  const { colors, isDark } = useTheme();
  return (
    <AppStack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.background },
        headerTitleStyle: { color: colors.textPrimary },
        headerTintColor: colors.textPrimary,
        statusBarStyle: isDark ? 'light' : 'dark',
      }}
    >
      <AppStack.Screen name="Home" component={HomeScreen} options={{ title: 'Home' }} />
    </AppStack.Navigator>
  );
};

const AppNavigator: React.FC = () => {
  const { user, initializing } = useAuth();

  if (initializing) return null; // could render splash

  return (
    <NavigationContainer>
      {user ? <AppStackNavigator /> : <AuthStackNavigator />}
    </NavigationContainer>
  );
};

export default AppNavigator;
