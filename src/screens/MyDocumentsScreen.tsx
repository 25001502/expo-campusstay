import React, { useCallback, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts, Radius, Spacing, TextColors } from '../theme';
import { Btn, EmptyState } from '../components/UI';
import { ProfileLayout, ProfileSection, profileStyles as styles } from '../components/ProfileLayout';
import { properties } from '../data';
import { LocalDocumentPreview } from '../components/LocalDocumentPreview';
import { formatDocumentSize, formatDocumentType, validLocalDocument, type LocalDocument } from '../documents';
import type { ImagePreview } from '../attachmentSession';
import type { RootStackParamList } from '../navigation/types';
import { getApplicationDocumentGroups } from '../profile';
import { useApplications } from '../state/ApplicationContext';

type Props = NativeStackScreenProps<RootStackParamList, 'MyDocuments'>;
export default function MyDocumentsScreen({ navigation, route }: Props) {
  const { applications, refreshDocuments, documentStatus, canPreviewDocument, previewDocument } = useApplications();
  const [preview, setPreview] = useState<ImagePreview | null>(null);
  useFocusEffect(useCallback(() => { for (const application of applications) void refreshDocuments(application.id, application.attachments ?? {}); }, [applications, refreshDocuments]));
  const selectedId = route.params?.applicationId;
  const { width, fontScale } = useWindowDimensions();
  const stacked = width < 360 || fontScale > 1.3;
  const allGroups = getApplicationDocumentGroups(applications, properties);
  // Identify the requested application first without filtering out any other records.
  const groups = [...allGroups.filter((group) => group.applicationId === selectedId), ...allGroups.filter((group) => group.applicationId !== selectedId)];
  const openPreview = (owner: string, document: LocalDocument) => {
    const result = previewDocument(owner, document);
    if (result.status === 'image') setPreview(result.preview);
    else if (result.status === 'error') Alert.alert('Preview unavailable', result.message);
  };
  return <><ProfileLayout title="My Documents" backLabel="Go back" onBack={() => navigation.goBack()}>
    <ProfileSection title="Local attachments"><Text style={styles.body}>Documents are available in this app session and have not been sent to the residence. Temporary copies may become unavailable; no files are verified.</Text></ProfileSection>
    {selectedId && !groups.some((group) => group.applicationId === selectedId) ? <Text accessibilityRole="alert" style={styles.body}>The requested application is unavailable in this session.</Text> : null}
    {!groups.length ? <EmptyState title="No application documents" description="Attach files within an application to see them here." actionLabel="Explore accommodation" onAction={() => navigation.popTo('Main', { screen: 'Explore' })} /> : groups.map((group) => <ProfileSection key={group.applicationId} title={group.property?.name ?? 'Property unavailable'}>
      <Text style={styles.label}>Application {group.applicationId}</Text>
      {group.applicationId === selectedId ? <Text style={localStyles.selected}>Selected application</Text> : null}
      {group.categories.map((category) => {
        const document = category.attachment;
        const available = validLocalDocument(document, category.id) && !!document && documentStatus(group.applicationId, document.id) === 'attached-local';
        const status = document ? available ? 'Attached locally' : 'File unavailable · Temporary reference unavailable' : category.legacySelection ? 'Selection recorded · No file attached' : 'Not attached';
        return <View key={category.id} style={[localStyles.row, stacked && localStyles.stacked]}>
          <View style={localStyles.fileInfo}>
            <View style={localStyles.category}>
              <Ionicons name={!document ? 'document-outline' : document.mimeType === 'application/pdf' ? 'document-text-outline' : 'image-outline'} size={20} color={TextColors.link} accessible={false} />
              <Text style={localStyles.categoryText}>{category.label} · {category.required ? 'Required' : 'Optional'}</Text>
            </View>
            {document ? <Text style={localStyles.filename}>{document.name}</Text> : null}
            <Text style={localStyles.metadata}>{document ? `${formatDocumentType(document.mimeType)} · ${formatDocumentSize(document.size)} · ` : ''}{status}</Text>
            {document?.mimeType === 'application/pdf' && available ? <Text style={localStyles.metadata}>PDF preview unavailable</Text> : null}
          </View>
          {document && available && canPreviewDocument(group.applicationId, document) ? <Pressable accessibilityRole="button" accessibilityLabel={`Preview ${category.label} for application ${group.applicationId}: ${document.name}`} onPress={() => openPreview(group.applicationId, document)} style={({ pressed }) => [localStyles.preview, pressed && localStyles.pressed]}>
            <Text style={localStyles.previewText}>Preview</Text>
          </Pressable> : null}
        </View>;
      })}
      {group.canOpenApplication ? <Btn variant="secondary" onPress={() => { if (group.property) navigation.navigate('AppStatus', { property: group.property, applicationId: group.applicationId }); }}>View application</Btn> : <Text style={styles.body}>The linked property or room is unavailable. Recorded document information remains visible.</Text>}
    </ProfileSection>)}
  </ProfileLayout><LocalDocumentPreview preview={preview} onClose={() => setPreview(null)} /></>;
}

const localStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingVertical: Spacing.sm, borderTopWidth: 1, borderTopColor: Colors.slate100 },
  stacked: { flexDirection: 'column', alignItems: 'stretch' },
  fileInfo: { flex: 1, minWidth: 0, gap: Spacing.xs },
  category: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm },
  categoryText: { flex: 1, minWidth: 0, fontFamily: Fonts.bodySemi, fontSize: 13, lineHeight: 20, color: TextColors.primary },
  filename: { fontFamily: Fonts.bodyMed, fontSize: 14, lineHeight: 21, color: TextColors.primary },
  metadata: { fontFamily: Fonts.body, fontSize: 12, lineHeight: 18, color: TextColors.secondary },
  selected: { fontFamily: Fonts.bodySemi, fontSize: 12, lineHeight: 18, color: TextColors.link },
  preview: { minHeight: 48, minWidth: 80, alignSelf: 'flex-start', justifyContent: 'center', alignItems: 'center', paddingHorizontal: Spacing.md, borderWidth: 1, borderColor: Colors.blue100, borderRadius: Radius.md, backgroundColor: Colors.blue50 },
  previewText: { fontFamily: Fonts.bodySemi, fontSize: 13, lineHeight: 20, color: TextColors.link },
  pressed: { opacity: 0.7 },
});
