import React, { createContext, useContext, useState, useCallback } from 'react';
import { getProfile, ApiError } from '../services/api';

const ProfileContext = createContext(null);

export function ProfileProvider({ children }) {
  const [profile, setProfileState] = useState(null);
  const [loading, setLoading] = useState(false);

  const setProfile = useCallback((newProfile) => {
    setProfileState(newProfile);
  }, []);

  const clearProfile = useCallback(() => {
    setProfileState(null);
  }, []);

  const refreshProfile = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getProfile();
      setProfileState(data);
      return data;
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) {
        setProfileState(null);
        return null;
      }
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const value = {
    profile,
    loading,
    refreshProfile,
    setProfile,
    clearProfile,
  };

  return (
    <ProfileContext.Provider value={value}>
      {children}
    </ProfileContext.Provider>
  );
}

export function useProfile() {
  const context = useContext(ProfileContext);
  if (!context) {
    throw new Error('useProfile must be used within a ProfileProvider');
  }
  return context;
}

export default ProfileContext;
