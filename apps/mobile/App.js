import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'react-native';
import RootNavigator from './src/navigation/RootNavigator';
import { ProfileProvider } from './src/context/ProfileContext';
import { SavedInternshipsProvider } from './src/context/SavedInternshipsContext';

export default function App() {
  return (
    <SafeAreaProvider>
      <StatusBar barStyle="light-content" />
      <ProfileProvider>
        <SavedInternshipsProvider>
          <RootNavigator />
        </SavedInternshipsProvider>
      </ProfileProvider>
    </SafeAreaProvider>
  );
}
