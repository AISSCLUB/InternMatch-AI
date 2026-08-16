import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { gradientColors, colors } from '../theme/colors';
import GradientButton from '../components/GradientButton';
import { signInWithGoogle } from '../services/googleAuth';
import { signUpWithEmail } from '../services/auth';
import { syncAuthenticatedUser, upsertProfile } from '../services/api';
import { useProfile } from '../context/ProfileContext';

export default function SignUpScreen({ navigation }) {
  const [accountType, setAccountType] = useState('intern'); // 'intern' | 'employer'
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [department, setDepartment] = useState('');
  const [loading, setLoading] = useState(false);
  const { setProfile } = useProfile();

  const handleCreateAccount = async () => {
    const normalizedEmail = email.trim().toLowerCase();
    const normalizedName = fullName.trim();
    const normalizedDepartment = department.trim();

    if (!normalizedName || !normalizedEmail || !password) {
      Alert.alert('Create account', 'Please enter your full name, email, and password.');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Create account', 'Password must contain at least 6 characters.');
      return;
    }

    if (loading) return;

    setLoading(true);

    try {
      const metadata = {
        full_name: normalizedName,
        department: normalizedDepartment || null,
        account_type: accountType,
      };

      const { data, error } = await signUpWithEmail(normalizedEmail, password, metadata);

      if (error) {
        throw error;
      }

      if (!data.session?.access_token) {
        Alert.alert(
          'Check your email',
          'Your account was created. Please confirm your email address, then sign in.'
        );
        navigation.replace('SignIn');
        return;
      }

      await syncAuthenticatedUser();

      const createdProfile = await upsertProfile({
        full_name: normalizedName,
        headline: null,
        preferences: {
          account_type: accountType,
          department: normalizedDepartment || null,
        },
      });

      setProfile(createdProfile);

      navigation.replace('MainTabs');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to create account.';
      Alert.alert('Sign up failed', message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    try {
      await signInWithGoogle();
      Alert.alert('Google Sign-In', 'Google Sign-In is not available in this build yet.');
    } catch (e) {
      console.warn('Google sign-in failed', e);
    }
  };

  return (
    <LinearGradient colors={gradientColors} style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text style={styles.title}>Sign Up</Text>

          <View style={styles.tabRow}>
            <TouchableOpacity style={styles.tab} onPress={() => navigation.replace('SignIn')}>
              <Text style={styles.tabText}>Sign In</Text>
            </TouchableOpacity>
            <View style={[styles.tab, styles.tabActive]}>
              <Text style={styles.tabActiveText}>Sign Up</Text>
            </View>
          </View>

          <Text style={styles.sectionLabel}>Account type</Text>
          <View style={styles.typeRow}>
            <TouchableOpacity
              style={[styles.typeButton, accountType === 'intern' && styles.typeButtonActive]}
              onPress={() => setAccountType('intern')}
            >
              <Ionicons name="school" size={16} color={accountType === 'intern' ? colors.white : colors.textDark} />
              <Text style={[styles.typeText, accountType === 'intern' && styles.typeTextActive]}>Intern</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.typeButton, accountType === 'employer' && styles.typeButtonActive]}
              onPress={() => setAccountType('employer')}
            >
              <Ionicons name="briefcase" size={16} color={accountType === 'employer' ? colors.white : colors.textDark} />
              <Text style={[styles.typeText, accountType === 'employer' && styles.typeTextActive]}>Employer</Text>
            </TouchableOpacity>
          </View>

          <TextInput style={styles.input} placeholder="Full name" placeholderTextColor="#8A8A8A" value={fullName} onChangeText={setFullName} />
          <TextInput
            style={styles.input}
            placeholder="E-Mail"
            placeholderTextColor="#8A8A8A"
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
          />
          <TextInput style={styles.input} placeholder="Password" placeholderTextColor="#8A8A8A" secureTextEntry value={password} onChangeText={setPassword} />
          <TextInput style={styles.input} placeholder="Department" placeholderTextColor="#8A8A8A" value={department} onChangeText={setDepartment} />

          <GradientButton title={loading ? "Creating account..." : "Create an account"} color={colors.primaryBlue} onPress={handleCreateAccount} style={{ marginTop: 20 }} />

          <View style={styles.dividerRow}>
            <View style={styles.divider} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.divider} />
          </View>

          <GradientButton title="by Google" color={colors.white} textColor={colors.textDark} onPress={handleGoogle} />
          <GradientButton title="by Apple" color={colors.white} textColor={colors.textDark} onPress={() => {}} style={{ marginTop: 12 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  flex: { flex: 1 },
  content: { paddingHorizontal: 24, paddingTop: 50, paddingBottom: 40 },
  title: { fontSize: 26, fontWeight: '700', color: colors.white, marginBottom: 20 },
  tabRow: { flexDirection: 'row', marginBottom: 20 },
  tab: {
    paddingHorizontal: 22,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.4)',
    marginRight: 10,
  },
  tabActive: { backgroundColor: colors.primaryBlue },
  tabActiveText: { color: colors.white, fontWeight: '700' },
  tabText: { color: colors.textDark, fontWeight: '600' },
  sectionLabel: { color: colors.white, fontWeight: '600', marginBottom: 8, fontSize: 12 },
  typeRow: { flexDirection: 'row', marginBottom: 18 },
  typeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.5)',
    marginRight: 10,
  },
  typeButtonActive: { backgroundColor: colors.primaryBlue },
  typeText: { marginLeft: 6, color: colors.textDark, fontWeight: '600' },
  typeTextActive: { color: colors.white },
  input: {
    backgroundColor: colors.inputBg,
    borderRadius: 10,
    height: 46,
    paddingHorizontal: 14,
    marginBottom: 12,
  },
  dividerRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 22 },
  divider: { flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.6)' },
  dividerText: { color: colors.white, marginHorizontal: 12 },
});
