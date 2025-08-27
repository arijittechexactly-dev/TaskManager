// import firebase from '@react-native-firebase/app';

// let appInstance: ReturnType<typeof firebase.app> | undefined;

// export function getFirebaseApp() {
//   if (!appInstance) {
//     // Configuration is read from google-services.json (Android)
//     // and GoogleService-Info.plist (iOS) automatically by @react-native-firebase/app
//     appInstance = firebase.app();
//   }
//   return appInstance;
// }

// import firebase from '@react-native-firebase/app';

// let appInstance: ReturnType<typeof firebase.app> | undefined;

// export function getFirebaseApp() {
//   if (!appInstance) {
//     const apps = firebase.apps;
//     if (apps.length > 0) {
//       // Use the first available app (usually the default)
//       appInstance = apps[0];
//     } else {
//       throw new Error('No Firebase apps found. Check your configuration.');
//     }
//   }
//   return appInstance;
// }
import firebase from '@react-native-firebase/app';
import {Platform} from 'react-native';

let appInstance: ReturnType<typeof firebase.app> | undefined;

export function getFirebaseApp() {
  if (!appInstance) {
    try {
      // Try to get the default app first
      appInstance = firebase.app();
    } catch (error) {
      // If no default app exists, check available apps
      const apps = firebase.apps;
      if (apps.length > 0) {
        appInstance = apps[0];
      } else {
        console.error('Firebase initialization error:', error);
        throw new Error(
          `No Firebase apps found. Platform: ${Platform.OS}. Check your configuration.`,
        );
      }
    }
  }
  return appInstance;
}
