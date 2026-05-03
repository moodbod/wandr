import { NativeModules, PermissionsAndroid, Platform } from 'react-native';

import type { Id } from '@/convex/_generated/dataModel';
import { presentIncomingFriendCallNotification } from '@/lib/notifications';

declare const require: (
  moduleName: string
) => { default?: NativeCallKeepModule } & Partial<NativeCallKeepModule>;

type NativeCallMode = 'voice' | 'video';

type NativeIncomingCall = {
  callId: Id<'friendCalls'>;
  callerName: string;
  groupName: string;
  mode: NativeCallMode;
};

type NativeCallHandlers = {
  onAnswer: (callId: Id<'friendCalls'>) => void;
  onEnd: (callId: Id<'friendCalls'>) => void;
};

type NativeCallKeepModule = {
  setup: (options: Record<string, unknown>) => Promise<boolean>;
  setAvailable: (available: boolean) => void;
  addEventListener: (
    eventName: 'answerCall' | 'endCall' | 'showIncomingCallUi' | 'createIncomingConnectionFailed' | 'didDisplayIncomingCall',
    listener: (event: { callUUID: string; handle?: string; name?: string }) => void
  ) => { remove: () => void };
  backToForeground: () => void;
  displayIncomingCall: (
    uuid: string,
    handle: string,
    localizedCallerName?: string,
    handleType?: string,
    hasVideo?: boolean,
    options?: Record<string, unknown>
  ) => void;
  setCurrentCallActive: (uuid: string) => void;
  answerIncomingCall: (uuid: string) => void;
  endCall: (uuid: string) => void;
};

const callIdsByUuid = new Map<string, Id<'friendCalls'>>();
const uuidsByCallId = new Map<string, string>();
const incomingCallsByUuid = new Map<string, NativeIncomingCall>();
let setupPromise: Promise<boolean> | null = null;
let listenersRegistered = false;
let missingModuleWarningShown = false;
let unsupportedModuleWarningShown = false;
let nativeCallKeep: NativeCallKeepModule | null | undefined;

export function canUseNativeCallSystem() {
  return false;
}

function getNativeCallKeep() {
  if (Platform.OS === 'web') {
    return null;
  }

  if (nativeCallKeep !== undefined) {
    return nativeCallKeep;
  }

  if (!NativeModules.RNCallKeep) {
    nativeCallKeep = null;
    return nativeCallKeep;
  }

  try {
    const module = require('react-native-callkeep');
    nativeCallKeep = module.default ?? (module as NativeCallKeepModule);
  } catch (error) {
    console.warn('Native call module failed to load', error);
    nativeCallKeep = null;
  }

  return nativeCallKeep;
}

function warnMissingNativeCallKeep() {
  if (missingModuleWarningShown) {
    return;
  }
  missingModuleWarningShown = true;
  console.warn('Native call system is unavailable: RNCallKeep native module was not found.');
}

function warnUnsupportedNativeCallKeep() {
  if (unsupportedModuleWarningShown) {
    return;
  }
  unsupportedModuleWarningShown = true;
  console.warn('Native call system is disabled for this runtime.');
}

function hashString(value: string) {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

function segment(value: string, salt: string, length: number) {
  return hashString(`${salt}:${value}`).toString(16).padStart(8, '0').slice(0, length);
}

export function getNativeCallUuid(callId: Id<'friendCalls'>) {
  const existingUuid = uuidsByCallId.get(callId);
  if (existingUuid) {
    return existingUuid;
  }

  const uuid = [
    segment(callId, 'wandr-a', 8),
    segment(callId, 'wandr-b', 4),
    `4${segment(callId, 'wandr-c', 3)}`,
    `8${segment(callId, 'wandr-d', 3)}`,
    segment(callId, 'wandr-e', 12),
  ].join('-');
  uuidsByCallId.set(callId, uuid);
  callIdsByUuid.set(uuid, callId);
  return uuid;
}

export function getNativeCallId(callUuid: string) {
  return callIdsByUuid.get(callUuid) ?? null;
}

export async function setupNativeCallSystem() {
  if (!canUseNativeCallSystem()) {
    warnUnsupportedNativeCallKeep();
    return false;
  }

  const RNCallKeep = getNativeCallKeep();
  if (!RNCallKeep) {
    warnMissingNativeCallKeep();
    return false;
  }

  if (!setupPromise) {
    setupPromise = RNCallKeep.setup({
      ios: {
        appName: 'Wandr',
        supportsVideo: true,
        maximumCallGroups: '1',
        maximumCallsPerCallGroup: '8',
        includesCallsInRecents: false,
      },
      android: {
        alertTitle: 'Enable Wandr calls',
        alertDescription: 'Allow Wandr to use the native phone call screen for voice and video calls.',
        cancelButton: 'Not now',
        okButton: 'Enable',
        additionalPermissions: [
          PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
          PermissionsAndroid.PERMISSIONS.READ_CALL_LOG,
          PermissionsAndroid.PERMISSIONS.READ_PHONE_STATE,
        ],
        selfManaged: true,
        foregroundService: {
          channelId: 'wandr-calls',
          channelName: 'Wandr calls',
          notificationTitle: 'Wandr call in progress',
          notificationIcon: 'ic_launcher',
        },
      },
    })
      .then((accepted) => {
        if (Platform.OS === 'android') {
          RNCallKeep.setAvailable(true);
          return true;
        }
        return accepted ?? true;
      })
      .catch((error) => {
        console.warn('Native call setup failed', error);
        setupPromise = null;
        return false;
      });
  }

  return setupPromise;
}

export function registerNativeCallHandlers({ onAnswer, onEnd }: NativeCallHandlers) {
  if (!canUseNativeCallSystem() || listenersRegistered) {
    return () => {};
  }

  const RNCallKeep = getNativeCallKeep();
  if (!RNCallKeep) {
    warnMissingNativeCallKeep();
    return () => {};
  }

  listenersRegistered = true;
  const answerSubscription = RNCallKeep.addEventListener('answerCall', ({ callUUID }) => {
    const callId = getNativeCallId(callUUID);
    if (!callId) {
      return;
    }
    if (Platform.OS === 'android') {
      RNCallKeep.backToForeground();
    }
    onAnswer(callId);
  });
  const endSubscription = RNCallKeep.addEventListener('endCall', ({ callUUID }) => {
    const callId = getNativeCallId(callUUID);
    if (callId) {
      onEnd(callId);
    }
    incomingCallsByUuid.delete(callUUID);
  });
  const didDisplayIncomingCallSubscription = RNCallKeep.addEventListener('didDisplayIncomingCall', ({ callUUID }) => {
    if (callUUID) {
      incomingCallsByUuid.delete(callUUID);
    }
  });
  const androidSubscriptions =
    Platform.OS === 'android'
      ? [
          RNCallKeep.addEventListener('showIncomingCallUi', ({ callUUID }) => {
            const incomingCall = incomingCallsByUuid.get(callUUID);
            if (!incomingCall) {
              return;
            }
            void presentIncomingFriendCallNotification({
              callId: incomingCall.callId,
              callerName: incomingCall.callerName,
              circleName: incomingCall.groupName,
              mode: incomingCall.mode,
            });
          }),
          RNCallKeep.addEventListener('createIncomingConnectionFailed', ({ callUUID }) => {
            incomingCallsByUuid.delete(callUUID);
          }),
        ]
      : [];

  return () => {
    listenersRegistered = false;
    answerSubscription.remove();
    endSubscription.remove();
    didDisplayIncomingCallSubscription.remove();
    androidSubscriptions.forEach((subscription) => subscription.remove());
  };
}

export async function showNativeIncomingCall({ callId, callerName, groupName, mode }: NativeIncomingCall) {
  if (!(await setupNativeCallSystem())) {
    return false;
  }

  const RNCallKeep = getNativeCallKeep();
  if (!RNCallKeep) {
    warnMissingNativeCallKeep();
    return false;
  }

  const uuid = getNativeCallUuid(callId);
  incomingCallsByUuid.set(uuid, { callId, callerName, groupName, mode });
  RNCallKeep.displayIncomingCall(uuid, groupName, callerName, 'generic', mode === 'video', {
    callId,
    groupName,
    mode,
  });
  return true;
}

export function answerNativeCall(callId: Id<'friendCalls'>) {
  if (!canUseNativeCallSystem()) {
    return;
  }
  const RNCallKeep = getNativeCallKeep();
  if (RNCallKeep) {
    RNCallKeep.answerIncomingCall(getNativeCallUuid(callId));
  }
}

export function markNativeCallConnected(callId: Id<'friendCalls'>) {
  if (!canUseNativeCallSystem()) {
    return;
  }
  getNativeCallUuid(callId);
}

export function endNativeCall(callId: Id<'friendCalls'>) {
  if (!canUseNativeCallSystem()) {
    return;
  }
  const RNCallKeep = getNativeCallKeep();
  if (RNCallKeep) {
    RNCallKeep.endCall(getNativeCallUuid(callId));
  }
}
