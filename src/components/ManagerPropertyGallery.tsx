import React, { useState } from 'react';
import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { Btn, StatusBadge } from './UI';
import { RemoteImage } from './RemoteImage';
import { ChoiceSheet } from './ChoiceSheet';
import { changeGallery, MAX_PROPERTY_PHOTOS, type PropertyGallery, type PhotoSource } from '../managerGallery';
import { Colors, Fonts, Radius, Spacing, TextColors } from '../theme';

export function ManagerPropertyGallery({ gallery, busy, error, onChange, onChoose }: {
  gallery: PropertyGallery; busy: boolean; error: string;
  onChange: (gallery: PropertyGallery) => void; onChoose: (source: PhotoSource, replaceId?: string) => Promise<void>;
}) {
  const [previewId, setPreviewId] = useState<string>();
  const { width, fontScale } = useWindowDimensions();
  const preview = gallery.photos.find((photo) => photo.id === previewId);
  const cover = gallery.photos.find((photo) => photo.id === gallery.coverPhotoId);
  const singleColumn = width < 390 || fontScale >= 1.5;
  return <View style={styles.section}>
    <Text accessibilityRole="header" style={styles.heading}>Property Photos</Text>
    <Text style={styles.help}>Up to 8 JPEG or PNG photos, 10 MB each. Photos stay in this workspace for the current session. Nothing is uploaded.</Text>
    {cover ? <Btn variant="ghost" accessibilityLabel="Preview cover photo" onPress={() => setPreviewId(cover.id)}><RemoteImage key={cover.id} source={{ uri: cover.uri }} style={styles.cover} accessibilityLabel="Property cover photo" fallbackLabel="Photo unavailable — replace or remove it" /></Btn> : <Text style={styles.help}>No photos selected. You can add photos now or edit this property later.</Text>}
    <View style={styles.actions}>
      <Btn variant="secondary" style={styles.action} disabled={busy || gallery.photos.length >= MAX_PROPERTY_PHOTOS} accessibilityLabel="Add property photos from Photo Library" onPress={() => { void onChoose('library'); }}>Add Photos</Btn>
      <Btn variant="secondary" style={styles.action} disabled={busy || gallery.photos.length >= MAX_PROPERTY_PHOTOS} accessibilityLabel="Take a property photo" onPress={() => { void onChoose('camera'); }}>Take Photo</Btn>
    </View>
    {busy ? <Text accessibilityLiveRegion="polite" style={styles.help}>Preparing photos…</Text> : null}
    {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
    <View style={styles.grid}>{gallery.photos.map((photo, index) => <View key={photo.id} style={[styles.card, { width: singleColumn ? '100%' : '48%' }]}>
      <Btn variant="ghost" accessibilityLabel={`Preview property photo ${index + 1}`} onPress={() => setPreviewId(photo.id)}><RemoteImage source={{ uri: photo.uri }} style={styles.thumbnail} accessibilityLabel={`Property photo ${index + 1}`} fallbackLabel="Photo unavailable" /></Btn>
      <Text numberOfLines={2} accessibilityLabel={photo.name} style={styles.name}>{photo.name}</Text>
      {photo.id === gallery.coverPhotoId ? <StatusBadge label="Cover photo" variant="blue" /> : null}
      <View style={styles.actions}>
        <Btn variant="secondary" style={styles.action} disabled={busy || photo.id === gallery.coverPhotoId} accessibilityLabel={`Set photo ${index + 1} as cover`} onPress={() => onChange(changeGallery(gallery, photo.id, 'cover'))}>Set as cover</Btn>
        <Btn variant="secondary" style={styles.action} disabled={busy} accessibilityLabel={`Replace photo ${index + 1} from Photo Library`} onPress={() => { void onChoose('library', photo.id); }}>Replace</Btn>
        <Btn variant="ghost" style={styles.action} disabled={busy} accessibilityLabel={`Replace photo ${index + 1} using camera`} onPress={() => { void onChoose('camera', photo.id); }}>Use camera</Btn>
        <Btn variant="ghost" style={styles.action} disabled={busy || index === 0} accessibilityLabel={`Move photo ${index + 1} earlier`} onPress={() => onChange(changeGallery(gallery, photo.id, 'earlier'))}>Move earlier</Btn>
        <Btn variant="ghost" style={styles.action} disabled={busy || index === gallery.photos.length - 1} accessibilityLabel={`Move photo ${index + 1} later`} onPress={() => onChange(changeGallery(gallery, photo.id, 'later'))}>Move later</Btn>
        <Btn variant="ghost" style={styles.action} disabled={busy} accessibilityLabel={`Remove photo ${index + 1}`} onPress={() => onChange(changeGallery(gallery, photo.id, 'remove'))}>Remove</Btn>
      </View>
    </View>)}</View>
    <ChoiceSheet visible={!!preview} title="Property photo" onClose={() => setPreviewId(undefined)}>{preview ? <><RemoteImage key={preview.id} source={{ uri: preview.uri }} style={styles.cover} accessibilityLabel="Selected property photo preview" fallbackLabel="Photo unavailable — replace or remove it" /><Text style={styles.help}>{preview.name}</Text></> : null}</ChoiceSheet>
  </View>;
}
export function ManagerPhotoPreview({ gallery }: { gallery: PropertyGallery }) {
  const [previewId, setPreviewId] = useState<string>();
  const preview = gallery.photos.find((photo) => photo.id === previewId);
  const cover = gallery.photos.find((photo) => photo.id === gallery.coverPhotoId);
  if (!cover) return null;
  return <View style={styles.section}>
    <Text accessibilityRole="header" style={styles.heading}>Property Photos</Text>
    <Btn variant="ghost" accessibilityLabel="Preview saved cover photo" onPress={() => setPreviewId(cover.id)}><RemoteImage key={cover.id} source={{ uri: cover.uri }} style={styles.cover} accessibilityLabel="Saved property cover photo" fallbackLabel="Photo unavailable — edit the gallery to replace it" /></Btn>
    <View style={styles.actions}>{gallery.photos.map((photo, index) => <Btn key={photo.id} variant="secondary" accessibilityLabel={`Preview saved property photo ${index + 1}`} style={styles.action} onPress={() => setPreviewId(photo.id)}>{`Photo ${index + 1}${photo.id === cover.id ? ' · Cover' : ''}`}</Btn>)}</View>
    <ChoiceSheet visible={!!preview} title="Property photo" onClose={() => setPreviewId(undefined)}>{preview ? <RemoteImage key={preview.id} source={{ uri: preview.uri }} style={styles.cover} accessibilityLabel="Saved property photo preview" fallbackLabel="Photo unavailable" /> : null}</ChoiceSheet>
  </View>;
}
const styles = StyleSheet.create({
  section: { gap: Spacing.md }, heading: { color: Colors.navy, fontFamily: Fonts.heading, fontSize: 19 },
  help: { fontFamily: Fonts.body, color: TextColors.secondary, fontSize: 13, lineHeight: 20 },
  error: { fontFamily: Fonts.bodyMed, color: TextColors.danger, fontSize: 13, lineHeight: 20 },
  cover: { width: '100%', aspectRatio: 1.5, borderRadius: Radius.md },
  thumbnail: { width: '100%', aspectRatio: 1.4, borderRadius: Radius.sm },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, justifyContent: 'space-between' },
  card: { borderWidth: 1, borderColor: Colors.slate200, borderRadius: Radius.md, padding: Spacing.sm, gap: Spacing.sm },
  name: { color: TextColors.primary, fontFamily: Fonts.bodyMed, fontSize: 13 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm }, action: { flexGrow: 1, flexBasis: 110 },
});
