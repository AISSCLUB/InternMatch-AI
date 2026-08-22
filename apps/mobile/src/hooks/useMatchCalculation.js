import { useState, useRef, useEffect, useCallback } from 'react';
import { calculateMatches, getProcessingJob, ApiError } from '../services/api';

const POLL_INTERVAL_MS = 1500;
const TIMEOUT_MS = 210000; // 210 seconds (safe buffer above RQ 180s worker timeout)

export function useMatchCalculation() {
  const [isCalculating, setIsCalculating] = useState(false);
  const [progressPercent, setProgressPercent] = useState(0);
  const [calculationError, setCalculationError] = useState(null);

  const isMountedRef = useRef(true);
  const pollTimerRef = useRef(null);
  const isPollingRef = useRef(false);
  const startTimeRef = useRef(0);
  const isCalculatingRef = useRef(false);

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

  const cancelCalculation = useCallback(() => {
    clearPolling();
    isCalculatingRef.current = false;
    if (isMountedRef.current) {
      setIsCalculating(false);
      setProgressPercent(0);
      setCalculationError(null);
    }
  }, [clearPolling]);

  const startCalculation = useCallback(
    async (onComplete) => {
      // Guard against duplicate/concurrent submissions
      if (isCalculatingRef.current) {
        return;
      }

      clearPolling();
      isCalculatingRef.current = true;
      setIsCalculating(true);
      setProgressPercent(0);
      setCalculationError(null);
      startTimeRef.current = Date.now();

      try {
        const acceptRes = await calculateMatches();
        const activeJobId = acceptRes.job_id;

        if (!isMountedRef.current || !isCalculatingRef.current) {
          return;
        }

        setProgressPercent(0);

        const poll = async () => {
          if (!isMountedRef.current || !isCalculatingRef.current || isPollingRef.current) {
            return;
          }

          // Timeout check (210s)
          if (Date.now() - startTimeRef.current > TIMEOUT_MS) {
            clearPolling();
            isCalculatingRef.current = false;
            if (isMountedRef.current) {
              setIsCalculating(false);
              setCalculationError('MATCH_CALCULATION_TIMEOUT');
            }
            return;
          }

          isPollingRef.current = true;

          try {
            const job = await getProcessingJob(activeJobId);

            if (!isMountedRef.current || !isCalculatingRef.current) {
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
              isCalculatingRef.current = false;
              setProgressPercent(100);
              setIsCalculating(false);

              const matchCount = (job.result && typeof job.result.match_count === 'number')
                ? job.result.match_count
                : 0;

              if (onComplete) {
                onComplete(matchCount);
              }
            } else if (job.status === 'failed') {
              clearPolling();
              isCalculatingRef.current = false;
              setProgressPercent(100);
              setIsCalculating(false);
              setCalculationError('MATCH_CALCULATION_FAILED');
            }
          } catch (err) {
            if (!isMountedRef.current || !isCalculatingRef.current) {
              return;
            }
            console.warn('Match calculation poll error:', err);
            isPollingRef.current = false;

            if (err instanceof ApiError && err.status === 401) {
              clearPolling();
              isCalculatingRef.current = false;
              setIsCalculating(false);
              setCalculationError('SESSION_EXPIRED');
            } else {
              // Transient network failure; schedule retry poll
              scheduleNextPoll();
            }
          }
        };

        const scheduleNextPoll = () => {
          clearPolling();
          if (!isMountedRef.current || !isCalculatingRef.current) {
            return;
          }
          pollTimerRef.current = setTimeout(poll, POLL_INTERVAL_MS);
        };

        scheduleNextPoll();
      } catch (err) {
        if (!isMountedRef.current) {
          return;
        }
        console.warn('Failed to enqueue match calculation:', err);
        clearPolling();
        isCalculatingRef.current = false;
        setIsCalculating(false);
        const errorCode = 'MATCH_CALCULATION_START_FAILED';
        setCalculationError(errorCode);
      }
    },
    [clearPolling]
  );

  return {
    isCalculating,
    progressPercent,
    calculationError,
    startCalculation,
    cancelCalculation,
  };
}
