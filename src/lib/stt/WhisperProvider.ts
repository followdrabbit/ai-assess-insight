// OpenAI Whisper Provider for Speech Recognition
import { STTProvider, STTProviderConfig, STTResult, STTError } from './types';

export class WhisperProvider implements STTProvider {
  private apiKey: string = '';
  private model: string = 'whisper-1';
  private endpointUrl: string = 'https://api.openai.com/v1/audio/transcriptions';
  private language: string = 'pt';
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private isRecording = false;
  private onResultCallback: ((result: STTResult) => void) | null = null;
  private onErrorCallback: ((error: STTError) => void) | null = null;
  private onEndCallback: (() => void) | null = null;
  private recordingInterval: NodeJS.Timeout | null = null;
  private silenceTimeout: NodeJS.Timeout | null = null;
  private options: STTProviderConfig = {};

  readonly id = 'openai-whisper';
  readonly name = 'OpenAI Whisper';
  readonly supportsRealtime = false;
  readonly supportsFileUpload = true;

  isSupported(): boolean {
    return typeof window !== 'undefined' && 
      'MediaRecorder' in window &&
      'navigator' in window &&
      'mediaDevices' in navigator;
  }

  async initialize(config: STTProviderConfig): Promise<void> {
    if (!config.apiKey) {
      throw new Error('API key is required for Whisper provider');
    }

    this.apiKey = config.apiKey;
    this.model = config.model || 'whisper-1';
    this.language = config.language?.split('-')[0] || 'pt';
    this.options = config;
    
    if (config.endpointUrl) {
      this.endpointUrl = config.endpointUrl;
    }
  }

  async start(): Promise<void> {
    if (this.isRecording) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Use webm for better compatibility
      const mimeType = MediaRecorder.isTypeSupported('audio/webm') 
        ? 'audio/webm' 
        : 'audio/mp4';
      
      this.mediaRecorder = new MediaRecorder(stream, { mimeType });
      this.audioChunks = [];
      this.isRecording = true;

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data);
        }
      };

      this.mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
        this.audioChunks = [];
        
        if (audioBlob.size > 0) {
          await this.transcribeAudio(audioBlob);
        }
        
        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());
      };

      // Start recording
      this.mediaRecorder.start();

      // Set up periodic transcription (every 5 seconds)
      this.recordingInterval = setInterval(() => {
        if (this.mediaRecorder && this.isRecording && this.audioChunks.length > 0) {
          // Request data from the recorder
          this.mediaRecorder.requestData();
          
          // Transcribe accumulated chunks
          const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
          if (audioBlob.size > 1000) { // Only transcribe if we have meaningful audio
            this.transcribeAudio(audioBlob);
            this.audioChunks = [];
          }
        }
      }, 5000);

      // Set up silence detection timeout
      this.startSilenceTimeout();

    } catch (err: any) {
      const error: STTError = {
        type: err.name === 'NotAllowedError' ? 'not-allowed' : 'audio-capture',
        message: err.name === 'NotAllowedError' 
          ? 'Permissão para microfone negada.' 
          : 'Não foi possível acessar o microfone.',
      };
      this.onErrorCallback?.(error);
      throw error;
    }
  }

  async stop(): Promise<void> {
    this.clearIntervals();
    
    if (this.mediaRecorder && this.isRecording) {
      this.isRecording = false;
      this.mediaRecorder.stop();
    }
    
    this.onEndCallback?.();
  }

  private clearIntervals(): void {
    if (this.recordingInterval) {
      clearInterval(this.recordingInterval);
      this.recordingInterval = null;
    }
    if (this.silenceTimeout) {
      clearTimeout(this.silenceTimeout);
      this.silenceTimeout = null;
    }
  }

  private startSilenceTimeout(): void {
    if (this.silenceTimeout) {
      clearTimeout(this.silenceTimeout);
    }
    
    const timeout = this.options.silenceTimeout || 30000; // Default 30s for Whisper
    this.silenceTimeout = setTimeout(() => {
      this.stop();
    }, timeout);
  }

  private async transcribeAudio(audioBlob: Blob): Promise<void> {
    try {
      const result = await this.transcribeFile(new File([audioBlob], 'audio.webm', { type: 'audio/webm' }));
      this.onResultCallback?.(result);
      
      // Reset silence timeout on successful transcription
      this.startSilenceTimeout();
    } catch (err) {
      // Error is already handled in transcribeFile
    }
  }

  async transcribeFile(file: File): Promise<STTResult> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('model', this.model);
    formData.append('language', this.language);
    formData.append('response_format', 'json');

    try {
      const response = await fetch(this.endpointUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const error: STTError = {
          type: 'api-error',
          message: `Erro na API: ${response.status}`,
          details: errorData.error?.message || response.statusText,
        };
        this.onErrorCallback?.(error);
        throw error;
      }

      const data = await response.json();
      
      return {
        transcript: data.text || '',
        isFinal: true,
        confidence: 0.95, // Whisper doesn't return confidence, assume high
        timestamp: Date.now(),
        language: data.language,
      };
    } catch (err: any) {
      if (err.type === 'api-error') {
        throw err;
      }
      
      const error: STTError = {
        type: 'network',
        message: 'Erro de conexão com a API.',
        details: err.message,
      };
      this.onErrorCallback?.(error);
      throw error;
    }
  }

  onResult(callback: (result: STTResult) => void): void {
    this.onResultCallback = callback;
  }

  onError(callback: (error: STTError) => void): void {
    this.onErrorCallback = callback;
  }

  onEnd(callback: () => void): void {
    this.onEndCallback = callback;
  }

  destroy(): void {
    this.clearIntervals();
    if (this.mediaRecorder && this.isRecording) {
      this.mediaRecorder.stop();
    }
    this.mediaRecorder = null;
  }
}
