import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../App';
import { Colors, Fonts, Radius } from '../theme';
import { conversations, Message } from '../data';

type Props = NativeStackScreenProps<RootStackParamList, 'Chat'>;

export default function ChatScreen({ navigation, route }: Props) {
  const { convId } = route.params;
  const insets = useSafeAreaInsets();
  const conv = conversations.find((c) => c.id === convId) ?? conversations[0];
  const [messages, setMessages] = useState<Message[]>(conv.messages);
  const [text, setText] = useState('');
  const listRef = useRef<FlatList>(null);

  const send = () => {
    if (!text.trim()) return;
    setMessages((prev) => [
      ...prev,
      { id: `m${Date.now()}`, sender: 'student', text: text.trim(), time: 'Now' },
    ]);
    setText('');
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 50);
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={0}
    >
      <View style={[styles.container, { paddingTop: insets.top }]}>
        {/* Top bar */}
        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.backText}>←</Text>
          </TouchableOpacity>
          <View style={styles.topInfo}>
            <View style={styles.topAvatar}>
              <Text style={styles.topAvatarText}>{conv.avatar}</Text>
            </View>
            <View>
              <Text style={styles.topName}>{conv.manager}</Text>
              <View style={styles.onlineRow}>
                <View style={styles.onlineDot} />
                <Text style={styles.onlineText}>Online</Text>
              </View>
            </View>
          </View>
          <View style={{ width: 24 }} />
        </View>

        <View style={styles.propLabel}>
          <Text style={styles.propLabelText}>{conv.property}</Text>
        </View>

        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.messageList}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
          renderItem={({ item }) => {
            const isMe = item.sender === 'student';
            return (
              <View style={[styles.bubbleWrapper, isMe && styles.bubbleWrapperMe]}>
                {!isMe && (
                  <View style={styles.bubbleAvatar}>
                    <Text style={styles.bubbleAvatarText}>{conv.avatar}</Text>
                  </View>
                )}
                <View style={[styles.bubble, isMe ? styles.bubbleMe : styles.bubbleThem]}>
                  <Text style={[styles.bubbleText, isMe && styles.bubbleTextMe]}>{item.text}</Text>
                  <Text style={[styles.bubbleTime, isMe && styles.bubbleTimeMe]}>{item.time}</Text>
                </View>
              </View>
            );
          }}
        />

        {/* Input bar */}
        <View style={[styles.inputBar, { paddingBottom: insets.bottom + 8 }]}>
          <TextInput
            style={styles.input}
            placeholder="Type a message..."
            placeholderTextColor={Colors.slate400}
            value={text}
            onChangeText={setText}
            onSubmitEditing={send}
            returnKeyType="send"
            multiline
          />
          <TouchableOpacity style={styles.sendBtn} onPress={send} activeOpacity={0.8}>
            <Text style={styles.sendIcon}>➤</Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.slate100,
  },
  backText: { fontSize: 22, color: Colors.slate600, width: 24 },
  topInfo: { flex: 1, flexDirection: "row", alignItems: "center", gap: 10 },
  topAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Colors.blue,
    alignItems: "center",
    justifyContent: "center",
  },
  topAvatarText: {
    color: Colors.white,
    fontSize: 13,
    fontFamily: Fonts.bodySemi,
  },
  topName: { fontSize: 15, fontFamily: Fonts.heading, color: Colors.slate900 },
  onlineRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 1,
  },
  onlineDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: Colors.green600,
  },
  onlineText: { fontSize: 11, fontFamily: Fonts.body, color: Colors.green600 },
  propLabel: {
    alignSelf: "center",
    backgroundColor: Colors.slate100,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: Radius.full,
    marginVertical: 10,
  },
  propLabelText: {
    fontSize: 12,
    fontFamily: Fonts.body,
    color: Colors.slate500,
  },
  messageList: { paddingHorizontal: 16, gap: 12, paddingBottom: 16 },
  bubbleWrapper: { flexDirection: "row", alignItems: "flex-end", gap: 8 },
  bubbleWrapperMe: { justifyContent: "flex-end" },
  bubbleAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.blue,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  bubbleAvatarText: {
    color: Colors.white,
    fontSize: 10,
    fontFamily: Fonts.bodySemi,
  },
  bubble: {
    maxWidth: "75%",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
    gap: 4,
  },
  bubbleMe: { backgroundColor: Colors.blue, borderBottomRightRadius: 4 },
  bubbleThem: {
    backgroundColor: Colors.white,
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: Colors.slate100,
  },
  bubbleText: {
    fontSize: 14,
    fontFamily: Fonts.body,
    color: Colors.slate800,
    lineHeight: 20,
  },
  bubbleTextMe: { color: Colors.white },
  bubbleTime: { fontSize: 10, fontFamily: Fonts.body, color: Colors.slate400 },
  bubbleTimeMe: { color: "rgba(255,255,255,0.65)" },
  inputBar: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 10,
    backgroundColor: Colors.white,
    borderTopWidth: 1,
    borderTopColor: Colors.slate100,
  },
  input: {
    flex: 1,
    backgroundColor: Colors.slate100,
    borderRadius: Radius.lg,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    fontFamily: Fonts.body,
    color: Colors.slate800,
    maxHeight: 100,
  },
  sendBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: Colors.blue,
    alignItems: "center",
    justifyContent: "center",
  },
  sendIcon: { color: Colors.white, fontSize: 16 },
});
