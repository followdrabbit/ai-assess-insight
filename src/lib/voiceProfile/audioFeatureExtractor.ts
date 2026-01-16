/**
 * Audio Feature Extractor with Web Worker Support
 * Processes audio in background thread to avoid UI blocking
 */

import { VoiceFeatures } from './types';

interface PendingRequest {
  resolve: (value: any) => void;
  reject: (error: Error) => void;
}

export class AudioFeatureExtractor {
  private audioContext: AudioContext | null = null;
  private worker: Worker | null = null;
  private pendingRequests: Map<string, PendingRequest> = new Map();
  private requestId = 0;
  private useWorker = true;

  constructor() {
    if (typeof window !== 'undefined') {
      if (window.AudioContext) {
        this.audioContext = new AudioContext();
      }
      this.initWorker();
    }
  }

  /**
   * Initialize Web Worker for background processing
   */
  private initWorker(): void {
    try {
      // Create worker from blob to avoid separate file issues
      const workerCode = this.getWorkerCode();
      const blob = new Blob([workerCode], { type: 'application/javascript' });
      const workerUrl = URL.createObjectURL(blob);
      
      this.worker = new Worker(workerUrl);
      
      this.worker.onmessage = (event) => {
        const { type, id, data, error } = event.data;
        const pending = this.pendingRequests.get(id);
        
        if (pending) {
          this.pendingRequests.delete(id);
          if (type === 'error') {
            pending.reject(new Error(error));
          } else {
            pending.resolve(data);
          }
        }
      };

      this.worker.onerror = (error) => {
        console.warn('Worker error, falling back to main thread:', error);
        this.useWorker = false;
        // Reject all pending requests
        this.pendingRequests.forEach((pending, id) => {
          pending.reject(new Error('Worker failed'));
          this.pendingRequests.delete(id);
        });
      };
    } catch (error) {
      console.warn('Failed to create worker, using main thread:', error);
      this.useWorker = false;
    }
  }

  /**
   * Get the worker code as a string (inline worker)
   */
  private getWorkerCode(): string {
    return `
      // Feature extraction functions
      function calculateSimplifiedMFCC(samples) {
        const numCoeffs = 13;
        const coeffs = new Array(numCoeffs).fill(0);
        const n = samples.length;
        
        if (n === 0) return coeffs;

        const bandSize = Math.floor(n / numCoeffs);
        
        for (let i = 0; i < numCoeffs; i++) {
          const start = i * bandSize;
          const end = Math.min(start + bandSize, n);
          
          let sum = 0;
          let sumSq = 0;
          let maxVal = 0;
          
          for (let j = start; j < end; j++) {
            const val = Math.abs(samples[j]);
            sum += val;
            sumSq += val * val;
            maxVal = Math.max(maxVal, val);
          }
          
          const count = end - start;
          const mean = sum / count;
          const variance = (sumSq / count) - (mean * mean);
          
          coeffs[i] = mean * 0.4 + Math.sqrt(Math.max(0, variance)) * 0.4 + maxVal * 0.2;
        }
        
        return coeffs;
      }

      function calculateZeroCrossingRate(samples) {
        if (samples.length < 2) return 0;
        
        let crossings = 0;
        for (let i = 1; i < samples.length; i++) {
          if ((samples[i] >= 0 && samples[i - 1] < 0) || (samples[i] < 0 && samples[i - 1] >= 0)) {
            crossings++;
          }
        }
        return crossings / samples.length;
      }

      function calculateRMSEnergy(samples) {
        if (samples.length === 0) return 0;
        
        let sum = 0;
        for (let i = 0; i < samples.length; i++) {
          sum += samples[i] * samples[i];
        }
        return Math.sqrt(sum / samples.length);
      }

      function estimateSpectralCentroid(samples, sampleRate) {
        const zcr = calculateZeroCrossingRate(samples);
        return zcr * sampleRate * 0.5;
      }

      function estimateSpectralRolloff(samples, sampleRate) {
        const n = samples.length;
        if (n === 0) return sampleRate / 4;
        
        let totalEnergy = 0;
        for (let i = 0; i < n; i++) {
          totalEnergy += samples[i] * samples[i];
        }
        
        const threshold = totalEnergy * 0.85;
        let cumEnergy = 0;
        let rolloffIndex = n;
        
        for (let i = 0; i < n; i++) {
          cumEnergy += samples[i] * samples[i];
          if (cumEnergy >= threshold) {
            rolloffIndex = i;
            break;
          }
        }
        
        return (rolloffIndex / n) * (sampleRate / 2);
      }

      function detectPitchFast(frame, sampleRate) {
        const minPeriod = Math.floor(sampleRate / 500);
        const maxPeriod = Math.floor(sampleRate / 50);
        const step = 2;
        
        let maxCorr = 0;
        let bestPeriod = 0;
        
        const windowSize = Math.min(frame.length / 2, 256);
        
        for (let period = minPeriod; period < maxPeriod && period < frame.length / 2; period += step) {
          let corr = 0;
          for (let i = 0; i < windowSize; i++) {
            corr += frame[i] * frame[i + period];
          }
          
          if (corr > maxCorr) {
            maxCorr = corr;
            bestPeriod = period;
          }
        }
        
        return bestPeriod > 0 ? sampleRate / bestPeriod : 0;
      }

      function calculatePitchStats(samples, sampleRate) {
        const frameSize = 1024;
        const hopSize = 512;
        const pitches = [];
        
        const maxFrames = Math.min(20, Math.floor((samples.length - frameSize) / hopSize));
        
        for (let f = 0; f < maxFrames; f++) {
          const i = f * hopSize;
          const frame = samples.slice(i, i + frameSize);
          const pitch = detectPitchFast(frame, sampleRate);
          if (pitch > 50 && pitch < 500) {
            pitches.push(pitch);
          }
        }
        
        if (pitches.length === 0) {
          return { pitchMean: 0, pitchStd: 0 };
        }
        
        const mean = pitches.reduce((a, b) => a + b, 0) / pitches.length;
        const variance = pitches.reduce((sum, p) => sum + Math.pow(p - mean, 2), 0) / pitches.length;
        
        return { pitchMean: mean, pitchStd: Math.sqrt(variance) };
      }

      function estimateSpeakingRate(samples, sampleRate) {
        const frameSize = Math.floor(sampleRate * 0.025);
        const hopSize = Math.floor(sampleRate * 0.015);
        
        const maxFrames = Math.min(200, Math.floor((samples.length - frameSize) / hopSize));
        const energies = [];
        
        for (let f = 0; f < maxFrames; f++) {
          const i = f * hopSize;
          let energy = 0;
          for (let j = 0; j < frameSize && i + j < samples.length; j++) {
            energy += samples[i + j] * samples[i + j];
          }
          energies.push(Math.sqrt(energy / frameSize));
        }
        
        if (energies.length === 0) return 0;
        
        const maxEnergy = Math.max(...energies);
        const threshold = maxEnergy * 0.3;
        let syllables = 0;
        let inSyllable = false;
        
        for (const energy of energies) {
          if (energy > threshold && !inSyllable) {
            syllables++;
            inSyllable = true;
          } else if (energy <= threshold) {
            inSyllable = false;
          }
        }
        
        const durationSeconds = samples.length / sampleRate;
        return durationSeconds > 0 ? syllables / durationSeconds : 0;
      }

      function extractFeatures(samples, sampleRate) {
        return {
          mfcc: calculateSimplifiedMFCC(samples),
          spectralCentroid: estimateSpectralCentroid(samples, sampleRate),
          spectralRolloff: estimateSpectralRolloff(samples, sampleRate),
          zeroCrossingRate: calculateZeroCrossingRate(samples),
          rmsEnergy: calculateRMSEnergy(samples),
          ...calculatePitchStats(samples, sampleRate),
          speakingRate: estimateSpeakingRate(samples, sampleRate),
        };
      }

      function calculateQualityScore(features, durationMs) {
        let score = 1.0;
        
        if (durationMs < 1000) score *= 0.5;
        else if (durationMs < 2000) score *= 0.8;
        
        if (features.rmsEnergy < 0.01) score *= 0.6;
        if (features.pitchMean === 0) score *= 0.5;
        if (features.zeroCrossingRate > 0.3) score *= 0.7;
        
        return Math.max(0, Math.min(1, score));
      }

      self.onmessage = function(event) {
        const { type, id, data } = event.data;
        
        try {
          if (type === 'extract' && data.samples && data.sampleRate) {
            const features = extractFeatures(data.samples, data.sampleRate);
            self.postMessage({ type: 'result', id, data: features });
          } else if (type === 'calculateQuality' && data.features && data.durationMs !== undefined) {
            const score = calculateQualityScore(data.features, data.durationMs);
            self.postMessage({ type: 'result', id, data: score });
          } else {
            throw new Error('Invalid message type');
          }
        } catch (error) {
          self.postMessage({ type: 'error', id, error: error.message });
        }
      };
    `;
  }

  /**
   * Send message to worker and wait for response
   */
  private sendToWorker<T>(type: string, data: any): Promise<T> {
    return new Promise((resolve, reject) => {
      if (!this.worker || !this.useWorker) {
        reject(new Error('Worker not available'));
        return;
      }

      const id = `req_${++this.requestId}`;
      this.pendingRequests.set(id, { resolve, reject });
      
      // Transfer Float32Array for better performance
      const message = { type, id, data };
      if (data.samples instanceof Float32Array) {
        this.worker.postMessage(message, [data.samples.buffer]);
      } else {
        this.worker.postMessage(message);
      }
    });
  }

  /**
   * Extract features (tries worker first, falls back to main thread)
   */
  async extractFeatures(audioBuffer: AudioBuffer): Promise<VoiceFeatures> {
    const channelData = audioBuffer.getChannelData(0);
    const sampleRate = audioBuffer.sampleRate;

    // Copy the data since we might transfer it
    const samples = new Float32Array(channelData);

    if (this.worker && this.useWorker) {
      try {
        return await this.sendToWorker<VoiceFeatures>('extract', { samples, sampleRate });
      } catch (error) {
        console.warn('Worker extraction failed, using main thread:', error);
      }
    }

    // Fallback to main thread
    return this.extractFeaturesMainThread(samples, sampleRate);
  }

  /**
   * Extract features from Blob
   */
  async extractFeaturesFromBlob(blob: Blob): Promise<VoiceFeatures> {
    if (!this.audioContext) {
      throw new Error('AudioContext not supported');
    }

    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }

    const arrayBuffer = await blob.arrayBuffer();
    const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
    return this.extractFeatures(audioBuffer);
  }

  /**
   * Calculate quality score
   */
  calculateQualityScore(features: VoiceFeatures, durationMs: number): number {
    let score = 1.0;
    
    if (durationMs < 1000) score *= 0.5;
    else if (durationMs < 2000) score *= 0.8;
    
    if (features.rmsEnergy < 0.01) score *= 0.6;
    if (features.pitchMean === 0) score *= 0.5;
    if (features.zeroCrossingRate > 0.3) score *= 0.7;
    
    return Math.max(0, Math.min(1, score));
  }

  /**
   * Main thread fallback for feature extraction
   */
  private extractFeaturesMainThread(samples: Float32Array, sampleRate: number): VoiceFeatures {
    return {
      mfcc: this.calculateSimplifiedMFCC(samples),
      spectralCentroid: this.estimateSpectralCentroid(samples, sampleRate),
      spectralRolloff: this.estimateSpectralRolloff(samples, sampleRate),
      zeroCrossingRate: this.calculateZeroCrossingRate(samples),
      rmsEnergy: this.calculateRMSEnergy(samples),
      ...this.calculatePitchStats(samples, sampleRate),
      speakingRate: this.estimateSpeakingRate(samples, sampleRate),
    };
  }

  // Main thread implementations (for fallback)
  private calculateSimplifiedMFCC(samples: Float32Array): number[] {
    const numCoeffs = 13;
    const coeffs = new Array(numCoeffs).fill(0);
    const n = samples.length;
    if (n === 0) return coeffs;

    const bandSize = Math.floor(n / numCoeffs);
    for (let i = 0; i < numCoeffs; i++) {
      const start = i * bandSize;
      const end = Math.min(start + bandSize, n);
      let sum = 0, sumSq = 0, maxVal = 0;
      for (let j = start; j < end; j++) {
        const val = Math.abs(samples[j]);
        sum += val;
        sumSq += val * val;
        maxVal = Math.max(maxVal, val);
      }
      const count = end - start;
      const mean = sum / count;
      const variance = (sumSq / count) - (mean * mean);
      coeffs[i] = mean * 0.4 + Math.sqrt(Math.max(0, variance)) * 0.4 + maxVal * 0.2;
    }
    return coeffs;
  }

  private calculateZeroCrossingRate(samples: Float32Array): number {
    if (samples.length < 2) return 0;
    let crossings = 0;
    for (let i = 1; i < samples.length; i++) {
      if ((samples[i] >= 0 && samples[i - 1] < 0) || (samples[i] < 0 && samples[i - 1] >= 0)) {
        crossings++;
      }
    }
    return crossings / samples.length;
  }

  private calculateRMSEnergy(samples: Float32Array): number {
    if (samples.length === 0) return 0;
    let sum = 0;
    for (let i = 0; i < samples.length; i++) {
      sum += samples[i] * samples[i];
    }
    return Math.sqrt(sum / samples.length);
  }

  private estimateSpectralCentroid(samples: Float32Array, sampleRate: number): number {
    return this.calculateZeroCrossingRate(samples) * sampleRate * 0.5;
  }

  private estimateSpectralRolloff(samples: Float32Array, sampleRate: number): number {
    const n = samples.length;
    if (n === 0) return sampleRate / 4;
    
    let totalEnergy = 0;
    for (let i = 0; i < n; i++) totalEnergy += samples[i] * samples[i];
    
    const threshold = totalEnergy * 0.85;
    let cumEnergy = 0;
    for (let i = 0; i < n; i++) {
      cumEnergy += samples[i] * samples[i];
      if (cumEnergy >= threshold) return (i / n) * (sampleRate / 2);
    }
    return sampleRate / 2;
  }

  private calculatePitchStats(samples: Float32Array, sampleRate: number): { pitchMean: number; pitchStd: number } {
    const frameSize = 1024, hopSize = 512;
    const pitches: number[] = [];
    const maxFrames = Math.min(20, Math.floor((samples.length - frameSize) / hopSize));
    
    for (let f = 0; f < maxFrames; f++) {
      const frame = samples.slice(f * hopSize, f * hopSize + frameSize);
      const pitch = this.detectPitchFast(frame, sampleRate);
      if (pitch > 50 && pitch < 500) pitches.push(pitch);
    }
    
    if (pitches.length === 0) return { pitchMean: 0, pitchStd: 0 };
    
    const mean = pitches.reduce((a, b) => a + b, 0) / pitches.length;
    const variance = pitches.reduce((sum, p) => sum + Math.pow(p - mean, 2), 0) / pitches.length;
    return { pitchMean: mean, pitchStd: Math.sqrt(variance) };
  }

  private detectPitchFast(frame: Float32Array, sampleRate: number): number {
    const minPeriod = Math.floor(sampleRate / 500);
    const maxPeriod = Math.floor(sampleRate / 50);
    let maxCorr = 0, bestPeriod = 0;
    const windowSize = Math.min(frame.length / 2, 256);
    
    for (let period = minPeriod; period < maxPeriod && period < frame.length / 2; period += 2) {
      let corr = 0;
      for (let i = 0; i < windowSize; i++) corr += frame[i] * frame[i + period];
      if (corr > maxCorr) { maxCorr = corr; bestPeriod = period; }
    }
    return bestPeriod > 0 ? sampleRate / bestPeriod : 0;
  }

  private estimateSpeakingRate(samples: Float32Array, sampleRate: number): number {
    const frameSize = Math.floor(sampleRate * 0.025);
    const hopSize = Math.floor(sampleRate * 0.015);
    const maxFrames = Math.min(200, Math.floor((samples.length - frameSize) / hopSize));
    const energies: number[] = [];
    
    for (let f = 0; f < maxFrames; f++) {
      const i = f * hopSize;
      let energy = 0;
      for (let j = 0; j < frameSize && i + j < samples.length; j++) {
        energy += samples[i + j] * samples[i + j];
      }
      energies.push(Math.sqrt(energy / frameSize));
    }
    
    if (energies.length === 0) return 0;
    
    const maxEnergy = Math.max(...energies);
    const threshold = maxEnergy * 0.3;
    let syllables = 0, inSyllable = false;
    
    for (const energy of energies) {
      if (energy > threshold && !inSyllable) { syllables++; inSyllable = true; }
      else if (energy <= threshold) inSyllable = false;
    }
    
    return samples.length / sampleRate > 0 ? syllables / (samples.length / sampleRate) : 0;
  }

  destroy(): void {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close().catch(() => {});
      this.audioContext = null;
    }
    this.pendingRequests.clear();
  }
}
