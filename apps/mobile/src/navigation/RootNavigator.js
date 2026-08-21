import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import SplashScreen from '../screens/SplashScreen';
import SignInScreen from '../screens/SignInScreen';
import SignUpScreen from '../screens/SignUpScreen';
import OnboardingProfileScreen from '../screens/OnboardingProfileScreen';
import MainTabs from './MainTabs';
import InternshipDetailScreen from '../screens/InternshipDetailScreen';
import WhyYouMatchScreen from '../screens/WhyYouMatchScreen';
import CoverLetterDraftScreen from '../screens/CoverLetterDraftScreen';
import CoverLetterScreen from '../screens/CoverLetterScreen';
import EditProfileScreen from '../screens/EditProfileScreen';
import SettingsScreen from '../screens/SettingsScreen';
import CVUploadScreen from '../screens/CVUploadScreen';
import SavedInternshipsScreen from '../screens/SavedInternshipsScreen';
import PrivacyPolicyScreen from '../screens/PrivacyPolicyScreen';
import TermsOfUseScreen from '../screens/TermsOfUseScreen';

const Stack = createNativeStackNavigator();

export default function RootNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Splash" screenOptions={{ headerShown: false }}>
        {/* Auth flow */}
        <Stack.Screen name="Splash" component={SplashScreen} />
        <Stack.Screen name="SignIn" component={SignInScreen} />
        <Stack.Screen name="SignUp" component={SignUpScreen} />
        <Stack.Screen name="OnboardingProfile" component={OnboardingProfileScreen} />

        {/* Main app (bottom tabs) */}
        <Stack.Screen name="MainTabs" component={MainTabs} />

        {/* Pushed detail / flow screens */}
        <Stack.Screen name="InternshipDetail" component={InternshipDetailScreen} />
        <Stack.Screen name="WhyYouMatch" component={WhyYouMatchScreen} />
        <Stack.Screen name="CoverLetterDraft" component={CoverLetterDraftScreen} />
        <Stack.Screen name="CoverLetter" component={CoverLetterScreen} />
        <Stack.Screen name="EditProfile" component={EditProfileScreen} />
        <Stack.Screen name="Settings" component={SettingsScreen} />
        <Stack.Screen name="SavedInternships" component={SavedInternshipsScreen} />
        <Stack.Screen name="CVUpload" component={CVUploadScreen} options={{ presentation: 'modal' }} />
        <Stack.Screen name="PrivacyPolicy" component={PrivacyPolicyScreen} />
        <Stack.Screen name="TermsOfUse" component={TermsOfUseScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
