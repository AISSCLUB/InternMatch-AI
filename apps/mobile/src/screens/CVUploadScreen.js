import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import colors from '../theme/colors';
import { spacing } from '../theme/spacing';
import { typography } from '../theme/typography';
import ScreenContainer from '../components/ScreenContainer';
import ScreenHeader from '../components/ScreenHeader';
import Card from '../components/Card';
import GradientButton from '../components/GradientButton';
import * as DocumentPicker from 'expo-document-picker';
import { uploadCV, getProcessingJob, ApiError } from '../services/api';
import { useProfile } from '../context/ProfileContext';

const MAX_POLL_DURATION_MS = 60000;
const POLL_INTERVAL_MS = 1500;

export default function CVUploadScreen({ route, navigation }) {
  const [selectedFile, setSelectedFile] = useState(null);
  const [status, setStatus] = useState('idle'); // 'idle' | 'uploading' | 'queued' | 'processing' | 'completed' | 'failed' | 'timeout'
  const [progressPercent, setProgressPercent] = useState(0);
  const [errorMessage, setErrorMessage] = useState(null);
  const [jobId, setJobId] = useState(null);

  const { refreshProfile } = useProfile();

  const pollTimerRef = useRef(null);
  const isMountedRef = useRef(true);
  const isPollingRef = useRef(false);
  const startTimeRef = useRef(0);

  const clearPolling = () => {
    if (pollTimerRef.current) {
      clearTimeout(pollTimerRef.current);
      pollTimerRef.current = null;
    }
    isPollingRef.current = false;
  };

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      clearPolling();
    };
  }, []);

  const pickFileAndUpload = async () => {
    clearPolling();
    setErrorMessage(null);

    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: [
          'application/pdf',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'application/msword',
        ],
        multiple: false,
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return;
      }

      const fileAsset = result.assets[0];

      if (fileAsset.size && fileAsset.size > 10 * 1024 * 1024) {
        Alert.alert('File too large', 'Please choose a document smaller than 10MB.');
        return;
      }

      setSelectedFile(fileAsset);
      await startUploadAndPolling(fileAsset);
    } catch (err) {
      console.warn('Document picker error:', err);
      const msg = err instanceof Error ? err.message : 'Unable to select document.';
      setErrorMessage(msg);
      setStatus('failed');
    }
  };

  const startUploadAndPolling = async (fileAsset) => {
    setStatus('uploading');
    setProgressPercent(10);
    setErrorMessage(null);

    try {
      const uploadRes = await uploadCV({
        uri: fileAsset.uri,
        name: fileAsset.name,
        type: fileAsset.mimeType || 'application/pdf',
      });

      if (!isMountedRef.current) return;

      setJobId(uploadRes.job_id);
      setStatus('queued');
      setProgressPercent(15);
      startTimeRef.current = Date.now();

      scheduleNextPoll(uploadRes.job_id);
    } catch (err) {
      if (!isMountedRef.current) return;
      console.warn('CV upload failed:', err);
      const msg = err instanceof Error ? err.message : 'CV upload failed. Please check connection.';
      setErrorMessage(msg);
      setStatus('failed');
    }
  };

  const scheduleNextPoll = (activeJobId) => {
    clearPolling();
    if (!isMountedRef.current) return;

    pollTimerRef.current = setTimeout(() => {
      pollJobStatus(activeJobId);
    }, POLL_INTERVAL_MS);
  };

  const pollJobStatus = async (activeJobId) => {
    if (!isMountedRef.current || isPollingRef.current) return;

    if (Date.now() - startTimeRef.current > MAX_POLL_DURATION_MS) {
      setStatus('timeout');
      setErrorMessage('Processing is taking longer than expected. You can check your profile later.');
      clearPolling();
      return;
    }

    isPollingRef.current = true;

    try {
      const job = await getProcessingJob(activeJobId);

      if (!isMountedRef.current) return;

      if (job.status === 'queued') {
        setStatus('queued');
        setProgressPercent(job.progress_percent);
        isPollingRef.current = false;
        scheduleNextPoll(activeJobId);
      } else if (job.status === 'processing') {
        setStatus('processing');
        setProgressPercent(job.progress_percent);
        isPollingRef.current = false;
        scheduleNextPoll(activeJobId);
      } else if (job.status === 'completed') {
        setProgressPercent(100);
        clearPolling();

        try {
          await refreshProfile();
        } catch (profileErr) {
          console.warn('Profile refresh after CV completion failed:', profileErr);
          if (isMountedRef.current) {
            setStatus('failed');
            setErrorMessage('CV processing completed, but the updated profile could not be loaded. Please try again.');
          }
          return;
        }

        if (isMountedRef.current) {
          setStatus('completed');
        }
      } else if (job.status === 'failed') {
        clearPolling();
        setStatus('failed');
        setProgressPercent(100);
        const serverError = job.error || 'CV processing failed on the server.';
        setErrorMessage(serverError);
      }
    } catch (err) {
      if (!isMountedRef.current) return;
      console.warn('Polling error:', err);
      isPollingRef.current = false;

      if (err instanceof ApiError && err.status === 401) {
        setStatus('failed');
        setErrorMessage('Session expired. Please sign in again.');
      } else {
        // Transient network failure; schedule retry
        scheduleNextPoll(activeJobId);
      }
    }
  };

  const handleStopPolling = () => {
    clearPolling();
    setStatus('idle');
    setProgressPercent(0);
    setErrorMessage(null);
  };

  const handleFinish = () => {
    if (route?.params?.origin === 'Home') {
      navigation.navigate('MainTabs', { screen: 'Home' });
    } else {
      navigation.goBack();
    }
  };

  const isWorking = status === 'uploading' || status === 'queued' || status === 'processing';

  return (
    <ScreenContainer edges={['top', 'bottom']}>
      <ScreenHeader
        title="CV Upload & Analysis"
        showBack={true}
        navigation={navigation}
      />

      <ScrollView
        style={styles.screen}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.subtitle}>
          Upload your PDF or Word resume. Our AI extracts your skills, education, and experience to calculate personalized internship matches.
        </Text>

        {/* Upload Drop Zone */}
        {!isWorking && status !== 'completed' && (
          <TouchableOpacity
            style={styles.dropZone}
            onPress={pickFileAndUpload}
            accessibilityRole="button"
            accessibilityLabel="Select document to upload"
            activeOpacity={0.7}
          >
            <Ionicons
              name="cloud-upload-outline"
              size={36}
              color={colors.accent || colors.teal}
            />
            <Text style={styles.dropText}>
              {selectedFile ? selectedFile.name : 'Tap to select PDF or DOCX (max 10MB)'}
            </Text>
            <Text style={styles.dropHint}>Supports .pdf and .docx documents</Text>
          </TouchableOpacity>
        )}

        {/* In-Progress State */}
        {isWorking && (
          <Card style={styles.workingCard} padding="lg">
            <View style={styles.iconCircle}>
              <ActivityIndicator size="large" color={colors.accent || colors.teal} />
            </View>
            <Text style={styles.workingTitle}>
              {status === 'uploading'
                ? 'Uploading Document...'
                : status === 'queued'
                ? 'Queued for AI Processing...'
                : 'Extracting Profile & Skills...'}
            </Text>
            <Text style={styles.workingFileName}>{selectedFile?.name}</Text>

            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${progressPercent}%` }]} />
            </View>
            <Text style={styles.percentText}>{progressPercent}%</Text>

            <Text style={styles.workingNotice}>
              Gemini is validating and structuring your candidate profile. This typically takes 10-20 seconds.
            </Text>

            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={handleStopPolling}
              accessibilityRole="button"
              accessibilityLabel="Cancel Polling"
            >
              <Text style={styles.cancelText}>Cancel Polling</Text>
            </TouchableOpacity>
          </Card>
        )}

        {/* Completed Success State */}
        {status === 'completed' && (
          <Card variant="highlight" style={styles.successCard} padding="lg">
            <Ionicons
              name="checkmark-circle"
              size={48}
              color={colors.success || '#10B981'}
            />
            <Text style={styles.successTitle}>CV Analyzed Successfully!</Text>
            <Text style={styles.successDescription}>
              Your candidate profile, verified skills, and background have been extracted and embedded for matching.
            </Text>

            <GradientButton
              title="View Updated Profile"
              color={colors.accent || colors.teal}
              onPress={() => navigation.navigate('MainTabs', { screen: 'Profile' })}
              style={{ marginTop: spacing.xl, width: '100%' }}
            />

            <TouchableOpacity
              style={styles.secondaryBtn}
              onPress={handleFinish}
              accessibilityRole="button"
              accessibilityLabel="Back to Dashboard"
            >
              <Text style={styles.secondaryBtnText}>Back to Dashboard</Text>
            </TouchableOpacity>
          </Card>
        )}

        {/* Failed / Error State */}
        {status === 'failed' && (
          <Card style={styles.errorCard} padding="lg">
            <Ionicons
              name="alert-circle"
              size={48}
              color={colors.danger || '#EF4444'}
            />
            <Text style={styles.errorTitle}>Analysis Could Not Complete</Text>
            <Text style={styles.errorMessage}>
              {errorMessage || 'An error occurred during CV analysis.'}
            </Text>

            <GradientButton
              title="Choose Another Document"
              color={colors.primaryBlue}
              onPress={pickFileAndUpload}
              style={{ marginTop: spacing.xl, width: '100%' }}
            />
          </Card>
        )}

        {/* Timeout State */}
        {status === 'timeout' && (
          <Card style={styles.errorCard} padding="lg">
            <Ionicons
              name="time-outline"
              size={48}
              color={colors.warning || '#F59E0B'}
            />
            <Text style={styles.errorTitle}>Processing Still in Progress</Text>
            <Text style={styles.errorMessage}>{errorMessage}</Text>

            <GradientButton
              title="Check Profile"
              color={colors.accent || colors.teal}
              onPress={() => navigation.navigate('MainTabs', { screen: 'Profile' })}
              style={{ marginTop: spacing.xl, width: '100%' }}
            />

            <TouchableOpacity
              style={styles.secondaryBtn}
              onPress={pickFileAndUpload}
              accessibilityRole="button"
              accessibilityLabel="Upload Again"
            >
              <Text style={styles.secondaryBtnText}>Upload Again</Text>
            </TouchableOpacity>
          </Card>
        )}
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background || colors.screenBg,
  },
  content: {
    paddingHorizontal: spacing.screenHorizontalPadding,
    paddingTop: spacing.xs,
    paddingBottom: spacing.xxxl,
  },
  subtitle: {
    ...typography.caption,
    color: colors.textSecondary || colors.textMuted,
    textAlign: 'center',
    marginBottom: spacing.lg,
    lineHeight: 18,
  },
  dropZone: {
    borderWidth: 2,
    borderColor: colors.accent || colors.teal,
    borderStyle: 'dashed',
    borderRadius: spacing.radii.lg,
    paddingVertical: spacing.xxxl,
    paddingHorizontal: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
  },
  dropText: {
    marginTop: spacing.md,
    color: colors.textPrimary || colors.textDark,
    ...typography.bodyEmphasis,
    textAlign: 'center',
  },
  dropHint: {
    marginTop: spacing.xs,
    color: colors.textSecondary || colors.textMuted,
    ...typography.caption,
  },
  workingCard: {
    alignItems: 'center',
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.accentSoft || '#E6F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  workingTitle: {
    ...typography.cardTitle,
    color: colors.textPrimary || colors.textDark,
    textAlign: 'center',
  },
  workingFileName: {
    ...typography.caption,
    color: colors.textSecondary || colors.textMuted,
    marginTop: spacing.xs,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  progressTrack: {
    width: '100%',
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.borderSubtle || '#E2E8F0',
    overflow: 'hidden',
  },
  progressFill: {
    height: 6,
    backgroundColor: colors.accent || colors.teal,
  },
  percentText: {
    ...typography.caption,
    fontWeight: '600',
    color: colors.accent || colors.teal,
    alignSelf: 'flex-end',
    marginTop: spacing.xs,
  },
  workingNotice: {
    ...typography.caption,
    color: colors.textSecondary || colors.textMuted,
    marginTop: spacing.md,
    textAlign: 'center',
    lineHeight: 18,
  },
  cancelBtn: {
    marginTop: spacing.lg,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    minHeight: spacing.minimumTouchTarget,
    justifyContent: 'center',
  },
  cancelText: {
    ...typography.caption,
    color: colors.textSecondary || colors.textMuted,
    textDecorationLine: 'underline',
  },
  successCard: {
    alignItems: 'center',
    borderColor: colors.success || '#10B981',
  },
  successTitle: {
    ...typography.cardTitle,
    fontSize: 18,
    color: colors.textPrimary || colors.textDark,
    marginTop: spacing.md,
  },
  successDescription: {
    ...typography.caption,
    color: colors.textSecondary || colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.xs,
    lineHeight: 18,
  },
  errorCard: {
    alignItems: 'center',
    borderColor: colors.dangerSoft || '#FEE2E2',
    backgroundColor: '#FEF2F2',
  },
  errorTitle: {
    ...typography.cardTitle,
    fontSize: 18,
    color: colors.danger || '#EF4444',
    marginTop: spacing.md,
  },
  errorMessage: {
    ...typography.caption,
    color: colors.danger || '#EF4444',
    textAlign: 'center',
    marginTop: spacing.xs,
    lineHeight: 18,
  },
  secondaryBtn: {
    marginTop: spacing.md,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    minHeight: spacing.minimumTouchTarget,
    justifyContent: 'center',
  },
  secondaryBtnText: {
    ...typography.button,
    color: colors.textPrimary || colors.textDark,
  },
});
