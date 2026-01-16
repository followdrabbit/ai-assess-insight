import { useEffect } from 'react';
import { useSpeechSynthesis } from './useSpeechSynthesis';
import { useVoiceSettings } from '@/contexts/VoiceSettingsContext';

/**
 * A wrapper around useSpeechSynthesis that automatically syncs
 * with the user's voice settings from their profile.
 */
export function useSyncedSpeechSynthesis() {
  const { settings, isLoaded } = useVoiceSettings();
  const speechSynthesis = useSpeechSynthesis(settings);

  // Apply settings when they're loaded or updated
  useEffect(() => {
    if (isLoaded) {
      speechSynthesis.applySettings(settings);
    }
  }, [isLoaded, settings, speechSynthesis.applySettings]);

  return speechSynthesis;
}
