import React, { useRef } from 'react';
import { AccessibilityInfo, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Btn } from './UI';
import { Colors, Fonts, Radius, Spacing, TextColors } from '../theme';

export function ChoiceSheet({ visible, title, onClose, children }: { visible: boolean; title: string; onClose: () => void; children: React.ReactNode }) {
  const insets = useSafeAreaInsets();
  const heading = useRef<React.ElementRef<typeof Text>>(null);
  return <Modal visible={visible} transparent animationType="none" onRequestClose={onClose} onShow={() => { if (heading.current) AccessibilityInfo.sendAccessibilityEvent(heading.current, 'focus'); }}>
    <View style={[styles.overlay, { paddingTop: insets.top + Spacing.md, paddingLeft: insets.left + Spacing.md, paddingRight: insets.right + Spacing.md }]}>
      <Pressable accessible={false} style={StyleSheet.absoluteFill} onPress={onClose} />
      <View accessibilityViewIsModal style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, Spacing.md) }]}>
        <Text ref={heading} accessibilityRole="header" style={styles.title}>{title}</Text>
        <ScrollView keyboardShouldPersistTaps="handled" style={styles.list} contentContainerStyle={styles.content}>{children}</ScrollView>
        <View style={styles.cancel}><Btn variant="ghost" onPress={onClose}>Cancel</Btn></View>
      </View>
    </View>
  </Modal>;
}
const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(15,27,45,0.45)' },
  sheet: { width: '100%', maxWidth: 640, maxHeight: '92%', alignSelf: 'center', backgroundColor: Colors.white, borderTopLeftRadius: Radius.xl, borderTopRightRadius: Radius.xl, paddingTop: Spacing.lg },
  title: { fontFamily: Fonts.headingSemi, fontSize: 20, lineHeight: 28, color: TextColors.primary, paddingHorizontal: Spacing.lg, paddingBottom: Spacing.md },
  list: { flexShrink: 1 }, content: { paddingHorizontal: Spacing.lg, gap: Spacing.xs },
  cancel: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.sm },
});
