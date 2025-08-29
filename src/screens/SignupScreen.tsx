import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, Alert, StatusBar, Platform, KeyboardAvoidingView, ScrollView } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../navigation/AppNavigator';
import { useAuth } from '../auth/AuthContext';
import MaterialIcons from '@react-native-vector-icons/material-icons';
import { useTheme } from '../theme';

export type SignupScreenProps = NativeStackScreenProps<AuthStackParamList, 'Signup'>;

const SignupScreen: React.FC<SignupScreenProps> = ({ navigation }) => {
  const { signUp } = useAuth();
  const { colors, isDark } = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const validateEmail = (val: string) => {
    const ok = /[^\s@]+@[^\s@]+\.[^\s@]+/.test(val.trim());
    setEmailError(ok ? null : 'Enter a valid email');
    return ok;
  };
  const validatePassword = (val: string) => {
    // at least 6 chars; could be extended with numbers/symbols rules
    const ok = val.length >= 6;
    setPasswordError(ok ? null : 'Password must be at least 6 characters');
    return ok;
  };

  const onSignup = async () => {
    const emailOK = validateEmail(email);
    const passOK = validatePassword(password);
    if (!emailOK || !passOK) return;
    try {
      setLoading(true);
      await signUp(email.trim(), password);
    } catch (e: any) {
      Alert.alert('Sign up failed', e?.message ?? 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const styles = createStyles(colors, isDark);

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior="padding"
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : -64}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <StatusBar
          barStyle={isDark ? "light-content" : "dark-content"}
          backgroundColor={colors.background}
          translucent={Platform.OS === 'ios'}
        />

        {/* Decorative background accent */}
        <View style={[styles.accentTopRight, { backgroundColor: colors.primary + '40' }]} />

        <View style={styles.card}>
          <View style={styles.headerRow}>
            <View style={styles.logoCircle}>
              <MaterialIcons name="task-alt" size={22} color="#16a34a" />
            </View>
            <Text style={styles.brand}>TaskManager</Text>
          </View>

          <Text style={styles.title}>Create your account</Text>
          <Text style={styles.subtitle}>Sign up to get started with your tasks</Text>

          <View style={styles.fieldContainer}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              placeholder="you@example.com"
              value={email}
              onChangeText={(t) => { setEmail(t); if (emailError) validateEmail(t); }}
              onBlur={() => validateEmail(email)}
              style={[styles.input, emailError && styles.inputError]}
              autoCapitalize="none"
              keyboardType="email-address"
            />
            {!!emailError && <Text style={styles.errorText}>{emailError}</Text>}
          </View>

          <View style={styles.fieldContainer}>
            <Text style={styles.label}>Password</Text>
            <View style={styles.passwordWrapper}>
              <TextInput
                placeholder="••••••••"
                value={password}
                onChangeText={(t) => { setPassword(t); if (passwordError) validatePassword(t); }}
                onBlur={() => validatePassword(password)}
                style={[styles.input, styles.passwordInput, passwordError && styles.inputError]}
                secureTextEntry={!showPassword}
              />
              <TouchableOpacity accessibilityRole="button" accessibilityLabel={showPassword ? 'Hide password' : 'Show password'} onPress={() => setShowPassword(s => !s)} style={styles.iconButton}>
                <MaterialIcons name={showPassword ? 'visibility-off' : 'visibility'} size={22} color="#6b7280" />
              </TouchableOpacity>
            </View>
            {!!passwordError && <Text style={styles.errorText}>{passwordError}</Text>}
          </View>

          <TouchableOpacity onPress={onSignup} style={[styles.button, !email || !password || emailError || passwordError ? styles.buttonDisabled : null]} disabled={loading || !email || !password || !!emailError || !!passwordError}>
            <Text style={styles.buttonText}>{loading ? 'Signing up...' : 'Sign Up'}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.link}>Already have an account? Log In</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const createStyles = (colors: any, isDark: boolean) => StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    padding: 24,
    justifyContent: 'center' as const,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: isDark ? 0.3 : 0.12,
    shadowRadius: 16,
    elevation: 6
  },
  headerRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    marginBottom: 8
  },
  logoCircle: {
    height: 36,
    width: 36,
    borderRadius: 18,
    backgroundColor: colors.background,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    marginRight: 8
  },
  brand: {
    fontWeight: '800' as const,
    color: colors.primary,
    letterSpacing: 0.3
  },
  title: {
    fontSize: 26,
    fontWeight: '800' as const,
    marginTop: 4,
    marginBottom: 6,
    textAlign: 'center' as const,
    color: colors.textPrimary
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center' as const,
    marginBottom: 16
  },
  fieldContainer: {
    marginBottom: 14
  },
  label: {
    marginBottom: 6,
    color: colors.textPrimary,
    fontWeight: '600' as const
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 12,
    paddingRight: 44,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
    color: colors.textPrimary
  },
  passwordWrapper: {
    position: 'relative' as const
  },
  passwordInput: {
    paddingRight: 44
  },
  iconButton: {
    position: 'absolute' as const,
    right: 10,
    top: 12,
    height: 24,
    width: 24,
    alignItems: 'center' as const,
    justifyContent: 'center' as const
  },
  inputError: {
    borderColor: colors.danger
  },
  errorText: {
    marginTop: 6,
    color: colors.danger
  },
  button: {
    backgroundColor: colors.primary,
    padding: 14,
    borderRadius: 12,
    alignItems: 'center' as const,
    marginTop: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: isDark ? 0.3 : 0.12,
    shadowRadius: 10,
    elevation: 3
  },
  buttonDisabled: {
    opacity: 0.6
  },
  buttonText: {
    color: 'white',
    fontWeight: '700' as const
  },
  link: {
    marginTop: 16,
    color: colors.primary,
    textAlign: 'center' as const,
    fontWeight: '700' as const
  },
  accentTopRight: {
    position: 'absolute' as const,
    top: -40,
    right: -30,
    height: 160,
    width: 160,
    borderRadius: 80
  }
});

export default SignupScreen;
