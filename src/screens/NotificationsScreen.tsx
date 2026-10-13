import React from 'react';
import { Alert, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faBell, faCircleCheck, faCreditCard, faHouse, faMessage } from '@fortawesome/free-solid-svg-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getNotificationConversationId } from '../communication';
import { EmptyState, IconButton, ScreenHeader } from '../components/UI';
import type { AppNotification } from '../data';
import type { RootStackParamList } from '../navigation/types';
import { useCommunication } from '../state/CommunicationContext';
import { Colors, Fonts, Spacing, TextColors } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Notifications'>;
const typeConfig = {
  booking: { icon: faCircleCheck, bg: Colors.green100, color: Colors.green600, label: 'Booking' },
  payment: { icon: faCreditCard, bg: Colors.amber100, color: Colors.amber600, label: 'Payment' },
  message: { icon: faMessage, bg: Colors.blue100, color: Colors.blue, label: 'Message' },
  application: { icon: faHouse, bg: Colors.purple100, color: Colors.purple600, label: 'Application' },
  system: { icon: faBell, bg: Colors.slate100, color: Colors.slate600, label: 'System' },
} as const;

export default function NotificationsScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { notifications, unreadNotificationCount, markNotificationRead, markAllNotificationsRead } = useCommunication();
  const openNotification = (item: AppNotification) => {
    markNotificationRead(item.id);
    const conversationId = getNotificationConversationId(item.id);
    if (conversationId) navigation.navigate('Chat', { convId: conversationId });
    else Alert.alert('No destination available', 'This notification has no connected destination or external action.');
  };
  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScreenHeader title="Notifications" subtitle={unreadNotificationCount ? unreadNotificationCount + ' unread notifications' : 'All notifications read'} onBack={() => navigation.goBack()} trailingAction={<IconButton icon="checkmark-done" label="Mark all notifications as read" disabled={!unreadNotificationCount} onPress={markAllNotificationsRead} />} />
      <View style={styles.localBanner}><Text style={styles.localBannerText}>Notification activity is stored for this session. External delivery is not connected.</Text></View>
      <FlatList
        data={notifications}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[styles.list, !notifications.length && styles.emptyList]}
        ListEmptyComponent={<EmptyState icon={<FontAwesomeIcon icon={faBell} size={42} color={Colors.slate500} />} title="No notifications" description="Notifications will appear here." />}
        renderItem={({ item }) => {
          const config = typeConfig[item.type] ?? typeConfig.system;
          return <TouchableOpacity accessibilityRole="button" accessibilityLabel={(item.read ? 'Read' : 'Unread') + ' ' + config.label + ': ' + item.title + '. ' + item.message + '. ' + item.time} accessibilityHint="Marks this item read and opens its destination when available" onPress={() => openNotification(item)} style={[styles.row, !item.read && styles.rowUnread]}>
            <View importantForAccessibility="no-hide-descendants" style={[styles.iconBox, { backgroundColor: config.bg }]}><FontAwesomeIcon icon={config.icon} size={20} color={config.color} /></View>
            <View style={styles.content}><Text style={styles.typeLabel}>{config.label}</Text><Text style={styles.title}>{item.title}</Text><Text style={styles.message}>{item.message}</Text><Text style={styles.time}>{item.time}</Text></View>
            {!item.read ? <View importantForAccessibility="no-hide-descendants" style={styles.unreadDot} /> : null}
          </TouchableOpacity>;
        }}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.white }, localBanner: { paddingHorizontal: Spacing.xl, paddingVertical: Spacing.md, backgroundColor: Colors.amber100 }, localBannerText: { fontSize: 12, lineHeight: 18, fontFamily: Fonts.body, color: '#78350F' }, list: { paddingBottom: 40 }, emptyList: { flexGrow: 1 },
  row: { minHeight: 104, flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.md, paddingHorizontal: Spacing.xl, paddingVertical: Spacing.lg, backgroundColor: Colors.white }, rowUnread: { backgroundColor: Colors.blue50 }, iconBox: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' }, content: { flex: 1, minWidth: 0 }, typeLabel: { fontSize: 10, lineHeight: 15, fontFamily: Fonts.bodySemi, color: TextColors.muted, textTransform: 'uppercase' }, title: { fontSize: 14, lineHeight: 20, fontFamily: Fonts.heading, color: TextColors.primary, marginTop: 2 }, message: { fontSize: 13, fontFamily: Fonts.body, color: TextColors.secondary, lineHeight: 19 }, time: { fontSize: 11, fontFamily: Fonts.body, color: TextColors.muted, marginTop: Spacing.xs }, unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.blue, marginTop: 6 }, separator: { height: 1, backgroundColor: Colors.slate100 },
});
