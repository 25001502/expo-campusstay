import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView, KeyboardAvoidingView, Platform,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../App';
import { Colors, Fonts, Radius, Shadow } from '../theme';
import { Btn, Input, Divider } from '../components/UI';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type Props = NativeStackScreenProps<RootStackParamList, 'Login'>;

export default function LoginScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={styles.container} contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
        <View style={[styles.header, { paddingTop: insets.top + 24 }]}>
          <View style={styles.logo}>
            <Text style={styles.logoIcon}>🏠</Text>
          </View>
          <Text style={styles.brand}>CampusStay</Text>
          <Text style={styles.title}>Welcome back</Text>
          <Text style={styles.subtitle}>Sign in to continue to your account</Text>
        </View>

        <View style={styles.form}>
          <Input label="Email address" placeholder="student@university.ac.za" value={email} onChangeText={setEmail} keyboardType="email-address" />
          <Input label="Password" placeholder="••••••••" value={password} onChangeText={setPassword} secureTextEntry style={{ marginTop: 12 }} />

          <TouchableOpacity style={styles.forgotBtn} onPress={() => navigation.navigate('Forgot')}>
            <Text style={styles.forgotText}>Forgot password?</Text>
          </TouchableOpacity>

          <Btn onPress={() => navigation.replace('Main')} style={styles.primaryBtn}>Sign In</Btn>

          <View style={styles.dividerRow}>
            <Divider style={{ flex: 1 }} />
            <Text style={styles.orText}>or</Text>
            <Divider style={{ flex: 1 }} />
          </View>

          <Btn variant="secondary" onPress={() => {}} style={styles.googleBtn}>
            <Text style={styles.googleText}>🔵  Continue with Google</Text>
          </Btn>

          <View style={styles.registerRow}>
            <Text style={styles.registerText}>Don't have an account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Register')}>
              <Text style={styles.registerLink}>Create account</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.managerBtn} onPress={() => navigation.replace('Manager')}>
            <Text style={styles.managerText}>Switch to Manager Portal →</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.white },
  header: {
    backgroundColor: Colors.navy,
    paddingHorizontal: 24,
    paddingBottom: 32,
  },
  logo: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: Colors.blue,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  logoIcon: { fontSize: 22 },
  brand: {
    color: Colors.white,
    fontSize: 20,
    fontFamily: Fonts.heading,
    marginBottom: 12,
  },
  title: {
    color: Colors.white,
    fontSize: 28,
    fontFamily: Fonts.heading,
    marginBottom: 4,
  },
  subtitle: { color: Colors.slate400, fontSize: 14, fontFamily: Fonts.body },
  form: { padding: 24, gap: 0 },
  forgotBtn: { alignSelf: "flex-end", marginTop: 8, marginBottom: 20 },
  forgotText: { color: Colors.blue, fontSize: 13, fontFamily: Fonts.bodyMed },
  primaryBtn: { marginBottom: 16 },
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 16,
  },
  orText: { color: Colors.slate400, fontSize: 13 },
  googleBtn: { marginBottom: 24 },
  googleText: {
    fontSize: 14,
    fontFamily: Fonts.bodyMed,
    color: Colors.slate700,
  },
  registerRow: {
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: 16,
  },
  registerText: { fontSize: 14, color: Colors.slate500 },
  registerLink: {
    fontSize: 14,
    fontFamily: Fonts.bodySemi,
    color: Colors.blue,
  },
  managerBtn: { alignItems: "center" },
  managerText: {
    fontSize: 13,
    fontFamily: Fonts.bodyMed,
    color: Colors.purple,
  },
});
