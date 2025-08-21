import firebase from '@react-native-firebase/app';

let appInstance: ReturnType<typeof firebase.app> | undefined;

export function getFirebaseApp() {
  if (!appInstance) {
    // Configuration is read from google-services.json (Android)
    // and GoogleService-Info.plist (iOS) automatically by @react-native-firebase/app
    appInstance = firebase.app();
  }
  return appInstance;
}
