/**
 * useVoiceProfile Hook
 * Manages voice profile enrollment, verification, and database operations
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import {
  VoiceProfile,
  VoiceFeatures,
  EnrollmentSample,
  VerificationResult,
  EnrollmentLevel,
  ENROLLMENT_CONFIGS,
  ENROLLMENT_PHRASES,
} from '@/lib/voiceProfile/types';
import { AudioFeatureExtractor } from '@/lib/voiceProfile/audioFeatureExtractor';
import { SpeakerVerifier } from '@/lib/voiceProfile/speakerVerifier';

interface UseVoiceProfileReturn {
  // State
  profile: VoiceProfile | null;
  isLoading: boolean;
  isEnrolling: boolean;
  isRecording: boolean;
  isProcessing: boolean;
  recordingDuration: number;
  audioLevels: number[];
  currentPhraseIndex: number;
  enrollmentProgress: number;
  enrolledSamples: EnrollmentSample[];
  verificationResult: VerificationResult | null;
  error: string | null;
  
  // Enrollment actions
  startEnrollment: (level: EnrollmentLevel, language?: string) => void;
  recordPhrase: () => Promise<EnrollmentSample | null>;
  stopRecording: () => void;
  skipPhrase: () => void;
  retryPhrase: () => void;
  completeEnrollment: () => Promise<boolean>;
  cancelEnrollment: () => void;
  
  // Profile actions
  fetchProfile: () => Promise<void>;
  deleteProfile: () => Promise<void>;
  toggleProfileEnabled: () => Promise<void>;
  updateNoiseThreshold: (threshold: number) => Promise<void>;
  
  // Verification
  verifyVoice: (audioBlob: Blob) => Promise<VerificationResult | null>;
  
  // Helpers
  getCurrentPhrase: () => string;
  getPhrasesForLevel: (level: EnrollmentLevel, language?: string) => string[];
}

export function useVoiceProfile(): UseVoiceProfileReturn {
  const { user } = useAuth();
  
  const [profile, setProfile] = useState<VoiceProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEnrolling, setIsEnrolling] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentPhraseIndex, setCurrentPhraseIndex] = useState(0);
  const [enrolledSamples, setEnrolledSamples] = useState<EnrollmentSample[]>([]);
  const [verificationResult, setVerificationResult] = useState<VerificationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [audioLevels, setAudioLevels] = useState<number[]>(new Array(12).fill(0));
  
  const enrollmentLevelRef = useRef<EnrollmentLevel>('standard');
  const languageRef = useRef<string>('pt-BR');
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const featureExtractorRef = useRef<AudioFeatureExtractor | null>(null);
  const verifierRef = useRef<SpeakerVerifier | null>(null);
  const recordingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Initialize feature extractor and verifier
  useEffect(() => {
    featureExtractorRef.current = new AudioFeatureExtractor();
    verifierRef.current = new SpeakerVerifier();
    
    return () => {
      featureExtractorRef.current?.destroy();
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  // Audio level analyzer function
  const startAudioAnalysis = useCallback((stream: MediaStream) => {
    try {
      audioContextRef.current = new AudioContext();
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 64;
      analyserRef.current.smoothingTimeConstant = 0.5;
      
      const source = audioContextRef.current.createMediaStreamSource(stream);
      source.connect(analyserRef.current);
      
      const bufferLength = analyserRef.current.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      const numBars = 12;
      
      const updateLevels = () => {
        if (!analyserRef.current) return;
        
        analyserRef.current.getByteFrequencyData(dataArray);
        
        // Map frequency data to 12 bars
        const levels: number[] = [];
        const step = Math.floor(bufferLength / numBars);
        
        for (let i = 0; i < numBars; i++) {
          let sum = 0;
          for (let j = 0; j < step; j++) {
            sum += dataArray[i * step + j] || 0;
          }
          // Normalize to 0-1 range with some boost for visibility
          const avg = (sum / step) / 255;
          levels.push(Math.min(1, avg * 1.5 + 0.1));
        }
        
        setAudioLevels(levels);
        animationFrameRef.current = requestAnimationFrame(updateLevels);
      };
      
      updateLevels();
    } catch (err) {
      console.warn('Failed to start audio analysis:', err);
    }
  }, []);

  const stopAudioAnalysis = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    analyserRef.current = null;
    setAudioLevels(new Array(12).fill(0));
  }, []);

  // Fetch profile on mount
  useEffect(() => {
    if (user) {
      fetchProfile();
    } else {
      setIsLoading(false);
    }
  }, [user]);

  const fetchProfile = useCallback(async () => {
    if (!user) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const { data, error: fetchError } = await supabase
        .from('voice_profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (fetchError) throw fetchError;
      
      if (data) {
        setProfile({
          id: data.id,
          userId: data.user_id,
          profileName: data.profile_name,
          enrollmentLevel: data.enrollment_level as EnrollmentLevel,
          enrollmentPhrasesCount: data.enrollment_phrases_count,
          voiceFeatures: data.voice_features as unknown as VoiceFeatures | null,
          noiseThreshold: Number(data.noise_threshold),
          isEnabled: data.is_enabled,
          enrolledAt: data.enrolled_at,
          createdAt: data.created_at,
          updatedAt: data.updated_at,
        });
      }
    } catch (err: any) {
      console.error('Error fetching voice profile:', err);
      setError('Erro ao carregar perfil de voz.');
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  const getPhrasesForLevel = useCallback((level: EnrollmentLevel, language: string = 'pt-BR'): string[] => {
    const phrases = ENROLLMENT_PHRASES[language] || ENROLLMENT_PHRASES['pt-BR'];
    const count = ENROLLMENT_CONFIGS[level].phrasesCount;
    return phrases.slice(0, count);
  }, []);

  const getCurrentPhrase = useCallback((): string => {
    const phrases = getPhrasesForLevel(enrollmentLevelRef.current, languageRef.current);
    return phrases[currentPhraseIndex] || '';
  }, [currentPhraseIndex, getPhrasesForLevel]);

  const startEnrollment = useCallback((level: EnrollmentLevel, language: string = 'pt-BR') => {
    enrollmentLevelRef.current = level;
    languageRef.current = language;
    setIsEnrolling(true);
    setCurrentPhraseIndex(0);
    setEnrolledSamples([]);
    setError(null);
    setVerificationResult(null);
  }, []);

  const recordPhrase = useCallback(async (): Promise<EnrollmentSample | null> => {
    if (!featureExtractorRef.current) {
      setError('Extrator de áudio não inicializado.');
      return null;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 16000,
        } 
      });
      
      audioChunksRef.current = [];
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') 
        ? 'audio/webm;codecs=opus' 
        : 'audio/webm';
      
      mediaRecorderRef.current = new MediaRecorder(stream, { mimeType });
      
      return new Promise((resolve, reject) => {
        const startTime = Date.now();
        
        mediaRecorderRef.current!.ondataavailable = (event) => {
          if (event.data.size > 0) {
            audioChunksRef.current.push(event.data);
          }
        };
        
        mediaRecorderRef.current!.onstop = async () => {
          const durationMs = Date.now() - startTime;
          stream.getTracks().forEach(track => track.stop());
          stopAudioAnalysis();
          
          const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
          
          // Show processing indicator
          setIsRecording(false);
          setIsProcessing(true);
          
          try {
            const features = await featureExtractorRef.current!.extractFeaturesFromBlob(audioBlob);
            const qualityScore = featureExtractorRef.current!.calculateQualityScore(features, durationMs);
            
            const sample: EnrollmentSample = {
              phraseIndex: currentPhraseIndex,
              phraseText: getCurrentPhrase(),
              audioFeatures: features,
              durationMs,
              sampleRate: 16000,
              qualityScore,
            };
            
            setEnrolledSamples(prev => [...prev, sample]);
            setIsProcessing(false);
            resolve(sample);
          } catch (err: any) {
            setIsProcessing(false);
            reject(err);
          }
        };
        
        mediaRecorderRef.current!.onerror = () => {
          stream.getTracks().forEach(track => track.stop());
          stopAudioAnalysis();
          setIsRecording(false);
          reject(new Error('Erro na gravação'));
        };
        
        // Start audio level analysis
        startAudioAnalysis(stream);
        
        mediaRecorderRef.current!.start();
        setIsRecording(true);
        setRecordingDuration(0);
        
        // Start duration counter
        recordingIntervalRef.current = setInterval(() => {
          setRecordingDuration(prev => prev + 1);
        }, 1000);
        
        // Auto-stop after 15 seconds for mobile reliability
        recordingTimeoutRef.current = setTimeout(() => {
          if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
            mediaRecorderRef.current.stop();
          }
        }, 15000);
      });
    } catch (err: any) {
      console.error('Error recording phrase:', err);
      setError('Erro ao acessar microfone. Verifique as permissões.');
      return null;
    }
  }, [currentPhraseIndex, getCurrentPhrase]);

  const stopRecording = useCallback(() => {
    // Clear timers
    if (recordingTimeoutRef.current) {
      clearTimeout(recordingTimeoutRef.current);
      recordingTimeoutRef.current = null;
    }
    if (recordingIntervalRef.current) {
      clearInterval(recordingIntervalRef.current);
      recordingIntervalRef.current = null;
    }
    setRecordingDuration(0);
    
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
  }, []);

  const skipPhrase = useCallback(() => {
    const totalPhrases = ENROLLMENT_CONFIGS[enrollmentLevelRef.current].phrasesCount;
    if (currentPhraseIndex < totalPhrases - 1) {
      setCurrentPhraseIndex(prev => prev + 1);
    }
  }, [currentPhraseIndex]);

  const retryPhrase = useCallback(() => {
    // Remove the last sample for current phrase if exists
    setEnrolledSamples(prev => 
      prev.filter(s => s.phraseIndex !== currentPhraseIndex)
    );
  }, [currentPhraseIndex]);

  const completeEnrollment = useCallback(async (): Promise<boolean> => {
    if (!user || !verifierRef.current || enrolledSamples.length === 0) {
      setError('Dados insuficientes para completar o cadastro.');
      return false;
    }

    try {
      // Aggregate all samples into a single voice profile
      const allFeatures = enrolledSamples.map(s => s.audioFeatures);
      const aggregatedFeatures = verifierRef.current.aggregateFeatures(allFeatures);
      
      // Create or update profile
      const profileData = {
        user_id: user.id,
        profile_name: 'Meu Perfil de Voz',
        enrollment_level: enrollmentLevelRef.current,
        enrollment_phrases_count: enrolledSamples.length,
        voice_features: aggregatedFeatures as any,
        is_enabled: true,
        enrolled_at: new Date().toISOString(),
      };

      if (profile?.id) {
        // Update existing profile
        const { error: updateError } = await supabase
          .from('voice_profiles')
          .update(profileData)
          .eq('id', profile.id);
        
        if (updateError) throw updateError;
      } else {
        // Create new profile
        const { error: insertError } = await supabase
          .from('voice_profiles')
          .insert(profileData);
        
        if (insertError) throw insertError;
      }

      // Save individual samples
      const { data: profileData2 } = await supabase
        .from('voice_profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (profileData2) {
        // Delete old samples
        await supabase
          .from('voice_enrollment_samples')
          .delete()
          .eq('voice_profile_id', profileData2.id);

        // Insert new samples
        const sampleInserts = enrolledSamples.map(sample => ({
          voice_profile_id: profileData2.id,
          phrase_index: sample.phraseIndex,
          phrase_text: sample.phraseText,
          audio_features: sample.audioFeatures as any,
          duration_ms: sample.durationMs,
          sample_rate: sample.sampleRate,
          quality_score: sample.qualityScore,
        }));

        await supabase
          .from('voice_enrollment_samples')
          .insert(sampleInserts);
      }

      setIsEnrolling(false);
      await fetchProfile();
      return true;
    } catch (err: any) {
      console.error('Error completing enrollment:', err);
      setError('Erro ao salvar perfil de voz.');
      return false;
    }
  }, [user, profile, enrolledSamples, fetchProfile]);

  const cancelEnrollment = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    setIsEnrolling(false);
    setIsRecording(false);
    setCurrentPhraseIndex(0);
    setEnrolledSamples([]);
  }, []);

  const deleteProfile = useCallback(async () => {
    if (!profile) return;
    
    try {
      const { error: deleteError } = await supabase
        .from('voice_profiles')
        .delete()
        .eq('id', profile.id);
      
      if (deleteError) throw deleteError;
      
      setProfile(null);
    } catch (err: any) {
      console.error('Error deleting voice profile:', err);
      setError('Erro ao excluir perfil de voz.');
    }
  }, [profile]);

  const toggleProfileEnabled = useCallback(async () => {
    if (!profile) return;
    
    try {
      const { error: updateError } = await supabase
        .from('voice_profiles')
        .update({ is_enabled: !profile.isEnabled })
        .eq('id', profile.id);
      
      if (updateError) throw updateError;
      
      setProfile(prev => prev ? { ...prev, isEnabled: !prev.isEnabled } : null);
    } catch (err: any) {
      console.error('Error toggling profile:', err);
      setError('Erro ao atualizar perfil.');
    }
  }, [profile]);

  const updateNoiseThreshold = useCallback(async (threshold: number) => {
    if (!profile) return;
    
    try {
      const { error: updateError } = await supabase
        .from('voice_profiles')
        .update({ noise_threshold: threshold })
        .eq('id', profile.id);
      
      if (updateError) throw updateError;
      
      setProfile(prev => prev ? { ...prev, noiseThreshold: threshold } : null);
    } catch (err: any) {
      console.error('Error updating threshold:', err);
      setError('Erro ao atualizar limiar.');
    }
  }, [profile]);

  const verifyVoice = useCallback(async (audioBlob: Blob): Promise<VerificationResult | null> => {
    if (!profile?.voiceFeatures || !featureExtractorRef.current || !verifierRef.current) {
      return null;
    }

    try {
      const inputFeatures = await featureExtractorRef.current.extractFeaturesFromBlob(audioBlob);
      const result = verifierRef.current.verify(
        inputFeatures, 
        profile.voiceFeatures, 
        profile.noiseThreshold
      );
      setVerificationResult(result);
      return result;
    } catch (err: any) {
      console.error('Error verifying voice:', err);
      setError('Erro na verificação de voz.');
      return null;
    }
  }, [profile]);

  const enrollmentProgress = enrolledSamples.length / ENROLLMENT_CONFIGS[enrollmentLevelRef.current].phrasesCount;

  return {
    profile,
    isLoading,
    isEnrolling,
    isRecording,
    isProcessing,
    recordingDuration,
    audioLevels,
    currentPhraseIndex,
    enrollmentProgress,
    enrolledSamples,
    verificationResult,
    error,
    startEnrollment,
    recordPhrase,
    stopRecording,
    skipPhrase,
    retryPhrase,
    completeEnrollment,
    cancelEnrollment,
    fetchProfile,
    deleteProfile,
    toggleProfileEnabled,
    updateNoiseThreshold,
    verifyVoice,
    getCurrentPhrase,
    getPhrasesForLevel,
  };
}
