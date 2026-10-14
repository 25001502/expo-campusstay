import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ProfileLayout, ProfileSection, profileStyles } from '../components/ProfileLayout';
import type { RootStackParamList } from '../navigation/types';
import { PROFILE_FAQS } from '../profile';
import { Colors, Interaction, Spacing } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'HelpSupport'>;
export default function HelpSupportScreen({ navigation }: Props) {
  const [expanded, setExpanded] = useState<string | undefined>();
  return <ProfileLayout title="Help & Support" onBack={() => navigation.goBack()}>
    <Text style={styles.body}>Find answers about accommodation, applications, and your session.</Text>
    {PROFILE_FAQS.map((faq) => <View key={faq.id} style={styles.card}>
      <TouchableOpacity accessibilityRole="button" accessibilityLabel={faq.question} accessibilityState={{ expanded: expanded === faq.id }} accessibilityHint={expanded === faq.id ? 'Collapses the answer' : 'Expands the answer'} activeOpacity={Interaction.pressedOpacity} style={styles.question} onPress={() => setExpanded((current) => current === faq.id ? undefined : faq.id)}><Text style={[styles.value, styles.questionText]}>{faq.question}</Text><Ionicons importantForAccessibility="no-hide-descendants" name={expanded === faq.id ? 'chevron-up' : 'chevron-down'} size={20} color={Colors.slate500} /></TouchableOpacity>
      {expanded === faq.id ? <Text style={styles.body}>{faq.answer}</Text> : null}
    </View>)}
    <ProfileSection title="Support availability"><Text style={styles.body}>A support contact channel is not available yet. Use the guidance above to manage your session; no support message can be sent from this screen.</Text></ProfileSection>
  </ProfileLayout>;
}
const styles = StyleSheet.create({ ...profileStyles, question: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: Spacing.md }, questionText: { flex: 1, minWidth: 0 } });
