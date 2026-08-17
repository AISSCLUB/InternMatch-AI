import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import colors from '../theme/colors';
import { spacing } from '../theme/spacing';
import { typography } from '../theme/typography';
import ScreenContainer from '../components/ScreenContainer';
import ScreenHeader from '../components/ScreenHeader';
import Card from '../components/Card';
import GradientButton from '../components/GradientButton';
import { updateApplicationStatus, ApiError } from '../services/api';
import haptics from '../services/haptics';

const STATUS_LABELS = {
  saved: 'Saved',
  applied: 'Applied',
  interviewing: 'Interviewing',
  rejected: 'Rejected',
  accepted: 'Accepted',
};

export default function CoverLetterScreen({ route, navigation }) {
  const applicationId = route?.params?.applicationId;
  const initialDraft = route?.params?.draft ?? '';
  const initialStatus = route?.params?.currentStatus ?? 'saved';
  const companyName = route?.params?.companyName;
  const jobTitle = route?.params?.jobTitle;

  const [text, setText] = useState(initialDraft);
  const [currentStatus, setCurrentStatus] = useState(initialStatus);
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateError, setUpdateError] = useState(null);

  const handleMarkAsApplied = async () => {
    if (!applicationId) {
      Alert.alert(
        'Missing Reference',
        'Application record not found. Please navigate from the Application Tracker.'
      );
      return;
    }

    setIsUpdating(true);
    setUpdateError(null);

    try {
      const updated = await updateApplicationStatus(applicationId, {
        status: 'applied',
      });

      haptics.success();
      setCurrentStatus(updated.status);

      Alert.alert(
        'Tracker Updated',
        'Application marked as applied in your tracker.',
        [
          {
            text: 'Go to Applications',
            onPress: () =>
              navigation.navigate('MainTabs', { screen: 'Applications' }),
          },
          { text: 'Stay Here', style: 'cancel' },
        ]
      );
    } catch (err) {
      console.warn('Failed to update application status:', err);
      let msg = 'Unable to update application status.';
      if (err instanceof ApiError) {
        msg = err.message || msg;
      } else if (err instanceof Error) {
        msg = err.message;
      }
      setUpdateError(msg);
      Alert.alert('Update Failed', msg);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <ScreenContainer edges={['top', 'bottom']}>
      <ScreenHeader
        title="Cover Letter"
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
          {/* Role & Company Header */}
          {(jobTitle || companyName) && (
            <Card style={styles.roleCard} padding="md">
              <Text style={styles.roleTitle}>{jobTitle || 'Internship'}</Text>
              {companyName ? (
                <Text style={styles.companyName}>{companyName}</Text>
              ) : null}
            </Card>
          )}

          {/* Tracker Status Pill */}
          <View style={styles.statusRow}>
            <Text style={styles.statusHeading}>TRACKER STATUS:</Text>
            <View
              style={[
                styles.statusPill,
                currentStatus === 'applied' && styles.statusPillApplied,
                currentStatus === 'interviewing' && styles.statusPillInterviewing,
                currentStatus === 'accepted' && styles.statusPillAccepted,
              ]}
            >
              <Text
                style={[
                  styles.statusPillText,
                  currentStatus === 'applied' && styles.statusTextApplied,
                  currentStatus === 'interviewing' && styles.statusTextInterviewing,
                  currentStatus === 'accepted' && styles.statusTextAccepted,
                ]}
              >
                {STATUS_LABELS[currentStatus] || currentStatus}
              </Text>
            </View>
          </View>

          {/* Notice on Edit Semantics */}
          <View style={styles.noticeBox}>
            <Ionicons
              name="information-circle-outline"
              size={16}
              color={colors.accentStrong || colors.tealDark}
              style={styles.noticeIcon}
            />
            <Text style={styles.noticeText}>
              You can customize this draft below for external submission. Generating this draft created a tracker record.
            </Text>
          </View>

          {/* Editable Cover Letter Input */}
          <Card style={styles.draftCard} padding="md">
            <TextInput
              style={styles.input}
              value={text}
              onChangeText={setText}
              multiline
              textAlignVertical="top"
              placeholder="Your generated cover letter will appear here..."
              placeholderTextColor={colors.textTertiary || colors.textMuted}
            />
          </Card>

          {updateError && (
            <Text style={styles.errorBanner}>{updateError}</Text>
          )}

          {/* Actions */}
          {currentStatus === 'saved' ? (
            <View style={styles.actionContainer}>
              {isUpdating ? (
                <ActivityIndicator
                  size="small"
                  color={colors.accent || colors.teal}
                  style={{ marginTop: spacing.lg }}
                />
              ) : (
                <GradientButton
                  title="Mark as Applied"
                  color={colors.accent || colors.teal}
                  onPress={handleMarkAsApplied}
                  style={{ marginTop: spacing.lg }}
                />
              )}
            </View>
          ) : (
            <View style={styles.actionContainer}>
              <TouchableOpacity
                style={styles.trackerBtn}
                onPress={() =>
                  navigation.navigate('MainTabs', { screen: 'Applications' })
                }
                accessibilityRole="button"
                accessibilityLabel="View in Application Tracker"
              >
                <Ionicons
                  name="list-outline"
                  size={16}
                  color={colors.accentStrong || colors.tealDark}
                  style={styles.trackerIcon}
                />
                <Text style={styles.trackerBtnText}>
                  View in Application Tracker
                </Text>
              </TouchableOpacity>
            </View>
          )}
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
  roleCard: {
    marginBottom: spacing.md,
  },
  roleTitle: {
    ...typography.cardTitle,
    color: colors.textPrimary || colors.textDark,
  },
  companyName: {
    ...typography.caption,
    color: colors.textSecondary || colors.textMuted,
    marginTop: spacing.xxs,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  statusHeading: {
    ...typography.eyebrow,
    color: colors.textSecondary || colors.textMuted,
    marginEnd: spacing.sm,
  },
  statusPill: {
    backgroundColor: colors.surfaceMuted || '#F1F5F9',
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xxs + 1,
    borderRadius: spacing.radii.sm,
  },
  statusPillApplied: {
    backgroundColor: colors.infoSoft || '#E0F2FE',
  },
  statusPillInterviewing: {
    backgroundColor: colors.warningSoft || '#FEF3C7',
  },
  statusPillAccepted: {
    backgroundColor: colors.successSoft || '#DCFCE7',
  },
  statusPillText: {
    ...typography.badge,
    fontSize: 11,
    color: colors.textSecondary || colors.textMuted,
  },
  statusTextApplied: {
    color: colors.info || '#0369A1',
  },
  statusTextInterviewing: {
    color: colors.warning || '#B45309',
  },
  statusTextAccepted: {
    color: colors.success || '#15803D',
  },
  noticeBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.accentSoft || '#E6F4F6',
    borderRadius: spacing.radii.sm,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  noticeIcon: {
    marginEnd: spacing.xs,
    marginTop: spacing.xxs,
  },
  noticeText: {
    flex: 1,
    ...typography.caption,
    color: colors.accentStrong || colors.tealDark,
    lineHeight: 18,
  },
  draftCard: {
    minHeight: 260,
    borderWidth: 1.5,
    borderColor: colors.accent || colors.teal,
  },
  input: {
    ...typography.body,
    color: colors.textPrimary || colors.textDark,
    lineHeight: 22,
    flex: 1,
  },
  errorBanner: {
    ...typography.caption,
    color: colors.danger || '#EF4444',
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  actionContainer: {
    marginTop: spacing.xs,
  },
  trackerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    backgroundColor: colors.accentSoft || '#E6F4F6',
    borderRadius: spacing.radii.md,
    minHeight: spacing.minimumTouchTarget,
  },
  trackerBtnText: {
    ...typography.button,
    color: colors.accentStrong || colors.tealDark,
    fontSize: 14,
  },
  trackerIcon: {
    marginEnd: spacing.xs,
  },
});
