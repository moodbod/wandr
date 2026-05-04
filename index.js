const { Platform } = require('react-native');

require('react-native-get-random-values');

if (Platform.OS !== 'web') {
  const { registerGlobals } = require('@livekit/react-native');
  const { Event, EventTarget } = require('@livekit/react-native-webrtc');

  registerGlobals();

  if (typeof global.Event === 'undefined') {
    global.Event = Event;
  }

  if (typeof global.EventTarget === 'undefined') {
    global.EventTarget = EventTarget;
  }
}

require('expo-router/entry');
