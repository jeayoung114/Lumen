import React, { useState, useEffect, useRef } from 'react';
import CameraView from './components/CameraView';
import ControlInterface from './components/ControlInterface';
import { AppMode, ChatMessage, LiveState } from './types';
import { analyzeScene } from './services/geminiService';
import { audioService } from './services/audioService';
import { liveClient } from './services/liveClient';
import { BrainCircuit, XCircle } from 'lucide-react';

const App: React.FC = () => {
  const [mode, setMode] = useState<AppMode>(AppMode.GUARDIAN);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [pendingPrompt, setPendingPrompt] = useState<string | null>(null);
  
  // Live State
  const [liveState, setLiveState] = useState<LiveState>({
    isConnected: false,
    isConnecting: false,
    volume: 0
  });

  // Setup Live Client callbacks
  useEffect(() => {
    liveClient.setTranscriptionCallback((text, role, isFinal) => {
        setChatHistory(prev => {
           // Basic logic to group or append.
           const lastMsg = prev[prev.length - 1];
           if (lastMsg && lastMsg.role === role && lastMsg.text === text) return prev;
           
           return [...prev, {
               id: Date.now().toString(),
               role,
               text,
               timestamp: Date.now()
           }];
        });
    });

    return () => {
        liveClient.disconnect();
    };
  }, []);

  const handleModeChange = (newMode: AppMode) => {
    setMode(newMode);
    // Disconnect live session if switching away from Insight
    if (newMode === AppMode.GUARDIAN && (liveState.isConnected || liveState.isConnecting)) {
        handleToggleLive();
    }

    if (newMode === AppMode.GUARDIAN) {
      audioService.speak("Guardian mode active. Reflex systems online.");
    } else {
      audioService.speak("Insight mode active. Cognitive systems online.");
    }
  };

  const handleToggleLive = async () => {
    // Check if connected OR connecting - allow cancellation in both states
    if (liveState.isConnected || liveState.isConnecting) {
        setLiveState(s => ({ ...s, isConnecting: false })); // Stop spinner immediately if connecting
        await liveClient.disconnect();
        setLiveState(s => ({ ...s, isConnected: false, isConnecting: false }));
        audioService.speak("Session ended.");
    } else {
        setLiveState(s => ({ ...s, isConnecting: true }));
        try {
            await liveClient.connect();
            // Check if user cancelled while connecting (state would have been reset by the 'if' block above if they clicked again)
            setLiveState(current => {
                 if (!current.isConnecting) { 
                     // User cancelled during await
                     liveClient.disconnect();
                     return current;
                 }
                 return { ...current, isConnected: true, isConnecting: false };
            });
        } catch (e) {
            console.error(e);
            setLiveState(s => ({ ...s, isConnecting: false, isConnected: false }));
            audioService.speak("Failed to connect to live visual cortex.");
        }
    }
  };

  // Handle Text Message (Fallback or typed input)
  const handleSendMessage = (text: string) => {
    const newMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      text: text,
      timestamp: Date.now()
    };
    setChatHistory(prev => [...prev, newMessage]);
    
    setPendingPrompt(text);
    setIsProcessing(true);
  };

  // Callback from CameraView
  const handleFrameCapture = async (imageData: string) => {
    // If Live Mode is active, stream to Live Client
    if (liveState.isConnected) {
        liveClient.sendVideoFrame(imageData);
        return; 
    }

    // Otherwise, handle as single-shot request
    if (!pendingPrompt) return;

    try {
      const responseText = await analyzeScene(imageData, pendingPrompt);

      const aiMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        text: responseText,
        timestamp: Date.now()
      };
      setChatHistory(prev => [...prev, aiMessage]);
      audioService.speak(responseText);

    } catch (error) {
      console.error("Analysis failed", error);
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        text: "I lost connection to the visual cortex. Please try again.",
        timestamp: Date.now()
      };
      setChatHistory(prev => [...prev, errorMessage]);
      audioService.speak("Analysis failed.");
    } finally {
      setIsProcessing(false);
      setPendingPrompt(null);
    }
  };

  return (
    <div className="flex flex-col h-screen max-h-screen bg-slate-950 text-slate-100 font-sans">
      {/* Header */}
      <header className="flex-none p-4 flex items-center justify-between bg-slate-950 border-b border-slate-900 z-10">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-500/10 rounded-lg border border-indigo-500/30">
            <BrainCircuit className="w-6 h-6 text-indigo-400" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-wider text-slate-100">LUMEN</h1>
            <p className="text-[10px] text-slate-500 uppercase tracking-widest font-mono">Digital Visual Cortex</p>
          </div>
        </div>
        
        {/* Right Side Header Controls */}
        <div className="flex items-center gap-3">
           {/* Global Stop Button for Live Mode */}
           {(liveState.isConnected || liveState.isConnecting) && (
             <button 
               onClick={handleToggleLive}
               className="flex items-center gap-2 px-3 py-1.5 bg-red-500/20 border border-red-500 text-red-500 rounded-full animate-pulse hover:bg-red-500 hover:text-white transition-all"
             >
               <div className="w-2 h-2 bg-current rounded-full"></div>
               <span className="text-xs font-bold tracking-widest">{liveState.isConnecting ? 'CONNECTING' : 'LIVE'}</span>
               <XCircle className="w-4 h-4 ml-1" />
             </button>
           )}

           <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border ${mode === AppMode.GUARDIAN ? 'border-cyan-500/30 bg-cyan-950/30' : 'border-indigo-500/30 bg-indigo-950/30'}`}>
             <div className={`w-2 h-2 rounded-full ${mode === AppMode.GUARDIAN ? 'bg-cyan-500 shadow-[0_0_10px_#06b6d4]' : 'bg-indigo-500 shadow-[0_0_10px_#6366f1]'}`}></div>
             <span className="text-xs font-mono text-slate-400">{mode}</span>
           </div>
        </div>
      </header>

      {/* Main Viewport (Camera) */}
      <main className="flex-1 relative overflow-hidden bg-black">
        <div className="absolute inset-0 p-2">
           <CameraView 
             mode={mode} 
             onFrameCapture={handleFrameCapture} 
             isProcessing={isProcessing}
             liveModeActive={liveState.isConnected}
             onToggleLive={handleToggleLive}
           />
        </div>
      </main>

      {/* Lower Control Interface */}
      <div className="flex-none h-[45vh] lg:h-[400px]">
        <ControlInterface 
          mode={mode} 
          setMode={handleModeChange} 
          onSendMessage={handleSendMessage}
          chatHistory={chatHistory}
          isProcessing={isProcessing}
          liveState={liveState}
          onToggleLive={handleToggleLive}
        />
      </div>
    </div>
  );
};

export default App;