import { useState, useRef, useEffect, useCallback } from 'react';
import { generateApplication, getProcessingJob, ApiError } from '../services/api';

const POLL_INTERVAL_MS = 1500;
const TIMEOUT_MS = 210000; // 210 seconds (safely exceeds RQ 180s worker timeout)

export function useApplicationGeneration() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [progressPercent, setProgressPercent] = useState(0);
  const [generationError, setGenerationError] = useState(null);

  const isMountedRef = useRef(true);
  const pollTimerRef = useRef(null);
  const isPollingRef = useRef(false);
  const startTimeRef = useRef(0);
  const isGeneratingRef = useRef(false);

  const clearPolling = useCallback(() => {
    if (pollTimerRef.current) {
      clearTimeout(pollTimerRef.current);
      pollTimerRef.current = null;
    }
    isPollingRef.current = false;
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      clearPolling();
    };
  }, [clearPolling]);

  const cancelGeneration = useCallback(() => {
    clearPolling();
    isGeneratingRef.current = false;
    if (isMountedRef.current) {
      setIsGenerating(false);
      setProgressPercent(0);
      setGenerationError(null);
    }
  }, [clearPolling]);

  const startGeneration = useCallback(
    async (params, onComplete) => {
      // Guard against duplicate/concurrent submissions
      if (isGeneratingRef.current) {
        return;
      }

      clearPolling();
      isGeneratingRef.current = true;
      setIsGenerating(true);
      setProgressPercent(0);
      setGenerationError(null);
      startTimeRef.current = Date.now();

      try {
        const acceptRes = await generateApplication({
          match_id: params.match_id,
          tone: params.tone,
          content_locale: params.content_locale || 'en',
        });
        const activeJobId = acceptRes.job_id;

        if (!isMountedRef.current || !isGeneratingRef.current) {
          return;
        }

        setProgressPercent(0);

        const poll = async () => {
          if (!isMountedRef.current || !isGeneratingRef.current || isPollingRef.current) {
            return;
          }

          // Timeout check (210s)
          if (Date.now() - startTimeRef.current > TIMEOUT_MS) {
            clearPolling();
            isGeneratingRef.current = false;
            if (isMountedRef.current) {
              setIsGenerating(false);
              setGenerationError(
                'Application generation is taking longer than expected. Please try again later.'
              );
            }
            return;
          }

          isPollingRef.current = true;

          try {
            const job = await getProcessingJob(activeJobId);

            if (!isMountedRef.current || !isGeneratingRef.current) {
              return;
            }

            if (job.status === 'queued') {
              setProgressPercent(job.progress_percent);
              isPollingRef.current = false;
              scheduleNextPoll();
            } else if (job.status === 'processing') {
              setProgressPercent(job.progress_percent);
              isPollingRef.current = false;
              scheduleNextPoll();
            } else if (job.status === 'completed') {
              clearPolling();
              isGeneratingRef.current = false;
              setProgressPercent(100);
              setIsGenerating(false);

              if (onComplete) {
                onComplete(job.result);
              }
            } else if (job.status === 'failed') {
              clearPolling();
              isGeneratingRef.current = false;
              setProgressPercent(100);
              setIsGenerating(false);
              setGenerationError(job.error || 'Application generation failed.');
            }
          } catch (err) {
            if (!isMountedRef.current || !isGeneratingRef.current) {
              return;
            }
            console.warn('Application generation poll error:', err);
            isPollingRef.current = false;

            if (err instanceof ApiError && err.status === 401) {
              clearPolling();
              isGeneratingRef.current = false;
              setIsGenerating(false);
              setGenerationError('Session expired. Please sign in again.');
            } else {
              // Transient network failure; schedule retry poll
              scheduleNextPoll();
            }
          }
        };

        const scheduleNextPoll = () => {
          clearPolling();
          if (!isMountedRef.current || !isGeneratingRef.current) {
            return;
          }
          pollTimerRef.current = setTimeout(poll, POLL_INTERVAL_MS);
        };

        scheduleNextPoll();
      } catch (err) {
        if (!isMountedRef.current) {
          return;
        }
        console.warn('Failed to enqueue application generation:', err);
        clearPolling();
        isGeneratingRef.current = false;
        setIsGenerating(false);

        let msg = 'Failed to start application generation.';
        if (err instanceof ApiError) {
          if (err.status === 404) {
            msg = 'Match record not found. Please refresh matches.';
          } else if (err.status === 429) {
            msg = 'Generation limit reached. Please wait a moment before trying again.';
          } else if (err.status === 503) {
            msg = 'Generation service is temporarily unavailable. Please try again later.';
          } else {
            msg = err.message || msg;
          }
        } else if (err instanceof Error) {
          msg = err.message;
        }
        setGenerationError(msg);
      }
    },
    [clearPolling]
  );

  return {
    isGenerating,
    progressPercent,
    generationError,
    startGeneration,
    cancelGeneration,
  };
}
