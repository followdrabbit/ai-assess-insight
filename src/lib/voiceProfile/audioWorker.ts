/**
 * Audio Processing Web Worker
 * Processes audio features in background thread to avoid UI blocking
 */

// Types (duplicated here since workers can't import)
interface VoiceFeatures {
  mfcc: number[];
  spectralCentroid: number;
  spectralRolloff: number;
  zeroCrossingRate: number;
  rmsEnergy: number;
  pitchMean: number;
  pitchStd: number;
  speakingRate: number;
}

interface WorkerMessage {
  type: 'extract' | 'calculateQuality';
  id: string;
  data: {
    samples?: Float32Array;
    sampleRate?: number;
    features?: VoiceFeatures;
    durationMs?: number;
  };
}

interface WorkerResponse {
  type: 'result' | 'error';
  id: string;
  data?: VoiceFeatures | number;
  error?: string;
}

// Feature extraction functions
function calculateSimplifiedMFCC(samples: Float32Array): number[] {
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

function calculateZeroCrossingRate(samples: Float32Array): number {
  if (samples.length < 2) return 0;
  
  let crossings = 0;
  for (let i = 1; i < samples.length; i++) {
    if ((samples[i] >= 0 && samples[i - 1] < 0) || (samples[i] < 0 && samples[i - 1] >= 0)) {
      crossings++;
    }
  }
  return crossings / samples.length;
}

function calculateRMSEnergy(samples: Float32Array): number {
  if (samples.length === 0) return 0;
  
  let sum = 0;
  for (let i = 0; i < samples.length; i++) {
    sum += samples[i] * samples[i];
  }
  return Math.sqrt(sum / samples.length);
}

function estimateSpectralCentroid(samples: Float32Array, sampleRate: number): number {
  const zcr = calculateZeroCrossingRate(samples);
  return zcr * sampleRate * 0.5;
}

function estimateSpectralRolloff(samples: Float32Array, sampleRate: number): number {
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

function detectPitchFast(frame: Float32Array, sampleRate: number): number {
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

function calculatePitchStats(samples: Float32Array, sampleRate: number): { pitchMean: number; pitchStd: number } {
  const frameSize = 1024;
  const hopSize = 512;
  const pitches: number[] = [];
  
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

function estimateSpeakingRate(samples: Float32Array, sampleRate: number): number {
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

function extractFeatures(samples: Float32Array, sampleRate: number): VoiceFeatures {
  const mfcc = calculateSimplifiedMFCC(samples);
  const spectralCentroid = estimateSpectralCentroid(samples, sampleRate);
  const spectralRolloff = estimateSpectralRolloff(samples, sampleRate);
  const zeroCrossingRate = calculateZeroCrossingRate(samples);
  const rmsEnergy = calculateRMSEnergy(samples);
  const { pitchMean, pitchStd } = calculatePitchStats(samples, sampleRate);
  const speakingRate = estimateSpeakingRate(samples, sampleRate);

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

function calculateQualityScore(features: VoiceFeatures, durationMs: number): number {
  let score = 1.0;
  
  if (durationMs < 1000) score *= 0.5;
  else if (durationMs < 2000) score *= 0.8;
  
  if (features.rmsEnergy < 0.01) score *= 0.6;
  if (features.pitchMean === 0) score *= 0.5;
  if (features.zeroCrossingRate > 0.3) score *= 0.7;
  
  return Math.max(0, Math.min(1, score));
}

// Worker message handler
self.onmessage = (event: MessageEvent<WorkerMessage>) => {
  const { type, id, data } = event.data;
  
  try {
    if (type === 'extract' && data.samples && data.sampleRate) {
      const features = extractFeatures(data.samples, data.sampleRate);
      const response: WorkerResponse = { type: 'result', id, data: features };
      self.postMessage(response);
    } else if (type === 'calculateQuality' && data.features && data.durationMs !== undefined) {
      const score = calculateQualityScore(data.features, data.durationMs);
      const response: WorkerResponse = { type: 'result', id, data: score };
      self.postMessage(response);
    } else {
      throw new Error('Invalid message type or missing data');
    }
  } catch (error: any) {
    const response: WorkerResponse = { type: 'error', id, error: error.message };
    self.postMessage(response);
  }
};
