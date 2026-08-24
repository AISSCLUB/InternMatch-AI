import React from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import CustomTabBar from './CustomTabBar';
import HomeScreen from '../screens/HomeScreen';
import InternshipsScreen from '../screens/InternshipsScreen';
import MatchupsScreen from '../screens/MatchupsScreen';
import ApplicationsScreen from '../screens/ApplicationsScreen';
import ProfileScreen from '../screens/ProfileScreen';
import { TabScrollProvider } from '../context/TabScrollContext';
import { useProfile } from '../context/ProfileContext';
import { normalizeAccountType } from '../services/subscriptionService';
import colors from '../theme/colors';

const Tab = createBottomTabNavigator();

export default function MainTabs() {
  const { profile } = useProfile();

  if (!profile) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.accent || colors.teal} />
      </View>
    );
  }

  const accountType = normalizeAccountType(profile.preferences?.account_type);
  const isEmployer = accountType === 'employer';

  return (
    <TabScrollProvider>
      <Tab.Navigator
        screenOptions={{
          headerShown: false,
          tabBarStyle: { position: 'absolute' },
        }}
        tabBar={(props) => <CustomTabBar {...props} />}
      >
        <Tab.Screen name="Home" component={HomeScreen} />
        {!isEmployer && (
          <>
            <Tab.Screen name="Internships" component={InternshipsScreen} />
            <Tab.Screen name="Matchups" component={MatchupsScreen} />
            <Tab.Screen name="Applications" component={ApplicationsScreen} />
          </>
        )}
        <Tab.Screen name="Profile" component={ProfileScreen} />
      </Tab.Navigator>
    </TabScrollProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: colors.background || colors.screenBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
