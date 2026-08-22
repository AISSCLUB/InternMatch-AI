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
import { useTranslation } from 'react-i18next';
import colors from '../theme/colors';
import { spacing } from '../theme/spacing';
import { typography } from '../theme/typography';
import ScreenContainer from '../components/ScreenContainer';
import ScreenHeader from '../components/ScreenHeader';
import Card from '../components/Card';
import GradientButton from '../components/GradientButton';
import BrandedAILoader from '../components/motion/BrandedAILoader';
import * as DocumentPicker from 'expo-document-picker';
import { uploadCV, getProcessingJob, ApiError } from '../services/api';
import { useProfile } from '../context/ProfileContext';
import haptics from '../services/haptics';

const MAX_POLL_DURATION_MS = 60000;
const POLL_INTERVAL_MS = 1500;

export default function CVUploadScreen({ route, navigation }) {
  const { t } = useTranslation();
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
        Alert.alert(t('cvUpload.fileTooLargeTitle'), t('cvUpload.fileTooLargeMsg'));
        return;
      }

      setSelectedFile(fileAsset);
      await startUploadAndPolling(fileAsset);
    } catch (err) {
      console.warn('Document picker error:', err);
      setErrorMessage('CV_PICKER_ERROR');
      setStatus('failed');
      haptics.error();
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
      setErrorMessage('CV_UPLOAD_FAILED');
      setStatus('failed');
      haptics.error();
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
      setErrorMessage('CV_TIMEOUT');
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
            setErrorMessage('PROFILE_REFRESH_FAILED');
            haptics.error();
          }
          return;
        }

        if (isMountedRef.current) {
          setStatus('completed');
          haptics.success();
        }
      } else if (job.status === 'failed') {
        clearPolling();
        setStatus('failed');
        setProgressPercent(100);
        setErrorMessage('CV_EXTRACTION_FAILED');
        haptics.error();
      }
    } catch (err) {
      if (!isMountedRef.current) return;
      console.warn('Polling error:', err);
      isPollingRef.current = false;

      if (err instanceof ApiError && err.status === 401) {
        setStatus('failed');
        setErrorMessage('UNAUTHENTICATED');
        haptics.error();
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
  const isAIProcessing = status === 'queued' || status === 'processing';

  return (
    <ScreenContainer edges={['top', 'bottom']}>
      <ScreenHeader
        title={t('cvUpload.title')}
        showBack={true}
        navigation={navigation}
      />

      <ScrollView
        style={styles.screen}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.subtitle}>
          {t('cvUpload.subtitle')}
        </Text>

        {/* Upload Drop Zone */}
        {!isWorking && status !== 'completed' && (
          <TouchableOpacity
            style={styles.dropZone}
            onPress={pickFileAndUpload}
            accessibilityRole="button"
            accessibilityLabel={t('cvUpload.dropZoneDefault')}
            activeOpacity={0.7}
          >
            <Ionicons
              name="cloud-upload-outline"
              size={36}
              color={colors.accent || colors.teal}
            />
            <Text style={styles.dropText}>
              {selectedFile ? selectedFile.name : t('cvUpload.dropZoneDefault')}
            </Text>
            <Text style={styles.dropHint}>{t('cvUpload.dropHint')}</Text>
          </TouchableOpacity>
        )}

        {/* In-Progress State */}
        {isWorking && (
          <Card style={styles.workingCard} padding="lg">
            <View style={styles.iconCircle}>
              <BrandedAILoader
                size={32}
                color={colors.accent || colors.teal}
                active={isAIProcessing}
              />
            </View>
            <Text style={styles.workingTitle}>
              {status === 'uploading'
                ? t('cvUpload.uploading')
                : status === 'queued'
                ? t('cvUpload.queued')
                : t('cvUpload.extracting')}
            </Text>
            <Text style={styles.workingFileName}>{selectedFile?.name}</Text>

            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${progressPercent}%` }]} />
            </View>
            <Text style={styles.percentText}>{progressPercent}%</Text>

            <Text style={styles.workingNotice}>
              {t('cvUpload.geminiNotice')}
            </Text>

            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={handleStopPolling}
              accessibilityRole="button"
              accessibilityLabel={t('cvUpload.cancelPolling')}
            >
              <Text style={styles.cancelText}>{t('cvUpload.cancelPolling')}</Text>
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
            <Text style={styles.successTitle}>{t('cvUpload.successTitle')}</Text>
            <Text style={styles.successDescription}>
              {t('cvUpload.successDescription')}
            </Text>

            <GradientButton
              title={t('cvUpload.viewProfile')}
              color={colors.accent || colors.teal}
              onPress={() => navigation.navigate('MainTabs', { screen: 'Profile' })}
              style={{ marginTop: spacing.xl, width: '100%' }}
            />

            <TouchableOpacity
              style={styles.secondaryBtn}
              onPress={handleFinish}
              accessibilityRole="button"
              accessibilityLabel={t('cvUpload.backToDashboard')}
            >
              <Text style={styles.secondaryBtnText}>{t('cvUpload.backToDashboard')}</Text>
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
            <Text style={styles.errorTitle}>{t('cvUpload.errorTitle')}</Text>
            <Text style={styles.errorMessage}>
              {errorMessage === 'CV_TIMEOUT'
                ? t('cvUpload.timeoutMessage')
                : errorMessage === 'UNAUTHENTICATED'
                  ? t('errors.unauthenticated')
                  : errorMessage === 'CV_PICKER_ERROR'
                    ? t('cvUpload.errors.selectDoc', { defaultValue: t('cvUpload.errorTitle') })
                    : errorMessage === 'CV_EXTRACTION_FAILED'
                      ? t('cvUpload.errors.serverProcessingFailed', { defaultValue: t('errors.cvUploadFailed') })
                      : errorMessage === 'PROFILE_REFRESH_FAILED'
                        ? t('cvUpload.errors.profileLoadFailed', { defaultValue: t('cvUpload.errorTitle') })
                        : t('errors.cvUploadFailed')}
            </Text>

            <GradientButton
              title={t('cvUpload.chooseAnother')}
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
            <Text style={styles.errorTitle}>{t('cvUpload.timeoutTitle')}</Text>
            <Text style={styles.errorMessage}>{t('cvUpload.timeoutMessage')}</Text>

            <GradientButton
              title={t('cvUpload.checkProfile')}
              color={colors.accent || colors.teal}
              onPress={() => navigation.navigate('MainTabs', { screen: 'Profile' })}
              style={{ marginTop: spacing.xl, width: '100%' }}
            />

            <TouchableOpacity
              style={styles.secondaryBtn}
              onPress={pickFileAndUpload}
              accessibilityRole="button"
              accessibilityLabel={t('cvUpload.uploadAgain')}
            >
              <Text style={styles.secondaryBtnText}>{t('cvUpload.uploadAgain')}</Text>
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
