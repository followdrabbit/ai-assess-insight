import { useState, useCallback, useEffect } from 'react';

interface RateLimitState {
  attempts: number;
  lockedUntil: number | null;
  lastAttempt: number | null;
}

const STORAGE_KEY = 'login_rate_limit';
const MAX_ATTEMPTS = 5;
const BASE_LOCKOUT_MS = 30000; // 30 seconds base lockout
const MAX_LOCKOUT_MS = 900000; // 15 minutes max lockout

function getStoredState(): RateLimitState {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch {
    // Ignore parsing errors
  }
  return { attempts: 0, lockedUntil: null, lastAttempt: null };
}

function saveState(state: RateLimitState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Ignore storage errors
  }
}

function calculateLockoutDuration(attempts: number): number {
  // Exponential backoff: 30s, 60s, 120s, 240s, up to 15 min
  const duration = BASE_LOCKOUT_MS * Math.pow(2, Math.min(attempts - MAX_ATTEMPTS, 4));
  return Math.min(duration, MAX_LOCKOUT_MS);
}

export function useLoginRateLimit() {
  const [state, setState] = useState<RateLimitState>(getStoredState);
  const [remainingTime, setRemainingTime] = useState<number>(0);

  // Check and update lockout status
  useEffect(() => {
    const checkLockout = () => {
      const now = Date.now();
      if (state.lockedUntil && now < state.lockedUntil) {
        setRemainingTime(Math.ceil((state.lockedUntil - now) / 1000));
      } else if (state.lockedUntil && now >= state.lockedUntil) {
        // Lockout expired, reset attempts
        const newState = { ...state, lockedUntil: null };
        setState(newState);
        saveState(newState);
        setRemainingTime(0);
      } else {
        setRemainingTime(0);
      }
    };

    checkLockout();
    const interval = setInterval(checkLockout, 1000);
    return () => clearInterval(interval);
  }, [state]);

  // Reset attempts after successful login or after 1 hour of no attempts
  useEffect(() => {
    const now = Date.now();
    if (state.lastAttempt && now - state.lastAttempt > 3600000) {
      const newState = { attempts: 0, lockedUntil: null, lastAttempt: null };
      setState(newState);
      saveState(newState);
    }
  }, [state.lastAttempt]);

  const isLocked = useCallback((): boolean => {
    const now = Date.now();
    return state.lockedUntil !== null && now < state.lockedUntil;
  }, [state.lockedUntil]);

  const recordAttempt = useCallback((success: boolean) => {
    const now = Date.now();

    if (success) {
      // Reset on successful login
      const newState = { attempts: 0, lockedUntil: null, lastAttempt: null };
      setState(newState);
      saveState(newState);
      return;
    }

    // Failed attempt
    const newAttempts = state.attempts + 1;
    let newLockedUntil = state.lockedUntil;

    if (newAttempts >= MAX_ATTEMPTS) {
      const lockoutDuration = calculateLockoutDuration(newAttempts);
      newLockedUntil = now + lockoutDuration;
    }

    const newState = {
      attempts: newAttempts,
      lockedUntil: newLockedUntil,
      lastAttempt: now,
    };
    setState(newState);
    saveState(newState);
  }, [state.attempts, state.lockedUntil]);

  const getAttemptsRemaining = useCallback((): number => {
    return Math.max(0, MAX_ATTEMPTS - state.attempts);
  }, [state.attempts]);

  const formatRemainingTime = useCallback((): string => {
    if (remainingTime <= 0) return '';
    
    const minutes = Math.floor(remainingTime / 60);
    const seconds = remainingTime % 60;
    
    if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    }
    return `${seconds}s`;
  }, [remainingTime]);

  return {
    isLocked,
    recordAttempt,
    getAttemptsRemaining,
    remainingTime,
    formatRemainingTime,
    attempts: state.attempts,
  };
}
