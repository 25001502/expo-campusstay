import React, { createContext, useCallback, useContext, useMemo, useReducer } from 'react';
import { createEmptyProfile, profileReducer, validateProfile, type ProfileDetails } from '../profile';

type ProfileValue = {
  profile: ProfileDetails;
  saveProfile: (details: ProfileDetails) => boolean;
  resetProfile: () => void;
};
const ProfileContext = createContext<ProfileValue | undefined>(undefined);

export function ProfileProvider({ children }: { children: React.ReactNode }) {
  const [profile, dispatch] = useReducer(profileReducer, undefined, createEmptyProfile);
  const saveProfile = useCallback((details: ProfileDetails) => {
    if (Object.keys(validateProfile(details)).length) return false;
    dispatch({ type: 'save', details });
    return true;
  }, []);
  const resetProfile = useCallback(() => dispatch({ type: 'reset' }), []);
  const value = useMemo(() => ({ profile, saveProfile, resetProfile }), [profile, resetProfile, saveProfile]);
  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>;
}

export function useProfile() {
  const value = useContext(ProfileContext);
  if (!value) throw new Error('useProfile must be used within ProfileProvider');
  return value;
}
