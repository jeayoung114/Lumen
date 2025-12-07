import React, { useState } from 'react';
import { AppMode, ChatMessage, LiveState } from '../types';
import { Mic, Send, Eye, Shield, Activity, Radio, MicOff, Power } from 'lucide-react';

interface ControlInterfaceProps {
  mode: AppMode;
  setMode: (mode: AppMode) => void;
  onSendMessage: (text: string) => void;
  chatHistory: ChatMessage[];
  isProcessing: boolean;
  liveState: LiveState;
  onToggleLive: () => void;
}

const ControlInterface: React.FC<ControlInterfaceProps> = ({ 
  mode, 
  setMode, 
  onSendMessage, 
  chatHistory,
  isProcessing,
  liveState,
  onToggleLive
}) => {
  const [inputText, setInputText] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputText.trim()) {
      onSendMessage(inputText);
      setInputText('');
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-900 border-t border-slate-800">
      
      {/* Mode Switcher */}
      <div className="flex p-2 gap-2 bg-slate-950 flex-none z-20">
        <button
          onClick={() => setMode(AppMode.GUARDIAN)}
          className={`flex-1 flex flex-col items-center justify-center py-4 rounded-xl transition-all duration-300 ${
            mode === AppMode.GUARDIAN 
              ? 'bg-cyan-900/30 border border-cyan-500/50 text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.3)]' 
              : 'bg-slate-900 border border-slate-800 text-slate-500 hover:bg-slate-800'
          }`}
        >
          <Shield className="w-6 h-6 mb-1" />
          <span className="text-xs font-bold tracking-widest">GUARDIAN</span>
        </button>
        
        <button
          onClick={() => setMode(AppMode.INSIGHT)}
          className={`flex-1 flex flex-col items-center justify-center py-4 rounded-xl transition-all duration-300 ${
            mode === AppMode.INSIGHT 
              ? 'bg-indigo-900/30 border border-indigo-500/50 text-indigo-400 shadow-[0_0_15px_rgba(99,102,241,0.3)]' 
              : 'bg-slate-900 border border-slate-800 text-slate-500 hover:bg-slate-800'
          }`}
        >
          <Eye className="w-6 h-6 mb-1" />
          <span className="text-xs font-bold tracking-widest">INSIGHT</span>
        </button>
      </div>

      {/* Dynamic Content Area */}
      <div className="flex-1 overflow-hidden relative flex flex-col">
        {mode === AppMode.GUARDIAN ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-6">
            <div className="w-32 h-32 rounded-full border-4 border-cyan-900/50 flex items-center justify-center relative">
              <div className="absolute inset-0 bg-cyan-500/5 rounded-full animate-ping"></div>
              <Activity className="w-12 h-12 text-cyan-500 animate-pulse" />
            </div>
            <div className="space-y-2">
              <h3 className="text-cyan-400 text-xl font-bold tracking-widest">REFLEX ACTIVE</h3>
              <p className="text-slate-400 text-sm max-w-[250px]">
                Scanning for immediate hazards using edge-simulated visuals. Haptics enabled.
              </p>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col h-full relative">
            {/* Live Header / Status */}
            {liveState.isConnected && (
              <div className="absolute top-0 left-0 right-0 bg-indigo-900/90 backdrop-blur text-white text-xs py-2 text-center border-b border-indigo-500/30 z-10 flex justify-center items-center gap-2 shadow-lg">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
                <span className="font-bold tracking-wider">LIVE CHANNEL OPEN</span>
              </div>
            )}

            {/* Chat History */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 pt-10 scroll-smooth">
              {chatHistory.length === 0 && !liveState.isConnected && (
                <div className="text-center text-slate-500 mt-10 text-sm">
                  <p>Ask Lumen about your surroundings.</p>
                  <p className="mt-2 text-xs opacity-60">Type below or tap the mic for Live Mode.</p>
                </div>
              )}
              {chatHistory.map((msg) => (
                <div 
                  key={msg.id} 
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-[85%] p-3 rounded-2xl text-sm ${
                    msg.role === 'user' 
                      ? 'bg-slate-800 text-slate-200 rounded-br-none' 
                      : 'bg-indigo-900/40 border border-indigo-500/30 text-indigo-100 rounded-bl-none shadow-lg'
                  }`}>
                    {msg.text}
                  </div>
                </div>
              ))}
              {isProcessing && !liveState.isConnected && (
                <div className="flex justify-start">
                  <div className="bg-slate-900 p-3 rounded-2xl rounded-bl-none border border-slate-800">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce delay-75"></div>
                      <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce delay-100"></div>
                      <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce delay-150"></div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Input Area */}
            <div className="p-3 bg-slate-950 border-t border-slate-900 z-20">
               {!liveState.isConnected ? (
                 <div className="flex gap-2 items-center">
                    <button 
                        type="button" 
                        onClick={onToggleLive}
                        className={`p-3 rounded-full transition-all duration-300 shadow-lg flex-shrink-0 border 
                            ${liveState.isConnecting 
                                ? 'bg-slate-800 border-indigo-500 text-indigo-300' 
                                : 'bg-slate-900 border-slate-700 text-indigo-400 hover:bg-slate-800 hover:text-indigo-300 hover:border-indigo-500/50'
                            }`}
                        title={liveState.isConnecting ? "Cancel Connection" : "Start Live Conversation"}
                    >
                        {liveState.isConnecting ? <Activity className="w-5 h-5 animate-spin" /> : <Mic className="w-5 h-5" />}
                    </button>

                    <form onSubmit={handleSubmit} className="flex-1 flex gap-2">
                       <input 
                        type="text" 
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        disabled={liveState.isConnecting}
                        placeholder={liveState.isConnecting ? "Connecting to vision center..." : "Ask about the scene..."}
                        className="flex-1 bg-slate-900 border border-slate-800 rounded-full px-4 text-sm text-slate-200 focus:outline-none focus:border-indigo-500 transition-all disabled:opacity-50"
                       />
                       <button 
                        type="submit" 
                        disabled={!inputText.trim() || isProcessing || liveState.isConnecting}
                        className="p-3 rounded-full bg-indigo-600 text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-indigo-500 transition-colors shadow-lg shadow-indigo-900/50"
                       >
                         <Send className="w-5 h-5" />
                       </button>
                    </form>
                 </div>
               ) : (
                 <div className="flex gap-3 items-center w-full">
                    <div className="flex-1 flex items-center justify-between h-14 bg-indigo-950/30 rounded-2xl border border-indigo-500/30 px-4 relative overflow-hidden group">
                        {/* Animated Background */}
                        <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/10 to-purple-500/10 animate-pulse"></div>
                        
                        <div className="flex items-center gap-2 relative z-10">
                            <div className="flex gap-1 h-6 items-end">
                                {[...Array(5)].map((_, i) => (
                                    <div key={i} className="w-1 bg-indigo-400 rounded-full animate-[bounce_1s_infinite]" style={{ height: '60%', animationDelay: `${i * 0.15}s` }}></div>
                                ))}
                            </div>
                            <span className="text-xs text-indigo-300 font-bold tracking-widest ml-2 group-hover:text-indigo-200 transition-colors">LISTENING...</span>
                        </div>
                    </div>

                    <button 
                        type="button" 
                        onClick={onToggleLive}
                        className="h-14 w-14 flex-shrink-0 rounded-2xl bg-red-500 hover:bg-red-600 text-white flex flex-col items-center justify-center transition-all shadow-[0_0_20px_rgba(239,68,68,0.4)] active:scale-95 border border-red-400 group relative overflow-hidden"
                        title="End Live Session"
                    >
                        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
                        <Power className="w-6 h-6 mb-0.5 relative z-10" />
                        <span className="text-[9px] font-bold relative z-10 tracking-wider">OFF</span>
                    </button>
                 </div>
               )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ControlInterface;