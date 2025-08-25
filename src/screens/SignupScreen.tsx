import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, Alert, StatusBar } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../navigation/AppNavigator';
import { useAuth } from '../auth/AuthContext';
import MaterialIcons from '@react-native-vector-icons/material-icons';

export type SignupScreenProps = NativeStackScreenProps<AuthStackParamList, 'Signup'>;

const SignupScreen: React.FC<SignupScreenProps> = ({ navigation }) => {
  const { signUp } = useAuth();
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

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#eef2ff" />

      {/* Decorative background accents */}
      <View style={styles.accentTopRight} />
      <View style={styles.accentBottomLeft} />

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
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, justifyContent: 'center', backgroundColor: '#eef2ff' },
  card: { backgroundColor: 'white', borderRadius: 20, padding: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.12, shadowRadius: 16, elevation: 6 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  logoCircle: { height: 36, width: 36, borderRadius: 18, backgroundColor: '#ecfdf5', alignItems: 'center', justifyContent: 'center', marginRight: 8 },
  brand: { fontWeight: '800', color: '#16a34a', letterSpacing: 0.3 },
  title: { fontSize: 26, fontWeight: '800', marginTop: 4, marginBottom: 6, textAlign: 'center', color: '#111827' },
  subtitle: { fontSize: 14, color: '#6b7280', textAlign: 'center', marginBottom: 16 },
  fieldContainer: { marginBottom: 14 },
  label: { marginBottom: 6, color: '#374151', fontWeight: '600' },
  input: { borderWidth: 1, borderColor: '#e5e7eb', backgroundColor: '#f9fafb', borderRadius: 12, padding: 12, paddingRight: 44, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 2 },
  passwordWrapper: { position: 'relative' },
  passwordInput: { paddingRight: 44 },
  iconButton: { position: 'absolute', right: 10, top: 12, height: 24, width: 24, alignItems: 'center', justifyContent: 'center' },
  inputError: { borderColor: '#ef4444' },
  errorText: { marginTop: 6, color: '#ef4444' },
  button: { backgroundColor: '#16a34a', padding: 14, borderRadius: 12, alignItems: 'center', marginTop: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.12, shadowRadius: 10, elevation: 3 },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: 'white', fontWeight: '700' },
  link: { marginTop: 16, color: '#16a34a', textAlign: 'center', fontWeight: '700' },
  accentTopRight: { position: 'absolute', top: -40, right: -30, height: 160, width: 160, borderRadius: 80, backgroundColor: '#c7d2fe', opacity: 0.45 },
  accentBottomLeft: { position: 'absolute', bottom: -30, left: -40, height: 200, width: 200, borderRadius: 100, backgroundColor: '#a7f3d0', opacity: 0.35 },
});

export default SignupScreen;
