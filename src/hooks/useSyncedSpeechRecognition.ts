import { useState, useCallback, useRef, useEffect } from 'react';
import { useVoiceSettings } from '@/contexts/VoiceSettingsContext';
import { STTProvider, STTResult, STTError, STTProviderConfig, createSTTProvider } from '@/lib/stt';

export interface SpeechRecognitionError {
  type: 'no-speech' | 'audio-capture' | 'not-allowed' | 'network' | 'aborted' | 'api-error' | 'unknown';
  message: string;
  details?: string;
}

interface TranscriptSegment {
  text: string;
  confidence: number;
  isFinal: boolean;
  timestamp: number;
}

interface UseSyncedSpeechRecognitionReturn {
  isListening: boolean;
  transcript: string;
  interimTranscript: string;
  finalTranscript: string;
  confidence: number;
  isSupported: boolean;
  error: SpeechRecognitionError | null;
  transcriptHistory: TranscriptSegment[];
  currentProvider: string;
  supportsRealtime: boolean;
  supportsFileUpload: boolean;
  startListening: (options?: SpeechRecognitionOptions) => void;
  stopListening: () => void;
  resetTranscript: () => void;
  clearError: () => void;
  transcribeFile: (file: File) => Promise<string>;
}

interface SpeechRecognitionOptions {
  language?: string;
  continuous?: boolean;
  interimResults?: boolean;
  maxAlternatives?: number;
  autoRestart?: boolean;
  silenceTimeout?: number;
}

/**
 * A speech recognition hook that automatically uses the user's
 * configured STT provider from their profile settings.
 */
export function useSyncedSpeechRecognition(): UseSyncedSpeechRecognitionReturn {
  const { settings, isLoaded } = useVoiceSettings();
  
  const [isListening, setIsListening] = useState(false);
  const [finalTranscript, setFinalTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [confidence, setConfidence] = useState(0);
  const [error, setError] = useState<SpeechRecognitionError | null>(null);
  const [transcriptHistory, setTranscriptHistory] = useState<TranscriptSegment[]>([]);
  const [isSupported, setIsSupported] = useState(false);
  
  const providerRef = useRef<STTProvider | null>(null);
  const currentProviderIdRef = useRef<string>('');
  const optionsRef = useRef<SpeechRecognitionOptions>({});

  // Initialize provider when settings are loaded or change
  useEffect(() => {
    if (!isLoaded) return;

    const initProvider = async () => {
      const providerId = settings.stt_provider || 'web-speech-api';
      
      // Skip if same provider is already initialized
      if (currentProviderIdRef.current === providerId && providerRef.current) {
        return;
      }

      // Cleanup previous provider
      if (providerRef.current) {
        providerRef.current.destroy();
        providerRef.current = null;
      }

      try {
        const provider = createSTTProvider(providerId);
        
        // Check if supported before initializing
        if (!provider.isSupported()) {
          setIsSupported(false);
          return;
        }

        const config: STTProviderConfig = {
          language: settings.voice_language || 'pt-BR',
          continuous: true,
          interimResults: true,
          autoRestart: true,
          silenceTimeout: 3000,
          apiKey: settings.stt_api_key || undefined,
          model: settings.stt_model || 'whisper-1',
          endpointUrl: settings.stt_endpoint_url || undefined,
        };

        await provider.initialize(config);
        
        // Set up callbacks
        provider.onResult((result: STTResult) => {
          if (result.isFinal) {
            setFinalTranscript(prev => prev + result.transcript);
            setInterimTranscript('');
            setTranscriptHistory(prev => [...prev, {
              text: result.transcript,
              confidence: result.confidence,
              isFinal: true,
              timestamp: result.timestamp,
            }]);
          } else {
            setInterimTranscript(result.transcript);
          }
          setConfidence(result.confidence);
        });

        provider.onError((err: STTError) => {
          setError({
            type: err.type,
            message: err.message,
            details: err.details,
          });
        });

        provider.onEnd(() => {
          setIsListening(false);
        });

        providerRef.current = provider;
        currentProviderIdRef.current = providerId;
        setIsSupported(true);
      } catch (err: any) {
        console.error('Failed to initialize STT provider:', err);
        setIsSupported(false);
        setError({
          type: 'unknown',
          message: 'Falha ao inicializar o provedor de reconhecimento de voz.',
          details: err.message,
        });
      }
    };

    initProvider();

    return () => {
      if (providerRef.current) {
        providerRef.current.destroy();
        providerRef.current = null;
      }
    };
  }, [isLoaded, settings.stt_provider, settings.stt_api_key, settings.stt_model, settings.stt_endpoint_url, settings.voice_language]);

  const startListening = useCallback(async (options?: SpeechRecognitionOptions) => {
    if (!providerRef.current || isListening) return;
    
    optionsRef.current = options || {};
    
    // Reset state
    setFinalTranscript('');
    setInterimTranscript('');
    setConfidence(0);
    setError(null);
    
    try {
      await providerRef.current.start();
      setIsListening(true);
    } catch (err: any) {
      setError({
        type: 'unknown',
        message: err.message || 'Não foi possível iniciar o reconhecimento de voz.',
      });
    }
  }, [isListening]);

  const stopListening = useCallback(async () => {
    if (!providerRef.current) return;
    
    try {
      await providerRef.current.stop();
    } catch (err) {
      console.error('Error stopping STT:', err);
    }
    setIsListening(false);
  }, []);

  const resetTranscript = useCallback(() => {
    setFinalTranscript('');
    setInterimTranscript('');
    setConfidence(0);
    setTranscriptHistory([]);
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const transcribeFile = useCallback(async (file: File): Promise<string> => {
    if (!providerRef.current) {
      throw new Error('Provider not initialized');
    }
    
    if (!providerRef.current.supportsFileUpload) {
      throw new Error('Current provider does not support file upload');
    }

    const result = await providerRef.current.transcribeFile(file);
    
    setFinalTranscript(prev => prev + result.transcript);
    setTranscriptHistory(prev => [...prev, {
      text: result.transcript,
      confidence: result.confidence,
      isFinal: true,
      timestamp: result.timestamp,
    }]);
    
    return result.transcript;
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
    currentProvider: currentProviderIdRef.current || settings.stt_provider || 'web-speech-api',
    supportsRealtime: providerRef.current?.supportsRealtime ?? true,
    supportsFileUpload: providerRef.current?.supportsFileUpload ?? false,
    startListening,
    stopListening,
    resetTranscript,
    clearError,
    transcribeFile,
  };
}
