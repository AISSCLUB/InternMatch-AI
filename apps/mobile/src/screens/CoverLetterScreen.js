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
import GradientButton from '../components/GradientButton';
import { updateApplicationStatus, ApiError } from '../services/api';

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
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.screen}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
        >
          <Ionicons name="arrow-back" size={22} color={colors.textDark} />
        </TouchableOpacity>

        <Text style={styles.title}>Cover Letter</Text>

        {/* Role & Company Header */}
        {(jobTitle || companyName) && (
          <View style={styles.roleHeader}>
            <Text style={styles.roleTitle}>{jobTitle || 'Internship'}</Text>
            {companyName && (
              <Text style={styles.companyName}>{companyName}</Text>
            )}
          </View>
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
            color={colors.tealDark}
            style={{ marginRight: 6 }}
          />
          <Text style={styles.noticeText}>
            You can customize this draft below for external submission. Generating this draft created a tracker record.
          </Text>
        </View>

        {/* Editable Cover Letter Input */}
        <View style={styles.draftBox}>
          <TextInput
            style={styles.input}
            value={text}
            onChangeText={setText}
            multiline
            textAlignVertical="top"
            placeholder="Your generated cover letter will appear here..."
            placeholderTextColor={colors.textMuted}
          />
        </View>

        {updateError && (
          <Text style={styles.errorBanner}>{updateError}</Text>
        )}

        {/* Actions */}
        {currentStatus === 'saved' ? (
          <View style={styles.actionContainer}>
            {isUpdating ? (
              <ActivityIndicator
                size="small"
                color={colors.teal}
                style={{ marginTop: 20 }}
              />
            ) : (
              <GradientButton
                title="Mark as Applied"
                color={colors.teal}
                onPress={handleMarkAsApplied}
                style={{ marginTop: 20 }}
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
            >
              <Ionicons
                name="list-outline"
                size={16}
                color={colors.tealDark}
                style={{ marginRight: 6 }}
              />
              <Text style={styles.trackerBtnText}>
                View in Application Tracker
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.cardBg },
  content: { padding: 20, paddingBottom: 40 },
  backBtn: { marginBottom: 8 },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.textDark,
    textAlign: 'center',
    marginBottom: 10,
  },
  roleHeader: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  roleTitle: { fontSize: 15, fontWeight: '700', color: colors.textDark },
  companyName: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  statusHeading: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textMuted,
    letterSpacing: 0.5,
    marginRight: 8,
  },
  statusPill: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  statusPillApplied: { backgroundColor: '#E0F2FE' },
  statusPillInterviewing: { backgroundColor: '#FEF3C7' },
  statusPillAccepted: { backgroundColor: '#DCFCE7' },
  statusPillText: { fontSize: 11, fontWeight: '700', color: colors.textMuted },
  statusTextApplied: { color: '#0369A1' },
  statusTextInterviewing: { color: '#B45309' },
  statusTextAccepted: { color: '#15803D' },
  noticeBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#E6F4F6',
    borderRadius: 10,
    padding: 12,
    marginBottom: 14,
  },
  noticeText: {
    flex: 1,
    fontSize: 12,
    color: colors.tealDark,
    lineHeight: 17,
  },
  draftBox: {
    backgroundColor: colors.white,
    borderWidth: 1.5,
    borderColor: colors.teal,
    borderRadius: 14,
    padding: 16,
    minHeight: 260,
  },
  input: {
    fontSize: 14,
    color: colors.textDark,
    lineHeight: 22,
    flex: 1,
  },
  errorBanner: {
    fontSize: 12,
    color: colors.red || '#EF4444',
    textAlign: 'center',
    marginTop: 10,
  },
  actionContainer: { marginTop: 10 },
  trackerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    backgroundColor: '#E6F4F6',
    borderRadius: 10,
  },
  trackerBtnText: {
    fontSize: 14,
    color: colors.tealDark,
    fontWeight: '600',
  },
});
