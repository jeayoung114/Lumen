
type VoiceCommandCallback = (command: 'START_GUARDIAN' | 'STOP_GUARDIAN' | 'START_INSIGHT' | 'START_NAVIGATION' | 'START_SESSION' | 'STOP_SESSION') => void;

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

  public processTranscript(text: string) {
    console.log("Processing Voice Command Input:", text);
    if (!this.callback) return;
    const t = text.toLowerCase();

    // --- STOP SESSION COMMANDS ---
    // Check for explicit stop phrases first
    if (
        t.includes('and session') ||
        t.includes('stop session') || 
        t.includes('end session') || 
        t.includes('close session') ||
        t.includes('stop listening') || 
        t.includes('stop recording') ||
        t.includes('turn off') || 
        t.includes('shut down') || 
        t.includes('go offline') || 
        t.includes('end live') ||
        t.includes('disconnect')
    ) {
        this.callback('STOP_SESSION');
        return;
    }

    // --- START SESSION COMMANDS ---
    if (
        t.includes('start session') || 
        t.includes('activate session') || 
        t.includes('open session') || 
        t.includes('begin session') ||
        (t.includes('session') && (t.includes('activate') || t.includes('start') || t.includes('begin')))
    ) {
         this.callback('START_SESSION');
         return;
    }

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
