import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import {
  syncRevenueCatUser,
  getRevenueCatRuntimeState,
} from '../services/revenueCatService';

const RevenueCatContext = createContext({
  configured: false,
  identifiedUserId: null,
  reason: null,
});

export function RevenueCatProvider({ children }) {
  const [runtimeState, setRuntimeState] = useState(getRevenueCatRuntimeState());

  useEffect(() => {
    let isMounted = true;
    let hasObservedAuthEvent = false;
    let syncQueue = Promise.resolve();

    const enqueueSync = (targetUserId) => {
      syncQueue = syncQueue
        .then(async () => {
          const state = await syncRevenueCatUser(targetUserId);
          if (isMounted) {
            setRuntimeState(state);
          }
        })
        .catch(() => {
          // Prevent queue rejection from stopping future synchronizations
        });
    };

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        hasObservedAuthEvent = true;
        const userId = session?.user?.id || null;
        enqueueSync(userId);
      }
    );

    const initInitialSession = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        if (!hasObservedAuthEvent) {
          const userId = data?.session?.user?.id || null;
          enqueueSync(userId);
        }
      } catch {
        if (!hasObservedAuthEvent) {
          enqueueSync(null);
        }
      }
    };

    initInitialSession();

    return () => {
      isMounted = false;
      authListener?.subscription?.unsubscribe();
    };
  }, []);

  return (
    <RevenueCatContext.Provider value={runtimeState}>
      {children}
    </RevenueCatContext.Provider>
  );
}

export function useRevenueCat() {
  return useContext(RevenueCatContext);
}
