type VoiceCommandCallback = (command: 'START_GUARDIAN' | 'STOP_GUARDIAN' | 'START_INSIGHT' | 'START_NAVIGATION') => void;

class VoiceService {
  private recognition: any = null;
  private isListening: boolean = false;
  private callback: VoiceCommandCallback | null = null;
  private restartTimer: any = null;

  constructor() {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      this.recognition = new SpeechRecognition();
      this.recognition.continuous = true;
      this.recognition.interimResults = false;
      this.recognition.lang = 'en-US';

      this.recognition.onresult = (event: any) => {
        const lastResult = event.results[event.results.length - 1];
        if (lastResult.isFinal) {
          const transcript = lastResult[0].transcript.toLowerCase().trim();
          this.processTranscript(transcript);
        }
      };

      this.recognition.onend = () => {
        if (this.isListening) {
          // Auto-restart to simulate continuous listening
          this.restartTimer = setTimeout(() => {
            try {
                this.recognition.start();
            } catch (e) {
                console.log("Voice restart ignored");
            }
          }, 1000);
        }
      };
      
      this.recognition.onerror = (event: any) => {
          // console.log("Voice Recognition Error", event.error); // Suppress noise in console
      };
    }
  }

  public setCallback(cb: VoiceCommandCallback) {
    this.callback = cb;
  }

  public start() {
    if (this.recognition && !this.isListening) {
      this.isListening = true;
      try {
        this.recognition.start();
      } catch (e) {
        console.error(e);
      }
    }
  }

  public stop() {
    this.isListening = false;
    clearTimeout(this.restartTimer);
    if (this.recognition) {
      this.recognition.stop();
    }
  }

  private processTranscript(text: string) {
    console.log("Heard:", text);
    if (!this.callback) return;
    const t = text.toLowerCase();

    // --- GUARDIAN COMMANDS ---
    if (t.includes('guardian') || t.includes('reflex')) {
        if (t.includes('stop') || t.includes('end') || t.includes('off') || t.includes('disable')) {
            this.callback('STOP_GUARDIAN');
            return;
        }
        if (t.includes('start') || t.includes('enable') || t.includes('on') || t.includes('mode') || t.includes('begin')) {
            this.callback('START_GUARDIAN');
            return;
        }
    }

    // --- NAVIGATION COMMANDS ---
    if (t.includes('navigation') || t.includes('navigate')) {
         if (t.includes('stop') || t.includes('end') || t.includes('off')) {
             this.callback('START_INSIGHT'); // End nav -> Insight
             return;
         }
         
         if (t.includes('start') || t.includes('mode') || t.includes('switch') || t.includes('begin') || t.includes('move') || t === 'navigate') {
             this.callback('START_NAVIGATION');
             return;
         }
    }

    // --- INSIGHT COMMANDS ---
    // Added 'inside' (common mishearing) and 'vision'
    if (t.includes('insight') || t.includes('vision') || t.includes('standard') || t.includes('inside')) {
         if (t.includes('start') || t.includes('mode') || t.includes('switch') || t.includes('begin') || t.includes('change') || t.includes('move')) {
             this.callback('START_INSIGHT');
             return;
         }
         // Direct commands: "Insight", "Insight mode"
         if (t === 'insight' || t === 'insight mode' || t === 'inside mode' || t === 'standard mode') {
            this.callback('START_INSIGHT');
            return;
         }
    }
  }
}

export const voiceService = new VoiceService();