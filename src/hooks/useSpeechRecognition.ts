import { useState, useCallback, useRef, useEffect } from 'react';

export interface SpeechRecognitionError {
  type: 'no-speech' | 'audio-capture' | 'not-allowed' | 'network' | 'aborted' | 'unknown';
  message: string;
}

interface TranscriptSegment {
  text: string;
  confidence: number;
  isFinal: boolean;
  timestamp: number;
}

interface UseSpeechRecognitionReturn {
  isListening: boolean;
  transcript: string;
  interimTranscript: string;
  finalTranscript: string;
  confidence: number;
  isSupported: boolean;
  error: SpeechRecognitionError | null;
  transcriptHistory: TranscriptSegment[];
  startListening: (options?: SpeechRecognitionOptions) => void;
  stopListening: () => void;
  resetTranscript: () => void;
  clearError: () => void;
}

interface SpeechRecognitionOptions {
  language?: string;
  continuous?: boolean;
  interimResults?: boolean;
  maxAlternatives?: number;
  autoRestart?: boolean;
  silenceTimeout?: number;
}

// Web Speech API types
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message?: string;
}

interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  isFinal: boolean;
  length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onend: (() => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onstart: (() => void) | null;
  onsoundstart: (() => void) | null;
  onsoundend: (() => void) | null;
  onspeechstart: (() => void) | null;
  onspeechend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognition;
    webkitSpeechRecognition: new () => SpeechRecognition;
  }
}

const DEFAULT_OPTIONS: SpeechRecognitionOptions = {
  continuous: true,
  interimResults: true,
  maxAlternatives: 3,
  autoRestart: true,
  silenceTimeout: 3000,
};

function mapErrorType(errorCode: string): SpeechRecognitionError['type'] {
  switch (errorCode) {
    case 'no-speech':
      return 'no-speech';
    case 'audio-capture':
      return 'audio-capture';
    case 'not-allowed':
      return 'not-allowed';
    case 'network':
      return 'network';
    case 'aborted':
      return 'aborted';
    default:
      return 'unknown';
  }
}

function getErrorMessage(type: SpeechRecognitionError['type']): string {
  switch (type) {
    case 'no-speech':
      return 'Nenhuma fala detectada. Tente falar mais alto ou mais perto do microfone.';
    case 'audio-capture':
      return 'Não foi possível capturar áudio. Verifique seu microfone.';
    case 'not-allowed':
      return 'Permissão para microfone negada. Habilite nas configurações do navegador.';
    case 'network':
      return 'Erro de rede. Verifique sua conexão com a internet.';
    case 'aborted':
      return 'Reconhecimento de voz foi cancelado.';
    default:
      return 'Erro desconhecido no reconhecimento de voz.';
  }
}

export function useSpeechRecognition(): UseSpeechRecognitionReturn {
  const [isListening, setIsListening] = useState(false);
  const [finalTranscript, setFinalTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [confidence, setConfidence] = useState(0);
  const [error, setError] = useState<SpeechRecognitionError | null>(null);
  const [transcriptHistory, setTranscriptHistory] = useState<TranscriptSegment[]>([]);
  
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const optionsRef = useRef<SpeechRecognitionOptions>(DEFAULT_OPTIONS);
  const shouldRestartRef = useRef(false);
  const silenceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSpeechTimeRef = useRef<number>(Date.now());

  const isSupported = typeof window !== 'undefined' && 
    ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);

  const clearSilenceTimeout = useCallback(() => {
    if (silenceTimeoutRef.current) {
      clearTimeout(silenceTimeoutRef.current);
      silenceTimeoutRef.current = null;
    }
  }, []);

  const startSilenceTimeout = useCallback(() => {
    clearSilenceTimeout();
    const timeout = optionsRef.current.silenceTimeout || DEFAULT_OPTIONS.silenceTimeout!;
    silenceTimeoutRef.current = setTimeout(() => {
      if (recognitionRef.current && isListening) {
        // Auto-stop after silence
        shouldRestartRef.current = false;
        recognitionRef.current.stop();
      }
    }, timeout);
  }, [clearSilenceTimeout, isListening]);

  useEffect(() => {
    if (!isSupported) return;

    const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognitionAPI();
    
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = navigator.language || 'pt-BR';
    recognition.maxAlternatives = 3;

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let finalText = '';
      let interimText = '';
      let maxConfidence = 0;

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const bestAlternative = result[0];
        
        if (result.isFinal) {
          finalText += bestAlternative.transcript;
          maxConfidence = Math.max(maxConfidence, bestAlternative.confidence);
          
          // Add to history
          setTranscriptHistory(prev => [...prev, {
            text: bestAlternative.transcript,
            confidence: bestAlternative.confidence,
            isFinal: true,
            timestamp: Date.now(),
          }]);
        } else {
          interimText += bestAlternative.transcript;
          maxConfidence = Math.max(maxConfidence, bestAlternative.confidence || 0.5);
        }
      }

      if (finalText) {
        setFinalTranscript(prev => prev + finalText);
      }
      setInterimTranscript(interimText);
      
      if (maxConfidence > 0) {
        setConfidence(maxConfidence);
      }

      // Reset silence timeout on speech
      lastSpeechTimeRef.current = Date.now();
      startSilenceTimeout();
    };

    recognition.onspeechstart = () => {
      clearSilenceTimeout();
      lastSpeechTimeRef.current = Date.now();
    };

    recognition.onspeechend = () => {
      startSilenceTimeout();
    };

    recognition.onend = () => {
      clearSilenceTimeout();
      
      if (shouldRestartRef.current && optionsRef.current.autoRestart) {
        // Auto-restart recognition
        try {
          setTimeout(() => {
            if (shouldRestartRef.current && recognitionRef.current) {
              recognitionRef.current.start();
            }
          }, 100);
        } catch (e) {
          console.error('Error restarting recognition:', e);
          setIsListening(false);
          shouldRestartRef.current = false;
        }
      } else {
        setIsListening(false);
        shouldRestartRef.current = false;
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      const errorType = mapErrorType(event.error);
      
      // Don't treat 'no-speech' as a critical error if auto-restart is enabled
      if (errorType === 'no-speech' && optionsRef.current.autoRestart) {
        // Just restart
        return;
      }
      
      // Don't show error for aborted (user cancelled)
      if (errorType !== 'aborted') {
        setError({
          type: errorType,
          message: getErrorMessage(errorType),
        });
      }
      
      if (errorType !== 'no-speech') {
        setIsListening(false);
        shouldRestartRef.current = false;
      }
    };

    recognitionRef.current = recognition;

    return () => {
      clearSilenceTimeout();
      shouldRestartRef.current = false;
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, [isSupported, clearSilenceTimeout, startSilenceTimeout]);

  const startListening = useCallback((options?: SpeechRecognitionOptions) => {
    if (!recognitionRef.current || isListening) return;
    
    // Merge options
    optionsRef.current = { ...DEFAULT_OPTIONS, ...options };
    
    // Configure recognition
    if (recognitionRef.current) {
      recognitionRef.current.continuous = optionsRef.current.continuous ?? true;
      recognitionRef.current.interimResults = optionsRef.current.interimResults ?? true;
      recognitionRef.current.lang = optionsRef.current.language || navigator.language || 'pt-BR';
      recognitionRef.current.maxAlternatives = optionsRef.current.maxAlternatives ?? 3;
    }
    
    // Reset state
    setFinalTranscript('');
    setInterimTranscript('');
    setConfidence(0);
    setError(null);
    shouldRestartRef.current = optionsRef.current.autoRestart ?? true;
    
    try {
      recognitionRef.current.start();
      setIsListening(true);
    } catch (err) {
      console.error('Speech recognition error:', err);
      setError({
        type: 'unknown',
        message: 'Não foi possível iniciar o reconhecimento de voz.',
      });
    }
  }, [isListening]);

  const stopListening = useCallback(() => {
    if (!recognitionRef.current) return;
    
    shouldRestartRef.current = false;
    clearSilenceTimeout();
    recognitionRef.current.stop();
    setIsListening(false);
  }, [clearSilenceTimeout]);

  const resetTranscript = useCallback(() => {
    setFinalTranscript('');
    setInterimTranscript('');
    setConfidence(0);
    setTranscriptHistory([]);
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Combined transcript for backward compatibility
  const transcript = finalTranscript + interimTranscript;

  return {
    isListening,
    transcript,
    interimTranscript,
    finalTranscript,
    confidence,
    isSupported,
    error,
    transcriptHistory,
    startListening,
    stopListening,
    resetTranscript,
    clearError,
  };
}
