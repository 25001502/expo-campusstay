import React from 'react';
import { FlatList, StyleSheet, Text, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useIsFocused } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getConversationPreview, getConversationProperty, getConversationUnreadCount, hasIllustrativeMessages } from '../communication';
import { EmptyState } from '../components/UI';
import { properties } from '../data';
import type { StudentTabScreenProps } from '../navigation/types';
import { useCommunication } from '../state/CommunicationContext';
import { Colors, Fonts, Spacing, TextColors } from '../theme';

type Props = StudentTabScreenProps<'Messages'>;

export default function MessagesScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const isFocused = useIsFocused();
  const { width, fontScale } = useWindowDimensions();
  const expanded = width < 360 || fontScale >= 1.3;
  const { conversations, markConversationRead } = useCommunication();
  const openConversation = (id: string) => {
    markConversationRead(id);
    navigation.navigate('Chat', { convId: id });
  };
  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingLeft: insets.left, paddingRight: insets.right }]}>
      {isFocused ? <StatusBar style="dark" /> : null}
      <FlatList
        data={conversations}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[styles.list, { paddingBottom: Math.max(insets.bottom, Spacing.xxl) }, !conversations.length && styles.emptyList]}
        ListHeaderComponent={<View style={styles.header}><Text accessibilityRole="header" style={styles.headerTitle}>Messages</Text><Text style={styles.headerSubtitle}>{conversations.some(hasIllustrativeMessages) ? 'Illustrative conversations · Your messages stay in this session' : 'Your messages stay in this session'}</Text></View>}
        ListEmptyComponent={<EmptyState style={styles.emptyState} icon={<Ionicons name="chatbubbles-outline" size={48} color={Colors.slate500} />} title="No conversations" description="Explore accommodation to find property information." actionLabel="Explore Accommodation" onAction={() => navigation.navigate('Explore')} />}
        renderItem={({ item }) => {
          const preview = getConversationPreview(item);
          const unread = getConversationUnreadCount(item);
          const propertyName = getConversationProperty(item, properties)?.name ?? item.property;
          return (
            <TouchableOpacity accessibilityRole="button" accessibilityLabel={`${item.manager}, ${propertyName}, ${unread ? `${unread} unread messages` : 'read'}, ${hasIllustrativeMessages(item) ? 'illustrative conversation, ' : ''}latest message${preview.isExample ? ' (illustrative)' : item.messages.length ? ' (saved locally)' : ''}: ${preview.text}${preview.time ? `, ${preview.time}` : ''}`} accessibilityHint="Opens this conversation" style={styles.row} activeOpacity={0.7} onPress={() => openConversation(item.id)}>
              <View importantForAccessibility="no-hide-descendants" style={styles.avatar}><Text maxFontSizeMultiplier={1.3} style={styles.avatarText}>{item.avatar}</Text></View>
              <View style={styles.info}>
                <View style={[styles.infoTop, expanded && styles.infoTopExpanded]}>
                  <Text style={styles.managerName}>{item.manager}</Text>
                  {preview.time ? <Text style={styles.time}>{preview.time}</Text> : null}
                </View>
                <Text style={styles.propertyName}>{propertyName}</Text>
                <Text style={[styles.lastMessage, unread > 0 && styles.lastMessageUnread]} numberOfLines={expanded ? undefined : 2}>{preview.text}</Text>
                {!preview.isExample && item.messages.length ? <Text style={styles.time}>Saved locally</Text> : null}
              </View>
              {unread > 0 ? <View importantForAccessibility="no-hide-descendants" style={styles.unreadBadge}><Text style={styles.unreadText}>{unread}</Text></View> : null}
            </TouchableOpacity>
          );
        }}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.white },
  header: { paddingHorizontal: Spacing.xl, paddingTop: Spacing.lg, paddingBottom: Spacing.xl, borderBottomWidth: 1, borderBottomColor: Colors.slate100 },
  headerTitle: { fontSize: 24, lineHeight: 31, letterSpacing: -0.4, fontFamily: Fonts.heading, color: TextColors.primary },
  headerSubtitle: { marginTop: Spacing.xs, fontSize: 13, lineHeight: 19, fontFamily: Fonts.body, color: TextColors.muted },
  list: { paddingBottom: Spacing.xxl },
  emptyList: { flexGrow: 1 },
  emptyState: { flexGrow: 1, width: '100%', maxWidth: 440, alignSelf: 'center' },
  row: { minHeight: 96, flexDirection: 'row', alignItems: 'flex-start', paddingHorizontal: Spacing.xl, paddingVertical: Spacing.xl, gap: Spacing.md, backgroundColor: Colors.white },
  avatar: { width: 52, height: 52, borderRadius: 26, backgroundColor: Colors.blue, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: Colors.white, fontSize: 15, lineHeight: 21, fontFamily: Fonts.bodySemi },
  info: { flex: 1, minWidth: 0, gap: Spacing.xs },
  infoTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: Spacing.sm },
  infoTopExpanded: { flexDirection: 'column', alignItems: 'flex-start', gap: Spacing.xxs },
  managerName: { flexShrink: 1, fontSize: 15, lineHeight: 21, fontFamily: Fonts.heading, color: TextColors.primary },
  time: { flexShrink: 0, fontSize: 11, lineHeight: 17, fontFamily: Fonts.body, color: TextColors.muted },
  propertyName: { fontSize: 12, lineHeight: 18, fontFamily: Fonts.bodyMed, color: TextColors.muted },
  lastMessage: { fontSize: 13, lineHeight: 19, fontFamily: Fonts.body, color: TextColors.secondary },
  lastMessageUnread: { fontFamily: Fonts.bodySemi, color: TextColors.primary },
  unreadBadge: { minWidth: 24, minHeight: 24, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 12, backgroundColor: Colors.blue, alignItems: 'center', justifyContent: 'center' },
  unreadText: { color: Colors.white, fontSize: 11, lineHeight: 16, fontFamily: Fonts.bodySemi },
  separator: { height: 1, backgroundColor: Colors.slate100, marginLeft: 84, marginRight: Spacing.xl },
});
