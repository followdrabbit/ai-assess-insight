import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { STTProviderType } from '@/lib/sttProviders';

export interface VoiceSettings {
  // TTS (Text-to-Speech) settings
  voice_language: string;
  voice_rate: number;
  voice_pitch: number;
  voice_volume: number;
  voice_name: string | null;
  voice_auto_speak: boolean;
  // STT (Speech-to-Text) settings
  stt_provider: STTProviderType;
  stt_api_key: string | null;
  stt_model: string;
  stt_endpoint_url: string | null;
}

interface VoiceSettingsContextValue {
  settings: VoiceSettings;
  isLoaded: boolean;
  updateSettings: (newSettings: Partial<VoiceSettings>) => void;
  refetch: () => Promise<void>;
}

const defaultSettings: VoiceSettings = {
  // TTS defaults
  voice_language: 'pt-BR',
  voice_rate: 1.0,
  voice_pitch: 1.0,
  voice_volume: 1.0,
  voice_name: null,
  voice_auto_speak: false,
  // STT defaults
  stt_provider: 'web-speech-api',
  stt_api_key: null,
  stt_model: 'whisper-1',
  stt_endpoint_url: null,
};

const VoiceSettingsContext = createContext<VoiceSettingsContextValue>({
  settings: defaultSettings,
  isLoaded: false,
  updateSettings: () => {},
  refetch: async () => {},
});

export function VoiceSettingsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [settings, setSettings] = useState<VoiceSettings>(defaultSettings);
  const [isLoaded, setIsLoaded] = useState(false);

  const fetchSettings = useCallback(async () => {
    if (!user) {
      setSettings(defaultSettings);
      setIsLoaded(true);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('voice_language, voice_rate, voice_pitch, voice_volume, voice_name, voice_auto_speak, stt_provider, stt_api_key_encrypted, stt_model, stt_endpoint_url')
        .eq('user_id', user.id)
        .single();

      if (error) {
        if (error.code !== 'PGRST116') {
          console.error('Error fetching voice settings:', error);
        }
        setIsLoaded(true);
        return;
      }

      if (data) {
        setSettings({
          voice_language: data.voice_language || 'pt-BR',
          voice_rate: Number(data.voice_rate) || 1.0,
          voice_pitch: Number(data.voice_pitch) || 1.0,
          voice_volume: Number(data.voice_volume) || 1.0,
          voice_name: data.voice_name || null,
          voice_auto_speak: data.voice_auto_speak ?? false,
          stt_provider: ((data as any).stt_provider as STTProviderType) || 'web-speech-api',
          stt_api_key: (data as any).stt_api_key_encrypted || null,
          stt_model: (data as any).stt_model || 'whisper-1',
          stt_endpoint_url: (data as any).stt_endpoint_url || null,
        });
      }
    } catch (err) {
      console.error('Error fetching voice settings:', err);
    } finally {
      setIsLoaded(true);
    }
  }, [user]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const updateSettings = useCallback((newSettings: Partial<VoiceSettings>) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
  }, []);

  return (
    <VoiceSettingsContext.Provider value={{ settings, isLoaded, updateSettings, refetch: fetchSettings }}>
      {children}
    </VoiceSettingsContext.Provider>
  );
}

export function useVoiceSettings() {
  return useContext(VoiceSettingsContext);
}
