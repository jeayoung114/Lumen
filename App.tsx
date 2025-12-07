
import React, { useState, useEffect, useRef } from 'react';
import CameraView from './components/CameraView';
import ControlInterface from './components/ControlInterface';
import { AppMode, ChatMessage, LiveState, MediaItem } from './types';
import { analyzeScene } from './services/geminiService';
import { audioService } from './services/audioService';
import { liveClient } from './services/liveClient';
import { voiceService } from './services/voiceService';
import { BrainCircuit, XCircle, Power, Lock, Shield, Mic, MicOff } from 'lucide-react';

const App: React.FC = () => {
  const [apiKeySet, setApiKeySet] = useState(false);
  const [mode, setMode] = useState<AppMode>(AppMode.INSIGHT); // Default to Insight
  const [guardianActive, setGuardianActive] = useState(false); // Toggle state for Guardian
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [pendingPrompt, setPendingPrompt] = useState<string | null>(null);
  const [useSearch, setUseSearch] = useState(true);
  const [destination, setDestination] = useState("");
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | undefined>(undefined);
  const [activeMedia, setActiveMedia] = useState<MediaItem | null>(null);
  const [cameraEnabled, setCameraEnabled] = useState(true);
  const isSwitchingRef = useRef(false);
  
  // Live State
  const [liveState, setLiveState] = useState<LiveState>({
    isConnected: false,
    isConnecting: false,
    isMuted: false,
    volume: 0
  });

  // Check for API Key
  useEffect(() => {
    const checkKey = async () => {
        if (window.aistudio) {
            const has = await window.aistudio.hasSelectedApiKey();
            setApiKeySet(has);
        } else {
            setApiKeySet(true); // Fallback for dev environments
        }
    };
    checkKey();
  }, []);

  // Fetch Geolocation (Continuous Watch)
  useEffect(() => {
    let watchId: number;
    if (navigator.geolocation) {
      watchId = navigator.geolocation.watchPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        (error) => {
          console.log("Geolocation access denied or failed", error);
        },
        { 
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0
        }
      );
    }
    return () => {
        if (watchId) navigator.geolocation.clearWatch(watchId);
    };
  }, []);

  // --- Session Management Functions ---

  const startLiveSession = async (overrideMode?: AppMode) => {
      const targetMode = overrideMode || mode;
      
      setLiveState(s => ({ ...s, isConnecting: true, isMuted: false }));
      
      // Stop voice service while live to prevent self-triggering
      voiceService.stop();

      try {
          // Use current 'useSearch', 'userLocation', 'destination' from state
          await liveClient.connect(useSearch, userLocation, targetMode, destination);
          
          setLiveState(current => {
               // Check if user cancelled while connecting
               if (!current.isConnecting) { 
                   liveClient.disconnect();
                   return current;
               }
               // Enforce unmuted state after connection to match UI default
               liveClient.toggleMute(false);
               return { ...current, isConnected: true, isConnecting: false };
          });
      } catch (e) {
          console.error(e);
          setLiveState(s => ({ ...s, isConnecting: false, isConnected: false }));
          audioService.speak("Connection failed.");
      }
  };

  const stopLiveSession = async () => {
        setLiveState(s => ({ ...s, isConnecting: false }));
        await liveClient.disconnect();
        setLiveState(s => ({ ...s, isConnected: false, isConnecting: false, isMuted: false }));
  };

  const handleToggleLive = () => {
    if (liveState.isConnected || liveState.isConnecting) {
        stopLiveSession();
        audioService.speak("Session ended.");
    } else {
        startLiveSession();
    }
  };

  const handleToggleMute = () => {
      const newMutedState = !liveState.isMuted;
      liveClient.toggleMute(newMutedState);
      setLiveState(s => ({ ...s, isMuted: newMutedState }));
  };

  const handleModeChange = async (newMode: AppMode) => {
    // If already in mode and connected, just give feedback
    if (newMode === mode && (liveState.isConnected || liveState.isConnecting)) {
        audioService.speak(`${newMode === AppMode.INSIGHT ? 'Insight' : 'Navigation'} mode is already active.`);
        return;
    }

    isSwitchingRef.current = true;

    // 1. Update Mode State
    setMode(newMode);

    // 2. Audio Feedback
    if (newMode === AppMode.INSIGHT) {
      audioService.speak("Insight mode active.");
    } else if (newMode === AppMode.NAVIGATION) {
      audioService.speak("Navigation mode active.");
    }

    // 3. Auto-Reconnect Logic
    if (liveState.isConnected || liveState.isConnecting) {
        await stopLiveSession();
        // Short delay to ensure hardware is released
        setTimeout(() => {
            startLiveSession(newMode).finally(() => {
                 isSwitchingRef.current = false;
            });
        }, 500);
    } else {
         isSwitchingRef.current = false;
         // Automatically start the session in the new mode even if it wasn't running
         startLiveSession(newMode);
    }
  };

  // --- Voice Service Effects ---

  // 1. Manage Service Lifecycle (Start/Stop) based on Live Connection
  useEffect(() => {
      // Only run VoiceService if NOT live AND NOT currently switching modes
      if (!liveState.isConnected && !liveState.isConnecting && !isSwitchingRef.current) {
          voiceService.start();
      } else {
          voiceService.stop();
      }
      return () => {
          voiceService.stop();
      };
  }, [liveState.isConnected, liveState.isConnecting]); // isSwitchingRef is a ref, so it doesn't trigger re-renders, logic handled in effects

  // 2. Update Callback (Keep Closures Fresh)
  useEffect(() => {
      voiceService.setCallback((command) => {
          console.log("Processing Voice Command:", command);
          switch(command) {
              case 'START_SESSION':
                  if (!liveState.isConnected && !liveState.isConnecting) {
                      startLiveSession();
                      audioService.speak("Starting session.");
                  } else {
                      audioService.speak("Session is already active.");
                  }
                  break;
              case 'STOP_SESSION':
                  if (liveState.isConnected || liveState.isConnecting) {
                      stopLiveSession();
                      audioService.speak("Ending session.");
                  } else {
                       audioService.speak("Session is already closed.");
                  }
                  break;
              case 'START_GUARDIAN':
                  if (!guardianActive) {
                    setGuardianActive(true);
                    audioService.speak("Guardian enabled.");
                  } else {
                    audioService.speak("Guardian is already active.");
                  }
                  break;
              case 'STOP_GUARDIAN':
                  if (guardianActive) {
                    setGuardianActive(false);
                    audioService.speak("Guardian disabled.");
                  } else {
                    audioService.speak("Guardian is already off.");
                  }
                  break;
              case 'START_NAVIGATION':
                  handleModeChange(AppMode.NAVIGATION);
                  break;
              case 'START_INSIGHT':
                  handleModeChange(AppMode.INSIGHT);
                  break;
          }
      });
  }, [mode, guardianActive, liveState, useSearch, userLocation, destination]); // Dependencies ensure callback has fresh state


  const handleStartApp = async () => {
      if (window.aistudio) {
          await window.aistudio.openSelectKey();
      }
      setApiKeySet(true); 
      // Auto-start Insight Mode Live Session on initialization
      startLiveSession(AppMode.INSIGHT);
  };

  // Setup Live Client callbacks
  useEffect(() => {
    if (!apiKeySet) return;

    liveClient.setTranscriptionCallback((text, role, isFinal, sources) => {
        // Voice Command Injection:
        // Feed user's spoken text from the Live API into the voice service 
        // to check for commands like "Navigation Start" even while the mic is occupied.
        if (role === 'user') {
            console.log("User live transcript:", text); // Debug log
            voiceService.processTranscript(text);
        }

        setChatHistory(prev => {
           const lastMsg = prev[prev.length - 1];
           
           // If the last message exists and has the same role, append to it
           if (lastMsg && lastMsg.role === role) {
               const updatedHistory = [...prev];
               
               // Merge Sources if available
               const existingSources = lastMsg.webSources || [];
               const newSources = sources || [];
               // Unique sources by URI
               const uniqueSources = [...existingSources, ...newSources].filter((v,i,a)=>a.findIndex(t=>(t.uri===v.uri))===i);

               updatedHistory[updatedHistory.length - 1] = {
                   ...lastMsg,
                   text: lastMsg.text + text,
                   webSources: uniqueSources.length > 0 ? uniqueSources : undefined
               };
               return updatedHistory;
           }
           
           // Otherwise create a new message
           return [...prev, {
               id: Date.now().toString(),
               role,
               text,
               timestamp: Date.now(),
               webSources: sources
           }];
        });
    });

    return () => {
        liveClient.disconnect();
    };
  }, [apiKeySet]);


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
      const result = await analyzeScene(imageData, pendingPrompt, useSearch, userLocation);

      const aiMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        text: result.text,
        timestamp: Date.now(),
        webSources: result.sources
      };
      setChatHistory(prev => [...prev, aiMessage]);
      audioService.speak(result.text);

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

  if (!apiKeySet) {
      return (
          <div className="flex flex-col items-center justify-center h-screen bg-stone-50 text-stone-900 p-6 relative overflow-hidden">
              <div className="absolute inset-0 bg-white opacity-60"></div>
              {/* Warm decorative blobs */}
              <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-amber-200/30 rounded-full blur-3xl"></div>
              <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-rose-200/30 rounded-full blur-3xl"></div>

              <div className="z-10 flex flex-col items-center max-w-md text-center space-y-8">
                  <div className="p-4 bg-white rounded-2xl border border-stone-200 shadow-xl shadow-stone-200/50 animate-pulse">
                     <BrainCircuit className="w-16 h-16 text-rose-500" />
                  </div>
                  <div>
                      <h1 className="text-4xl font-bold tracking-tight text-stone-900 mb-2">LUMEN</h1>
                      <p className="text-stone-500 font-medium text-sm tracking-widest uppercase">Digital Visual Cortex</p>
                  </div>
                  
                  <div className="bg-white/80 backdrop-blur border border-stone-200 p-6 rounded-2xl shadow-lg space-y-5">
                      <p className="text-sm text-stone-600 leading-relaxed">
                          Initialize your secure cognitive link to begin.
                      </p>
                      <button 
                        onClick={handleStartApp}
                        className="w-full py-4 bg-gradient-to-r from-rose-500 to-amber-500 hover:from-rose-600 hover:to-amber-600 text-white font-bold tracking-widest rounded-xl transition-all shadow-lg shadow-rose-200 flex items-center justify-center gap-2"
                      >
                          <Lock className="w-4 h-4" />
                          INITIALIZE SYSTEM
                      </button>
                      <p className="text-[10px] text-stone-400">
                          Requires a valid API Key from a paid Google Cloud Project. 
                          <br />
                          <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noreferrer" className="underline hover:text-rose-500 transition-colors">Billing Documentation</a>
                      </p>
                  </div>
              </div>
          </div>
      );
  }

  return (
    <div className="flex flex-col h-screen max-h-screen bg-stone-50 text-stone-900 font-sans">
      {/* Header */}
      <header className="flex-none px-4 py-3 flex items-center justify-between bg-white/80 backdrop-blur-md border-b border-stone-200 z-10 sticky top-0 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-stone-100 rounded-xl border border-stone-200">
            <BrainCircuit className="w-5 h-5 text-rose-500" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-stone-900 leading-none">LUMEN</h1>
            <p className="text-[9px] text-stone-500 uppercase tracking-widest font-semibold mt-0.5">Digital Visual Cortex</p>
          </div>
        </div>
        
        {/* Right Side Header Controls */}
        <div className="flex items-center gap-3">
           {/* Global Stop Button for Live Mode */}
           {(liveState.isConnected || liveState.isConnecting) && (
             <div className="flex items-center gap-2">
                 <button 
                    onClick={handleToggleMute}
                    className={`flex items-center justify-center w-8 h-8 rounded-full border transition-all ${liveState.isMuted ? 'bg-red-500 text-white border-red-600' : 'bg-white text-stone-600 border-stone-200 hover:bg-stone-50'}`}
                 >
                     {liveState.isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                 </button>

                 <button 
                   onClick={handleToggleLive}
                   className="flex items-center gap-2 px-3 py-1.5 bg-red-50 border border-red-200 text-red-600 rounded-full animate-pulse hover:bg-red-100 transition-all shadow-sm"
                 >
                   <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                   <span className="text-xs font-bold tracking-widest">{liveState.isConnecting ? 'CONNECTING' : 'LIVE'}</span>
                   <XCircle className="w-4 h-4 ml-1" />
                 </button>
             </div>
           )}

           {/* Mode Indicator (Visual only, controls are below) */}
           <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border shadow-sm transition-colors duration-300 ${
                mode === AppMode.NAVIGATION
                ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
                : 'border-rose-200 bg-rose-50 text-rose-900'
           }`}>
             <div className={`w-2 h-2 rounded-full ${
                 mode === AppMode.NAVIGATION ? 'bg-emerald-500' : 'bg-rose-500'
             }`}></div>
             <span className="text-xs font-bold uppercase">{mode}</span>
           </div>
        </div>
      </header>

      {/* Main Viewport (Camera) */}
      <main className="flex-1 relative overflow-hidden bg-stone-100 flex items-center justify-center p-2 lg:p-4">
        {/* Square Aspect Ratio Container */}
        <div className="aspect-square max-h-full max-w-full relative shadow-lg rounded-3xl overflow-hidden">
           <CameraView 
             mode={mode} 
             guardianActive={guardianActive}
             onFrameCapture={handleFrameCapture} 
             isProcessing={isProcessing}
             liveModeActive={liveState.isConnected}
             onToggleLive={handleToggleLive}
             setCameraEnabled={setCameraEnabled}
             cameraEnabled={cameraEnabled}
           />
        </div>
      </main>

      {/* Lower Control Interface */}
      {/* Reduced height to 40vh to give more space to camera */}
      <div className="flex-none h-[40vh] min-h-[300px] bg-white border-t border-stone-200 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
        <ControlInterface 
          mode={mode} 
          setMode={handleModeChange}
          guardianActive={guardianActive}
          toggleGuardian={() => setGuardianActive(!guardianActive)}
          onSendMessage={handleSendMessage}
          chatHistory={chatHistory}
          isProcessing={isProcessing}
          liveState={liveState}
          onToggleLive={handleToggleLive}
          useSearch={useSearch}
          setUseSearch={setUseSearch}
          destination={destination}
          setDestination={setDestination}
          activeMedia={activeMedia}
          setActiveMedia={setActiveMedia}
          onToggleMute={handleToggleMute}
        />
      </div>
    </div>
  );
};

export default App;
