import type { Id } from '@/convex/_generated/dataModel';

type NativeCallMode = 'voice' | 'video';

type NativeIncomingCall = {
  callId: Id<'calls'>;
  callerName: string;
  groupName: string;
  mode: NativeCallMode;
};

type NativeCallHandlers = {
  onAnswer: (callId: Id<'calls'>) => void;
  onEnd: (callId: Id<'calls'>) => void;
};

export function canUseNativeCallSystem() {
  return false;
}

export function getNativeCallUuid(callId: Id<'calls'>) {
  return String(callId);
}

export function getNativeCallId(_callUuid: string) {
  return null;
}

export async function setupNativeCallSystem() {
  return false;
}

export function registerNativeCallHandlers(_handlers: NativeCallHandlers) {
  return () => {};
}

export async function showNativeIncomingCall(_call: NativeIncomingCall) {
  return false;
}

export function answerNativeCall(_callId: Id<'calls'>) {}

export function markNativeCallConnected(_callId: Id<'calls'>) {}

export function endNativeCall(_callId: Id<'calls'>) {}
