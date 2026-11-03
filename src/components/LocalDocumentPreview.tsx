import React, { useState } from 'react';
import { Image, Modal, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Btn } from './UI';
import { Colors, Fonts, Spacing, TextColors } from '../theme';
import type { ImagePreview } from '../attachmentSession';

export function LocalDocumentPreview({ preview, onClose }: { preview: ImagePreview | null; onClose: () => void }) {
  const insets = useSafeAreaInsets();
  const [failedUri, setFailedUri] = useState<string | null>(null);
  return <Modal visible={!!preview} onRequestClose={onClose} animationType="none" statusBarTranslucent navigationBarTranslucent>
    <View style={[styles.page, { paddingTop: insets.top + Spacing.md, paddingBottom: insets.bottom + Spacing.md, paddingLeft: insets.left + Spacing.lg, paddingRight: insets.right + Spacing.lg }]}>
      <Btn variant="secondary" onPress={onClose}>Close preview</Btn>
      <ScrollView style={styles.filenameArea} contentContainerStyle={styles.filenameContent}><Text accessibilityRole="header" style={styles.name}>{preview?.name}</Text></ScrollView>
      {preview && failedUri !== preview.uri ? <Image source={{ uri: preview.uri }} resizeMode="contain" style={styles.image} accessibilityLabel={`Selected image: ${preview.name}`} onError={() => setFailedUri(preview.uri)} /> : <View style={styles.image}><Text accessibilityRole="alert" style={styles.note}>This image could not be displayed. Its file information remains available.</Text></View>}
      <Text style={styles.note}>Local preview · No file has been sent</Text>
    </View>
  </Modal>;
}
const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: Colors.white, paddingHorizontal: Spacing.lg, gap: Spacing.md },
  name: { fontFamily: Fonts.heading, color: TextColors.primary, fontSize: 18, lineHeight: 26 },
  filenameArea: { flexGrow: 0, flexShrink: 1, maxHeight: '25%' },
  filenameContent: { paddingBottom: Spacing.xs },
  image: { flex: 1, width: '100%', minHeight: 0 },
  note: { fontFamily: Fonts.body, fontSize: 12, color: TextColors.muted },
});
