import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

import type { Id } from '@/convex/_generated/dataModel';

type ActiveFriendCallContextValue = {
  activeCallId: Id<'friendCalls'> | null;
  isMinimized: boolean;
  openCall: (callId: Id<'friendCalls'>, options?: { minimized?: boolean }) => void;
  minimizeCall: () => void;
  expandCall: () => void;
  clearCall: () => void;
};

const ActiveFriendCallContext = createContext<ActiveFriendCallContextValue | null>(null);

export function ActiveFriendCallProvider({ children }: { children: ReactNode }) {
  const [activeCallId, setActiveCallId] = useState<Id<'friendCalls'> | null>(null);
  const [isMinimized, setIsMinimized] = useState(false);
  const openCall = useCallback((callId: Id<'friendCalls'>, options?: { minimized?: boolean }) => {
    setActiveCallId(callId);
    setIsMinimized(Boolean(options?.minimized));
  }, []);
  const minimizeCall = useCallback(() => setIsMinimized(true), []);
  const expandCall = useCallback(() => setIsMinimized(false), []);
  const clearCall = useCallback(() => {
    setActiveCallId(null);
    setIsMinimized(false);
  }, []);

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
    throw new Error('useActiveFriendCall must be used inside ActiveFriendCallProvider.');
  }
  return context;
}
