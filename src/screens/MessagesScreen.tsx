import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../App';
import { Colors, Fonts, Radius } from '../theme';
import { conversations } from '../data';

type Props = NativeStackScreenProps<RootStackParamList, 'Main'>;

export default function MessagesScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Messages</Text>
      </View>
      <FlatList
        data={conversations}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingBottom: 100 }}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.row}
            activeOpacity={0.7}
            onPress={() => (navigation as any).navigate('Chat', { convId: item.id })}
          >
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{item.avatar}</Text>
            </View>
            <View style={styles.info}>
              <View style={styles.infoTop}>
                <Text style={styles.managerName}>{item.manager}</Text>
                <Text style={styles.time}>{item.time}</Text>
              </View>
              <Text style={styles.propertyName}>{item.property}</Text>
              <Text style={styles.lastMsg} numberOfLines={1}>{item.lastMessage}</Text>
            </View>
            {item.unread > 0 && (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadText}>{item.unread}</Text>
              </View>
            )}
          </TouchableOpacity>
        )}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.white },
  header: { paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: Colors.slate100 },
  headerTitle: { fontSize: 24, fontFamily: Fonts.heading, color: Colors.slate900 },
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, gap: 12, backgroundColor: Colors.white },
  avatar: { width: 52, height: 52, borderRadius: 26, backgroundColor: Colors.blue, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: Colors.white, fontSize: 15, fontFamily: Fonts.bodySemi },
  info: { flex: 1 },
  infoTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 },
  managerName: { fontSize: 15, fontFamily: Fonts.heading, color: Colors.slate900 },
  time: { fontSize: 11, fontFamily: Fonts.body, color: Colors.slate400 },
  propertyName: { fontSize: 12, fontFamily: Fonts.body, color: Colors.slate400, marginBottom: 3 },
  lastMsg: { fontSize: 13, fontFamily: Fonts.body, color: Colors.slate600 },
  unreadBadge: { width: 22, height: 22, borderRadius: 11, backgroundColor: Colors.blue, alignItems: 'center', justifyContent: 'center' },
  unreadText: { color: Colors.white, fontSize: 11, fontFamily: Fonts.bodySemi },
  separator: { height: 1, backgroundColor: Colors.slate100 },
});
