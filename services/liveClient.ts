import { GoogleGenAI, LiveServerMessage, Modality } from "@google/genai";
import { WebSource, AppMode } from "../types";

// AudioWorklet processor code as a string to avoid external file dependencies in this setup
const workletCode = `
class PCMProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.bufferSize = 2048; // Lower latency
    this.buffer = new Float32Array(this.bufferSize);
    this.bufferIndex = 0;
  }

  process(inputs, outputs, parameters) {
    const input = inputs[0];
    if (!input || input.length === 0) return true;

    const channelData = input[0];
    
    // Copy input data to internal buffer
    for (let i = 0; i < channelData.length; i++) {
      this.buffer[this.bufferIndex++] = channelData[i];

      // When buffer is full, flush to main thread
      if (this.bufferIndex >= this.bufferSize) {
        this.port.postMessage(this.buffer.slice()); // Send copy
        this.bufferIndex = 0;
      }
    }
    return true;
  }
}
registerProcessor('pcm-processor', PCMProcessor);
`;

class LiveClient {
  private session: any = null;
  private inputAudioContext: AudioContext | null = null;
  private outputAudioContext: AudioContext | null = null;
  private inputSource: MediaStreamAudioSourceNode | null = null;
  private workletNode: AudioWorkletNode | null = null;
  
  private nextStartTime = 0;
  private sources = new Set<AudioBufferSourceNode>();
  private onTranscription: ((text: string, role: 'user' | 'assistant', isFinal: boolean, webSources?: WebSource[]) => void) | null = null;
  private onVolumeUpdate: ((vol: number) => void) | null = null;

  // VAD Parameters
  private readonly VAD_THRESHOLD = 0.012; // RMS threshold for noise gate

  constructor() {
    // Initialization moved to connect() to ensure fresh API Key
  }

  public setTranscriptionCallback(callback: (text: string, role: 'user' | 'assistant', isFinal: boolean, webSources?: WebSource[]) => void) {
    this.onTranscription = callback;
  }

  public setVolumeCallback(callback: (vol: number) => void) {
    this.onVolumeUpdate = callback;
  }

  public async connect(
    enableSearch: boolean, 
    location?: { lat: number; lng: number },
    mode: AppMode = AppMode.INSIGHT,
    destination?: string
  ) {
    this.cleanup();
    
    // Initialize AI client with the latest API key
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    this.inputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
    this.outputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    
    // Configure Tools: Search and Maps
    // Navigation mode always needs Maps
    const tools = (enableSearch || mode === AppMode.NAVIGATION) 
        ? [{ googleSearch: {} }, { googleMaps: {} }] 
        : undefined;
    
    // Configure Retrieval (Location)
    const toolConfig = ((enableSearch || mode === AppMode.NAVIGATION) && location) ? {
      retrievalConfig: {
        latLng: {
          latitude: location.lat,
          longitude: location.lng
        }
      }
    } : undefined;
    
    let systemInstruction = "";

    if (mode === AppMode.NAVIGATION) {
         systemInstruction = `You are Lumen, a navigation assistant for a visually impaired user.
        CURRENT MODE: SYSTEM 3 - NAVIGATION.
        USER_LATITUDE: ${location ? location.lat : 'Unknown'}
        USER_LONGITUDE: ${location ? location.lng : 'Unknown'}
        DESTINATION: ${destination ? destination : 'NOT SET - ASK USER'}.

        YOUR MISSION:
        1. If destination is not set, ask the user where they want to go.
        2. SEARCH ACTION: Use Google Maps to find the route. YOU MUST SPECIFY THE STARTING POINT using the USER_LATITUDE and USER_LONGITUDE provided above. Do not assume a starting location.
        3. Provide turn-by-turn directions based on the Maps route.
        4. CRITICAL - MICRO-NAVIGATION: Use the video feed to provide "Micro-Navigation".
           - Identify physical landmarks mentioned in directions (e.g., "Turn left at the Starbucks").
           - Warn about immediate physical obstacles in the path (e.g., "There is a construction barrier ahead, shift left").
           - Verify the user is facing the right way (e.g., "You are facing a brick wall, turn 180 degrees").
        5. Keep instructions clear, short, and actionable. Focus on safety and orientation.
        `;
    } else if (enableSearch) {
        systemInstruction = "You are Lumen. You have access to Google Search and Google Maps. You MUST use them to find real-time information. SPECIFIC CAPABILITIES: 1) Price Comparison: Find prices for products seen. 2) Nutrition: Find nutrition info for food. 3) Location: Find nearby places, ratings, and navigation details using Maps. 4) Media: Find YouTube videos or audio for songs/topics requested. When using search, provide the information clearly. If no search is needed, describe the surroundings for a visually impaired user.";
    } else {
        systemInstruction = "You are Lumen, an advanced visual assistant for visually impaired users. You receive a video stream of the user's surroundings. Be concise, helpful, and safety-conscious. Do not describe everything, only what is relevant to navigation or what the user asks about.";
    }

    const sessionPromise = ai.live.connect({
      model: 'gemini-2.5-flash-native-audio-preview-09-2025',
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } }
        },
        inputAudioTranscription: {},
        outputAudioTranscription: {},
        systemInstruction: systemInstruction,
        tools: tools,
        // @ts-ignore - The SDK types might be strict, but this structure is standard for Live API tools
        toolConfig: toolConfig 
      },
      callbacks: {
        onopen: async () => {
          console.log("Live Session Connected");
          await this.startAudioStream(sessionPromise);
        },
        onmessage: (msg: LiveServerMessage) => this.handleMessage(msg),
        onclose: () => {
          console.log("Live Session Closed");
          this.cleanup();
        },
        onerror: (err) => {
          console.error("Live Session Error", err);
          this.cleanup();
        }
      }
    });

    this.session = await sessionPromise;
    
    // Resume contexts immediately to prevent autoplay policy blocks
    if (this.inputAudioContext.state === 'suspended') await this.inputAudioContext.resume();
    if (this.outputAudioContext.state === 'suspended') await this.outputAudioContext.resume();
  }

  private async startAudioStream(sessionPromise: Promise<any>) {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (!this.inputAudioContext) return;

      this.inputSource = this.inputAudioContext.createMediaStreamSource(stream);

      // Setup AudioWorklet
      const blob = new Blob([workletCode], { type: 'application/javascript' });
      const workletUrl = URL.createObjectURL(blob);
      
      await this.inputAudioContext.audioWorklet.addModule(workletUrl);
      this.workletNode = new AudioWorkletNode(this.inputAudioContext, 'pcm-processor');

      this.workletNode.port.onmessage = (event) => {
        if (!this.session) return;

        const inputData = event.data as Float32Array;
        
        // --- TURN DETECTION MODULE (CLIENT-SIDE VAD) ---
        // 1. Calculate RMS
        let sumSquares = 0;
        for (let i = 0; i < inputData.length; i++) {
          sumSquares += inputData[i] * inputData[i];
        }
        const rms = Math.sqrt(sumSquares / inputData.length);

        // 2. Update Volume State
        if (this.onVolumeUpdate) {
            this.onVolumeUpdate(Math.min(1, rms * 8)); // Scale up for visualizer
        }

        // 3. Noise Gate / VAD
        // If below threshold, send silence to help server detect end-of-turn
        if (rms < this.VAD_THRESHOLD) {
             inputData.fill(0);
        }

        const pcmData = this.floatTo16BitPCM(inputData);
        const base64Data = this.arrayBufferToBase64(pcmData);

        sessionPromise.then(session => {
            if (this.session) {
              session.sendRealtimeInput({
                  media: {
                      mimeType: 'audio/pcm;rate=16000',
                      data: base64Data
                  }
              });
            }
        }).catch(e => {
            // Silence unhandled rejections for void returns
        });
      };

      this.inputSource.connect(this.workletNode);
      this.workletNode.connect(this.inputAudioContext.destination); // Connect to destination to keep graph alive
      
    } catch (err) {
      console.error("Error accessing microphone:", err);
      this.cleanup();
    }
  }

  public sendVideoFrame(base64Image: string) {
    if (!this.session) return;
    
    const cleanBase64 = base64Image.replace(/^data:image\/(png|jpeg|jpg);base64,/, '');
    
    try {
        this.session.sendRealtimeInput({
            media: {
                mimeType: 'image/jpeg',
                data: cleanBase64
            }
        });
    } catch (e) {
        console.error("Video frame send failed", e);
    }
  }

  public async disconnect() {
    if (this.session) {
      try {
        await this.session.close();
      } catch (e) {
        console.error("Error closing session", e);
      }
      this.session = null;
    }
    this.cleanup();
  }

  private cleanup() {
    // Immediate silence
    this.sources.forEach(s => {
      try { s.stop(); } catch(e) {}
    });
    this.sources.clear();
    this.nextStartTime = 0;

    // Close contexts
    if (this.inputAudioContext && this.inputAudioContext.state !== 'closed') {
       this.inputAudioContext.close();
    }
    if (this.outputAudioContext && this.outputAudioContext.state !== 'closed') {
       this.outputAudioContext.close();
    }
    
    if (this.inputSource) {
        this.inputSource.disconnect();
    }
    if (this.workletNode) {
        this.workletNode.disconnect();
    }

    this.inputAudioContext = null;
    this.outputAudioContext = null;
    this.inputSource = null;
    this.workletNode = null;
  }

  private async handleMessage(message: LiveServerMessage) {
    const { serverContent } = message;
    if (!serverContent) return;

    if (serverContent.interrupted) {
      this.sources.forEach(s => {
        try { s.stop(); } catch(e) {}
      });
      this.sources.clear();
      this.nextStartTime = 0;
    }

    if (serverContent.modelTurn?.parts?.[0]?.inlineData?.data) {
      const audioData = serverContent.modelTurn.parts[0].inlineData.data;
      this.playAudio(audioData);
    }

    // Handle Grounding Metadata (Search Sources & Maps)
    let webSources: WebSource[] | undefined;
    const contentAny = serverContent as any;
    
    if (contentAny.groundingMetadata?.groundingChunks) {
        webSources = contentAny.groundingMetadata.groundingChunks
            .map((chunk: any) => chunk.web || chunk.maps) // Support both standard web and maps chunks
            .filter((source: any) => source && source.uri && source.title)
            .map((source: any) => ({
                uri: source.uri,
                title: source.title
            }));
    }

    if (serverContent.outputTranscription?.text && this.onTranscription) {
        this.onTranscription(serverContent.outputTranscription.text, 'assistant', false, webSources);
    }
    
    if (serverContent.inputTranscription?.text && this.onTranscription) {
        this.onTranscription(serverContent.inputTranscription.text, 'user', false);
    }
  }

  private async playAudio(base64Data: string) {
    if (!this.outputAudioContext) return;

    try {
      const binaryString = atob(base64Data);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      const audioBuffer = await this.decodeAudioData(bytes, this.outputAudioContext);
      
      const source = this.outputAudioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(this.outputAudioContext.destination);
      
      this.nextStartTime = Math.max(this.nextStartTime, this.outputAudioContext.currentTime);
      source.start(this.nextStartTime);
      this.nextStartTime += audioBuffer.duration;
      
      source.onended = () => this.sources.delete(source);
      this.sources.add(source);
    } catch (e) {
      console.error("Audio playback error:", e);
    }
  }

  // Helpers
  private floatTo16BitPCM(float32Array: Float32Array): ArrayBuffer {
    const buffer = new ArrayBuffer(float32Array.length * 2);
    const view = new DataView(buffer);
    for (let i = 0; i < float32Array.length; i++) {
      let s = Math.max(-1, Math.min(1, float32Array[i]));
      view.setInt16(i * 2, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
    }
    return buffer;
  }

  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  private async decodeAudioData(data: Uint8Array, ctx: AudioContext): Promise<AudioBuffer> {
    const dataInt16 = new Int16Array(data.buffer);
    const buffer = ctx.createBuffer(1, dataInt16.length, 24000);
    const channelData = buffer.getChannelData(0);
    for (let i = 0; i < dataInt16.length; i++) {
        channelData[i] = dataInt16[i] / 32768.0;
    }
    return buffer;
  }
}

export const liveClient = new LiveClient();