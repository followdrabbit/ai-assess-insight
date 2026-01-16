// Types for Speech-to-Text Providers

export interface STTResult {
  transcript: string;
  isFinal: boolean;
  confidence: number;
  timestamp: number;
  language?: string;
}

export interface STTError {
  type: 'no-speech' | 'audio-capture' | 'not-allowed' | 'network' | 'aborted' | 'api-error' | 'unknown';
  message: string;
  details?: string;
}

export interface STTProviderConfig {
  language?: string;
  continuous?: boolean;
  interimResults?: boolean;
  maxAlternatives?: number;
  autoRestart?: boolean;
  silenceTimeout?: number;
  apiKey?: string;
  model?: string;
  endpointUrl?: string;
}

export interface STTProvider {
  readonly id: string;
  readonly name: string;
  readonly supportsRealtime: boolean;
  readonly supportsFileUpload: boolean;
  
  isSupported(): boolean;
  initialize(config: STTProviderConfig): Promise<void>;
  start(): Promise<void>;
  stop(): Promise<void>;
  transcribeFile(file: File): Promise<STTResult>;
  onResult(callback: (result: STTResult) => void): void;
  onError(callback: (error: STTError) => void): void;
  onEnd(callback: () => void): void;
  destroy(): void;
}
