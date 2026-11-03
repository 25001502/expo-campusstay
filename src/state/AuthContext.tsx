import React, { createContext, useContext, useEffect, useState } from 'react';
import { AppState, Linking } from 'react-native';
import { AccountController, type AuthSnapshot } from '../auth/controller';
import { authSetupError, supabase } from '../auth/client';
import { managerReviewSession } from '../manager';

type AuthValue = AuthSnapshot & { account: AccountController; configured: boolean };
const AuthContext = createContext<AuthValue | undefined>(undefined);
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [account] = useState(() => new AccountController(supabase?.auth ?? null, authSetupError));
  const [snapshot, setSnapshot] = useState(account.getSnapshot);
  useEffect(() => {
    let mounted = true, identity: string | undefined;
    const unsubscribe = account.subscribe(() => {
      if (!mounted) return;
      const next = account.getSnapshot();
      if (identity !== next.user?.id) { managerReviewSession.clear(); identity = next.user?.id; }
      setSnapshot(next);
    });
    let started = false;
    const begin = (url: string | null) => {
      if (!mounted) return;
      if (started) { if (url) void account.handleUrl(url); return; }
      started = true; clearTimeout(linkTimer); void account.start(url);
    };
    const linkTimer = setTimeout(() => begin(null), 3000);
    void Linking.getInitialURL().then(begin).catch(() => begin(null));
    const links = Linking.addEventListener('url', ({ url }) => { void account.handleUrl(url); });
    const activity = AppState.addEventListener('change', (state) => {
      if (state === 'active') supabase?.auth.startAutoRefresh(); else supabase?.auth.stopAutoRefresh();
    });
    if (AppState.currentState === 'active') supabase?.auth.startAutoRefresh();
    return () => { mounted = false; clearTimeout(linkTimer); unsubscribe(); links.remove(); activity.remove(); supabase?.auth.stopAutoRefresh(); account.dispose(); };
  }, [account]);
  return <AuthContext.Provider value={{ ...snapshot, account, configured: !!supabase }}>{children}</AuthContext.Provider>;
}
export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used within AuthProvider');
  return value;
}
