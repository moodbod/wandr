import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import type { Id } from '@/convex/_generated/dataModel';
import { registerNativeCallHandlers, setupNativeCallSystem } from '@/lib/native-calls';

type ActiveFriendCallContextValue = {
  activeCallId: Id<'calls'> | null;
  isMinimized: boolean;
  openCall: (callId: Id<'calls'>, options?: { minimized?: boolean }) => void;
  minimizeCall: () => void;
  expandCall: () => void;
  clearCall: () => void;
};

const ActiveFriendCallContext = createContext<ActiveFriendCallContextValue | null>(null);

const missingActiveFriendCallContext: ActiveFriendCallContextValue = {
  activeCallId: null,
  isMinimized: false,
  openCall: () => {},
  minimizeCall: () => {},
  expandCall: () => {},
  clearCall: () => {},
};

export function ActiveFriendCallProvider({ children }: { children: ReactNode }) {
  const [activeCallId, setActiveCallId] = useState<Id<'calls'> | null>(null);
  const [isMinimized, setIsMinimized] = useState(false);
  const openCall = useCallback((callId: Id<'calls'>, options?: { minimized?: boolean }) => {
    setActiveCallId(callId);
    setIsMinimized(Boolean(options?.minimized));
  }, []);
  const minimizeCall = useCallback(() => setIsMinimized(true), []);
  const expandCall = useCallback(() => setIsMinimized(false), []);
  const clearCall = useCallback(() => {
    setActiveCallId(null);
    setIsMinimized(false);
  }, []);

  useEffect(() => {
    void setupNativeCallSystem();
    return registerNativeCallHandlers({
      onAnswer: (callId) => openCall(callId),
      onEnd: (callId) => {
        setActiveCallId((currentCallId) => (currentCallId === callId ? null : currentCallId));
        setIsMinimized(false);
      },
    });
  }, [openCall]);

  const value = useMemo<ActiveFriendCallContextValue>(
    () => ({
      activeCallId,
      isMinimized,
      openCall,
      minimizeCall,
      expandCall,
      clearCall,
    }),
    [activeCallId, clearCall, expandCall, isMinimized, minimizeCall, openCall]
  );

  return <ActiveFriendCallContext.Provider value={value}>{children}</ActiveFriendCallContext.Provider>;
}

export function useActiveFriendCall() {
  const context = useContext(ActiveFriendCallContext);
  if (!context) {
    console.warn('useActiveFriendCall used outside ActiveFriendCallProvider; native call UI is disabled for this render.');
    return missingActiveFriendCallContext;
  }
  return context;
}
