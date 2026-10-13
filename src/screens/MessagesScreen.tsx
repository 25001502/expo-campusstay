import React from 'react';
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { EmptyState } from '../components/UI';
import type { StudentTabScreenProps } from '../navigation/types';
import { useCommunication } from '../state/CommunicationContext';
import { Colors, Fonts, Spacing, TextColors } from '../theme';

type Props = StudentTabScreenProps<'Messages'>;

export default function MessagesScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { conversations, markConversationRead } = useCommunication();
  const openConversation = (id: string) => {
    markConversationRead(id);
    navigation.navigate('Chat', { convId: id });
  };
  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar style="dark" />
      <View style={styles.header}><Text accessibilityRole="header" style={styles.headerTitle}>Messages</Text><Text style={styles.headerSubtitle}>Messages are stored on-device for this session. External delivery is not connected.</Text></View>
      <FlatList
        data={conversations}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[styles.list, !conversations.length && styles.emptyList]}
        ListEmptyComponent={<EmptyState icon={<Ionicons name="chatbubbles-outline" size={48} color={Colors.slate500} />} title="No conversations" description="Your conversations will appear here." />}
        renderItem={({ item }) => (
          <TouchableOpacity accessibilityRole="button" accessibilityLabel={item.manager + ', ' + item.property + ', ' + (item.unread ? item.unread + ' unread messages' : 'read') + ', latest message: ' + item.lastMessage} accessibilityHint="Opens this conversation" style={styles.row} activeOpacity={0.7} onPress={() => openConversation(item.id)}>
            <View importantForAccessibility="no-hide-descendants" style={styles.avatar}><Text style={styles.avatarText}>{item.avatar}</Text></View>
            <View style={styles.info}><View style={styles.infoTop}><Text numberOfLines={1} style={styles.managerName}>{item.manager}</Text><Text style={styles.time}>{item.time}</Text></View><Text numberOfLines={1} style={styles.propertyName}>{item.property}</Text><Text style={[styles.lastMessage, item.unread > 0 && styles.lastMessageUnread]} numberOfLines={2}>{item.lastMessage}</Text></View>
            {item.unread > 0 ? <View accessibilityElementsHidden style={styles.unreadBadge}><Text style={styles.unreadText}>{item.unread}</Text></View> : null}
          </TouchableOpacity>
        )}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.white }, header: { paddingHorizontal: Spacing.xl, paddingVertical: Spacing.lg, borderBottomWidth: 1, borderBottomColor: Colors.slate100 }, headerTitle: { fontSize: 24, fontFamily: Fonts.heading, color: TextColors.primary }, headerSubtitle: { marginTop: Spacing.xs, fontSize: 12, lineHeight: 18, fontFamily: Fonts.body, color: TextColors.muted },
  list: { paddingBottom: 100 }, emptyList: { flexGrow: 1 }, row: { minHeight: 88, flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.xl, paddingVertical: Spacing.lg, gap: Spacing.md, backgroundColor: Colors.white }, avatar: { width: 52, height: 52, borderRadius: 26, backgroundColor: Colors.blue, alignItems: 'center', justifyContent: 'center' }, avatarText: { color: Colors.white, fontSize: 15, fontFamily: Fonts.bodySemi }, info: { flex: 1, minWidth: 0 }, infoTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: Spacing.sm, marginBottom: 2 }, managerName: { flex: 1, fontSize: 15, fontFamily: Fonts.heading, color: TextColors.primary }, time: { fontSize: 11, fontFamily: Fonts.body, color: TextColors.muted }, propertyName: { fontSize: 12, fontFamily: Fonts.body, color: TextColors.muted, marginBottom: 3 }, lastMessage: { fontSize: 13, lineHeight: 18, fontFamily: Fonts.body, color: TextColors.secondary }, lastMessageUnread: { fontFamily: Fonts.bodySemi, color: TextColors.primary }, unreadBadge: { minWidth: 24, height: 24, paddingHorizontal: 6, borderRadius: 12, backgroundColor: Colors.blue, alignItems: 'center', justifyContent: 'center' }, unreadText: { color: Colors.white, fontSize: 11, fontFamily: Fonts.bodySemi }, separator: { height: 1, backgroundColor: Colors.slate100, marginLeft: 84 },
});
