// Speech-to-Text Providers Configuration

export type STTProviderType = 'web-speech-api' | 'openai-whisper' | 'custom';

export interface STTProvider {
  id: STTProviderType;
  name: string;
  description: string;
  requiresApiKey: boolean;
  requiresEndpoint: boolean;
  supportedLanguages: string[];
  models?: { id: string; name: string }[];
  features: {
    realtime: boolean;
    fileUpload: boolean;
    streaming: boolean;
  };
}

export const STT_PROVIDERS: STTProvider[] = [
  {
    id: 'web-speech-api',
    name: 'Web Speech API',
    description: 'API nativa do navegador. Gratuita, mas requer conexão com internet em alguns navegadores.',
    requiresApiKey: false,
    requiresEndpoint: false,
    supportedLanguages: ['pt-BR', 'en-US', 'es-ES', 'fr-FR', 'de-DE', 'it-IT', 'ja-JP', 'ko-KR', 'zh-CN'],
    features: {
      realtime: true,
      fileUpload: false,
      streaming: true,
    },
  },
  {
    id: 'openai-whisper',
    name: 'OpenAI Whisper',
    description: 'Modelo de alta precisão da OpenAI. Requer API key. Suporta upload de arquivos de áudio.',
    requiresApiKey: true,
    requiresEndpoint: false,
    supportedLanguages: ['auto', 'pt', 'en', 'es', 'fr', 'de', 'it', 'ja', 'ko', 'zh'],
    models: [
      { id: 'whisper-1', name: 'Whisper v1' },
    ],
    features: {
      realtime: false,
      fileUpload: true,
      streaming: false,
    },
  },
  {
    id: 'custom',
    name: 'Endpoint Personalizado',
    description: 'Configure seu próprio endpoint de transcrição compatível com a API do Whisper.',
    requiresApiKey: true,
    requiresEndpoint: true,
    supportedLanguages: [],
    features: {
      realtime: false,
      fileUpload: true,
      streaming: false,
    },
  },
];

export function getSTTProvider(providerId: STTProviderType): STTProvider | undefined {
  return STT_PROVIDERS.find(p => p.id === providerId);
}

export function getDefaultSTTProvider(): STTProvider {
  return STT_PROVIDERS[0];
}
