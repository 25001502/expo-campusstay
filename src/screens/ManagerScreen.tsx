import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, FlatList, Dimensions } from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../App';
import { Colors, Fonts, Radius, Shadow } from '../theme';
import { Badge, Btn } from '../components/UI';
import { properties } from '../data';

type Props = NativeStackScreenProps<RootStackParamList, 'Manager'>;
type MgrPage = 'dashboard' | 'properties' | 'applications' | 'tenants' | 'analytics';

const apps = [
  { id: 1, student: 'Thabo Sithole', property: 'Campus View Residence', room: 'Private Room', submitted: '2 days ago', docs: '4/4', status: 'Pending' },
  { id: 2, student: 'Naledi Mokoena', property: 'Campus View Residence', room: 'Shared Room', submitted: '1 day ago', docs: '3/4', status: 'Under Review' },
  { id: 3, student: 'Keanu Williams', property: 'Varsity Heights', room: 'Studio', submitted: '5 days ago', docs: '4/4', status: 'Approved' },
  { id: 4, student: 'Amara Osei', property: 'Varsity Heights', room: 'Private Room', submitted: '1 week ago', docs: '2/4', status: 'Rejected' },
];

const stats = [
  { label: 'Total Properties', value: '5', icon: '🏢', bg: Colors.blue100 },
  { label: 'Total Rooms', value: '42', icon: '🚪', bg: Colors.purple100 },
  { label: 'Occupied', value: '35', icon: '✅', bg: Colors.green100 },
  { label: 'Pending Apps', value: '8', icon: '🔔', bg: Colors.amber100 },
  { label: 'Available Rooms', value: '7', icon: '🏠', bg: '#CCFBF1' },
  { label: 'Monthly Revenue', value: 'R142,500', icon: '📈', bg: Colors.emerald100 },
];

const occupancy = [72, 81, 88, 92, 95, 83];
const months = ['Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan'];

const statusVariant: Record<string, 'green' | 'amber' | 'red' | 'blue'> = {
  Approved: 'green',
  Pending: 'amber',
  Rejected: 'red',
  'Under Review': 'blue',
};

const navItems: { key: MgrPage; label: string; icon: string }[] = [
  { key: 'dashboard', label: 'Dashboard', icon: '🏠' },
  { key: 'properties', label: 'Properties', icon: '🏢' },
  { key: 'applications', label: 'Applications', icon: '📋' },
  { key: 'tenants', label: 'Tenants', icon: '👥' },
  { key: 'analytics', label: 'Analytics', icon: '📈' },
];

export default function ManagerScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const [page, setPage] = useState<MgrPage>('dashboard');
  const [selectedApp, setSelectedApp] = useState<number | null>(null);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Top bar */}
      <View style={styles.topBar}>
        <View style={styles.brand}>
          <View style={styles.brandIcon}>
            <Text style={styles.brandIconText}>🏠</Text>
          </View>
          <Text style={styles.brandName}>Manager Portal</Text>
        </View>
        <View style={styles.mgAvatar}>
          <Text style={styles.mgAvatarText}>TM</Text>
        </View>
      </View>

      {/* Page content */}
      <ScrollView style={styles.content} contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 100 }} showsVerticalScrollIndicator={false}>

        {page === 'dashboard' && (
          <>
            <Text style={styles.pageTitle}>Dashboard</Text>
            <View style={styles.statsGrid}>
              {stats.map((s) => (
                <View key={s.label} style={styles.statCard}>
                  <View style={[styles.statIcon, { backgroundColor: s.bg }]}>
                    <Text style={styles.statIconText}>{s.icon}</Text>
                  </View>
                  <Text style={styles.statVal}>{s.value}</Text>
                  <Text style={styles.statLabel}>{s.label}</Text>
                </View>
              ))}
            </View>

            {/* Occupancy chart */}
            <View style={styles.chartCard}>
              <Text style={styles.chartTitle}>Occupancy Rate</Text>
              <View style={styles.chartBars}>
                {occupancy.map((pct, i) => (
                  <View key={i} style={styles.chartBarCol}>
                    <Text style={styles.chartPct}>{pct}%</Text>
                    <View style={styles.chartBarTrack}>
                      <View style={[styles.chartBarFill, { height: `${pct}%` }]} />
                    </View>
                    <Text style={styles.chartMonth}>{months[i]}</Text>
                  </View>
                ))}
              </View>
            </View>

            {/* Recent applications */}
            <View style={styles.sectionCard}>
              <View style={styles.sectionCardHeader}>
                <Text style={styles.sectionCardTitle}>Recent Applications</Text>
                <TouchableOpacity onPress={() => setPage('applications')}>
                  <Text style={styles.sectionCardLink}>View all</Text>
                </TouchableOpacity>
              </View>
              {apps.slice(0, 3).map((a) => (
                <View key={a.id} style={styles.appRow}>
                  <View style={styles.appAvatar}>
                    <Text style={styles.appAvatarText}>{a.student.split(' ').map(n => n[0]).join('')}</Text>
                  </View>
                  <View style={styles.appInfo}>
                    <Text style={styles.appStudent}>{a.student}</Text>
                    <Text style={styles.appProp}>{a.property}</Text>
                  </View>
                  <Badge label={a.status} variant={statusVariant[a.status] ?? 'gray'} />
                </View>
              ))}
            </View>
          </>
        )}

        {page === 'properties' && (
          <>
            <View style={styles.pageHeader}>
              <Text style={styles.pageTitle}>Properties</Text>
              <Btn style={styles.addBtn}>+ Add Property</Btn>
            </View>
            {properties.slice(0, 3).map((p) => (
              <View key={p.id} style={styles.propCard}>
                <Image source={{ uri: p.images[0] }} style={styles.propCardImage} contentFit="cover" />
                <View style={styles.propCardInfo}>
                  <Text style={styles.propCardName} numberOfLines={1}>{p.name}</Text>
                  <Text style={styles.propCardCity}>{p.city} · {p.rooms.length} room types</Text>
                  <View style={styles.propCardBadges}>
                    <Badge label={`${p.available} available`} variant="green" />
                    <Badge label={p.type} variant="gray" />
                  </View>
                  <Text style={styles.propCardPrice}>From R{p.price.toLocaleString()}/mo</Text>
                </View>
              </View>
            ))}
          </>
        )}

        {page === 'applications' && (
          <>
            <Text style={styles.pageTitle}>Applications</Text>
            {selectedApp !== null ? (
              <View style={styles.appDetail}>
                <TouchableOpacity onPress={() => setSelectedApp(null)} style={styles.backToList}>
                  <Text style={styles.backToListText}>← Back to applications</Text>
                </TouchableOpacity>
                {(() => {
                  const a = apps.find((x) => x.id === selectedApp)!;
                  return (
                    <View style={styles.appDetailCard}>
                      <View style={styles.appDetailHeader}>
                        <Text style={styles.appDetailName}>{a.student}</Text>
                        <Badge label={a.status} variant={statusVariant[a.status] ?? 'gray'} />
                      </View>
                      {[['Property', a.property], ['Room', a.room], ['Submitted', a.submitted], ['Documents', a.docs]].map(([k, v]) => (
                        <View key={k} style={styles.appDetailRow}>
                          <Text style={styles.appDetailLabel}>{k}</Text>
                          <Text style={styles.appDetailVal}>{v}</Text>
                        </View>
                      ))}
                      {(a.status === 'Pending' || a.status === 'Under Review') && (
                        <View style={styles.appDetailActions}>
                          <Btn variant="danger" style={{ flex: 1 }}>Reject</Btn>
                          <Btn style={{ flex: 1 }}>Approve</Btn>
                        </View>
                      )}
                    </View>
                  );
                })()}
              </View>
            ) : (
              apps.map((a) => (
                <View key={a.id} style={styles.appCard}>
                  <View style={styles.appCardTop}>
                    <View style={styles.appCardInfo}>
                      <Text style={styles.appCardStudent}>{a.student}</Text>
                      <Text style={styles.appCardProp}>{a.property} · {a.room}</Text>
                      <Text style={styles.appCardMeta}>Docs: {a.docs} · {a.submitted}</Text>
                    </View>
                    <Badge label={a.status} variant={statusVariant[a.status] ?? 'gray'} />
                  </View>
                  <View style={styles.appCardActions}>
                    <Btn variant="secondary" onPress={() => setSelectedApp(a.id)} style={styles.appCardBtn}>View</Btn>
                    {(a.status === 'Pending' || a.status === 'Under Review') && (
                      <Btn style={styles.appCardBtn}>Approve</Btn>
                    )}
                  </View>
                </View>
              ))
            )}
          </>
        )}

        {page === 'tenants' && (
          <>
            <Text style={styles.pageTitle}>Tenants</Text>
            {[
              { name: 'Luvuyo Mthembu', property: 'Campus View Residence', room: 'Private', rent: 3500, since: 'Feb 2024' },
              { name: 'Farai Ncube', property: 'Campus View Residence', room: 'Shared', rent: 2200, since: 'Jan 2024' },
              { name: 'Keanu Williams', property: 'Varsity Heights', room: 'Studio', rent: 5200, since: 'Mar 2024' },
            ].map((t) => (
              <View key={t.name} style={styles.tenantCard}>
                <View style={styles.tenantAvatar}>
                  <Text style={styles.tenantAvatarText}>{t.name.split(' ').map(n => n[0]).join('')}</Text>
                </View>
                <View style={styles.tenantInfo}>
                  <Text style={styles.tenantName}>{t.name}</Text>
                  <Text style={styles.tenantMeta}>{t.property} · {t.room} · since {t.since}</Text>
                </View>
                <View style={styles.tenantRent}>
                  <Text style={styles.tenantRentVal}>R{t.rent.toLocaleString()}</Text>
                  <Text style={styles.tenantRentSub}>/mo</Text>
                </View>
              </View>
            ))}
          </>
        )}

        {page === 'analytics' && (
          <>
            <Text style={styles.pageTitle}>Analytics</Text>
            <View style={styles.revenueCard}>
              <Text style={styles.revenueLabel}>Monthly Revenue</Text>
              <Text style={styles.revenueVal}>R142,500</Text>
              <View style={styles.revenueBars}>
                {[85000, 92000, 105000, 120000, 132000, 142500].map((v, i) => (
                  <View key={i} style={[styles.revenueBar, { height: `${(v / 142500) * 100}%` }]} />
                ))}
              </View>
              <View style={styles.revenueMonths}>
                {['Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan'].map((m) => (
                  <Text key={m} style={styles.revenueMonth}>{m}</Text>
                ))}
              </View>
            </View>
            <View style={styles.metricsGrid}>
              {[
                { label: 'Avg. Occupancy', value: '83%', delta: '+5%' },
                { label: 'New Applications', value: '24', delta: '+8' },
                { label: 'Avg. Response', value: '1.2h', delta: '-0.3h' },
                { label: 'Satisfaction', value: '4.7★', delta: '+0.2' },
              ].map((m) => (
                <View key={m.label} style={styles.metricCard}>
                  <Text style={styles.metricLabel}>{m.label}</Text>
                  <Text style={styles.metricVal}>{m.value}</Text>
                  <Text style={styles.metricDelta}>{m.delta} this month</Text>
                </View>
              ))}
            </View>
          </>
        )}
      </ScrollView>

      {/* Bottom nav */}
      <View style={[styles.bottomNav, { paddingBottom: insets.bottom + 4 }]}>
        {navItems.map(({ key, label, icon }) => (
          <TouchableOpacity key={key} style={styles.navItem} onPress={() => setPage(key)} activeOpacity={0.7}>
            <Text style={styles.navIcon}>{icon}</Text>
            <Text style={[styles.navLabel, page === key && styles.navLabelActive]}>{label}</Text>
            {page === key && <View style={styles.navDot} />}
          </TouchableOpacity>
        ))}
        <TouchableOpacity style={styles.navItem} onPress={() => (navigation as any).replace('Login')} activeOpacity={0.7}>
          <Text style={styles.navIcon}>🔒</Text>
          <Text style={styles.navLabel}>Exit</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: Colors.navy, paddingHorizontal: 16, paddingVertical: 12 },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  brandIcon: { width: 32, height: 32, borderRadius: 8, backgroundColor: Colors.blue, alignItems: 'center', justifyContent: 'center' },
  brandIconText: { fontSize: 16 },
  brandName: { color: Colors.white, fontSize: 16, fontFamily: Fonts.heading },
  mgAvatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.blue, alignItems: 'center', justifyContent: 'center' },
  mgAvatarText: { color: Colors.white, fontSize: 12, fontFamily: Fonts.bodySemi },
  content: { flex: 1 },
  pageTitle: { fontSize: 22, fontFamily: Fonts.heading, color: Colors.slate900 },
  pageHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  addBtn: { paddingVertical: 8, paddingHorizontal: 14 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  statCard: { width: (width - 52) / 2, backgroundColor: Colors.white, borderRadius: Radius.xl, padding: 16, ...Shadow.sm, gap: 6 },
  statIcon: { width: 40, height: 40, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center' },
  statIconText: { fontSize: 20 },
  statVal: { fontSize: 22, fontFamily: Fonts.heading, color: Colors.slate900 },
  statLabel: { fontSize: 12, fontFamily: Fonts.body, color: Colors.slate400 },
  chartCard: { backgroundColor: Colors.white, borderRadius: Radius.xl, padding: 16, ...Shadow.sm },
  chartTitle: { fontSize: 16, fontFamily: Fonts.heading, color: Colors.slate900, marginBottom: 14 },
  chartBars: { flexDirection: 'row', alignItems: 'flex-end', height: 110, gap: 6 },
  chartBarCol: { flex: 1, alignItems: 'center', gap: 4, height: '100%', justifyContent: 'flex-end' },
  chartPct: { fontSize: 9, fontFamily: Fonts.bodySemi, color: Colors.blue },
  chartBarTrack: { width: '100%', flex: 1, backgroundColor: Colors.blue100, borderRadius: 4, overflow: 'hidden', justifyContent: 'flex-end' },
  chartBarFill: { width: '100%', backgroundColor: Colors.blue, borderRadius: 4 },
  chartMonth: { fontSize: 9, fontFamily: Fonts.body, color: Colors.slate400 },
  sectionCard: { backgroundColor: Colors.white, borderRadius: Radius.xl, padding: 16, ...Shadow.sm, gap: 12 },
  sectionCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionCardTitle: { fontSize: 16, fontFamily: Fonts.heading, color: Colors.slate900 },
  sectionCardLink: { fontSize: 13, fontFamily: Fonts.bodyMed, color: Colors.blue },
  appRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6 },
  appAvatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.slate200, alignItems: 'center', justifyContent: 'center' },
  appAvatarText: { fontSize: 12, fontFamily: Fonts.bodySemi, color: Colors.slate600 },
  appInfo: { flex: 1 },
  appStudent: { fontSize: 13, fontFamily: Fonts.heading, color: Colors.slate900 },
  appProp: { fontSize: 11, fontFamily: Fonts.body, color: Colors.slate400 },
  propCard: { flexDirection: 'row', gap: 12, backgroundColor: Colors.white, borderRadius: Radius.xl, overflow: 'hidden', ...Shadow.sm },
  propCardImage: { width: 90, height: 90 },
  propCardInfo: { flex: 1, padding: 12, gap: 4 },
  propCardName: { fontSize: 14, fontFamily: Fonts.heading, color: Colors.slate900 },
  propCardCity: { fontSize: 12, fontFamily: Fonts.body, color: Colors.slate500 },
  propCardBadges: { flexDirection: 'row', gap: 6 },
  propCardPrice: { fontSize: 13, fontFamily: Fonts.bodySemi, color: Colors.slate800 },
  appCard: { backgroundColor: Colors.white, borderRadius: Radius.xl, padding: 14, ...Shadow.sm, gap: 10 },
  appCardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  appCardInfo: { flex: 1, gap: 2 },
  appCardStudent: { fontSize: 14, fontFamily: Fonts.heading, color: Colors.slate900 },
  appCardProp: { fontSize: 12, fontFamily: Fonts.body, color: Colors.slate500 },
  appCardMeta: { fontSize: 11, fontFamily: Fonts.body, color: Colors.slate400 },
  appCardActions: { flexDirection: 'row', gap: 8 },
  appCardBtn: { flex: 1, paddingVertical: 8 },
  appDetail: { gap: 12 },
  backToList: {},
  backToListText: { color: Colors.blue, fontSize: 14, fontFamily: Fonts.bodyMed },
  appDetailCard: { backgroundColor: Colors.white, borderRadius: Radius.xl, padding: 20, ...Shadow.sm, gap: 12 },
  appDetailHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  appDetailName: { fontSize: 18, fontFamily: Fonts.heading, color: Colors.slate900 },
  appDetailRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: Colors.slate100 },
  appDetailLabel: { fontSize: 13, fontFamily: Fonts.body, color: Colors.slate500 },
  appDetailVal: { fontSize: 13, fontFamily: Fonts.bodySemi, color: Colors.slate900 },
  appDetailActions: { flexDirection: 'row', gap: 12, marginTop: 4 },
  tenantCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.white, borderRadius: Radius.xl, padding: 14, ...Shadow.sm, gap: 12 },
  tenantAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.blue100, alignItems: 'center', justifyContent: 'center' },
  tenantAvatarText: { fontSize: 14, fontFamily: Fonts.bodySemi, color: Colors.blue },
  tenantInfo: { flex: 1 },
  tenantName: { fontSize: 14, fontFamily: Fonts.heading, color: Colors.slate900 },
  tenantMeta: { fontSize: 12, fontFamily: Fonts.body, color: Colors.slate400, marginTop: 2 },
  tenantRent: { alignItems: 'flex-end' },
  tenantRentVal: { fontSize: 15, fontFamily: Fonts.heading, color: Colors.slate900 },
  tenantRentSub: { fontSize: 11, fontFamily: Fonts.body, color: Colors.slate400 },
  revenueCard: { backgroundColor: Colors.white, borderRadius: Radius.xl, padding: 16, ...Shadow.sm, gap: 8 },
  revenueLabel: { fontSize: 14, fontFamily: Fonts.bodyMed, color: Colors.slate500 },
  revenueVal: { fontSize: 28, fontFamily: Fonts.heading, color: Colors.blue },
  revenueBars: { flexDirection: 'row', alignItems: 'flex-end', height: 80, gap: 6 },
  revenueBar: { flex: 1, backgroundColor: Colors.blue, borderRadius: 4, opacity: 0.7 },
  revenueMonths: { flexDirection: 'row', gap: 6 },
  revenueMonth: { flex: 1, textAlign: 'center', fontSize: 10, fontFamily: Fonts.body, color: Colors.slate400 },
  metricsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  metricCard: { width: (width - 52) / 2, backgroundColor: Colors.white, borderRadius: Radius.xl, padding: 14, ...Shadow.sm, gap: 4 },
  metricLabel: { fontSize: 11, fontFamily: Fonts.body, color: Colors.slate400 },
  metricVal: { fontSize: 22, fontFamily: Fonts.heading, color: Colors.slate900 },
  metricDelta: { fontSize: 11, fontFamily: Fonts.bodySemi, color: Colors.green600 },
  bottomNav: { flexDirection: 'row', backgroundColor: Colors.white, borderTopWidth: 1, borderTopColor: Colors.slate100, paddingTop: 8 },
  navItem: { flex: 1, alignItems: 'center', gap: 2, paddingVertical: 4 },
  navIcon: { fontSize: 20 },
  navLabel: { fontSize: 9, fontFamily: Fonts.bodyMed, color: Colors.slate400 },
  navLabelActive: { color: Colors.blue },
  navDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: Colors.blue },
});
