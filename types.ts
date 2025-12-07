export enum AppMode {
  GUARDIAN = 'GUARDIAN', // System 1: Fast, Reflexive
  INSIGHT = 'INSIGHT',   // System 2: Slow, Cognitive
}

export interface Hazard {
  id: string;
  type: 'OBSTACLE' | 'TRAFFIC' | 'DROP_OFF';
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
  direction: 'LEFT' | 'CENTER' | 'RIGHT';
  timestamp: number;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  timestamp: number;
}

export interface LiveState {
  isConnected: boolean;
  isConnecting: boolean;
  volume: number; // For visualization
}