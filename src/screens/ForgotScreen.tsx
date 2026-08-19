import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../App';
import { Colors, Fonts, Radius } from '../theme';
import { Btn, Input } from '../components/UI';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type Props = NativeStackScreenProps<RootStackParamList, 'Forgot'>;

export default function ForgotScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const [sent, setSent] = useState(false);

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>

        {!sent ? (
          <View style={styles.content}>
            <View style={styles.iconBox}>
              <Text style={styles.icon}>🔔</Text>
            </View>
            <Text style={styles.title}>Forgot your password?</Text>
            <Text style={styles.subtitle}>
              Enter your email and we'll send you instructions to reset your password.
            </Text>
            <Input label="Email address" placeholder="student@university.ac.za" keyboardType="email-address" style={styles.input} />
            <Btn onPress={() => setSent(true)}>Send Reset Link</Btn>
          </View>
        ) : (
          <View style={[styles.content, styles.successContent]}>
            <View style={[styles.iconBox, styles.successBox]}>
              <Text style={styles.icon}>✅</Text>
            </View>
            <Text style={styles.title}>Check your email</Text>
            <Text style={styles.subtitle}>
              We've sent password reset instructions to your email address.
            </Text>
            <Btn onPress={() => navigation.navigate('Login')} style={styles.backToLogin}>
              Back to Login
            </Btn>
          </View>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.white, padding: 20 },
  backBtn: { marginBottom: 20 },
  backText: { color: Colors.slate500, fontSize: 14, fontFamily: Fonts.bodyMed },
  content: { flex: 1, gap: 16 },
  successContent: { alignItems: "center", paddingTop: 40 },
  iconBox: {
    width: 72,
    height: 72,
    borderRadius: Radius.xl,
    backgroundColor: Colors.blue100,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  successBox: { borderRadius: Radius.full },
  icon: { fontSize: 32 },
  title: { fontSize: 24, fontFamily: Fonts.heading, color: Colors.slate900 },
  subtitle: {
    fontSize: 14,
    fontFamily: Fonts.body,
    color: Colors.slate500,
    lineHeight: 21,
  },
  input: { marginBottom: 4 },
  backToLogin: { width: "100%", marginTop: 8 },
});
