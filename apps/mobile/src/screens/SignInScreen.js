import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { gradientColors, colors } from '../theme/colors';
import GradientButton from '../components/GradientButton';
import { signInWithGoogle } from '../services/googleAuth';

export default function SignInScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleContinue = () => {
    // TODO: hook up to real auth (Firebase / your backend)
    navigation.replace('MainTabs');
  };

  const handleGoogle = async () => {
    try {
      await signInWithGoogle();
      navigation.replace('MainTabs');
    } catch (e) {
      console.warn('Google sign-in failed', e);
    }
  };

  return (
    <LinearGradient colors={gradientColors} style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <View style={styles.content}>
          <Text style={styles.title}>Welcome</Text>

          <View style={styles.tabRow}>
            <View style={[styles.tab, styles.tabActive]}>
              <Text style={styles.tabActiveText}>Sign In</Text>
            </View>
            <TouchableOpacity style={styles.tab} onPress={() => navigation.replace('SignUp')}>
              <Text style={styles.tabText}>Sign Up</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.label}>E-Mail</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />

          <Text style={styles.label}>Password</Text>
          <TextInput style={styles.input} value={password} onChangeText={setPassword} secureTextEntry />

          <TouchableOpacity style={{ alignSelf: 'flex-end', marginTop: 6 }}>
            <Text style={styles.forgot}>I forgot my password</Text>
          </TouchableOpacity>

          <GradientButton title="Continue" color={colors.primaryBlue} onPress={handleContinue} style={{ marginTop: 24 }} />

          <View style={styles.dividerRow}>
            <View style={styles.divider} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.divider} />
          </View>

          <GradientButton title="by Google" color={colors.white} textColor={colors.textDark} onPress={handleGoogle} />
          <GradientButton title="by Apple" color={colors.white} textColor={colors.textDark} onPress={() => {}} style={{ marginTop: 12 }} />
        </View>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  flex: { flex: 1 },
  content: { flex: 1, paddingHorizontal: 24, paddingTop: 60 },
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
  label: { color: colors.white, fontWeight: '600', marginBottom: 6, marginTop: 10 },
  input: {
    backgroundColor: colors.inputBg,
    borderRadius: 10,
    height: 46,
    paddingHorizontal: 14,
  },
  forgot: { color: colors.white, textDecorationLine: 'underline', fontSize: 12 },
  dividerRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 22 },
  divider: { flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.6)' },
  dividerText: { color: colors.white, marginHorizontal: 12 },
});
