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
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
        <Ionicons name="arrow-back" size={22} color={colors.textDark} />
      </TouchableOpacity>

      <Text style={styles.title}>CV Upload & Analysis</Text>
      <Text style={styles.subtitle}>
        Upload your PDF or Word resume. Our AI extracts your skills, education, and experience to calculate personalized internship matches.
      </Text>

      {/* Upload Drop Zone */}
      {!isWorking && status !== 'completed' && (
        <TouchableOpacity style={styles.dropZone} onPress={pickFileAndUpload}>
          <Ionicons name="cloud-upload-outline" size={36} color={colors.teal} />
          <Text style={styles.dropText}>
            {selectedFile ? selectedFile.name : 'Tap to select PDF or DOCX (max 10MB)'}
          </Text>
          <Text style={styles.dropHint}>Supports .pdf and .docx documents</Text>
        </TouchableOpacity>
      )}

      {/* In-Progress State */}
      {isWorking && (
        <View style={styles.card}>
          <View style={styles.iconCircle}>
            <ActivityIndicator size="large" color={colors.teal} />
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

          <TouchableOpacity style={styles.cancelBtn} onPress={handleStopPolling}>
            <Text style={styles.cancelText}>Cancel Polling</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Completed Success State */}
      {status === 'completed' && (
        <View style={[styles.card, styles.successCard]}>
          <Ionicons name="checkmark-circle" size={48} color={colors.green || '#10B981'} />
          <Text style={styles.successTitle}>CV Analyzed Successfully!</Text>
          <Text style={styles.successDescription}>
            Your candidate profile, verified skills, and background have been extracted and embedded for matching.
          </Text>

          <GradientButton
            title="View Updated Profile"
            color={colors.teal}
            onPress={() => navigation.navigate('MainTabs', { screen: 'Profile' })}
            style={{ marginTop: 20, width: '100%' }}
          />

          <TouchableOpacity style={styles.secondaryBtn} onPress={handleFinish}>
            <Text style={styles.secondaryBtnText}>Back to Dashboard</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Failed / Error State */}
      {status === 'failed' && (
        <View style={[styles.card, styles.errorCard]}>
          <Ionicons name="alert-circle" size={48} color={colors.red || '#EF4444'} />
          <Text style={styles.errorTitle}>Analysis Could Not Complete</Text>
          <Text style={styles.errorMessage}>{errorMessage || 'An error occurred during CV analysis.'}</Text>

          <GradientButton
            title="Choose Another Document"
            color={colors.primaryBlue}
            onPress={pickFileAndUpload}
            style={{ marginTop: 20, width: '100%' }}
          />
        </View>
      )}

      {/* Timeout State */}
      {status === 'timeout' && (
        <View style={[styles.card, styles.errorCard]}>
          <Ionicons name="time-outline" size={48} color={colors.orange || '#F59E0B'} />
          <Text style={styles.errorTitle}>Processing Still in Progress</Text>
          <Text style={styles.errorMessage}>{errorMessage}</Text>

          <GradientButton
            title="Check Profile"
            color={colors.teal}
            onPress={() => navigation.navigate('MainTabs', { screen: 'Profile' })}
            style={{ marginTop: 20, width: '100%' }}
          />

          <TouchableOpacity style={styles.secondaryBtn} onPress={pickFileAndUpload}>
            <Text style={styles.secondaryBtnText}>Upload Again</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.cardBg },
  content: { padding: 20, paddingBottom: 40 },
  backBtn: { marginBottom: 12 },
  title: { fontSize: 22, fontWeight: '700', color: colors.textDark, textAlign: 'center', marginBottom: 6 },
  subtitle: { fontSize: 13, color: colors.textMuted, textAlign: 'center', marginBottom: 24, lineHeight: 18 },
  dropZone: {
    borderWidth: 2,
    borderColor: colors.teal,
    borderStyle: 'dashed',
    borderRadius: 16,
    paddingVertical: 36,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
  },
  dropText: { marginTop: 12, color: colors.textDark, fontSize: 14, fontWeight: '600', textAlign: 'center' },
  dropHint: { marginTop: 6, color: colors.textMuted, fontSize: 12 },
  card: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  successCard: { borderColor: colors.green || '#10B981', borderWidth: 1.5 },
  errorCard: { borderColor: colors.red || '#EF4444', borderWidth: 1.5 },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#E6F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  workingTitle: { fontSize: 16, fontWeight: '700', color: colors.textDark, textAlign: 'center' },
  workingFileName: { fontSize: 13, color: colors.textMuted, marginTop: 4, marginBottom: 16, textAlign: 'center' },
  progressTrack: { width: '100%', height: 8, borderRadius: 4, backgroundColor: '#E2E8F0', overflow: 'hidden' },
  progressFill: { height: 8, backgroundColor: colors.teal },
  percentText: { fontSize: 12, fontWeight: '600', color: colors.teal, alignSelf: 'flex-end', marginTop: 4 },
  workingNotice: { fontSize: 12, color: colors.textMuted, marginTop: 16, textAlign: 'center', lineHeight: 16 },
  cancelBtn: { marginTop: 20, paddingVertical: 8, paddingHorizontal: 16 },
  cancelText: { color: colors.textMuted, fontSize: 13, textDecorationLine: 'underline' },
  successTitle: { fontSize: 18, fontWeight: '700', color: colors.textDark, marginTop: 12 },
  successDescription: { fontSize: 13, color: colors.textMuted, textAlign: 'center', marginTop: 8, lineHeight: 18 },
  errorTitle: { fontSize: 18, fontWeight: '700', color: colors.textDark, marginTop: 12 },
  errorMessage: { fontSize: 13, color: colors.red || '#EF4444', textAlign: 'center', marginTop: 8, lineHeight: 18 },
  secondaryBtn: { marginTop: 14, paddingVertical: 10, alignItems: 'center' },
  secondaryBtnText: { color: colors.textDark, fontWeight: '600', fontSize: 14 },
});
