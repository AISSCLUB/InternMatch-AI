import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import CustomTabBar from './CustomTabBar';
import HomeScreen from '../screens/HomeScreen';
import InternshipsScreen from '../screens/InternshipsScreen';
import MatchupsScreen from '../screens/MatchupsScreen';
import ApplicationsScreen from '../screens/ApplicationsScreen';
import ProfileScreen from '../screens/ProfileScreen';
import { TabScrollProvider } from '../context/TabScrollContext';

const Tab = createBottomTabNavigator();

export default function MainTabs() {
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
        <Tab.Screen name="Internships" component={InternshipsScreen} />
        <Tab.Screen name="Matchups" component={MatchupsScreen} />
        <Tab.Screen name="Applications" component={ApplicationsScreen} />
        <Tab.Screen name="Profile" component={ProfileScreen} />
      </Tab.Navigator>
    </TabScrollProvider>
  );
}
