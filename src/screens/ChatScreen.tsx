import React, { useEffect, useRef, useState } from 'react';
import { FlatList, KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getConversationProperty } from '../communication';
import { EmptyState, IconButton } from '../components/UI';
import { properties, type Message } from '../data';
import type { RootStackParamList } from '../navigation/types';
import { useCommunication } from '../state/CommunicationContext';
import { Colors, Fonts, Radius, Spacing, TextColors } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Chat'>;

export default function ChatScreen({ navigation, route }: Props) {
  const insets = useSafeAreaInsets();
  const { conversations, markConversationRead, sendMessage } = useCommunication();
  const conversation = conversations.find((item) => item.id === route.params.convId);
  const [text, setText] = useState('');
  const [feedback, setFeedback] = useState('');
  const listRef = useRef<FlatList<Message>>(null);
  const property = conversation ? getConversationProperty(conversation, properties) : undefined;

  useEffect(() => {
    if (conversation) markConversationRead(conversation.id);
  }, [conversation, markConversationRead]);

  if (!conversation) {
    return <View style={[styles.container, { paddingTop: insets.top }]}><View style={styles.topBar}><IconButton icon="arrow-back" label="Go back" onPress={() => navigation.goBack()} /><Text accessibilityRole="header" style={styles.missingTitle}>Conversation</Text><View style={styles.headerSpacer} /></View><EmptyState icon={<Ionicons name="chatbubble-ellipses-outline" size={48} color={Colors.slate500} />} title="Conversation unavailable" description="This conversation does not exist or is no longer available." actionLabel="Back to Messages" onAction={() => navigation.goBack()} /></View>;
  }

  const send = () => {
    const trimmed = text.trim();
    if (!trimmed) {
      setFeedback('Enter a message before sending.');
      return;
    }
    if (!sendMessage(conversation.id, trimmed)) return;
    setText('');
    setFeedback('Message saved for this session. External delivery is not connected.');
    requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: true }));
  };

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.topBar}>
          <IconButton icon="arrow-back" label="Back to messages" onPress={() => navigation.goBack()} />
          <View style={styles.topInfo}><View importantForAccessibility="no-hide-descendants" style={styles.topAvatar}><Text style={styles.topAvatarText}>{conversation.avatar}</Text></View><View style={styles.topCopy}><Text accessibilityRole="header" numberOfLines={1} style={styles.topName}>{conversation.manager}</Text><Text style={styles.localLabel}>On-device messages</Text></View></View>
          <View style={styles.headerSpacer} />
        </View>
        {property ? (
          <View style={styles.propertyRow}><Text numberOfLines={1} style={styles.propertyText}>{conversation.property}</Text><IconButton icon="chevron-forward" label={'Open ' + conversation.property + ' property details'} onPress={() => navigation.navigate('Property', { property })} iconSize={20} /></View>
        ) : <View style={styles.propertyRow}><Text style={styles.propertyUnavailable}>{conversation.property} · Property details unavailable</Text></View>}
        <FlatList
          ref={listRef}
          data={conversation.messages}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[styles.messageList, !conversation.messages.length && styles.emptyList]}
          ListEmptyComponent={<EmptyState title="No messages yet" description="Write a message below to start this conversation." />}
          keyboardShouldPersistTaps="handled"
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
          renderItem={({ item }) => <MessageBubble item={item} avatar={conversation.avatar} />}
        />
        {feedback ? <Text accessibilityRole="alert" accessibilityLiveRegion="polite" style={styles.feedback}>{feedback}</Text> : null}
        <View style={[styles.inputBar, { paddingBottom: insets.bottom + Spacing.sm }]}>
          <TextInput accessibilityLabel="Message" accessibilityHint="Messages stay in this app session and are not sent externally" style={styles.input} placeholder="Write a message…" placeholderTextColor={Colors.slate500} value={text} onChangeText={(value) => { setText(value); setFeedback(''); }} returnKeyType="send" multiline maxLength={1000} />
          <IconButton icon="send" label="Send message" hint="Saves this message locally; external delivery is not connected" onPress={send} disabled={!text.trim()} color={Colors.white} backgroundColor={Colors.blue} />
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

function MessageBubble({ item, avatar }: { item: Message; avatar: string }) {
  const isStudent = item.sender === 'student';
  return <View accessible accessibilityLabel={(isStudent ? 'You' : 'Property manager') + ' at ' + item.time + ': ' + item.text} style={[styles.bubbleWrapper, isStudent && styles.bubbleWrapperMe]}>{!isStudent ? <View importantForAccessibility="no-hide-descendants" style={styles.bubbleAvatar}><Text style={styles.bubbleAvatarText}>{avatar}</Text></View> : null}<View style={[styles.bubble, isStudent ? styles.bubbleMe : styles.bubbleThem]}><Text style={[styles.bubbleText, isStudent && styles.bubbleTextMe]}>{item.text}</Text><Text style={[styles.bubbleTime, isStudent && styles.bubbleTimeMe]}>{item.time}</Text></View></View>;
}

const styles = StyleSheet.create({
  flex: { flex: 1 }, container: { flex: 1, backgroundColor: Colors.background }, topBar: { minHeight: 64, flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.sm, backgroundColor: Colors.white, borderBottomWidth: 1, borderBottomColor: Colors.slate100 }, topInfo: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: Spacing.sm }, topCopy: { flex: 1, minWidth: 0 }, topAvatar: { width: 38, height: 38, borderRadius: 19, backgroundColor: Colors.blue, alignItems: 'center', justifyContent: 'center' }, topAvatarText: { color: Colors.white, fontSize: 13, fontFamily: Fonts.bodySemi }, topName: { fontSize: 15, fontFamily: Fonts.heading, color: TextColors.primary }, localLabel: { fontSize: 11, fontFamily: Fonts.body, color: TextColors.muted }, headerSpacer: { width: 44 }, missingTitle: { flex: 1, textAlign: 'center', fontSize: 16, fontFamily: Fonts.heading, color: TextColors.primary },
  propertyRow: { minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.xs, paddingLeft: Spacing.lg, paddingRight: Spacing.xs, backgroundColor: Colors.slate100 }, propertyText: { flexShrink: 1, fontSize: 12, fontFamily: Fonts.bodySemi, color: TextColors.link }, propertyUnavailable: { fontSize: 12, fontFamily: Fonts.body, color: TextColors.muted, textAlign: 'center' },
  messageList: { padding: Spacing.lg, gap: Spacing.md, paddingBottom: Spacing.lg }, emptyList: { flexGrow: 1 }, bubbleWrapper: { flexDirection: 'row', alignItems: 'flex-end', gap: Spacing.sm }, bubbleWrapperMe: { justifyContent: 'flex-end' }, bubbleAvatar: { width: 28, height: 28, borderRadius: 14, backgroundColor: Colors.blue, alignItems: 'center', justifyContent: 'center' }, bubbleAvatarText: { color: Colors.white, fontSize: 10, fontFamily: Fonts.bodySemi }, bubble: { maxWidth: '78%', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 18, gap: Spacing.xs }, bubbleMe: { backgroundColor: Colors.blue, borderBottomRightRadius: 4 }, bubbleThem: { backgroundColor: Colors.white, borderBottomLeftRadius: 4, borderWidth: 1, borderColor: Colors.slate100 }, bubbleText: { fontSize: 14, fontFamily: Fonts.body, color: TextColors.primary, lineHeight: 20 }, bubbleTextMe: { color: Colors.white }, bubbleTime: { fontSize: 10, fontFamily: Fonts.body, color: TextColors.muted }, bubbleTimeMe: { color: 'rgba(255,255,255,0.78)' },
  feedback: { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm, backgroundColor: Colors.blue50, color: TextColors.link, fontSize: 12, lineHeight: 17, fontFamily: Fonts.body }, inputBar: { flexDirection: 'row', alignItems: 'flex-end', gap: Spacing.sm, paddingHorizontal: Spacing.lg, paddingTop: Spacing.sm, backgroundColor: Colors.white, borderTopWidth: 1, borderTopColor: Colors.slate100 }, input: { flex: 1, minHeight: 44, maxHeight: 110, backgroundColor: Colors.slate100, borderRadius: Radius.lg, paddingHorizontal: 14, paddingVertical: 11, fontSize: 14, fontFamily: Fonts.body, color: TextColors.primary, textAlignVertical: 'top' },
});
