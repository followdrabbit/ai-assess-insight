import { useState, useCallback, useRef, useEffect } from 'react';
import { useVoiceSettings } from '@/contexts/VoiceSettingsContext';
import { STTProvider, STTResult, STTError, STTProviderConfig, createSTTProvider } from '@/lib/stt';
import { useVoiceProfile } from '@/hooks/useVoiceProfile';
import { AudioFeatureExtractor } from '@/lib/voiceProfile/audioFeatureExtractor';
import { SpeakerVerifier } from '@/lib/voiceProfile/speakerVerifier';
import { VerificationResult } from '@/lib/voiceProfile/types';

export interface SpeechRecognitionError {
  type: 'no-speech' | 'audio-capture' | 'not-allowed' | 'network' | 'aborted' | 'api-error' | 'voice-rejected' | 'unknown';
  message: string;
  details?: string;
}

interface TranscriptSegment {
  text: string;
  confidence: number;
  isFinal: boolean;
  timestamp: number;
  voiceVerified?: boolean;
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
  // Voice verification
  isVoiceProfileEnabled: boolean;
  isVoiceVerified: boolean | null;
  verificationResult: VerificationResult | null;
  voiceRejectedCount: number;
  // Actions
  startListening: (options?: SpeechRecognitionOptions) => void;
  stopListening: () => void;
  resetTranscript: () => void;
  clearError: () => void;
  transcribeFile: (file: File) => Promise<string>;
  resetVoiceRejectedCount: () => void;
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
 * Integrates voice profile verification to filter unrecognized voices.
 */
export function useSyncedSpeechRecognition(): UseSyncedSpeechRecognitionReturn {
  const { settings, isLoaded } = useVoiceSettings();
  const { profile: voiceProfile } = useVoiceProfile();
  
  const [isListening, setIsListening] = useState(false);
  const [finalTranscript, setFinalTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [confidence, setConfidence] = useState(0);
  const [error, setError] = useState<SpeechRecognitionError | null>(null);
  const [transcriptHistory, setTranscriptHistory] = useState<TranscriptSegment[]>([]);
  const [isSupported, setIsSupported] = useState(false);
  
  // Voice verification state
  const [isVoiceVerified, setIsVoiceVerified] = useState<boolean | null>(null);
  const [verificationResult, setVerificationResult] = useState<VerificationResult | null>(null);
  const [voiceRejectedCount, setVoiceRejectedCount] = useState(0);
  
  const providerRef = useRef<STTProvider | null>(null);
  const currentProviderIdRef = useRef<string>('');
  const optionsRef = useRef<SpeechRecognitionOptions>({});
  
  // Audio recording for voice verification (parallel to STT)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioStreamRef = useRef<MediaStream | null>(null);
  const featureExtractorRef = useRef<AudioFeatureExtractor | null>(null);
  const verifierRef = useRef<SpeakerVerifier | null>(null);
  
  // Pending transcript while waiting for verification
  const pendingTranscriptRef = useRef<{ text: string; confidence: number; timestamp: number } | null>(null);

  // Check if voice profile verification is enabled
  const isVoiceProfileEnabled = voiceProfile?.isEnabled && voiceProfile?.voiceFeatures != null;

  // Initialize feature extractor and verifier for voice verification
  useEffect(() => {
    if (isVoiceProfileEnabled) {
      featureExtractorRef.current = new AudioFeatureExtractor();
      verifierRef.current = new SpeakerVerifier();
    }
    
    return () => {
      featureExtractorRef.current?.destroy();
      featureExtractorRef.current = null;
      verifierRef.current = null;
    };
  }, [isVoiceProfileEnabled]);

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
          handleSTTResult(result);
        });

        provider.onError((err: STTError) => {
          setError({
            type: err.type,
            message: err.message,
            details: err.details,
          });
        });

        provider.onEnd(() => {
          handleListeningEnd();
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

  /**
   * Handle STT result with optional voice verification
   */
  const handleSTTResult = useCallback(async (result: STTResult) => {
    if (result.isFinal) {
      // If voice profile is enabled, verify before accepting
      if (isVoiceProfileEnabled) {
        pendingTranscriptRef.current = {
          text: result.transcript,
          confidence: result.confidence,
          timestamp: result.timestamp,
        };
        
        // Verification will happen when audio recording stops
        // For now, just update interim to show we received something
        setInterimTranscript(result.transcript + ' (verificando...)');
      } else {
        // No voice profile - accept immediately
        acceptTranscript(result.transcript, result.confidence, result.timestamp, undefined);
      }
    } else {
      setInterimTranscript(result.transcript);
    }
    setConfidence(result.confidence);
  }, [isVoiceProfileEnabled]);

  /**
   * Accept a verified transcript
   */
  const acceptTranscript = useCallback((text: string, confidence: number, timestamp: number, verified?: boolean) => {
    setFinalTranscript(prev => prev + text);
    setInterimTranscript('');
    setTranscriptHistory(prev => [...prev, {
      text,
      confidence,
      isFinal: true,
      timestamp,
      voiceVerified: verified,
    }]);
    setIsVoiceVerified(verified ?? null);
  }, []);

  /**
   * Reject a transcript due to voice verification failure
   */
  const rejectTranscript = useCallback(() => {
    setInterimTranscript('');
    setVoiceRejectedCount(prev => prev + 1);
    setIsVoiceVerified(false);
    pendingTranscriptRef.current = null;
  }, []);

  /**
   * Handle listening end - verify voice if needed
   */
  const handleListeningEnd = useCallback(async () => {
    setIsListening(false);
    
    // If we have pending transcript and voice profile is enabled, verify now
    if (pendingTranscriptRef.current && isVoiceProfileEnabled && audioChunksRef.current.length > 0) {
      try {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const verified = await verifyVoiceFromBlob(audioBlob);
        
        if (verified) {
          const pending = pendingTranscriptRef.current;
          acceptTranscript(pending.text, pending.confidence, pending.timestamp, true);
        } else {
          rejectTranscript();
        }
      } catch (err) {
        console.error('Voice verification error:', err);
        // On error, accept with unknown verification status
        if (pendingTranscriptRef.current) {
          const pending = pendingTranscriptRef.current;
          acceptTranscript(pending.text, pending.confidence, pending.timestamp, undefined);
        }
      }
    }
    
    // Cleanup audio recording
    stopAudioRecording();
  }, [isVoiceProfileEnabled, acceptTranscript, rejectTranscript]);

  /**
   * Verify voice from audio blob
   */
  const verifyVoiceFromBlob = useCallback(async (blob: Blob): Promise<boolean> => {
    if (!voiceProfile?.voiceFeatures || !featureExtractorRef.current || !verifierRef.current) {
      return true; // No profile to verify against
    }

    try {
      const inputFeatures = await featureExtractorRef.current.extractFeaturesFromBlob(blob);
      const result = verifierRef.current.verify(
        inputFeatures,
        voiceProfile.voiceFeatures,
        voiceProfile.noiseThreshold
      );
      
      setVerificationResult(result);
      return result.isMatch;
    } catch (err) {
      console.error('Voice verification failed:', err);
      return true; // On error, don't block
    }
  }, [voiceProfile]);

  /**
   * Start parallel audio recording for voice verification
   */
  const startAudioRecording = useCallback(async () => {
    if (!isVoiceProfileEnabled) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        }
      });

      audioStreamRef.current = stream;
      audioChunksRef.current = [];

      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : 'audio/webm';

      const recorder = new MediaRecorder(stream, { mimeType });
      
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.start(1000); // Collect chunks every second
      mediaRecorderRef.current = recorder;
    } catch (err) {
      console.error('Failed to start audio recording for verification:', err);
    }
  }, [isVoiceProfileEnabled]);

  /**
   * Stop audio recording
   */
  const stopAudioRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    
    if (audioStreamRef.current) {
      audioStreamRef.current.getTracks().forEach(track => track.stop());
      audioStreamRef.current = null;
    }
    
    mediaRecorderRef.current = null;
  }, []);

  const startListening = useCallback(async (options?: SpeechRecognitionOptions) => {
    if (!providerRef.current || isListening) return;
    
    optionsRef.current = options || {};
    
    // Reset state
    setFinalTranscript('');
    setInterimTranscript('');
    setConfidence(0);
    setError(null);
    setIsVoiceVerified(null);
    setVerificationResult(null);
    pendingTranscriptRef.current = null;
    
    try {
      // Start audio recording for voice verification (if enabled)
      await startAudioRecording();
      
      // Start STT provider
      await providerRef.current.start();
      setIsListening(true);
    } catch (err: any) {
      stopAudioRecording();
      setError({
        type: 'unknown',
        message: err.message || 'Não foi possível iniciar o reconhecimento de voz.',
      });
    }
  }, [isListening, startAudioRecording, stopAudioRecording]);

  const stopListening = useCallback(async () => {
    if (!providerRef.current) return;
    
    try {
      await providerRef.current.stop();
    } catch (err) {
      console.error('Error stopping STT:', err);
    }
    
    // Note: handleListeningEnd will be called by the provider's onEnd callback
  }, []);

  const resetTranscript = useCallback(() => {
    setFinalTranscript('');
    setInterimTranscript('');
    setConfidence(0);
    setTranscriptHistory([]);
    setIsVoiceVerified(null);
    setVerificationResult(null);
    pendingTranscriptRef.current = null;
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const resetVoiceRejectedCount = useCallback(() => {
    setVoiceRejectedCount(0);
  }, []);

  const transcribeFile = useCallback(async (file: File): Promise<string> => {
    if (!providerRef.current) {
      throw new Error('Provider not initialized');
    }
    
    if (!providerRef.current.supportsFileUpload) {
      throw new Error('Current provider does not support file upload');
    }

    const result = await providerRef.current.transcribeFile(file);
    
    // For file transcription, we can verify if voice profile is enabled
    if (isVoiceProfileEnabled) {
      const verified = await verifyVoiceFromBlob(file);
      
      if (!verified) {
        setVoiceRejectedCount(prev => prev + 1);
        setIsVoiceVerified(false);
        throw new Error('Voz não reconhecida. O arquivo de áudio não corresponde ao seu perfil de voz.');
      }
      
      setIsVoiceVerified(true);
    }
    
    setFinalTranscript(prev => prev + result.transcript);
    setTranscriptHistory(prev => [...prev, {
      text: result.transcript,
      confidence: result.confidence,
      isFinal: true,
      timestamp: result.timestamp,
      voiceVerified: isVoiceProfileEnabled ? true : undefined,
    }]);
    
    return result.transcript;
  }, [isVoiceProfileEnabled, verifyVoiceFromBlob]);

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
    // Voice verification
    isVoiceProfileEnabled,
    isVoiceVerified,
    verificationResult,
    voiceRejectedCount,
    // Actions
    startListening,
    stopListening,
    resetTranscript,
    clearError,
    transcribeFile,
    resetVoiceRejectedCount,
  };
}
