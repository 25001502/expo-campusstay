import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import {
  faCircleCheck,
  faCreditCard,
  faMessage,
  faHouse,
  faBell,
  faArrowLeft,
} from '@fortawesome/free-solid-svg-icons';

import { RootStackParamList } from '../../App';
import { Colors, Fonts } from '../theme';
import { notifications } from '../data';

type Props = NativeStackScreenProps<RootStackParamList, 'Notifications'>;

const typeConfig: Record<
  string,
  {
    icon: any;
    bg: string;
    color: string;
  }
> = {
  booking: {
    icon: faCircleCheck,
    bg: Colors.green100,
    color: Colors.green600,
  },

  payment: {
    icon: faCreditCard,
    bg: Colors.amber100,
    color: Colors.amber600,
  },

  message: {
    icon: faMessage,
    bg: Colors.blue100,
    color: Colors.blue,
  },

  application: {
    icon: faHouse,
    bg: Colors.purple100,
    color: Colors.purple600,
  },

  system: {
    icon: faBell,
    bg: Colors.slate100,
    color: Colors.slate500,
  },
};

export default function NotificationsScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>

      {/* Header */}
      <View style={styles.topBar}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
          activeOpacity={0.7}
        >
          <FontAwesomeIcon
            icon={faArrowLeft}
            size={18}
            color={Colors.slate600}
          />
        </TouchableOpacity>

        <Text style={styles.title}>Notifications</Text>

        {/* Keeps title centered */}
        <View style={styles.headerSpacer} />
      </View>

      {/* Notifications */}
      <FlatList
        data={notifications}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => {
          const {
            icon,
            bg,
            color,
          } = typeConfig[item.type] ?? typeConfig.system;

          return (
            <View
              style={[
                styles.row,
                !item.read && styles.rowUnread,
              ]}
            >
              {/* Notification Icon */}
              <View
                style={[
                  styles.iconBox,
                  { backgroundColor: bg },
                ]}
              >
                <FontAwesomeIcon
                  icon={icon}
                  size={20}
                  color={color}
                />
              </View>

              {/* Notification Content */}
              <View style={styles.content}>
                <Text style={styles.notifTitle}>
                  {item.title}
                </Text>

                <Text style={styles.notifMsg}>
                  {item.message}
                </Text>

                <Text style={styles.notifTime}>
                  {item.time}
                </Text>
              </View>

              {/* Unread Indicator */}
              {!item.read && (
                <View style={styles.unreadDot} />
              )}
            </View>
          );
        }}
        ItemSeparatorComponent={() => (
          <View style={styles.separator} />
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white,
  },

  /* Header */
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.slate100,
  },

  backButton: {
    width: 24,
    height: 24,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },

  headerSpacer: {
    width: 24,
  },

  title: {
    flex: 1,
    textAlign: 'center',
    fontSize: 16,
    fontFamily: Fonts.heading,
    color: Colors.slate900,
  },

  /* Notification List */
  listContent: {
    paddingBottom: 40,
  },

  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: Colors.white,
  },

  rowUnread: {
    backgroundColor: '#EFF6FF',
  },

  /* Icon */
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },

  /* Content */
  content: {
    flex: 1,
  },

  notifTitle: {
    fontSize: 14,
    fontFamily: Fonts.heading,
    color: Colors.slate900,
    marginBottom: 3,
  },

  notifMsg: {
    fontSize: 13,
    fontFamily: Fonts.body,
    color: Colors.slate600,
    lineHeight: 19,
  },

  notifTime: {
    fontSize: 11,
    fontFamily: Fonts.body,
    color: Colors.slate400,
    marginTop: 4,
  },

  /* Unread Indicator */
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.blue,
    marginTop: 6,
  },

  /* Separator */
  separator: {
    height: 1,
    backgroundColor: Colors.slate100,
  },
});