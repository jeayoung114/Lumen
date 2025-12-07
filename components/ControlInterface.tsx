import React, { useState } from 'react';
import { AppMode, ChatMessage, LiveState, WebSource, MediaItem } from '../types';
import { Mic, Send, Globe, MapPin, Video, ShoppingCart, Power, Activity, Play, X, Shield, Eye, Navigation } from 'lucide-react';

interface ControlInterfaceProps {
  mode: AppMode;
  setMode: (mode: AppMode) => void;
  guardianActive: boolean;
  toggleGuardian: () => void;
  onSendMessage: (text: string) => void;
  chatHistory: ChatMessage[];
  isProcessing: boolean;
  liveState: LiveState;
  onToggleLive: () => void;
  useSearch: boolean;
  setUseSearch: (use: boolean) => void;
  destination: string;
  setDestination: (dest: string) => void;
  activeMedia: MediaItem | null;
  setActiveMedia: (media: MediaItem | null) => void;
}

const ControlInterface: React.FC<ControlInterfaceProps> = ({ 
  mode, 
  setMode, 
  guardianActive,
  toggleGuardian,
  onSendMessage, 
  chatHistory,
  isProcessing,
  liveState,
  onToggleLive,
  useSearch,
  setUseSearch,
  destination,
  setDestination,
  activeMedia,
  setActiveMedia
}) => {
  const [inputText, setInputText] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputText.trim()) {
        if (inputText.toLowerCase().includes('navigate to')) {
            const dest = inputText.toLowerCase().replace('navigate to', '').trim();
            setDestination(dest);
            setMode(AppMode.NAVIGATION);
            onToggleLive();
            setInputText('');
            return;
        }
      onSendMessage(inputText);
      setInputText('');
    }
  };

  const getSourceIcon = (uri: string) => {
    if (uri.includes('google.com/maps')) return <MapPin className="w-3 h-3 text-emerald-500" />;
    if (uri.includes('youtube.com') || uri.includes('youtu.be')) return <Video className="w-3 h-3 text-red-500" />;
    if (uri.includes('shopping') || uri.includes('product')) return <ShoppingCart className="w-3 h-3 text-amber-500" />;
    return <Globe className="w-3 h-3" />;
  };

  const handleMediaClick = (source: WebSource) => {
      if (source.uri.includes('youtube.com') || source.uri.includes('youtu.be')) {
          setActiveMedia({
              uri: source.uri,
              title: source.title,
              type: 'VIDEO'
          });
      } else {
          window.open(source.uri, '_blank');
      }
  };

  return (
    <div className="flex flex-col h-full bg-white relative">
      
      {/* Global Media Player */}
      {activeMedia && (
          <div className="bg-stone-900 text-white p-3 flex items-center justify-between border-b border-stone-800 shadow-lg z-30">
              <div className="flex items-center gap-3 overflow-hidden">
                  <div className="p-2 bg-red-600 rounded-lg">
                      <Play className="w-4 h-4 fill-white" />
                  </div>
                  <div className="flex flex-col min-w-0">
                      <span className="text-xs font-bold tracking-wide truncate">{activeMedia.title}</span>
                      <span className="text-[10px] text-stone-400 truncate">Now Playing • External Media</span>
                  </div>
              </div>
              <div className="flex items-center gap-2">
                   <button 
                     onClick={() => window.open(activeMedia.uri, '_blank')}
                     className="px-3 py-1.5 bg-stone-800 rounded-md text-[10px] font-bold hover:bg-stone-700"
                   >
                       OPEN
                   </button>
                   <button onClick={() => setActiveMedia(null)} className="p-1 hover:bg-stone-800 rounded-full">
                       <X className="w-4 h-4 text-stone-400" />
                   </button>
              </div>
          </div>
      )}

      {/* Command Bar (Mode Switching) */}
      <div className="flex items-center justify-between px-4 py-2 bg-stone-50 border-b border-stone-200">
        <div className="flex items-center gap-2">
            <button
                onClick={() => setMode(AppMode.INSIGHT)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold tracking-wider transition-all ${
                    mode === AppMode.INSIGHT 
                    ? 'bg-rose-100 text-rose-700 border border-rose-200' 
                    : 'bg-white text-stone-500 border border-stone-200 hover:bg-stone-100'
                }`}
            >
                <Eye className="w-3 h-3" />
                INSIGHT
            </button>
            <button
                onClick={() => setMode(AppMode.NAVIGATION)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold tracking-wider transition-all ${
                    mode === AppMode.NAVIGATION 
                    ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' 
                    : 'bg-white text-stone-500 border border-stone-200 hover:bg-stone-100'
                }`}
            >
                <Navigation className="w-3 h-3" />
                NAV
            </button>
        </div>
        
        <button 
            onClick={toggleGuardian}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold tracking-wider transition-all border ${
                guardianActive 
                ? 'bg-amber-100 text-amber-700 border-amber-200' 
                : 'bg-white text-stone-400 border-stone-200 hover:bg-stone-50'
            }`}
        >
            <Shield className={`w-3 h-3 ${guardianActive ? 'fill-current' : ''}`} />
            GUARDIAN
        </button>
      </div>

      {/* Dynamic Content Area */}
      <div className="flex-1 overflow-hidden relative flex flex-col">
          <div className="flex-1 flex flex-col h-full relative bg-white">
            {/* Live Header / Status */}
            {liveState.isConnected && (
              <div className={`absolute top-0 left-0 right-0 ${mode === AppMode.NAVIGATION ? 'bg-emerald-500/90' : 'bg-rose-500/90'} backdrop-blur text-white text-xs py-1 text-center shadow-md z-10 flex justify-center items-center gap-2`}>
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></span>
                <span className="font-bold tracking-wider">{mode === AppMode.NAVIGATION ? 'NAVIGATION ACTIVE' : 'LIVE CHANNEL OPEN'}</span>
              </div>
            )}

            {/* Chat History */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 pt-8 scroll-smooth">
                {/* Navigation Destination Card */}
                {mode === AppMode.NAVIGATION && !liveState.isConnected && chatHistory.length === 0 && (
                    <div className="mb-4 bg-emerald-50 border border-emerald-100 p-4 rounded-xl shadow-sm">
                        <label className="text-xs font-bold text-emerald-700 tracking-widest mb-2 block">SET DESTINATION</label>
                        <div className="flex gap-2">
                            <input 
                                type="text"
                                value={destination}
                                onChange={(e) => setDestination(e.target.value)}
                                placeholder="Where do you want to go?"
                                className="flex-1 bg-white border border-emerald-200 rounded-lg px-3 py-2 text-sm text-stone-800 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-emerald-200"
                            />
                        </div>
                    </div>
                )}

              {chatHistory.length === 0 && !liveState.isConnected && mode !== AppMode.NAVIGATION && (
                <div className="text-center text-stone-400 mt-4 text-sm flex flex-col items-center gap-1">
                  <p>Ask Lumen about your surroundings.</p>
                </div>
              )}
              {chatHistory.map((msg) => (
                <div 
                  key={msg.id} 
                  className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
                >
                  <div className={`max-w-[90%] p-3 rounded-2xl text-sm leading-relaxed shadow-sm ${
                    msg.role === 'user' 
                      ? 'bg-stone-100 text-stone-800 rounded-br-none border border-stone-200' 
                      : `bg-white border ${mode === AppMode.NAVIGATION ? 'border-emerald-100' : 'border-rose-100'} text-stone-800 rounded-bl-none shadow-stone-100`
                  }`}>
                    {msg.text}
                  </div>
                  {msg.webSources && msg.webSources.length > 0 && (
                    <div className="mt-1.5 flex flex-wrap gap-2 max-w-[90%]">
                      {msg.webSources.map((source, idx) => (
                        <button 
                          key={idx} 
                          onClick={() => handleMediaClick(source)}
                          className={`flex items-center gap-1.5 px-2 py-1 bg-white border border-stone-200 rounded-lg text-[10px] ${mode === AppMode.NAVIGATION ? 'text-emerald-500 hover:bg-emerald-50 hover:border-emerald-200' : 'text-rose-500 hover:bg-rose-50 hover:border-rose-200'} transition-colors shadow-sm text-left`}
                        >
                          {getSourceIcon(source.uri)}
                          <span className="truncate max-w-[120px] font-medium">{source.title}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
              {isProcessing && !liveState.isConnected && (
                <div className="flex justify-start">
                  <div className={`bg-white p-3 rounded-2xl rounded-bl-none border ${mode === AppMode.NAVIGATION ? 'border-emerald-100' : 'border-rose-100'} shadow-sm`}>
                    <div className="flex gap-1">
                      <div className={`w-1.5 h-1.5 ${mode === AppMode.NAVIGATION ? 'bg-emerald-400' : 'bg-rose-400'} rounded-full animate-bounce delay-75`}></div>
                      <div className={`w-1.5 h-1.5 ${mode === AppMode.NAVIGATION ? 'bg-emerald-400' : 'bg-rose-400'} rounded-full animate-bounce delay-100`}></div>
                      <div className={`w-1.5 h-1.5 ${mode === AppMode.NAVIGATION ? 'bg-emerald-400' : 'bg-rose-400'} rounded-full animate-bounce delay-150`}></div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Input Area */}
            <div className="p-3 bg-white border-t border-stone-100 z-20">
               {!liveState.isConnected ? (
                 <div className="flex gap-2 items-center">
                    <button 
                        type="button" 
                        onClick={onToggleLive}
                        className={`p-3 rounded-full transition-all duration-300 shadow-sm flex-shrink-0 border 
                            ${liveState.isConnecting 
                                ? `bg-stone-100 ${mode === AppMode.NAVIGATION ? 'border-emerald-300 text-emerald-500' : 'border-rose-300 text-rose-500'}` 
                                : `bg-stone-50 border-stone-200 ${mode === AppMode.NAVIGATION ? 'text-emerald-500 hover:bg-emerald-50 hover:border-emerald-200' : 'text-rose-500 hover:bg-rose-50 hover:border-rose-200'} hover:scale-105 active:scale-95`
                            }`}
                        title={liveState.isConnecting ? "Cancel Connection" : "Start Live Conversation"}
                    >
                        {liveState.isConnecting ? <Activity className="w-5 h-5 animate-spin" /> : <Mic className="w-5 h-5" />}
                    </button>

                    <form onSubmit={handleSubmit} className="flex-1 flex gap-2 relative">
                       <input 
                        type="text" 
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        disabled={liveState.isConnecting}
                        placeholder={liveState.isConnecting ? "Connecting..." : (mode === AppMode.NAVIGATION ? "Enter destination..." : "Ask Lumen...")}
                        className={`flex-1 bg-stone-50 border border-stone-200 rounded-full pl-5 pr-12 text-sm text-stone-800 placeholder:text-stone-400 focus:outline-none ${mode === AppMode.NAVIGATION ? 'focus:border-emerald-300 focus:ring-emerald-100' : 'focus:border-rose-300 focus:ring-rose-100'} focus:ring-2 transition-all disabled:opacity-50`}
                       />
                       
                       {mode !== AppMode.NAVIGATION && (
                            <button
                                type="button"
                                onClick={() => setUseSearch(!useSearch)}
                                className={`absolute right-[3.5rem] top-1/2 -translate-y-1/2 p-1.5 rounded-full transition-all ${
                                    useSearch 
                                        ? 'text-rose-500 bg-rose-50' 
                                        : 'text-stone-400 hover:text-rose-400'
                                }`}
                                title="Toggle Web Search"
                            >
                                <Globe className={`w-4 h-4 ${useSearch ? 'animate-pulse' : ''}`} />
                            </button>
                       )}

                       <button 
                        type="submit" 
                        disabled={!inputText.trim() || isProcessing || liveState.isConnecting}
                        className="p-3 rounded-full bg-stone-900 text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-stone-800 transition-colors shadow-lg shadow-stone-200 z-10"
                       >
                         <Send className="w-5 h-5" />
                       </button>
                    </form>
                 </div>
               ) : (
                 <div className="flex gap-3 items-center w-full">
                    <div className={`flex-1 flex items-center justify-between h-16 bg-gradient-to-r ${mode === AppMode.NAVIGATION ? 'from-emerald-50 to-teal-50 border-emerald-100' : 'from-rose-50 to-amber-50 border-rose-100'} rounded-2xl border px-6 relative overflow-hidden group`}>
                        
                        <div className="flex items-center gap-3 relative z-10">
                            <div className="flex gap-1 h-8 items-end">
                                {[...Array(5)].map((_, i) => (
                                    <div key={i} className={`w-1.5 ${mode === AppMode.NAVIGATION ? 'bg-emerald-400' : 'bg-rose-400'} rounded-full animate-[bounce_1s_infinite]`} style={{ height: '60%', animationDelay: `${i * 0.15}s` }}></div>
                                ))}
                            </div>
                            <span className={`text-xs ${mode === AppMode.NAVIGATION ? 'text-emerald-700' : 'text-rose-700'} font-bold tracking-widest ml-2`}>
                                {mode === AppMode.NAVIGATION ? 'NAVIGATING...' : 'LISTENING...'}
                            </span>
                        </div>
                    </div>

                    <button 
                        type="button" 
                        onClick={onToggleLive}
                        className="h-16 w-16 flex-shrink-0 rounded-2xl bg-red-500 hover:bg-red-600 text-white flex flex-col items-center justify-center transition-all shadow-lg shadow-red-200 active:scale-95 group"
                        title="End Live Session"
                    >
                        <Power className="w-6 h-6 mb-0.5" />
                        <span className="text-[10px] font-bold tracking-wider">OFF</span>
                    </button>
                 </div>
               )}
            </div>
          </div>
      </div>
    </div>
  );
};

export default ControlInterface;