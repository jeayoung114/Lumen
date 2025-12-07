export enum AppMode {
  INSIGHT = 'INSIGHT',   // System 2: Default, Cognitive
  NAVIGATION = 'NAVIGATION' // System 3: Wayfinding
}

export interface Hazard {
  id: string;
  type: 'OBSTACLE' | 'TRAFFIC' | 'DROP_OFF';
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
  direction: 'LEFT' | 'CENTER' | 'RIGHT';
  timestamp: number;
}

export interface WebSource {
  uri: string;
  title: string;
  type?: 'VIDEO' | 'MAP' | 'PRODUCT' | 'GENERAL';
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  timestamp: number;
  webSources?: WebSource[];
}

export interface LiveState {
  isConnected: boolean;
  isConnecting: boolean;
  volume: number; // For visualization
}

export interface MediaItem {
  uri: string;
  title: string;
  type: 'VIDEO' | 'AUDIO';
}