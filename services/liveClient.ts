import { GoogleGenAI, LiveServerMessage, Modality } from "@google/genai";

class LiveClient {
  private ai: GoogleGenAI;
  private session: any = null;
  private inputAudioContext: AudioContext | null = null;
  private outputAudioContext: AudioContext | null = null;
  private inputSource: MediaStreamAudioSourceNode | null = null;
  private processor: ScriptProcessorNode | null = null;
  private nextStartTime = 0;
  private sources = new Set<AudioBufferSourceNode>();
  private onTranscription: ((text: string, role: 'user' | 'assistant', isFinal: boolean) => void) | null = null;

  constructor() {
    this.ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  }

  public setTranscriptionCallback(callback: (text: string, role: 'user' | 'assistant', isFinal: boolean) => void) {
    this.onTranscription = callback;
  }

  public async connect() {
    this.cleanup(); // Ensure any previous session is fully gone
    
    this.inputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
    this.outputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    
    const sessionPromise = this.ai.live.connect({
      model: 'gemini-2.5-flash-native-audio-preview-09-2025',
      config: {
        responseModalities: [Modality.AUDIO],
        inputAudioTranscription: { model: "gemini-2.5-flash-native-audio-preview-09-2025" },
        outputAudioTranscription: { model: "gemini-2.5-flash-native-audio-preview-09-2025" },
        systemInstruction: "You are Lumen, an advanced visual assistant for visually impaired users. You receive a video stream of the user's surroundings. Be concise, helpful, and safety-conscious. Do not describe everything, only what is relevant to navigation or what the user asks about. If the user interrupts, stop speaking immediately.",
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
  }

  private async startAudioStream(sessionPromise: Promise<any>) {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (!this.inputAudioContext) return;

      this.inputSource = this.inputAudioContext.createMediaStreamSource(stream);
      this.processor = this.inputAudioContext.createScriptProcessor(4096, 1, 1);

      this.processor.onaudioprocess = (e) => {
        // If we disconnected mid-stream, stop processing
        if (!this.session) return; 

        const inputData = e.inputBuffer.getChannelData(0);
        const pcmData = this.floatTo16BitPCM(inputData);
        const base64Data = this.arrayBufferToBase64(pcmData);

        sessionPromise.then(session => {
            if (this.session) { // Double check active session
              session.sendRealtimeInput({
                  media: {
                      mimeType: 'audio/pcm;rate=16000',
                      data: base64Data
                  }
              });
            }
        }).catch(e => console.error("Send input failed", e));
      };

      this.inputSource.connect(this.processor);
      this.processor.connect(this.inputAudioContext.destination);
    } catch (err) {
      console.error("Error accessing microphone:", err);
      this.cleanup(); // Clean up if mic fails
    }
  }

  public sendVideoFrame(base64Image: string) {
    if (!this.session) return;
    
    const cleanBase64 = base64Image.replace(/^data:image\/(png|jpeg|jpg);base64,/, '');
    
    this.session.sendRealtimeInput({
      media: {
        mimeType: 'image/jpeg',
        data: cleanBase64
      }
    }).catch((e: any) => {
      console.error("Video frame send failed", e);
    });
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
    if (this.processor) {
        this.processor.disconnect();
    }

    this.inputAudioContext = null;
    this.outputAudioContext = null;
    this.inputSource = null;
    this.processor = null;
  }

  private async handleMessage(message: LiveServerMessage) {
    const { serverContent } = message;
    if (!serverContent) return;

    if (serverContent.turnComplete) {
       // Turn complete logic if needed
    }

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

    if (serverContent.outputTranscription?.text && this.onTranscription) {
        this.onTranscription(serverContent.outputTranscription.text, 'assistant', false);
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