import { createContext, createElement, useContext, useEffect, useMemo, useState, useCallback, useSyncExternalStore, type ReactNode } from 'react';
import { AppState } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { supabase } from '../auth/client';
import { useAuth } from '../state/AuthContext';
import { createVerificationApi } from './api';
import { VerificationController, type VerificationSnapshot } from './controller';

type Value = VerificationSnapshot & { controller: VerificationController; foreground: boolean };
const VerificationContext = createContext<Value | null>(null);
export function ManagerVerificationProvider({ children }: { children: ReactNode }) {
  const auth = useAuth(), owner = auth.user?.id ?? '';
  const controller = useMemo(() => new VerificationController(createVerificationApi(supabase, owner)), [owner]);
  const snapshot = useSyncExternalStore(controller.subscribe, controller.getSnapshot, controller.getSnapshot);
  const [foreground, setForeground] = useState(false);
  useEffect(() => controller.retain(), [controller]);
  useEffect(() => {
    if (!owner || auth.phase !== 'authenticated') return;
    let alive = true;
    const refresh = () => {
      setForeground(false);
      void controller.refresh().then(() => { if (alive && AppState.currentState === 'active') setForeground(true); });
    };
    refresh();
    const activity = AppState.addEventListener('change', (state) => {
      setForeground(false); if (state === 'active') refresh();
    });
    const timer = setInterval(() => {
      // Fresh reads also cover deployments where Realtime is not yet enabled.
      if (AppState.currentState === 'active' && controller.getSnapshot().data?.application) refresh();
    }, 15000);
    const channel = supabase?.channel(`manager-verification-${owner}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'manager_authorizations', filter: `user_id=eq.${owner}` }, refresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'manager_verification_applications', filter: `applicant_id=eq.${owner}` }, refresh).subscribe();
    return () => { alive = false; activity.remove(); clearInterval(timer); if (channel) void supabase?.removeChannel(channel); };
  }, [controller, owner, auth.phase, auth.user]);
  return createElement(VerificationContext.Provider, { value: { ...snapshot, controller, foreground } }, children);
}
export function useManagerVerification() {
  const value = useContext(VerificationContext);
  if (!value) throw new Error('ManagerVerificationProvider is required');
  const controller = value.controller;
  useFocusEffect(useCallback(() => { void controller.refresh(); }, [controller]));
  return value;
}
