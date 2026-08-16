import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { gradientColors, colors } from '../theme/colors';

export default function SplashScreen({ navigation }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      navigation.replace('SignIn');
    }, 1800);
    return () => clearTimeout(timer);
  }, [navigation]);

  return (
    <LinearGradient colors={gradientColors} style={styles.container}>
      <View style={styles.center}>
        <View style={styles.logoRow}>
          <Text style={styles.logo}>InternMatch</Text>
          <Ionicons name="locate" size={26} color={colors.white} style={{ marginLeft: 6 }} />
        </View>
        <Text style={styles.tagline}>Right Internship, Bright Future</Text>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  logoRow: { flexDirection: 'row', alignItems: 'center' },
  logo: {
    fontSize: 28,
    fontStyle: 'italic',
    fontWeight: '700',
    color: colors.white,
  },
  tagline: {
    marginTop: 12,
    color: colors.white,
    fontSize: 13,
    fontWeight: '600',
  },
});
