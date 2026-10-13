import React, { createContext, useCallback, useContext, useMemo, useReducer, useRef } from 'react';
import {
  addSubmittedApplication,
  createSubmittedApplication,
  type ApplicationDraft,
  type SubmittedApplication,
} from '../application';

type ApplicationContextValue = {
  applications: SubmittedApplication[];
  submitApplication: (draft: ApplicationDraft) => SubmittedApplication;
  getApplication: (id: string) => SubmittedApplication | undefined;
  clearApplications: () => void;
};

type Action = { type: 'add'; application: SubmittedApplication } | { type: 'clear' };

export function applicationReducer(state: SubmittedApplication[], action: Action) {
  if (action.type === 'add') return addSubmittedApplication(state, action.application);
  return [];
}

const ApplicationContext = createContext<ApplicationContextValue | undefined>(undefined);

export function ApplicationProvider({ children }: { children: React.ReactNode }) {
  const [applications, dispatch] = useReducer(applicationReducer, []);
  const sequence = useRef(0);

  const submitApplication = useCallback((draft: ApplicationDraft) => {
    sequence.current += 1;
    const application = createSubmittedApplication(draft, new Date().toISOString(), sequence.current);
    dispatch({ type: 'add', application });
    return application;
  }, []);

  const getApplication = useCallback(
    (id: string) => applications.find((application) => application.id === id),
    [applications],
  );
  const clearApplications = useCallback(() => {
    sequence.current = 0;
    dispatch({ type: 'clear' });
  }, []);

  const value = useMemo(() => ({ applications, submitApplication, getApplication, clearApplications }), [applications, clearApplications, getApplication, submitApplication]);
  return <ApplicationContext.Provider value={value}>{children}</ApplicationContext.Provider>;
}

export function useApplications() {
  const value = useContext(ApplicationContext);
  if (!value) throw new Error('useApplications must be used within ApplicationProvider');
  return value;
}
