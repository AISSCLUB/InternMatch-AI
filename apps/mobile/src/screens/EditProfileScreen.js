import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Image,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import colors from '../theme/colors';
import { spacing } from '../theme/spacing';
import { typography } from '../theme/typography';
import ScreenContainer from '../components/ScreenContainer';
import ScreenHeader from '../components/ScreenHeader';
import Chip from '../components/Chip';
import GradientButton from '../components/GradientButton';
import { useProfile } from '../context/ProfileContext';
import { upsertProfile, uploadAvatar, deleteAvatar } from '../services/api';
import haptics from '../services/haptics';

function getInitials(name) {
  if (!name || typeof name !== 'string') return '';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function normalizeUrl(rawUrl) {
  if (!rawUrl || typeof rawUrl !== 'string') return null;
  let trimmed = rawUrl.trim();
  if (!trimmed) return null;

  // Block dangerous schemes
  const lower = trimmed.toLowerCase();
  if (
    lower.startsWith('javascript:') ||
    lower.startsWith('data:') ||
    lower.startsWith('vbscript:') ||
    lower.startsWith('file:')
  ) {
    return null;
  }

  // Prepend https:// if no scheme provided
  if (!/^https?:\/\//i.test(trimmed)) {
    trimmed = 'https://' + trimmed;
  }

  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return null;
    }
    return parsed.toString();
  } catch {
    // Regex validation fallback
    if (/^https?:\/\/[^\s$.?#].[^\s]*$/i.test(trimmed)) {
      return trimmed;
    }
    return null;
  }
}

export default function EditProfileScreen({ navigation }) {
  const { profile, setProfile, refreshProfile } = useProfile();

  const [fullName, setFullName] = useState(profile?.full_name ?? '');
  const [headline, setHeadline] = useState(profile?.headline ?? '');
  const [department, setDepartment] = useState(
    typeof profile?.preferences?.department === 'string' ? profile.preferences.department : ''
  );
  const [linkedinUrl, setLinkedinUrl] = useState(
    typeof profile?.preferences?.linkedin_url === 'string' ? profile.preferences.linkedin_url : ''
  );
  const [githubUrl, setGithubUrl] = useState(
    typeof profile?.preferences?.github_url === 'string' ? profile.preferences.github_url : ''
  );
  const [portfolioUrl, setPortfolioUrl] = useState(
    typeof profile?.preferences?.portfolio_url === 'string' ? profile.preferences.portfolio_url : ''
  );

  const [avatarUri, setAvatarUri] = useState(profile?.avatar_url ?? null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [saving, setSaving] = useState(false);

  const skills = profile?.skills || [];
  const currentAvatar = avatarUri || profile?.avatar_url || null;
  const initials = getInitials(fullName || profile?.full_name);

  const handlePickImage = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(
          'Permission Required',
          'Please allow photo library access to choose a profile picture.'
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.85,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return;
      }

      const asset = result.assets[0];
      setAvatarUri(asset.uri);
      setUploadingAvatar(true);

      try {
        const uploadRes = await uploadAvatar({
          uri: asset.uri,
          name: asset.fileName || 'avatar.jpg',
          type: asset.mimeType || 'image/jpeg',
        });
        setAvatarUri(uploadRes.avatar_url);
        await refreshProfile();
        haptics.success();
      } catch (err) {
        setAvatarUri(profile?.avatar_url || null);
        const msg = err instanceof Error ? err.message : 'Failed to upload profile picture.';
        Alert.alert('Upload Failed', msg);
        haptics.error();
      } finally {
        setUploadingAvatar(false);
      }
    } catch (err) {
      console.warn('Image picker error:', err);
      setUploadingAvatar(false);
    }
  };

  const handleRemoveAvatar = async () => {
    setUploadingAvatar(true);
    try {
      await deleteAvatar();
      setAvatarUri(null);
      await refreshProfile();
      haptics.success();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to remove profile picture.';
      Alert.alert('Remove Failed', msg);
      haptics.error();
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleAvatarPress = () => {
    if (uploadingAvatar) return;

    if (currentAvatar) {
      Alert.alert('Profile Picture', 'Choose an option', [
        { text: 'Choose from Library', onPress: handlePickImage },
        { text: 'Remove Photo', style: 'destructive', onPress: handleRemoveAvatar },
        { text: 'Cancel', style: 'cancel' },
      ]);
    } else {
      handlePickImage();
    }
  };

  const handleSave = async () => {
    const trimmedName = fullName.trim();
    if (!trimmedName) {
      haptics.error();
      Alert.alert('Edit Profile', 'Please enter your full name.');
      return;
    }

    if (saving) return;

    const normalizedLinkedin = normalizeUrl(linkedinUrl);
    const normalizedGithub = normalizeUrl(githubUrl);
    const normalizedPortfolio = normalizeUrl(portfolioUrl);

    if (linkedinUrl.trim() && !normalizedLinkedin) {
      haptics.error();
      Alert.alert('Invalid LinkedIn URL', 'Please enter a valid website address.');
      return;
    }
    if (githubUrl.trim() && !normalizedGithub) {
      haptics.error();
      Alert.alert('Invalid GitHub URL', 'Please enter a valid website address.');
      return;
    }
    if (portfolioUrl.trim() && !normalizedPortfolio) {
      haptics.error();
      Alert.alert('Invalid Portfolio URL', 'Please enter a valid website address.');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        full_name: trimmedName,
        headline: headline.trim() || (department.trim() ? department.trim() : null),
        preferences: {
          ...(profile?.preferences || {}),
          department: department.trim() || null,
          linkedin_url: normalizedLinkedin,
          github_url: normalizedGithub,
          portfolio_url: normalizedPortfolio,
        },
      };

      const updated = await upsertProfile(payload);
      setProfile(updated);
      haptics.success();
      navigation.goBack();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to save profile.';
      Alert.alert('Save failed', message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScreenContainer edges={['top', 'bottom']}>
      <ScreenHeader
        title="Edit Profile"
        showBack={true}
        navigation={navigation}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}
      >
        <ScrollView
          style={styles.screen}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Circular Interactive Avatar */}
          <View style={styles.avatarWrap}>
            <TouchableOpacity
              style={styles.avatarTouchTarget}
              onPress={handleAvatarPress}
              disabled={uploadingAvatar}
              accessibilityRole="button"
              accessibilityLabel="Change profile picture"
              accessibilityHint="Tap to choose or remove profile photo"
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <View style={styles.avatarContainer}>
                {uploadingAvatar ? (
                  <ActivityIndicator size="small" color={colors.accent || colors.teal} />
                ) : currentAvatar ? (
                  <Image source={{ uri: currentAvatar }} style={styles.avatarImage} />
                ) : initials ? (
                  <Text style={styles.avatarInitials}>{initials}</Text>
                ) : (
                  <Ionicons
                    name="person-add-outline"
                    size={28}
                    color={colors.accent || colors.teal}
                  />
                )}

                {/* Camera / Edit Badge Indicator */}
                {!uploadingAvatar && (
                  <View style={styles.editBadge}>
                    <Ionicons name="camera" size={13} color="#FFFFFF" />
                  </View>
                )}
              </View>
            </TouchableOpacity>
            <Text style={styles.avatarLabel}>
              {currentAvatar ? 'Change Photo' : 'Add Photo'}
            </Text>
          </View>

          <Text style={styles.sectionTitle}>Basic Information</Text>

          <Text style={styles.label}>Full Name</Text>
          <TextInput
            style={styles.input}
            placeholder="Full Name"
            placeholderTextColor={colors.textTertiary || colors.textMuted}
            value={fullName}
            onChangeText={setFullName}
          />

          <Text style={styles.label}>Headline</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Computer Science Student"
            placeholderTextColor={colors.textTertiary || colors.textMuted}
            value={headline}
            onChangeText={setHeadline}
          />

          <Text style={styles.label}>Department / Major</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Computer Engineering"
            placeholderTextColor={colors.textTertiary || colors.textMuted}
            value={department}
            onChangeText={setDepartment}
          />

          <Text style={styles.sectionTitle}>Social & Portfolio Links</Text>

          <Text style={styles.label}>LinkedIn URL</Text>
          <TextInput
            style={styles.input}
            placeholder="https://linkedin.com/in/username"
            placeholderTextColor={colors.textTertiary || colors.textMuted}
            value={linkedinUrl}
            onChangeText={setLinkedinUrl}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
          />

          <Text style={styles.label}>GitHub URL</Text>
          <TextInput
            style={styles.input}
            placeholder="https://github.com/username"
            placeholderTextColor={colors.textTertiary || colors.textMuted}
            value={githubUrl}
            onChangeText={setGithubUrl}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
          />

          <Text style={styles.label}>Portfolio Website</Text>
          <TextInput
            style={styles.input}
            placeholder="https://yourportfolio.com"
            placeholderTextColor={colors.textTertiary || colors.textMuted}
            value={portfolioUrl}
            onChangeText={setPortfolioUrl}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
          />

          {skills.length > 0 && (
            <>
              <Text style={styles.sectionTitle}>Skills (Extracted from CV)</Text>
              <View style={styles.chipRow}>
                {skills.map((s) => (
                  <Chip key={s} label={s} variant="skill" />
                ))}
              </View>
            </>
          )}

          <GradientButton
            title={saving ? 'Saving...' : 'Save'}
            color={colors.accent || colors.teal}
            onPress={handleSave}
            style={{ marginTop: spacing.lg }}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  screen: {
    flex: 1,
    backgroundColor: colors.background || colors.screenBg,
  },
  content: {
    paddingHorizontal: spacing.screenHorizontalPadding,
    paddingTop: spacing.xs,
    paddingBottom: spacing.xxxl,
  },
  avatarWrap: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  avatarTouchTarget: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarContainer: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 2,
    borderColor: colors.accent || colors.teal,
    backgroundColor: colors.surface || colors.cardBg,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    shadowColor: 'rgba(14, 116, 144, 0.2)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 4,
    elevation: 2,
  },
  avatarImage: {
    width: 72,
    height: 72,
    borderRadius: 36,
  },
  avatarInitials: {
    ...typography.display,
    fontSize: 22,
    fontWeight: '700',
    color: colors.accentStrong || colors.tealDark,
  },
  editBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.accentStrong || colors.tealDark,
    borderWidth: 2,
    borderColor: colors.surface || '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLabel: {
    ...typography.caption,
    fontWeight: '600',
    color: colors.accentStrong || colors.tealDark,
    marginTop: spacing.xs + 2,
  },
  label: {
    ...typography.caption,
    fontWeight: '600',
    color: colors.textPrimary || colors.textDark,
    marginBottom: spacing.xxs + 2,
    marginStart: spacing.xxs,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.borderSubtle || colors.border,
    backgroundColor: colors.surface || colors.cardBg,
    borderRadius: spacing.radii.md,
    minHeight: 46,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
    justifyContent: 'center',
    color: colors.textPrimary || colors.textDark,
    ...typography.body,
  },
  sectionTitle: {
    ...typography.sectionTitle,
    color: colors.textPrimary || colors.textDark,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
});
