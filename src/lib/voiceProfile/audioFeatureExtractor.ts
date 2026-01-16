/**
 * Audio Feature Extractor
 * Extracts voice characteristics using Web Audio API for speaker verification
 */

import { VoiceFeatures } from './types';

export class AudioFeatureExtractor {
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;

  constructor() {
    if (typeof window !== 'undefined' && window.AudioContext) {
      this.audioContext = new AudioContext();
    }
  }

  /**
   * Extract voice features from an audio buffer
   */
  async extractFeatures(audioBuffer: AudioBuffer): Promise<VoiceFeatures> {
    if (!this.audioContext) {
      throw new Error('AudioContext not supported');
    }

    const channelData = audioBuffer.getChannelData(0);
    const sampleRate = audioBuffer.sampleRate;

    // Calculate various audio features
    const mfcc = this.calculateMFCC(channelData, sampleRate);
    const spectralCentroid = this.calculateSpectralCentroid(channelData, sampleRate);
    const spectralRolloff = this.calculateSpectralRolloff(channelData, sampleRate);
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

    const arrayBuffer = await blob.arrayBuffer();
    const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
    return this.extractFeatures(audioBuffer);
  }

  /**
   * Calculate simplified MFCC (Mel-frequency cepstral coefficients)
   * Using a simplified approach suitable for browser
   */
  private calculateMFCC(samples: Float32Array, sampleRate: number): number[] {
    const frameSize = 2048;
    const hopSize = 512;
    const numMfcc = 13;
    const numFrames = Math.floor((samples.length - frameSize) / hopSize) + 1;
    
    if (numFrames <= 0) {
      return new Array(numMfcc).fill(0);
    }

    const mfccSum = new Array(numMfcc).fill(0);
    let validFrames = 0;

    for (let i = 0; i < numFrames; i++) {
      const start = i * hopSize;
      const frame = samples.slice(start, start + frameSize);
      
      // Apply Hamming window
      const windowed = this.applyHammingWindow(frame);
      
      // Calculate FFT magnitude spectrum
      const spectrum = this.calculateFFT(windowed);
      
      // Apply mel filterbank
      const melSpectrum = this.applyMelFilterbank(spectrum, sampleRate, 26);
      
      // Calculate DCT to get MFCCs
      const frameMfcc = this.calculateDCT(melSpectrum, numMfcc);
      
      if (frameMfcc.some(v => !isNaN(v) && isFinite(v))) {
        for (let j = 0; j < numMfcc; j++) {
          if (!isNaN(frameMfcc[j]) && isFinite(frameMfcc[j])) {
            mfccSum[j] += frameMfcc[j];
          }
        }
        validFrames++;
      }
    }

    // Return average MFCC
    return mfccSum.map(v => validFrames > 0 ? v / validFrames : 0);
  }

  /**
   * Apply Hamming window to a frame
   */
  private applyHammingWindow(frame: Float32Array): Float32Array {
    const windowed = new Float32Array(frame.length);
    for (let i = 0; i < frame.length; i++) {
      const window = 0.54 - 0.46 * Math.cos((2 * Math.PI * i) / (frame.length - 1));
      windowed[i] = frame[i] * window;
    }
    return windowed;
  }

  /**
   * Simplified FFT magnitude calculation
   */
  private calculateFFT(samples: Float32Array): Float32Array {
    const n = samples.length;
    const spectrum = new Float32Array(n / 2);
    
    // Simple DFT for demonstration (in production, use a proper FFT library)
    for (let k = 0; k < n / 2; k++) {
      let real = 0;
      let imag = 0;
      for (let t = 0; t < n; t++) {
        const angle = (2 * Math.PI * k * t) / n;
        real += samples[t] * Math.cos(angle);
        imag -= samples[t] * Math.sin(angle);
      }
      spectrum[k] = Math.sqrt(real * real + imag * imag);
    }
    
    return spectrum;
  }

  /**
   * Apply mel filterbank
   */
  private applyMelFilterbank(spectrum: Float32Array, sampleRate: number, numFilters: number): Float32Array {
    const melSpectrum = new Float32Array(numFilters);
    const minFreq = 0;
    const maxFreq = sampleRate / 2;
    
    const melMin = this.hzToMel(minFreq);
    const melMax = this.hzToMel(maxFreq);
    const melPoints = new Float32Array(numFilters + 2);
    
    for (let i = 0; i < numFilters + 2; i++) {
      melPoints[i] = melMin + (i * (melMax - melMin)) / (numFilters + 1);
    }
    
    const fftBins = new Float32Array(numFilters + 2);
    for (let i = 0; i < numFilters + 2; i++) {
      fftBins[i] = Math.floor((spectrum.length * 2 * this.melToHz(melPoints[i])) / sampleRate);
    }
    
    for (let i = 0; i < numFilters; i++) {
      let sum = 0;
      const startBin = Math.floor(fftBins[i]);
      const peakBin = Math.floor(fftBins[i + 1]);
      const endBin = Math.floor(fftBins[i + 2]);
      
      for (let j = startBin; j < endBin && j < spectrum.length; j++) {
        let weight = 0;
        if (j < peakBin && peakBin !== startBin) {
          weight = (j - startBin) / (peakBin - startBin);
        } else if (j >= peakBin && endBin !== peakBin) {
          weight = (endBin - j) / (endBin - peakBin);
        }
        sum += spectrum[j] * weight;
      }
      
      melSpectrum[i] = sum > 0 ? Math.log(sum) : -10;
    }
    
    return melSpectrum;
  }

  /**
   * Calculate DCT (Discrete Cosine Transform)
   */
  private calculateDCT(input: Float32Array, numCoeffs: number): number[] {
    const output = new Array(numCoeffs).fill(0);
    const n = input.length;
    
    for (let k = 0; k < numCoeffs; k++) {
      let sum = 0;
      for (let i = 0; i < n; i++) {
        sum += input[i] * Math.cos((Math.PI * k * (2 * i + 1)) / (2 * n));
      }
      output[k] = sum * Math.sqrt(2 / n);
    }
    
    return output;
  }

  /**
   * Hz to Mel conversion
   */
  private hzToMel(hz: number): number {
    return 2595 * Math.log10(1 + hz / 700);
  }

  /**
   * Mel to Hz conversion
   */
  private melToHz(mel: number): number {
    return 700 * (Math.pow(10, mel / 2595) - 1);
  }

  /**
   * Calculate spectral centroid (brightness of sound)
   */
  private calculateSpectralCentroid(samples: Float32Array, sampleRate: number): number {
    const spectrum = this.calculateFFT(samples);
    let numerator = 0;
    let denominator = 0;
    
    for (let i = 0; i < spectrum.length; i++) {
      const freq = (i * sampleRate) / (spectrum.length * 2);
      numerator += freq * spectrum[i];
      denominator += spectrum[i];
    }
    
    return denominator > 0 ? numerator / denominator : 0;
  }

  /**
   * Calculate spectral rolloff (frequency below which 85% of energy is contained)
   */
  private calculateSpectralRolloff(samples: Float32Array, sampleRate: number): number {
    const spectrum = this.calculateFFT(samples);
    const threshold = 0.85;
    
    let totalEnergy = 0;
    for (let i = 0; i < spectrum.length; i++) {
      totalEnergy += spectrum[i] * spectrum[i];
    }
    
    let cumulativeEnergy = 0;
    for (let i = 0; i < spectrum.length; i++) {
      cumulativeEnergy += spectrum[i] * spectrum[i];
      if (cumulativeEnergy >= threshold * totalEnergy) {
        return (i * sampleRate) / (spectrum.length * 2);
      }
    }
    
    return sampleRate / 2;
  }

  /**
   * Calculate zero crossing rate
   */
  private calculateZeroCrossingRate(samples: Float32Array): number {
    let crossings = 0;
    for (let i = 1; i < samples.length; i++) {
      if ((samples[i] >= 0 && samples[i - 1] < 0) || (samples[i] < 0 && samples[i - 1] >= 0)) {
        crossings++;
      }
    }
    return crossings / samples.length;
  }

  /**
   * Calculate RMS energy
   */
  private calculateRMSEnergy(samples: Float32Array): number {
    let sum = 0;
    for (let i = 0; i < samples.length; i++) {
      sum += samples[i] * samples[i];
    }
    return Math.sqrt(sum / samples.length);
  }

  /**
   * Calculate pitch statistics using autocorrelation
   */
  private calculatePitchStats(samples: Float32Array, sampleRate: number): { pitchMean: number; pitchStd: number } {
    const frameSize = 2048;
    const hopSize = 512;
    const pitches: number[] = [];
    
    for (let i = 0; i + frameSize < samples.length; i += hopSize) {
      const frame = samples.slice(i, i + frameSize);
      const pitch = this.detectPitch(frame, sampleRate);
      if (pitch > 50 && pitch < 500) { // Valid human voice range
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
   * Simple autocorrelation-based pitch detection
   */
  private detectPitch(frame: Float32Array, sampleRate: number): number {
    const minPeriod = Math.floor(sampleRate / 500); // Max 500Hz
    const maxPeriod = Math.floor(sampleRate / 50);  // Min 50Hz
    
    let maxCorr = 0;
    let bestPeriod = 0;
    
    for (let period = minPeriod; period < maxPeriod && period < frame.length / 2; period++) {
      let corr = 0;
      for (let i = 0; i < frame.length - period; i++) {
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
    const frameSize = Math.floor(sampleRate * 0.025); // 25ms frames
    const hopSize = Math.floor(sampleRate * 0.010);   // 10ms hop
    const energies: number[] = [];
    
    for (let i = 0; i + frameSize < samples.length; i += hopSize) {
      const frame = samples.slice(i, i + frameSize);
      const energy = this.calculateRMSEnergy(frame);
      energies.push(energy);
    }
    
    // Detect syllables as energy peaks
    const threshold = Math.max(...energies) * 0.3;
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
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
  }
}
