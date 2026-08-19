import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../App';
import { Colors, Fonts, Radius } from '../theme';
import { Btn, Input } from '../components/UI';
import { universities } from '../data';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type Props = NativeStackScreenProps<RootStackParamList, 'Register'>;

export default function RegisterScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const [uni, setUni] = useState('');

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
        <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Create Account</Text>
        </View>

        <View style={styles.form}>
          <View style={styles.infoBanner}>
            <Text style={styles.infoTitle}>Welcome to CampusStay 👋</Text>
            <Text style={styles.infoSub}>Find verified student accommodation near your campus.</Text>
          </View>

          <Input label="Full name" placeholder="Siyanda Dlamini" style={styles.field} />
          <Input label="Email address" placeholder="student@university.ac.za" keyboardType="email-address" style={styles.field} />
          <Input label="Phone number" placeholder="+27 71 234 5678" keyboardType="phone-pad" style={styles.field} />

          <View style={styles.field}>
            <Text style={styles.pickerLabel}>University</Text>
            <View style={styles.pickerWrapper}>
              <Picker selectedValue={uni} onValueChange={setUni} style={styles.picker}>
                <Picker.Item label="Select your university" value="" color={Colors.slate400} />
                {universities.map((u) => (
                  <Picker.Item key={u.id} label={u.name} value={u.id} />
                ))}
              </Picker>
            </View>
          </View>

          <Input label="Student number" placeholder="e.g. 2021012345" style={styles.field} />
          <Input label="Password" placeholder="Min. 8 characters" secureTextEntry style={styles.field} />
          <Input label="Confirm password" placeholder="••••••••" secureTextEntry style={styles.field} />

          <Text style={styles.terms}>
            By creating an account, you agree to our{' '}
            <Text style={styles.link}>Terms of Service</Text> and{' '}
            <Text style={styles.link}>Privacy Policy</Text>.
          </Text>

          <Btn onPress={() => navigation.replace('Main')} style={styles.createBtn}>Create Account</Btn>

          <View style={styles.loginRow}>
            <Text style={styles.loginText}>Already have an account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
              <Text style={styles.loginLink}>Sign in</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.white },
  header: {
    backgroundColor: Colors.navy,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  backBtn: { marginBottom: 12 },
  backText: { color: Colors.slate300, fontSize: 14, fontFamily: Fonts.bodyMed },
  title: { color: Colors.white, fontSize: 26, fontFamily: Fonts.heading },
  form: { padding: 20 },
  infoBanner: {
    backgroundColor: Colors.blue50,
    borderRadius: Radius.lg,
    padding: 14,
    marginBottom: 20,
  },
  infoTitle: { color: Colors.blue, fontSize: 14, fontFamily: Fonts.bodySemi },
  infoSub: {
    color: Colors.blueLight,
    fontSize: 12,
    fontFamily: Fonts.body,
    marginTop: 4,
  },
  field: { marginBottom: 14 },
  pickerLabel: {
    fontSize: 13,
    fontFamily: Fonts.bodyMed,
    color: Colors.slate700,
    marginBottom: 6,
  },
  pickerWrapper: {
    borderWidth: 1,
    borderColor: Colors.slate200,
    borderRadius: Radius.lg,
    overflow: "hidden",
    backgroundColor: Colors.white,
  },
  picker: { height: 48, color: Colors.slate800 },
  terms: {
    fontSize: 12,
    color: Colors.slate500,
    lineHeight: 18,
    marginBottom: 20,
    fontFamily: Fonts.body,
  },
  link: { color: Colors.blue, fontFamily: Fonts.bodyMed },
  createBtn: { marginBottom: 16 },
  loginRow: { flexDirection: "row", justifyContent: "center" },
  loginText: { fontSize: 14, color: Colors.slate500 },
  loginLink: { fontSize: 14, fontFamily: Fonts.bodySemi, color: Colors.blue },
});
