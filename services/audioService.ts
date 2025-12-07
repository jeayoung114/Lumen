import { Hazard } from '../types';

class AudioService {
  private audioContext: AudioContext | null = null;
  private synthesis: SpeechSynthesis;

  constructor() {
    this.synthesis = window.speechSynthesis;
    // Initialize AudioContext on user interaction usually, handling comfortably here
    try {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    } catch (e) {
      console.error('Web Audio API not supported');
    }
  }

  private ensureAudioContext() {
    if (this.audioContext?.state === 'suspended') {
      this.audioContext.resume();
    }
  }

  public playHazardAlert(hazard: Hazard) {
    this.ensureAudioContext();
    if (!this.audioContext) return;

    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();
    const panner = this.audioContext.createStereoPanner();

    oscillator.type = 'sawtooth';
    
    // Frequency based on severity
    oscillator.frequency.value = hazard.severity === 'HIGH' ? 880 : hazard.severity === 'MEDIUM' ? 440 : 220;

    // Pan based on direction
    if (hazard.direction === 'LEFT') panner.pan.value = -0.8;
    else if (hazard.direction === 'RIGHT') panner.pan.value = 0.8;
    else panner.pan.value = 0;

    // Connect nodes
    oscillator.connect(panner);
    panner.connect(gainNode);
    gainNode.connect(this.audioContext.destination);

    // Envelope
    const now = this.audioContext.currentTime;
    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(0.3, now + 0.05);
    gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.2);

    oscillator.start(now);
    oscillator.stop(now + 0.2);
  }

  public speak(text: string) {
    this.synthesis.cancel(); // Stop current speech
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.1; // Slightly faster for efficiency
    utterance.pitch = 1.0;
    this.synthesis.speak(utterance);
  }

  public vibrate(pattern: number[]) {
    if (navigator.vibrate) {
      navigator.vibrate(pattern);
    }
  }
}

export const audioService = new AudioService();