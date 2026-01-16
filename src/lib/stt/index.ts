// STT Provider Factory
export * from './types';
export { WebSpeechAPIProvider } from './WebSpeechAPIProvider';
export { WhisperProvider } from './WhisperProvider';

import { STTProvider, STTProviderConfig } from './types';
import { WebSpeechAPIProvider } from './WebSpeechAPIProvider';
import { WhisperProvider } from './WhisperProvider';
import { STTProviderType } from '@/lib/sttProviders';

export function createSTTProvider(providerId: STTProviderType): STTProvider {
  switch (providerId) {
    case 'openai-whisper':
      return new WhisperProvider();
    case 'custom':
      return new WhisperProvider(); // Custom uses Whisper-compatible API
    case 'web-speech-api':
    default:
      return new WebSpeechAPIProvider();
  }
}

export async function initializeSTTProvider(
  providerId: STTProviderType,
  config: STTProviderConfig
): Promise<STTProvider> {
  const provider = createSTTProvider(providerId);
  await provider.initialize(config);
  return provider;
}
