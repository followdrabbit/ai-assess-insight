/**
 * Voice Profile Types
 * Types for voice enrollment and speaker verification system
 */

export interface VoiceFeatures {
  // Mel-frequency cepstral coefficients (average)
  mfcc: number[];
  // Spectral centroid (brightness)
  spectralCentroid: number;
  // Spectral rolloff (high frequency content)
  spectralRolloff: number;
  // Zero crossing rate (noisiness)
  zeroCrossingRate: number;
  // RMS energy (loudness)
  rmsEnergy: number;
  // Pitch statistics
  pitchMean: number;
  pitchStd: number;
  // Speaking rate (syllables per second estimate)
  speakingRate: number;
}

export interface EnrollmentSample {
  id?: string;
  phraseIndex: number;
  phraseText: string;
  audioFeatures: VoiceFeatures;
  durationMs: number;
  sampleRate: number;
  qualityScore: number;
  recordedAt?: string;
}

export interface VoiceProfile {
  id: string;
  userId: string;
  profileName: string;
  enrollmentLevel: 'standard' | 'advanced';
  enrollmentPhrasesCount: number;
  voiceFeatures: VoiceFeatures | null;
  noiseThreshold: number;
  isEnabled: boolean;
  enrolledAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface VerificationResult {
  isMatch: boolean;
  confidence: number;
  matchScore: number;
  threshold: number;
  details?: {
    mfccSimilarity: number;
    pitchSimilarity: number;
    energySimilarity: number;
    spectralSimilarity: number;
  };
}

export type EnrollmentLevel = 'standard' | 'advanced';

export interface EnrollmentConfig {
  level: EnrollmentLevel;
  phrasesCount: number;
  description: string;
  benefits: string[];
  estimatedTime: string;
}

export const ENROLLMENT_CONFIGS: Record<EnrollmentLevel, EnrollmentConfig> = {
  standard: {
    level: 'standard',
    phrasesCount: 6,
    description: 'Treinamento padrão com 5-7 frases',
    benefits: [
      'Boa precisão para ambientes normais',
      'Distingue sua voz de outras pessoas',
      'Filtra ruídos moderados',
      'Configuração rápida (~1-2 minutos)',
    ],
    estimatedTime: '1-2 minutos',
  },
  advanced: {
    level: 'advanced',
    phrasesCount: 12,
    description: 'Treinamento avançado com 10+ frases',
    benefits: [
      'Alta precisão em ambientes ruidosos',
      'Melhor distinção de vozes similares',
      'Filtragem robusta de ruídos',
      'Ideal para uso profissional',
      'Maior resistência a variações de voz',
    ],
    estimatedTime: '3-5 minutos',
  },
};

export const ENROLLMENT_PHRASES: Record<string, string[]> = {
  'pt-BR': [
    'O sol nasce no leste e se põe no oeste todos os dias.',
    'A tecnologia avança rapidamente no mundo moderno.',
    'Segurança da informação é fundamental para empresas.',
    'Minha voz é única e serve como minha identificação.',
    'Inteligência artificial transforma o modo como trabalhamos.',
    'O reconhecimento de voz facilita a interação com sistemas.',
    'Dados precisam ser protegidos contra acessos não autorizados.',
    'A qualidade do áudio influencia o reconhecimento de fala.',
    'Autenticação biométrica oferece segurança adicional.',
    'Processos automatizados aumentam a produtividade.',
    'Comunicação clara é essencial em qualquer ambiente.',
    'Inovação constante impulsiona o crescimento das organizações.',
  ],
  'en-US': [
    'The sun rises in the east and sets in the west every day.',
    'Technology advances rapidly in the modern world.',
    'Information security is fundamental for businesses.',
    'My voice is unique and serves as my identification.',
    'Artificial intelligence transforms the way we work.',
    'Voice recognition facilitates interaction with systems.',
    'Data needs to be protected against unauthorized access.',
    'Audio quality influences speech recognition accuracy.',
    'Biometric authentication offers additional security.',
    'Automated processes increase productivity.',
    'Clear communication is essential in any environment.',
    'Constant innovation drives organizational growth.',
  ],
  'es-ES': [
    'El sol sale por el este y se pone por el oeste cada día.',
    'La tecnología avanza rápidamente en el mundo moderno.',
    'La seguridad de la información es fundamental para las empresas.',
    'Mi voz es única y sirve como mi identificación.',
    'La inteligencia artificial transforma la forma en que trabajamos.',
    'El reconocimiento de voz facilita la interacción con sistemas.',
    'Los datos deben protegerse contra accesos no autorizados.',
    'La calidad del audio influye en el reconocimiento del habla.',
    'La autenticación biométrica ofrece seguridad adicional.',
    'Los procesos automatizados aumentan la productividad.',
    'La comunicación clara es esencial en cualquier entorno.',
    'La innovación constante impulsa el crecimiento organizacional.',
  ],
};
