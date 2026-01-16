import { useState, useCallback, useRef, useEffect } from 'react';

export interface SpeechSynthesisError {
  type: 'synthesis-failed' | 'network' | 'voice-unavailable' | 'unknown';
  message: string;
}

interface SpeechQueueItem {
  id: string;
  text: string;
  priority: number;
}

export interface VoiceSettingsConfig {
  voice_language?: string;
  voice_rate?: number;
  voice_pitch?: number;
  voice_volume?: number;
  voice_name?: string | null;
  voice_auto_speak?: boolean;
}

interface UseSpeechSynthesisReturn {
  isSpeaking: boolean;
  isPaused: boolean;
  isSupported: boolean;
  error: SpeechSynthesisError | null;
  currentText: string;
  progress: number;
  speak: (text: string, options?: SpeakOptions) => string;
  stop: () => void;
  pause: () => void;
  resume: () => void;
  skip: () => void;
  voices: SpeechSynthesisVoice[];
  selectedVoice: SpeechSynthesisVoice | null;
  setSelectedVoice: (voice: SpeechSynthesisVoice) => void;
  rate: number;
  setRate: (rate: number) => void;
  pitch: number;
  setPitch: (pitch: number) => void;
  volume: number;
  setVolume: (volume: number) => void;
  queueLength: number;
  clearQueue: () => void;
  clearError: () => void;
  autoSpeak: boolean;
  applySettings: (settings: VoiceSettingsConfig) => void;
}

interface SpeakOptions {
  priority?: number;
  voice?: SpeechSynthesisVoice;
  rate?: number;
  pitch?: number;
  volume?: number;
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (error: SpeechSynthesisError) => void;
}

function generateId(): string {
  return `speech-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

function preprocessTextForSpeech(text: string): string {
  // Remove markdown formatting
  let processed = text
    .replace(/\*\*([^*]+)\*\*/g, '$1') // Bold
    .replace(/\*([^*]+)\*/g, '$1') // Italic
    .replace(/`([^`]+)`/g, '$1') // Inline code
    .replace(/```[\s\S]*?```/g, '') // Code blocks
    .replace(/#{1,6}\s*/g, '') // Headers
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Links
    .replace(/\n{3,}/g, '\n\n') // Multiple newlines
    .replace(/[-*]\s+/g, ', ') // List items
    .replace(/\d+\.\s+/g, ', ') // Numbered lists
    .trim();
  
  // Add pauses for readability
  processed = processed
    .replace(/\. /g, '. ... ')
    .replace(/: /g, ': ... ')
    .replace(/\? /g, '? ... ')
    .replace(/! /g, '! ... ');
  
  return processed;
}

export function useSpeechSynthesis(initialSettings?: VoiceSettingsConfig): UseSpeechSynthesisReturn {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoice, setSelectedVoice] = useState<SpeechSynthesisVoice | null>(null);
  const [rate, setRate] = useState(initialSettings?.voice_rate ?? 1);
  const [pitch, setPitch] = useState(initialSettings?.voice_pitch ?? 1);
  const [volume, setVolume] = useState(initialSettings?.voice_volume ?? 1);
  const [autoSpeak, setAutoSpeak] = useState(initialSettings?.voice_auto_speak ?? false);
  const [preferredLanguage, setPreferredLanguage] = useState(initialSettings?.voice_language ?? 'pt-BR');
  const [preferredVoiceName, setPreferredVoiceName] = useState<string | null>(initialSettings?.voice_name ?? null);
  const [error, setError] = useState<SpeechSynthesisError | null>(null);
  const [currentText, setCurrentText] = useState('');
  const [progress, setProgress] = useState(0);
  const [queue, setQueue] = useState<SpeechQueueItem[]>([]);
  
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const currentCallbacksRef = useRef<{
    onStart?: () => void;
    onEnd?: () => void;
    onError?: (error: SpeechSynthesisError) => void;
  }>({});
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);
  const estimatedDurationRef = useRef<number>(0);
  const settingsAppliedRef = useRef(false);

  const isSupported = typeof window !== 'undefined' && 'speechSynthesis' in window;

  // Apply settings from context/props
  const applySettings = useCallback((settings: VoiceSettingsConfig) => {
    if (settings.voice_rate !== undefined) setRate(settings.voice_rate);
    if (settings.voice_pitch !== undefined) setPitch(settings.voice_pitch);
    if (settings.voice_volume !== undefined) setVolume(settings.voice_volume);
    if (settings.voice_auto_speak !== undefined) setAutoSpeak(settings.voice_auto_speak);
    if (settings.voice_language !== undefined) setPreferredLanguage(settings.voice_language);
    if (settings.voice_name !== undefined) setPreferredVoiceName(settings.voice_name);
    settingsAppliedRef.current = true;
  }, []);

  // Load voices and apply preferred voice
  useEffect(() => {
    if (!isSupported) return;

    const loadVoices = () => {
      const availableVoices = window.speechSynthesis.getVoices();
      setVoices(availableVoices);
      
      if (availableVoices.length > 0) {
        // First try to find the preferred voice by name
        if (preferredVoiceName) {
          const namedVoice = availableVoices.find(v => v.name === preferredVoiceName);
          if (namedVoice) {
            setSelectedVoice(namedVoice);
            return;
          }
        }
        
        // Then try to find a voice matching the preferred language
        const langVoice = availableVoices.find(v => v.lang === preferredLanguage);
        const langPrefixVoice = availableVoices.find(v => v.lang.startsWith(preferredLanguage.split('-')[0]));
        const ptBrVoice = availableVoices.find(v => v.lang === 'pt-BR');
        const enVoice = availableVoices.find(v => v.lang.startsWith('en') && v.name.includes('Google'));
        
        const defaultVoice = langVoice || langPrefixVoice || ptBrVoice || enVoice || availableVoices[0];
        setSelectedVoice(defaultVoice);
      }
    };

    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;

    return () => {
      window.speechSynthesis.onvoiceschanged = null;
    };
  }, [isSupported, preferredLanguage, preferredVoiceName]);

  // Process queue
  useEffect(() => {
    if (!isSupported || isSpeaking || queue.length === 0) return;

    // Get highest priority item
    const sortedQueue = [...queue].sort((a, b) => b.priority - a.priority);
    const nextItem = sortedQueue[0];
    
    if (nextItem) {
      // Remove from queue and speak
      setQueue(prev => prev.filter(item => item.id !== nextItem.id));
      speakInternal(nextItem.text);
    }
  }, [isSupported, isSpeaking, queue]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
      if (isSupported) {
        window.speechSynthesis.cancel();
      }
    };
  }, [isSupported]);

  const clearProgressInterval = useCallback(() => {
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
  }, []);

  const startProgressTracking = useCallback((text: string) => {
    clearProgressInterval();
    
    // Estimate duration based on word count and rate
    const wordCount = text.split(/\s+/).length;
    const wordsPerMinute = 150 * rate; // Average speaking rate
    const estimatedSeconds = (wordCount / wordsPerMinute) * 60;
    estimatedDurationRef.current = estimatedSeconds * 1000;
    startTimeRef.current = Date.now();
    
    progressIntervalRef.current = setInterval(() => {
      const elapsed = Date.now() - startTimeRef.current;
      const progressPercent = Math.min((elapsed / estimatedDurationRef.current) * 100, 100);
      setProgress(progressPercent);
    }, 100);
  }, [rate, clearProgressInterval]);

  const speakInternal = useCallback((text: string, options?: SpeakOptions) => {
    if (!isSupported || !text.trim()) return;

    // Cancel any ongoing speech
    window.speechSynthesis.cancel();
    clearProgressInterval();

    const processedText = preprocessTextForSpeech(text);
    setCurrentText(text);
    setProgress(0);

    const utterance = new SpeechSynthesisUtterance(processedText);
    utterance.rate = options?.rate ?? rate;
    utterance.pitch = options?.pitch ?? pitch;
    utterance.volume = options?.volume ?? volume;
    
    const voice = options?.voice ?? selectedVoice;
    if (voice) {
      utterance.voice = voice;
    }

    currentCallbacksRef.current = {
      onStart: options?.onStart,
      onEnd: options?.onEnd,
      onError: options?.onError,
    };

    utterance.onstart = () => {
      setIsSpeaking(true);
      setIsPaused(false);
      setError(null);
      startProgressTracking(processedText);
      currentCallbacksRef.current.onStart?.();
    };

    utterance.onend = () => {
      setIsSpeaking(false);
      setIsPaused(false);
      setCurrentText('');
      setProgress(100);
      clearProgressInterval();
      currentCallbacksRef.current.onEnd?.();
    };

    utterance.onpause = () => {
      setIsPaused(true);
      clearProgressInterval();
    };

    utterance.onresume = () => {
      setIsPaused(false);
      // Restart progress tracking from current position
      const elapsed = Date.now() - startTimeRef.current;
      startTimeRef.current = Date.now() - elapsed;
      progressIntervalRef.current = setInterval(() => {
        const totalElapsed = Date.now() - startTimeRef.current + elapsed;
        const progressPercent = Math.min((totalElapsed / estimatedDurationRef.current) * 100, 100);
        setProgress(progressPercent);
      }, 100);
    };

    utterance.onerror = (event) => {
      const speechError: SpeechSynthesisError = {
        type: event.error === 'network' ? 'network' : 
              event.error === 'synthesis-failed' ? 'synthesis-failed' : 'unknown',
        message: event.error === 'network' 
          ? 'Erro de rede ao sintetizar voz.' 
          : 'Erro ao reproduzir a fala.',
      };
      
      setError(speechError);
      setIsSpeaking(false);
      setIsPaused(false);
      clearProgressInterval();
      currentCallbacksRef.current.onError?.(speechError);
    };

    utteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  }, [isSupported, selectedVoice, rate, pitch, volume, clearProgressInterval, startProgressTracking]);

  const speak = useCallback((text: string, options?: SpeakOptions): string => {
    const id = generateId();
    
    if (options?.priority !== undefined && options.priority > 0) {
      // Add to queue with priority
      setQueue(prev => [...prev, { id, text, priority: options.priority! }]);
    } else if (isSpeaking) {
      // Add to end of queue
      setQueue(prev => [...prev, { id, text, priority: 0 }]);
    } else {
      // Speak immediately
      speakInternal(text, options);
    }
    
    return id;
  }, [isSpeaking, speakInternal]);

  const stop = useCallback(() => {
    if (!isSupported) return;
    window.speechSynthesis.cancel();
    clearProgressInterval();
    setIsSpeaking(false);
    setIsPaused(false);
    setCurrentText('');
    setProgress(0);
  }, [isSupported, clearProgressInterval]);

  const pause = useCallback(() => {
    if (!isSupported || !isSpeaking) return;
    window.speechSynthesis.pause();
    setIsPaused(true);
  }, [isSupported, isSpeaking]);

  const resume = useCallback(() => {
    if (!isSupported || !isPaused) return;
    window.speechSynthesis.resume();
    setIsPaused(false);
  }, [isSupported, isPaused]);

  const skip = useCallback(() => {
    stop();
    // Trigger next in queue immediately
    if (queue.length > 0) {
      const sortedQueue = [...queue].sort((a, b) => b.priority - a.priority);
      const nextItem = sortedQueue[0];
      setQueue(prev => prev.filter(item => item.id !== nextItem.id));
      setTimeout(() => speakInternal(nextItem.text), 50);
    }
  }, [stop, queue, speakInternal]);

  const clearQueue = useCallback(() => {
    setQueue([]);
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    isSpeaking,
    isPaused,
    isSupported,
    error,
    currentText,
    progress,
    speak,
    stop,
    pause,
    resume,
    skip,
    voices,
    selectedVoice,
    setSelectedVoice,
    rate,
    setRate,
    pitch,
    setPitch,
    volume,
    setVolume,
    queueLength: queue.length,
    clearQueue,
    clearError,
    autoSpeak,
    applySettings,
  };
}
