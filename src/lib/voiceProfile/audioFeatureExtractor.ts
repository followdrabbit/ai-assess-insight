/**
 * Audio Feature Extractor (Lightweight Version)
 * Extracts voice characteristics using simple statistical methods
 * Optimized for mobile devices - no heavy FFT calculations
 */

import { VoiceFeatures } from './types';

export class AudioFeatureExtractor {
  private audioContext: AudioContext | null = null;

  constructor() {
    if (typeof window !== 'undefined' && window.AudioContext) {
      this.audioContext = new AudioContext();
    }
  }

  /**
   * Extract voice features from an audio buffer
   */
  async extractFeatures(audioBuffer: AudioBuffer): Promise<VoiceFeatures> {
    const channelData = audioBuffer.getChannelData(0);
    const sampleRate = audioBuffer.sampleRate;

    // Use lightweight statistical features instead of heavy FFT
    const mfcc = this.calculateSimplifiedMFCC(channelData);
    const spectralCentroid = this.estimateSpectralCentroid(channelData, sampleRate);
    const spectralRolloff = this.estimateSpectralRolloff(channelData, sampleRate);
    const zeroCrossingRate = this.calculateZeroCrossingRate(channelData);
    const rmsEnergy = this.calculateRMSEnergy(channelData);
    const { pitchMean, pitchStd } = this.calculatePitchStats(channelData, sampleRate);
    const speakingRate = this.estimateSpeakingRate(channelData, sampleRate);

    return {
      mfcc,
      spectralCentroid,
      spectralRolloff,
      zeroCrossingRate,
      rmsEnergy,
      pitchMean,
      pitchStd,
      speakingRate,
    };
  }

  /**
   * Extract features from a Blob (recorded audio)
   */
  async extractFeaturesFromBlob(blob: Blob): Promise<VoiceFeatures> {
    if (!this.audioContext) {
      throw new Error('AudioContext not supported');
    }

    // Resume audio context if suspended (required on mobile)
    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }

    const arrayBuffer = await blob.arrayBuffer();
    const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
    return this.extractFeatures(audioBuffer);
  }

  /**
   * Calculate simplified MFCC-like features using statistical moments
   * Much faster than real MFCC - O(n) instead of O(n²)
   */
  private calculateSimplifiedMFCC(samples: Float32Array): number[] {
    const numCoeffs = 13;
    const coeffs = new Array(numCoeffs).fill(0);
    const n = samples.length;
    
    if (n === 0) return coeffs;

    // Divide signal into bands and compute statistics
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
      
      // Combine mean, variance and max into a single coefficient
      coeffs[i] = mean * 0.4 + Math.sqrt(Math.max(0, variance)) * 0.4 + maxVal * 0.2;
    }
    
    return coeffs;
  }

  /**
   * Estimate spectral centroid using zero-crossing rate correlation
   * Faster approximation that correlates with brightness
   */
  private estimateSpectralCentroid(samples: Float32Array, sampleRate: number): number {
    const zcr = this.calculateZeroCrossingRate(samples);
    // ZCR correlates roughly with spectral centroid
    // Map to approximate frequency range
    return zcr * sampleRate * 0.5;
  }

  /**
   * Estimate spectral rolloff based on energy distribution
   */
  private estimateSpectralRolloff(samples: Float32Array, sampleRate: number): number {
    const n = samples.length;
    if (n === 0) return sampleRate / 4;
    
    // Calculate cumulative energy
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
    
    // Map index to approximate frequency
    return (rolloffIndex / n) * (sampleRate / 2);
  }

  /**
   * Calculate zero crossing rate - O(n)
   */
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

  /**
   * Calculate RMS energy - O(n)
   */
  private calculateRMSEnergy(samples: Float32Array): number {
    if (samples.length === 0) return 0;
    
    let sum = 0;
    for (let i = 0; i < samples.length; i++) {
      sum += samples[i] * samples[i];
    }
    return Math.sqrt(sum / samples.length);
  }

  /**
   * Calculate pitch statistics using simplified autocorrelation
   * Only checks a subset of lags for speed
   */
  private calculatePitchStats(samples: Float32Array, sampleRate: number): { pitchMean: number; pitchStd: number } {
    const frameSize = 1024; // Smaller frame for speed
    const hopSize = 512;
    const pitches: number[] = [];
    
    // Process fewer frames for mobile performance
    const maxFrames = Math.min(20, Math.floor((samples.length - frameSize) / hopSize));
    
    for (let f = 0; f < maxFrames; f++) {
      const i = f * hopSize;
      const frame = samples.slice(i, i + frameSize);
      const pitch = this.detectPitchFast(frame, sampleRate);
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

  /**
   * Fast pitch detection using sparse autocorrelation
   */
  private detectPitchFast(frame: Float32Array, sampleRate: number): number {
    const minPeriod = Math.floor(sampleRate / 500);
    const maxPeriod = Math.floor(sampleRate / 50);
    const step = 2; // Check every 2nd period for speed
    
    let maxCorr = 0;
    let bestPeriod = 0;
    
    // Only compute partial autocorrelation
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

  /**
   * Estimate speaking rate based on energy envelope
   */
  private estimateSpeakingRate(samples: Float32Array, sampleRate: number): number {
    const frameSize = Math.floor(sampleRate * 0.025);
    const hopSize = Math.floor(sampleRate * 0.015);
    
    // Limit number of frames for mobile
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
    
    // Detect syllables as energy peaks
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

  /**
   * Calculate audio quality score (0-1)
   */
  calculateQualityScore(features: VoiceFeatures, durationMs: number): number {
    let score = 1.0;
    
    // Penalize very short recordings
    if (durationMs < 1000) score *= 0.5;
    else if (durationMs < 2000) score *= 0.8;
    
    // Penalize low energy (too quiet)
    if (features.rmsEnergy < 0.01) score *= 0.6;
    
    // Penalize if no pitch detected (might be noise)
    if (features.pitchMean === 0) score *= 0.5;
    
    // Penalize very high zero crossing rate (noise indicator)
    if (features.zeroCrossingRate > 0.3) score *= 0.7;
    
    return Math.max(0, Math.min(1, score));
  }

  destroy(): void {
    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close().catch(() => {});
      this.audioContext = null;
    }
  }
}
