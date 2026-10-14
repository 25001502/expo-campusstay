import React, { useState } from 'react';
import { Alert, Text, View } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { usePreventRemove } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Btn, Input } from '../components/UI';
import { ProfileLayout, ProfileSection, profileStyles as styles } from '../components/ProfileLayout';
import { universities } from '../data';
import type { RootStackParamList } from '../navigation/types';
import { PROFILE_LIMITS, profilesEqual, validateProfile, type ProfileDetails, type ProfileErrors } from '../profile';
import { useProfile } from '../state/ProfileContext';

type Props = NativeStackScreenProps<RootStackParamList, 'PersonalInformation'>;
const labels = { fullName: 'Full name', email: 'Email address', phone: 'Phone number', universityId: 'University', studentNumber: 'Student number' } as const;

export default function PersonalInformationScreen({ navigation }: Props) {
  const { profile, saveProfile } = useProfile();
  const [draft, setDraft] = useState<ProfileDetails>({ ...profile });
  const [editing, setEditing] = useState(false);
  const [errors, setErrors] = useState<ProfileErrors>({});
  const [feedback, setFeedback] = useState('');
  const dirty = editing && !profilesEqual(draft, profile);
  usePreventRemove(dirty, ({ data }) => Alert.alert('Discard changes?', 'Your unsaved personal details will be discarded.', [
    { text: 'Keep editing', style: 'cancel' },
    { text: 'Discard', style: 'destructive', onPress: () => navigation.dispatch(data.action) },
  ]));
  const update = (key: keyof ProfileDetails, value: string) => {
    setDraft((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
  };
  const cancel = () => {
    const discard = () => { setDraft({ ...profile }); setErrors({}); setEditing(false); };
    if (dirty) Alert.alert('Discard changes?', 'Your saved details will stay unchanged.', [{ text: 'Keep editing', style: 'cancel' }, { text: 'Discard', style: 'destructive', onPress: discard }]);
    else discard();
  };
  const save = () => {
    const nextErrors = validateProfile(draft);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;
    if (!saveProfile(draft)) { setFeedback('Details could not be saved. Review the fields and try again.'); return; }
    setEditing(false);
    setFeedback('Details saved for this session. They were not sent to a server.');
  };
  return (
    <ProfileLayout title="Personal Information" onBack={() => navigation.goBack()}>
      <Text style={styles.body}>Add only the details you want to keep during this session. All fields are optional. Saved applications retain their own details.</Text>
      {feedback ? <Text accessibilityRole="alert" accessibilityLiveRegion="polite" style={styles.feedback}>{feedback}</Text> : null}
      <ProfileSection title={editing ? 'Edit details' : 'Your details'}>
        {editing ? <>
          <Input label={labels.fullName} value={draft.fullName} onChangeText={(value) => update('fullName', value)} error={errors.fullName} autoComplete="name" maxLength={PROFILE_LIMITS.fullName} />
          <Input label={labels.email} value={draft.email} onChangeText={(value) => update('email', value)} error={errors.email} keyboardType="email-address" autoCapitalize="none" autoComplete="email" maxLength={PROFILE_LIMITS.email} />
          <Input label={labels.phone} value={draft.phone} onChangeText={(value) => update('phone', value)} error={errors.phone} keyboardType="phone-pad" autoComplete="tel" maxLength={PROFILE_LIMITS.phone} />
          <Text style={styles.label}>{labels.universityId}</Text>
          <View style={styles.pickerBox}><Picker accessibilityLabel="University" selectedValue={draft.universityId} onValueChange={(value: string) => update('universityId', value)}><Picker.Item label="Not selected" value="" />{universities.map((university) => <Picker.Item key={university.id} label={university.name} value={university.id} />)}</Picker></View>
          {errors.universityId ? <Text accessibilityRole="alert" style={styles.error}>{errors.universityId}</Text> : null}
          <Input label={labels.studentNumber} value={draft.studentNumber} onChangeText={(value) => update('studentNumber', value)} error={errors.studentNumber} maxLength={PROFILE_LIMITS.studentNumber} onSubmitEditing={save} returnKeyType="done" submitBehavior="blurAndSubmit" />
          <Btn onPress={save}>Save changes</Btn><Btn variant="secondary" onPress={cancel}>Cancel editing</Btn>
        </> : <>
          {(Object.keys(labels) as (keyof ProfileDetails)[]).map((key) => <View key={key} style={styles.detail}><Text style={styles.label}>{labels[key]}</Text><Text style={styles.value}>{key === 'universityId' ? universities.find((item) => item.id === profile.universityId)?.name ?? 'Not provided' : profile[key] || 'Not provided'}</Text></View>)}
          <Btn onPress={() => { setDraft({ ...profile }); setErrors({}); setFeedback(''); setEditing(true); }}>Edit details</Btn>
        </>}
      </ProfileSection>
    </ProfileLayout>
  );
}
