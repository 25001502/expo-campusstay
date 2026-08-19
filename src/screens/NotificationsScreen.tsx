import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../App';
import { Colors, Fonts, Radius } from '../theme';
import { notifications } from '../data';

type Props = NativeStackScreenProps<RootStackParamList, 'Notifications'>;

const typeConfig: Record<string, { icon: string; bg: string; color: string }> = {
  booking:     { icon: '✅', bg: Colors.green100,  color: Colors.green600 },
  payment:     { icon: '💳', bg: Colors.amber100,  color: Colors.amber600 },
  message:     { icon: '💬', bg: Colors.blue100,   color: Colors.blue },
  application: { icon: '🏠', bg: Colors.purple100, color: Colors.purple600 },
  system:      { icon: '🔔', bg: Colors.slate100,  color: Colors.slate500 },
};

export default function NotificationsScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Notifications</Text>
        <View style={{ width: 24 }} />
      </View>

      <FlatList
        data={notifications}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingBottom: 40 }}
        renderItem={({ item }) => {
          const { icon, bg, color } = typeConfig[item.type] ?? typeConfig.system;
          return (
            <View style={[styles.row, !item.read && styles.rowUnread]}>
              <View style={[styles.iconBox, { backgroundColor: bg }]}>
                <Text style={styles.icon}>{icon}</Text>
              </View>
              <View style={styles.content}>
                <Text style={styles.notifTitle}>{item.title}</Text>
                <Text style={styles.notifMsg}>{item.message}</Text>
                <Text style={styles.notifTime}>{item.time}</Text>
              </View>
              {!item.read && <View style={styles.unreadDot} />}
            </View>
          );
        }}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.white },
  topBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Colors.slate100 },
  backText: { fontSize: 22, color: Colors.slate600, width: 24 },
  title: { flex: 1, textAlign: 'center', fontSize: 16, fontFamily: Fonts.heading, color: Colors.slate900 },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingHorizontal: 20, paddingVertical: 16, backgroundColor: Colors.white },
  rowUnread: { backgroundColor: '#EFF6FF' },
  iconBox: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  icon: { fontSize: 20 },
  content: { flex: 1 },
  notifTitle: { fontSize: 14, fontFamily: Fonts.heading, color: Colors.slate900, marginBottom: 3 },
  notifMsg: { fontSize: 13, fontFamily: Fonts.body, color: Colors.slate600, lineHeight: 19 },
  notifTime: { fontSize: 11, fontFamily: Fonts.body, color: Colors.slate400, marginTop: 4 },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.blue, marginTop: 6 },
  separator: { height: 1, backgroundColor: Colors.slate100 },
});
