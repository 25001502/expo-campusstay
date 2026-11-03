import React from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ErrorState } from './UI';
import { reportDiagnostic } from '../errors';
import { Colors, Spacing } from '../theme';

function Recovery({ onRetry }: { onRetry: () => void }) {
  const insets = useSafeAreaInsets();
  return <ScrollView style={styles.screen} contentContainerStyle={[styles.content, { paddingTop: insets.top + Spacing.xl, paddingBottom: insets.bottom + Spacing.xl, paddingLeft: insets.left + Spacing.xl, paddingRight: insets.right + Spacing.xl }]}>
    <StatusBar style="dark" />
    <ErrorState title="CampusStay couldn't open this screen" message="Please reopen CampusStay to continue. Unsaved entries may need to be entered again." retryLabel="Reopen CampusStay" onRetry={onRetry} />
  </ScrollView>;
}
// Render/lifecycle errors only. Retrying remounts AuthProvider, so access is checked again.
export class AppErrorBoundary extends React.Component<{ children: React.ReactNode }, { failed: boolean; attempt: number }> {
  state = { failed: false, attempt: 0 };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch() { reportDiagnostic('render', 'unexpected'); }
  retry = () => this.setState(({ attempt }) => ({ failed: false, attempt: attempt + 1 }));
  render() {
    return this.state.failed ? <Recovery onRetry={this.retry} /> : <React.Fragment key={this.state.attempt}>{this.props.children}</React.Fragment>;
  }
}
const styles = StyleSheet.create({ screen: { flex: 1, backgroundColor: Colors.background }, content: { flexGrow: 1, justifyContent: 'center' } });
