/**
 * Speaker Verifier
 * Compares voice features against enrolled profile for speaker verification
 */

import { VoiceFeatures, VerificationResult } from './types';

export class SpeakerVerifier {
  /**
   * Verify if the given voice features match the enrolled profile
   */
  verify(
    inputFeatures: VoiceFeatures,
    profileFeatures: VoiceFeatures,
    threshold: number = 0.65
  ): VerificationResult {
    // Calculate individual similarity scores
    const mfccSimilarity = this.calculateMFCCSimilarity(inputFeatures.mfcc, profileFeatures.mfcc);
    const pitchSimilarity = this.calculatePitchSimilarity(inputFeatures, profileFeatures);
    const energySimilarity = this.calculateEnergySimilarity(inputFeatures, profileFeatures);
    const spectralSimilarity = this.calculateSpectralSimilarity(inputFeatures, profileFeatures);

    // Weighted combination (MFCC is most important for speaker ID)
    const weights = {
      mfcc: 0.50,
      pitch: 0.25,
      energy: 0.10,
      spectral: 0.15,
    };

    const matchScore =
      mfccSimilarity * weights.mfcc +
      pitchSimilarity * weights.pitch +
      energySimilarity * weights.energy +
      spectralSimilarity * weights.spectral;

    // Calculate confidence based on how far above/below threshold
    const normalizedScore = Math.max(0, Math.min(1, matchScore));
    const confidence = this.calculateConfidence(normalizedScore, threshold);

    return {
      isMatch: normalizedScore >= threshold,
      confidence,
      matchScore: normalizedScore,
      threshold,
      details: {
        mfccSimilarity,
        pitchSimilarity,
        energySimilarity,
        spectralSimilarity,
      },
    };
  }

  /**
   * Calculate MFCC similarity using cosine similarity
   */
  private calculateMFCCSimilarity(mfcc1: number[], mfcc2: number[]): number {
    if (mfcc1.length !== mfcc2.length || mfcc1.length === 0) {
      return 0;
    }

    let dotProduct = 0;
    let norm1 = 0;
    let norm2 = 0;

    for (let i = 0; i < mfcc1.length; i++) {
      dotProduct += mfcc1[i] * mfcc2[i];
      norm1 += mfcc1[i] * mfcc1[i];
      norm2 += mfcc2[i] * mfcc2[i];
    }

    const magnitude = Math.sqrt(norm1) * Math.sqrt(norm2);
    if (magnitude === 0) return 0;

    // Cosine similarity: -1 to 1, convert to 0 to 1
    const cosineSim = dotProduct / magnitude;
    return (cosineSim + 1) / 2;
  }

  /**
   * Calculate pitch similarity
   */
  private calculatePitchSimilarity(features1: VoiceFeatures, features2: VoiceFeatures): number {
    if (features1.pitchMean === 0 || features2.pitchMean === 0) {
      return 0.5; // Neutral if no pitch detected
    }

    // Calculate relative pitch difference
    const pitchRatio = Math.min(features1.pitchMean, features2.pitchMean) / 
                       Math.max(features1.pitchMean, features2.pitchMean);
    
    // Also consider pitch variation similarity
    const stdRatio = features1.pitchStd > 0 && features2.pitchStd > 0
      ? Math.min(features1.pitchStd, features2.pitchStd) / Math.max(features1.pitchStd, features2.pitchStd)
      : 0.5;

    return (pitchRatio * 0.7 + stdRatio * 0.3);
  }

  /**
   * Calculate energy profile similarity
   */
  private calculateEnergySimilarity(features1: VoiceFeatures, features2: VoiceFeatures): number {
    if (features1.rmsEnergy === 0 || features2.rmsEnergy === 0) {
      return 0.5;
    }

    // Relative energy is less reliable, so we're lenient
    const energyRatio = Math.min(features1.rmsEnergy, features2.rmsEnergy) / 
                        Math.max(features1.rmsEnergy, features2.rmsEnergy);
    
    // Use a softer comparison curve
    return Math.pow(energyRatio, 0.5);
  }

  /**
   * Calculate spectral characteristic similarity
   */
  private calculateSpectralSimilarity(features1: VoiceFeatures, features2: VoiceFeatures): number {
    // Spectral centroid similarity
    const centroidRatio = features1.spectralCentroid > 0 && features2.spectralCentroid > 0
      ? Math.min(features1.spectralCentroid, features2.spectralCentroid) / 
        Math.max(features1.spectralCentroid, features2.spectralCentroid)
      : 0.5;

    // Spectral rolloff similarity
    const rolloffRatio = features1.spectralRolloff > 0 && features2.spectralRolloff > 0
      ? Math.min(features1.spectralRolloff, features2.spectralRolloff) / 
        Math.max(features1.spectralRolloff, features2.spectralRolloff)
      : 0.5;

    // Zero crossing rate similarity (speaking style)
    const zcrDiff = Math.abs(features1.zeroCrossingRate - features2.zeroCrossingRate);
    const zcrSimilarity = Math.max(0, 1 - zcrDiff * 5);

    return (centroidRatio * 0.4 + rolloffRatio * 0.3 + zcrSimilarity * 0.3);
  }

  /**
   * Calculate confidence based on distance from threshold
   */
  private calculateConfidence(score: number, threshold: number): number {
    if (score >= threshold) {
      // Above threshold: confidence increases as score approaches 1
      return 0.5 + (score - threshold) / (1 - threshold) * 0.5;
    } else {
      // Below threshold: confidence in rejection increases as score decreases
      return 0.5 - (threshold - score) / threshold * 0.5;
    }
  }

  /**
   * Aggregate multiple samples into a single profile
   */
  aggregateFeatures(samples: VoiceFeatures[]): VoiceFeatures {
    if (samples.length === 0) {
      throw new Error('No samples to aggregate');
    }

    if (samples.length === 1) {
      return samples[0];
    }

    // Calculate weighted average of all features
    const avgMfcc = new Array(samples[0].mfcc.length).fill(0);
    let avgSpectralCentroid = 0;
    let avgSpectralRolloff = 0;
    let avgZeroCrossingRate = 0;
    let avgRmsEnergy = 0;
    let avgPitchMean = 0;
    let avgPitchStd = 0;
    let avgSpeakingRate = 0;

    for (const sample of samples) {
      for (let i = 0; i < sample.mfcc.length; i++) {
        avgMfcc[i] += sample.mfcc[i] / samples.length;
      }
      avgSpectralCentroid += sample.spectralCentroid / samples.length;
      avgSpectralRolloff += sample.spectralRolloff / samples.length;
      avgZeroCrossingRate += sample.zeroCrossingRate / samples.length;
      avgRmsEnergy += sample.rmsEnergy / samples.length;
      avgPitchMean += sample.pitchMean / samples.length;
      avgPitchStd += sample.pitchStd / samples.length;
      avgSpeakingRate += sample.speakingRate / samples.length;
    }

    return {
      mfcc: avgMfcc,
      spectralCentroid: avgSpectralCentroid,
      spectralRolloff: avgSpectralRolloff,
      zeroCrossingRate: avgZeroCrossingRate,
      rmsEnergy: avgRmsEnergy,
      pitchMean: avgPitchMean,
      pitchStd: avgPitchStd,
      speakingRate: avgSpeakingRate,
    };
  }
}
