import React, { useEffect, useRef, useState } from 'react';
import { FlatList, KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getConversationProperty, getMessageTimeLabel, hasIllustrativeMessages, MAX_MESSAGE_LENGTH } from '../communication';
import { EmptyState, IconButton } from '../components/UI';
import { properties, type Message } from '../data';
import type { RootStackParamList } from '../navigation/types';
import { useCommunication } from '../state/CommunicationContext';
import { Colors, Fonts, Radius, Spacing, TextColors } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Chat'>;

export default function ChatScreen({ navigation, route }: Props) {
  const insets = useSafeAreaInsets();
  const { width, fontScale } = useWindowDimensions();
  const expanded = width < 360 || fontScale >= 1.3;
  const { conversations, markConversationRead, sendMessage } = useCommunication();
  const conversation = conversations.find((item) => item.id === route.params?.convId);
  const conversationId = conversation?.id;
  const [draftConversationId, setDraftConversationId] = useState(conversationId);
  const [text, setText] = useState('');
  const [feedback, setFeedback] = useState('');
  const draftRef = useRef('');
  const followLatest = useRef(true);
  const pendingScroll = useRef(true);
  const readerDragging = useRef(false);
  const readerMomentum = useRef(false);
  const scrollMeasurements = useRef({ content: 0, viewport: 0 });
  const scrollFrame = useRef<number | null>(null);
  const listRef = useRef<FlatList<Message>>(null);
  const property = conversation ? getConversationProperty(conversation, properties) : undefined;

  if (draftConversationId !== conversationId) {
    setDraftConversationId(conversationId);
    setText('');
    setFeedback('');
  }

  useEffect(() => {
    if (conversationId) markConversationRead(conversationId);
    draftRef.current = '';
    followLatest.current = true;
    pendingScroll.current = true;
    readerDragging.current = false;
    readerMomentum.current = false;
    return () => {
      if (scrollFrame.current !== null) cancelAnimationFrame(scrollFrame.current);
      scrollFrame.current = null;
    };
  }, [conversationId, markConversationRead]);

  const safeArea = { paddingTop: insets.top, paddingLeft: insets.left, paddingRight: insets.right };
  if (!conversation) {
    return <View style={[styles.container, safeArea]}><StatusBar style="dark" /><View style={styles.topBar}><IconButton icon="arrow-back" label="Go back" onPress={() => navigation.goBack()} /><Text accessibilityRole="header" style={styles.missingTitle}>Conversation</Text><View style={styles.headerSpacer} /></View><EmptyState icon={<Ionicons name="chatbubble-ellipses-outline" size={48} color={Colors.slate500} />} title="Conversation unavailable" description="This conversation does not exist or is no longer available." actionLabel="Back to Messages" onAction={() => navigation.goBack()} /></View>;
  }

  const send = () => {
    const trimmed = draftRef.current.trim();
    if (!trimmed) return;
    if (trimmed.length > MAX_MESSAGE_LENGTH) {
      setFeedback(`Keep your message within ${MAX_MESSAGE_LENGTH} characters.`);
      return;
    }
    // Clear synchronously so a second tap on the same rendered button cannot duplicate it.
    draftRef.current = '';
    if (!sendMessage(conversation.id, trimmed)) {
      draftRef.current = trimmed;
      setFeedback('Message could not be saved. Please try again.');
      return;
    }
    followLatest.current = true;
    pendingScroll.current = true;
    readerDragging.current = false;
    readerMomentum.current = false;
    setText('');
    setFeedback('Saved here for this session. Not delivered externally.');
  };
  const scrollToLatest = () => {
    const { content, viewport } = scrollMeasurements.current;
    // FlatList.scrollToEnd estimates variable-height cells. Use actual native
    // content/viewport measurements so a long new bubble reaches the viewport.
    if ((pendingScroll.current || followLatest.current) && content > 0 && viewport > 0) {
      if (scrollFrame.current !== null) cancelAnimationFrame(scrollFrame.current);
      scrollFrame.current = requestAnimationFrame(() => {
        scrollFrame.current = null;
        const measured = scrollMeasurements.current;
        if (pendingScroll.current || followLatest.current) {
          listRef.current?.scrollToOffset({ offset: Math.max(0, measured.content - measured.viewport), animated: false });
        }
      });
    }
  };

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={[styles.container, safeArea]}>
        <StatusBar style="dark" />
        <View style={styles.topBar}>
          <IconButton icon="arrow-back" label="Back to messages" onPress={() => navigation.goBack()} />
          <View style={styles.topInfo}>
            <View importantForAccessibility="no-hide-descendants" style={styles.topAvatar}><Text maxFontSizeMultiplier={1.3} style={styles.topAvatarText}>{conversation.avatar}</Text></View>
            <View style={styles.topCopy}><Text accessibilityRole="header" style={styles.topName}>{conversation.manager}</Text><Text style={styles.localLabel}>{hasIllustrativeMessages(conversation) ? 'Illustrative conversation' : 'Messages saved locally'}</Text></View>
          </View>
          <View style={styles.headerSpacer} />
        </View>
        <FlatList
          testID="chat-message-list"
          ref={listRef}
          data={conversation.messages}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[styles.messageList, !conversation.messages.length && styles.emptyList]}
          ListHeaderComponent={<View style={styles.conversationContext}>
            {property ? <View style={styles.propertyRow}><Text style={styles.propertyText}>{property.name}</Text><IconButton icon="chevron-forward" label={'Open ' + property.name + ' property details'} onPress={() => navigation.navigate('Property', { property })} iconSize={20} /></View>
              : <Text style={styles.propertyUnavailable}>{conversation.property} · Property details unavailable</Text>}
          </View>}
          ListEmptyComponent={<EmptyState style={styles.emptyState} title="No messages yet" description="Write a message below. It will stay in this session." />}
          ListFooterComponent={feedback ? <Text accessibilityRole="alert" accessibilityLiveRegion="polite" style={styles.feedback}>{feedback}</Text> : null}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          onScroll={({ nativeEvent }) => {
            if (readerDragging.current && !pendingScroll.current) followLatest.current = nativeEvent.contentSize.height - nativeEvent.layoutMeasurement.height - nativeEvent.contentOffset.y < 80;
          }}
          onScrollBeginDrag={() => { readerDragging.current = true; readerMomentum.current = true; pendingScroll.current = false; followLatest.current = false; }}
          onScrollEndDrag={({ nativeEvent }) => {
            readerDragging.current = false;
            followLatest.current = nativeEvent.contentSize.height - nativeEvent.layoutMeasurement.height - nativeEvent.contentOffset.y < 80;
          }}
          onMomentumScrollEnd={({ nativeEvent }) => {
            if (readerMomentum.current) followLatest.current = nativeEvent.contentSize.height - nativeEvent.layoutMeasurement.height - nativeEvent.contentOffset.y < 80;
            readerMomentum.current = false;
          }}
          scrollEventThrottle={100}
          onContentSizeChange={(_width, height) => { scrollMeasurements.current.content = height; scrollToLatest(); pendingScroll.current = false; }}
          onLayout={({ nativeEvent }) => { scrollMeasurements.current.viewport = nativeEvent.layout.height; scrollToLatest(); }}
          renderItem={({ item }) => <MessageBubble item={item} avatar={conversation.avatar} author={conversation.manager} expanded={expanded} />}
        />
        <View style={[styles.inputBar, { paddingBottom: Math.max(insets.bottom, Spacing.sm) }]}>
          <TextInput accessibilityLabel="Message" accessibilityHint={`Up to ${MAX_MESSAGE_LENGTH} characters. Messages stay in this session and are not sent externally`} style={[styles.input, { maxHeight: expanded ? 150 : 110 }]} placeholder="Write a message…" placeholderTextColor={Colors.slate500} value={text}
            onChangeText={(value) => { draftRef.current = value; setText(value); setFeedback(''); }}
            returnKeyType="default" multiline maxLength={MAX_MESSAGE_LENGTH} />
          <IconButton icon="send" label="Send message" hint="Saves this message locally; external delivery is not connected" onPress={send} disabled={!text.trim() || text.trim().length > MAX_MESSAGE_LENGTH} color={Colors.white} backgroundColor={Colors.blue} />
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

export function MessageBubble({ item, avatar, author, expanded = false }: { item: Message; avatar: string; author: string; expanded?: boolean }) {
  const isStudent = item.sender === 'student';
  const isExample = item.source !== 'local';
  const time = getMessageTimeLabel(item);
  return <View accessible accessibilityLabel={`${isStudent ? 'You' : author}${isExample ? ', example message' : ', saved locally'}${time ? `, ${time}` : ''}: ${item.text}`} style={[styles.bubbleWrapper, isStudent && styles.bubbleWrapperMe]}>
    {!isStudent ? <View importantForAccessibility="no-hide-descendants" style={styles.bubbleAvatar}><Text maxFontSizeMultiplier={1.3} style={styles.bubbleAvatarText}>{avatar}</Text></View> : null}
    <View style={[styles.bubble, expanded && styles.bubbleExpanded, isStudent ? styles.bubbleMe : styles.bubbleThem]}>
      <Text style={[styles.bubbleText, isStudent && styles.bubbleTextMe]}>{item.text}</Text>
      {time || !isExample ? <Text style={[styles.bubbleTime, isStudent && styles.bubbleTimeMe]}>{isExample ? time : `${time} · Saved locally`}</Text> : null}
    </View>
  </View>;
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { flex: 1, backgroundColor: Colors.background },
  topBar: { minHeight: 64, flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.sm, paddingVertical: Spacing.sm, backgroundColor: Colors.white, borderBottomWidth: 1, borderBottomColor: Colors.slate100 },
  topInfo: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  topCopy: { flex: 1, minWidth: 0 },
  topAvatar: { width: 38, height: 38, borderRadius: 19, backgroundColor: Colors.blue, alignItems: 'center', justifyContent: 'center' },
  topAvatarText: { color: Colors.white, fontSize: 13, lineHeight: 18, fontFamily: Fonts.bodySemi },
  topName: { fontSize: 15, lineHeight: 21, fontFamily: Fonts.heading, color: TextColors.primary },
  localLabel: { fontSize: 11, lineHeight: 17, fontFamily: Fonts.body, color: TextColors.muted },
  headerSpacer: { width: 44 },
  missingTitle: { flex: 1, textAlign: 'center', fontSize: 16, fontFamily: Fonts.heading, color: TextColors.primary },
  conversationContext: { gap: Spacing.sm, paddingBottom: Spacing.md },
  propertyRow: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, paddingLeft: Spacing.md, paddingRight: Spacing.xs, borderRadius: Radius.md, backgroundColor: Colors.slate100 },
  propertyText: { flex: 1, fontSize: 12, lineHeight: 18, fontFamily: Fonts.bodySemi, color: TextColors.link },
  propertyUnavailable: { fontSize: 12, lineHeight: 18, fontFamily: Fonts.body, color: TextColors.muted },
  messageList: { padding: Spacing.lg, gap: Spacing.md },
  emptyList: { flexGrow: 1 },
  emptyState: { flexGrow: 1 },
  bubbleWrapper: { flexDirection: 'row', alignItems: 'flex-end', gap: Spacing.sm },
  bubbleWrapperMe: { justifyContent: 'flex-end' },
  bubbleAvatar: { width: 28, height: 28, borderRadius: 14, backgroundColor: Colors.blue, alignItems: 'center', justifyContent: 'center' },
  bubbleAvatarText: { color: Colors.white, fontSize: 10, lineHeight: 14, fontFamily: Fonts.bodySemi },
  bubble: { maxWidth: '78%', flexShrink: 1, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 18, gap: Spacing.xs },
  bubbleExpanded: { maxWidth: '88%' },
  bubbleMe: { backgroundColor: Colors.blue, borderBottomRightRadius: 4 },
  bubbleThem: { backgroundColor: Colors.white, borderBottomLeftRadius: 4, borderWidth: 1, borderColor: Colors.slate100 },
  bubbleText: { fontSize: 14, fontFamily: Fonts.body, color: TextColors.primary, lineHeight: 20 },
  bubbleTextMe: { color: Colors.white },
  bubbleTime: { fontSize: 11, lineHeight: 17, fontFamily: Fonts.body, color: TextColors.muted },
  bubbleTimeMe: { color: Colors.white },
  feedback: { paddingVertical: Spacing.sm, color: TextColors.link, fontSize: 12, lineHeight: 18, fontFamily: Fonts.body },
  inputBar: { flexDirection: 'row', alignItems: 'flex-end', gap: Spacing.sm, paddingHorizontal: Spacing.lg, paddingTop: Spacing.sm, backgroundColor: Colors.white, borderTopWidth: 1, borderTopColor: Colors.slate100 },
  input: { flex: 1, minWidth: 0, minHeight: 44, backgroundColor: Colors.slate100, borderRadius: Radius.lg, paddingHorizontal: 14, paddingVertical: 11, fontSize: 14, lineHeight: 20, fontFamily: Fonts.body, color: TextColors.primary, textAlignVertical: 'top' },
});
