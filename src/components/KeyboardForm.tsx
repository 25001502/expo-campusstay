import React, { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { Keyboard, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, TextInput, type ScrollViewProps, type StyleProp, type ViewStyle } from 'react-native';
import { clampFormOffset, focusedFormOffset } from '../formScroll';

export type KeyboardFormHandle = { scrollTo: (options: { y: number; animated?: boolean }) => void };
type Props = {
  children: React.ReactNode; header?: React.ReactNode; footer?: React.ReactNode;
  style?: StyleProp<ViewStyle>; scrollStyle?: StyleProp<ViewStyle>; contentContainerStyle?: ScrollViewProps['contentContainerStyle'];
  resetKey?: string | number; showsVerticalScrollIndicator?: boolean;
};

/** One avoidance owner: iOS padding, Android height. Insets stay disabled. */
export const KeyboardForm = forwardRef<KeyboardFormHandle, Props>(function KeyboardForm({ children, header, footer, style, scrollStyle, contentContainerStyle, resetKey, showsVerticalScrollIndicator = true }, ref) {
  const scroll = useRef<ScrollView>(null);
  const focused = useRef<ReturnType<typeof TextInput.State.currentlyFocusedInput>>(null);
  const offset = useRef(0);
  const contentHeight = useRef(0);
  const viewportHeight = useRef(0);
  const frame = useRef<number | null>(null);
  const revision = useRef(0);
  const alive = useRef(true);
  const settling = useRef(false);
  const dragging = useRef(false);
  const requested = useRef<{ y: number; animated?: boolean } | null>(null);
  const previousStep = useRef(resetKey);
  const [typing, setTyping] = useState(() => Keyboard.isVisible());

  const queue = useCallback(() => {
    const version = ++revision.current;
    if (frame.current !== null) cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => {
      frame.current = null;
      if (!alive.current || settling.current || dragging.current || !scroll.current) return;
      const command = requested.current;
      if (command) {
        requested.current = null;
        const y = clampFormOffset(command.y, contentHeight.current, viewportHeight.current);
        offset.current = y;
        scroll.current.scrollTo({ ...command, y });
        return;
      }
      const input = focused.current;
      scroll.current.getNativeScrollRef()?.measureInWindow((_x, y, _width, height) => {
        const commit = (inputBounds?: { y: number; height: number }) => {
          if (!alive.current || version !== revision.current || focused.current !== input) return;
          const next = focusedFormOffset(offset.current, contentHeight.current, { y, height }, inputBounds);
          if (Math.abs(next - offset.current) > 0.5) {
            offset.current = next;
            scroll.current?.scrollTo({ y: next, animated: false });
          }
        };
        if (input && TextInput.State.currentlyFocusedInput() === input) input.measureInWindow((_ix, iy, _iw, ih) => commit({ y: iy, height: ih }));
        else commit();
      });
    });
  }, []);

  const scrollTo = useCallback((options: { y: number; animated?: boolean }) => {
    focused.current?.blur(); focused.current = null;
    Keyboard.dismiss(); requested.current = options; queue();
  }, [queue]);
  useImperativeHandle(ref, () => ({ scrollTo }), [scrollTo]);
  useEffect(() => {
    alive.current = true;
    const subscriptions = [
      Keyboard.addListener('keyboardDidShow', () => { settling.current = false; setTyping(true); queue(); }),
      Keyboard.addListener('keyboardDidHide', () => { settling.current = false; setTyping(false); queue(); }),
    ];
    if (Platform.OS === 'ios') subscriptions.push(
      Keyboard.addListener('keyboardWillChangeFrame', () => { settling.current = true; ++revision.current; }),
      Keyboard.addListener('keyboardDidChangeFrame', () => { settling.current = false; queue(); }),
      Keyboard.addListener('keyboardWillShow', () => { settling.current = true; setTyping(true); }),
    );
    queue();
    return () => {
      alive.current = false;
      subscriptions.forEach((subscription) => subscription.remove());
      if (frame.current !== null) cancelAnimationFrame(frame.current);
    };
  }, [queue]);
  useEffect(() => {
    if (previousStep.current !== resetKey) {
      previousStep.current = resetKey;
      scrollTo({ y: 0, animated: false });
    }
  }, [resetKey, scrollTo]);

  return <KeyboardAvoidingView style={[styles.fill, style]} enabled behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={0}>
    {header}
    <ScrollView ref={scroll} style={[styles.fill, scrollStyle]} contentContainerStyle={contentContainerStyle}
      automaticallyAdjustKeyboardInsets={false} automaticallyAdjustContentInsets={false} contentInsetAdjustmentBehavior="never"
      keyboardShouldPersistTaps="handled" keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'} showsVerticalScrollIndicator={showsVerticalScrollIndicator}
      onFocus={() => { dragging.current = false; focused.current = TextInput.State.currentlyFocusedInput(); queue(); }}
      onBlur={() => { focused.current = null; ++revision.current; }}
      onScrollBeginDrag={() => { dragging.current = true; ++revision.current; }}
      onScrollEndDrag={() => { dragging.current = false; }}
      onLayout={(event) => { viewportHeight.current = event.nativeEvent.layout.height; queue(); }}
      onContentSizeChange={(_width, height) => { contentHeight.current = height; queue(); }}
      onScroll={(event) => { offset.current = event.nativeEvent.contentOffset.y; }} scrollEventThrottle={16}>
      {children}
    </ScrollView>
    {!typing ? footer : null}
  </KeyboardAvoidingView>;
});
const styles = StyleSheet.create({ fill: { flex: 1, minHeight: 0 } });
