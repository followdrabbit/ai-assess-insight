// Web Speech API Provider for Speech Recognition
import { STTProvider, STTProviderConfig, STTResult, STTError } from './types';

// Web Speech API type declarations
interface WebSpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  onresult: ((event: any) => void) | null;
  onend: (() => void) | null;
  onerror: ((event: any) => void) | null;
  onstart: (() => void) | null;
  onspeechstart: (() => void) | null;
  onspeechend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

export class WebSpeechAPIProvider implements STTProvider {
  private recognition: WebSpeechRecognition | null = null;
  private isListening = false;
  private onResultCallback: ((result: STTResult) => void) | null = null;
  private onErrorCallback: ((error: STTError) => void) | null = null;
  private onEndCallback: (() => void) | null = null;
  private shouldRestart = false;
  private silenceTimeout: NodeJS.Timeout | null = null;
  private options: STTProviderConfig = {};

  readonly id = 'web-speech-api';
  readonly name = 'Web Speech API';
  readonly supportsRealtime = true;
  readonly supportsFileUpload = false;

  isSupported(): boolean {
    return typeof window !== 'undefined' && 
      ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);
  }

  async initialize(config: STTProviderConfig): Promise<void> {
    if (!this.isSupported()) {
      throw new Error('Web Speech API is not supported in this browser');
    }

    this.options = config;
    const SpeechRecognitionAPI = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    this.recognition = new SpeechRecognitionAPI();
    
    this.recognition.continuous = config.continuous ?? true;
    this.recognition.interimResults = config.interimResults ?? true;
    this.recognition.lang = config.language || navigator.language || 'pt-BR';
    this.recognition.maxAlternatives = config.maxAlternatives ?? 3;

    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    if (!this.recognition) return;

    this.recognition.onresult = (event: any) => {
      let finalText = '';
      let interimText = '';
      let maxConfidence = 0;

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const bestAlternative = result[0];
        
        if (result.isFinal) {
          finalText += bestAlternative.transcript;
          maxConfidence = Math.max(maxConfidence, bestAlternative.confidence);
        } else {
          interimText += bestAlternative.transcript;
          maxConfidence = Math.max(maxConfidence, bestAlternative.confidence || 0.5);
        }
      }

      this.clearSilenceTimeout();
      this.startSilenceTimeout();

      this.onResultCallback?.({
        transcript: finalText || interimText,
        isFinal: !!finalText,
        confidence: maxConfidence,
        timestamp: Date.now(),
      });
    };

    this.recognition.onspeechstart = () => {
      this.clearSilenceTimeout();
    };

    this.recognition.onspeechend = () => {
      this.startSilenceTimeout();
    };

    this.recognition.onend = () => {
      this.clearSilenceTimeout();
      
      if (this.shouldRestart && this.options.autoRestart) {
        setTimeout(() => {
          if (this.shouldRestart && this.recognition) {
            try {
              this.recognition.start();
            } catch (e) {
              this.isListening = false;
              this.shouldRestart = false;
              this.onEndCallback?.();
            }
          }
        }, 100);
      } else {
        this.isListening = false;
        this.shouldRestart = false;
        this.onEndCallback?.();
      }
    };

    this.recognition.onerror = (event: any) => {
      const errorType = this.mapErrorType(event.error);
      
      if (errorType === 'no-speech' && this.options.autoRestart) {
        return;
      }
      
      if (errorType !== 'aborted') {
        this.onErrorCallback?.({
          type: errorType,
          message: this.getErrorMessage(errorType),
        });
      }
      
      if (errorType !== 'no-speech') {
        this.isListening = false;
        this.shouldRestart = false;
      }
    };
  }

  private mapErrorType(errorCode: string): STTError['type'] {
    switch (errorCode) {
      case 'no-speech': return 'no-speech';
      case 'audio-capture': return 'audio-capture';
      case 'not-allowed': return 'not-allowed';
      case 'network': return 'network';
      case 'aborted': return 'aborted';
      default: return 'unknown';
    }
  }

  private getErrorMessage(type: STTError['type']): string {
    switch (type) {
      case 'no-speech':
        return 'Nenhuma fala detectada. Tente falar mais alto ou mais perto do microfone.';
      case 'audio-capture':
        return 'Não foi possível capturar áudio. Verifique seu microfone.';
      case 'not-allowed':
        return 'Permissão para microfone negada. Habilite nas configurações do navegador.';
      case 'network':
        return 'Erro de rede. Verifique sua conexão com a internet.';
      case 'aborted':
        return 'Reconhecimento de voz foi cancelado.';
      default:
        return 'Erro desconhecido no reconhecimento de voz.';
    }
  }

  private clearSilenceTimeout(): void {
    if (this.silenceTimeout) {
      clearTimeout(this.silenceTimeout);
      this.silenceTimeout = null;
    }
  }

  private startSilenceTimeout(): void {
    this.clearSilenceTimeout();
    const timeout = this.options.silenceTimeout || 3000;
    this.silenceTimeout = setTimeout(() => {
      if (this.recognition && this.isListening) {
        this.shouldRestart = false;
        this.recognition.stop();
      }
    }, timeout);
  }

  async start(): Promise<void> {
    if (!this.recognition || this.isListening) return;
    
    this.shouldRestart = this.options.autoRestart ?? true;
    
    try {
      this.recognition.start();
      this.isListening = true;
    } catch (err) {
      throw new Error('Não foi possível iniciar o reconhecimento de voz.');
    }
  }

  async stop(): Promise<void> {
    if (!this.recognition) return;
    
    this.shouldRestart = false;
    this.clearSilenceTimeout();
    this.recognition.stop();
    this.isListening = false;
  }

  async transcribeFile(_file: File): Promise<STTResult> {
    throw new Error('Web Speech API does not support file transcription');
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
    this.clearSilenceTimeout();
    if (this.recognition) {
      this.recognition.abort();
      this.recognition = null;
    }
  }
}
