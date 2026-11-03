import React, { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, ActionSheetIOS, findNodeHandle, Keyboard, Platform, Text, View } from 'react-native';
import type { TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Btn } from './UI';
import { ChoiceSheet } from './ChoiceSheet';
import { Colors, Spacing, TextColors, Fonts } from '../theme';
import type { AttachmentSource } from '../attachmentSession';

const sources: { value: AttachmentSource; label: string; icon: 'images-outline' | 'camera-outline' | 'folder-open-outline' }[] = [
  { value: 'library', label: 'Photo Library', icon: 'images-outline' },
  { value: 'camera', label: 'Take Photo', icon: 'camera-outline' },
  { value: 'files', label: 'Choose Files', icon: 'folder-open-outline' },
];
export function AttachmentSourceButton({ categoryLabel, replacing, disabled, onChoose }: {
  categoryLabel: string; replacing: boolean; disabled: boolean; onChoose: (source: AttachmentSource) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [launching, setLaunching] = useState(false);
  const [error, setError] = useState('');
  const busy = useRef(false);
  const choosing = useRef(false);
  const active = useRef(true);
  const iosSheet = useRef(false);
  const trigger = useRef<React.ElementRef<typeof TouchableOpacity>>(null);
  useEffect(() => { active.current = true; return () => { active.current = false; if (iosSheet.current) ActionSheetIOS.dismissActionSheet(); }; }, []);
  const restoreFocus = () => { if (!active.current) return; const tag = findNodeHandle(trigger.current); if (tag) AccessibilityInfo.setAccessibilityFocus(tag); };
  const cancel = () => { busy.current = false; iosSheet.current = false; setOpen(false); requestAnimationFrame(restoreFocus); };
  const choose = async (source: AttachmentSource) => {
    if (choosing.current || !active.current) return;
    choosing.current = true;
    iosSheet.current = false; setOpen(false); setLaunching(true);
    // Commit the Android modal dismissal before presenting a system picker.
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    try { if (active.current) await onChoose(source); }
    catch { if (active.current) setError('Attachment selection could not finish. Please try again.'); }
    finally { choosing.current = false; busy.current = false; if (active.current) { setLaunching(false); requestAnimationFrame(restoreFocus); } }
  };
  const show = () => {
    if (disabled || busy.current) return;
    busy.current = true; Keyboard.dismiss(); setError('');
    if (Platform.OS === 'ios') {
      iosSheet.current = true;
      try {
        const anchor = findNodeHandle(trigger.current);
        ActionSheetIOS.showActionSheetWithOptions({ title: categoryLabel, options: [...sources.map((source) => source.label), 'Cancel'], cancelButtonIndex: 3, ...(anchor ? { anchor } : {}), tintColor: Colors.blue, userInterfaceStyle: 'light' }, (index) => {
          if (!active.current) return;
          if (sources[index]) void choose(sources[index].value); else cancel();
        });
      } catch { iosSheet.current = false; busy.current = false; setError('Attachment options could not open. Please try again.'); }
    } else if (Platform.OS === 'android') setOpen(true);
    else void choose('files');
  };
  return <View style={{ gap: Spacing.sm }}>
    <Btn buttonRef={trigger} variant="secondary" disabled={disabled || launching} accessibilityLabel={`${replacing ? 'Replace' : 'Choose file for'} ${categoryLabel}`} accessibilityHint="Choose Photo Library, Take Photo or Choose Files" onPress={show}>{replacing ? 'Replace' : 'Choose file'}</Btn>
    {error ? <Text accessibilityRole="alert" style={{ color: TextColors.danger, fontFamily: Fonts.body, fontSize: 13, lineHeight: 20 }}>{error}</Text> : null}
    <ChoiceSheet visible={open} title={`Attach ${categoryLabel}`} onClose={cancel}>
      {sources.map((source) => <Btn key={source.value} variant="ghost" onPress={() => { if (!launching) void choose(source.value); }} accessibilityLabel={source.label}><View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.md, flexShrink: 1 }}><Ionicons name={source.icon} size={20} color={Colors.blue} importantForAccessibility="no" /><Text style={{ flexShrink: 1, color: TextColors.primary, fontFamily: Fonts.bodySemi, fontSize: 15, lineHeight: 22 }}>{source.label}</Text></View></Btn>)}
    </ChoiceSheet>
  </View>;
}
