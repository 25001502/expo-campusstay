import { classifyError, reportDiagnostic } from '../errors';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { Btn, ErrorState } from '../components/UI';
import { ProfileLayout, ProfileSection, profileStyles } from '../components/ProfileLayout';
import { FundingFields } from '../components/FundingFields';
import { AttachmentSourceButton } from '../components/AttachmentSourceButton';
import { LocalDocumentPreview } from '../components/LocalDocumentPreview';
import { formatDocumentSize, formatDocumentType, newLocalId, type LocalDocument } from '../documents';
import { normalizeFunding, validateFunding } from '../funding';
import type { AttachmentSource, ImagePreview } from '../attachmentSession';
import type { RootStackParamList } from '../navigation/types';
import { useApplications } from '../state/ApplicationContext';
import { Colors, Radius, Spacing } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'UpdateFunding'>;
export default function UpdateFundingScreen({ navigation, route }: Props) {
  const applicationId = route.params?.applicationId ?? '';
  const { getApplication, updateFunding, chooseDocument, removeDocument, releaseDraft, refreshDocuments, documentStatus, canPreviewDocument, previewDocument, picking } = useApplications();
  const application = getApplication(applicationId);
  const [originalId] = useState(applicationId);
  const [editor] = useState(() => newLocalId('funding-edit'));
  const [funding, setFunding] = useState(() => normalizeFunding(application?.funding));
  const [document, setDocument] = useState<LocalDocument | undefined>(() => application?.attachments?.funding);
  const [error, setError] = useState<string>();
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState<ImagePreview | null>(null);
  const active = useRef(true);
  const savingRef = useRef(false);
  useEffect(() => { active.current = true; return () => { active.current = false; releaseDraft(editor); }; }, [editor, releaseDraft]);
  const owner = document?.id === application?.attachments?.funding?.id ? applicationId : editor;
  useFocusEffect(useCallback(() => { if (document) void refreshDocuments(owner, { funding: document }); }, [document, owner, refreshDocuments]));
  const available = document && documentStatus(owner, document.id) === 'attached-local';
  const choose = async (source: AttachmentSource) => {
    const result = await chooseDocument(editor, 'funding', source);
    if (!active.current) return;
    if (result.status === 'selected') { setDocument(result.document); setError(undefined); }
    else if (result.status === 'error') setError(result.message);
  };
  const remove = () => {
    if (document && owner === editor) removeDocument(editor, document.id);
    setDocument(undefined); setError(undefined); setPreview(null);
  };
  const save = async () => {
    if (savingRef.current || picking) return;
    const issue = validateFunding(funding);
    if (issue) { setError(issue); return; }
    savingRef.current = true; setSaving(true); setError(undefined);
    try {
      await updateFunding(applicationId, editor, funding, document);
      if (active.current) navigation.goBack();
    } catch (failure) {
      const issue = classifyError(failure, 'save');
      reportDiagnostic('funding', issue.code);
      if (active.current) setError(issue.message);
      savingRef.current = false; if (active.current) setSaving(false);
    }
  };
  if (!application || originalId !== applicationId) return <ProfileLayout title="Funding Information" onBack={() => navigation.goBack()} backLabel="Go back"><ErrorState title="Application unavailable" message="This application is no longer available in this session." retryLabel="Go back" onRetry={() => navigation.goBack()} /></ProfileLayout>;
  return <ProfileLayout title="Funding Information" onBack={() => navigation.goBack()} backLabel="Cancel funding update">
    <Text style={profileStyles.body}>Update this application’s funding details. Changes are saved in this session only.</Text>
    <Text style={profileStyles.label}>Application ID: {application.id}</Text>
    <ProfileSection title="Funding Information"><FundingFields funding={funding} disabled={picking || saving} onChange={(value) => { setFunding(value); setError(undefined); }} /></ProfileSection>
    <View style={[styles.documentCard, available && styles.selected]}>
      <Text accessibilityRole="header" style={profileStyles.heading}>Proof of Funding</Text>
      <Text style={profileStyles.label}>Optional · {document ? available ? 'Supporting document attached locally' : 'File unavailable · Replace or remove' : 'Not attached'}</Text>
      <Text style={profileStyles.body}>PDF, JPG, JPEG or PNG · Up to 10 MB. A supporting file does not verify funding.</Text>
      {document ? <View accessibilityLiveRegion="polite"><Text style={profileStyles.value}>{document.name}</Text><Text style={profileStyles.label}>{formatDocumentType(document.mimeType)} · {formatDocumentSize(document.size)}</Text></View> : null}
      <AttachmentSourceButton categoryLabel="Proof of Funding" replacing={!!document} disabled={picking || saving} onChoose={choose} />
      {document ? <Btn variant="ghost" disabled={picking || saving} accessibilityLabel="Remove Proof of Funding" onPress={remove}>Remove</Btn> : null}
      {document && available && canPreviewDocument(owner, document) ? <Btn variant="ghost" disabled={picking || saving} accessibilityLabel="Preview Proof of Funding" onPress={() => { const result = previewDocument(owner, document); if (result.status === 'image') setPreview(result.preview); else if (result.status === 'error') Alert.alert('Preview unavailable', result.message); }}>Preview</Btn> : null}
    </View>
    {error ? <Text accessibilityRole="alert" accessibilityLiveRegion="polite" style={profileStyles.error}>{error}</Text> : null}
    <Btn disabled={picking || saving} loading={saving} onPress={save}>Save funding update</Btn>
    <Btn variant="ghost" disabled={saving} onPress={() => navigation.goBack()}>Cancel</Btn>
    <LocalDocumentPreview preview={preview} onClose={() => setPreview(null)} />
  </ProfileLayout>;
}
const styles = StyleSheet.create({
  documentCard: { padding: Spacing.lg, gap: Spacing.md, borderRadius: Radius.xl, borderWidth: 1, borderColor: Colors.slate200, backgroundColor: Colors.white },
  selected: { borderColor: Colors.blue, backgroundColor: Colors.blue50 },
});
