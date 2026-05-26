const { Platform } = require('react-native');

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
