import React, { useRef, useEffect, useState } from 'react';
import { AppMode, Hazard } from '../types';
import { audioService } from '../services/audioService';
import { Power, Video, VideoOff } from 'lucide-react';

interface CameraViewProps {
  mode: AppMode;
  onFrameCapture: (imageData: string) => void;
  isProcessing: boolean;
  liveModeActive: boolean;
  onToggleLive: () => void;
}

const CameraView: React.FC<CameraViewProps> = ({ mode, onFrameCapture, isProcessing, liveModeActive, onToggleLive }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [streamActive, setStreamActive] = useState(false);
  const [hazards, setHazards] = useState<Hazard[]>([]);
  const [cameraEnabled, setCameraEnabled] = useState(true);

  // Initialize Camera
  useEffect(() => {
    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
          audio: false,
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          setStreamActive(true);
        }
      } catch (err) {
        console.error("Camera access denied:", err);
      }
    };

    const stopCamera = () => {
        if (videoRef.current && videoRef.current.srcObject) {
            const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
            tracks.forEach(track => track.stop());
            videoRef.current.srcObject = null;
            setStreamActive(false);
        }
    };

    if (cameraEnabled) {
        startCamera();
    } else {
        stopCamera();
    }

    return () => {
      stopCamera();
    };
  }, [cameraEnabled]);

  // Guardian Mode Simulation Loop
  useEffect(() => {
    if (mode !== AppMode.GUARDIAN || !cameraEnabled) {
      setHazards([]);
      return;
    }

    const interval = setInterval(() => {
      const shouldTrigger = Math.random() > 0.85; 
      
      if (shouldTrigger) {
        const directions: ('LEFT' | 'CENTER' | 'RIGHT')[] = ['LEFT', 'CENTER', 'RIGHT'];
        const types: ('OBSTACLE' | 'TRAFFIC' | 'DROP_OFF')[] = ['OBSTACLE', 'TRAFFIC', 'DROP_OFF'];
        
        const newHazard: Hazard = {
          id: Math.random().toString(36).substr(2, 9),
          type: types[Math.floor(Math.random() * types.length)],
          severity: Math.random() > 0.5 ? 'HIGH' : 'MEDIUM',
          direction: directions[Math.floor(Math.random() * directions.length)],
          timestamp: Date.now(),
        };

        setHazards(prev => [...prev.slice(-2), newHazard]); 
        
        audioService.playHazardAlert(newHazard);
        audioService.vibrate(newHazard.severity === 'HIGH' ? [50, 50, 50, 50] : [50]);
      }
    }, 1500);

    return () => clearInterval(interval);
  }, [mode, cameraEnabled]);

  // One-shot capture for text requests
  useEffect(() => {
    if (isProcessing && videoRef.current && canvasRef.current && cameraEnabled) {
         const ctx = canvasRef.current.getContext('2d');
         if (ctx) {
            canvasRef.current.width = videoRef.current.videoWidth;
            canvasRef.current.height = videoRef.current.videoHeight;
            ctx.drawImage(videoRef.current, 0, 0);
            const dataUrl = canvasRef.current.toDataURL('image/jpeg', 0.8);
            onFrameCapture(dataUrl);
         }
    }
  }, [isProcessing, cameraEnabled]);

  // Continuous capture for Live Mode
  useEffect(() => {
    let intervalId: NodeJS.Timeout;
    if (liveModeActive && mode === AppMode.INSIGHT && cameraEnabled) {
        intervalId = setInterval(() => {
            if (videoRef.current && canvasRef.current) {
                const ctx = canvasRef.current.getContext('2d');
                if (ctx) {
                    canvasRef.current.width = videoRef.current.videoWidth;
                    canvasRef.current.height = videoRef.current.videoHeight;
                    ctx.drawImage(videoRef.current, 0, 0);
                    // Lower quality for streaming performance
                    const dataUrl = canvasRef.current.toDataURL('image/jpeg', 0.5); 
                    onFrameCapture(dataUrl);
                }
            }
        }, 1000); // 1 FPS for live vision is sufficient for descriptions
    }
    return () => clearInterval(intervalId);
  }, [liveModeActive, mode, cameraEnabled]);


  return (
    <div className="relative w-full h-full bg-black overflow-hidden rounded-2xl shadow-2xl border border-slate-800 group">
      {/* Raw Video Feed */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className={`w-full h-full object-cover transition-opacity duration-500 ${streamActive && cameraEnabled ? 'opacity-70' : 'opacity-0'}`}
      />
      
      {/* Camera Off State */}
      {!cameraEnabled && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/80 backdrop-blur-sm z-10">
            <VideoOff className="w-12 h-12 text-slate-600 mb-4" />
            <p className="text-slate-500 font-mono tracking-widest text-sm">VISUAL SENSORS OFFLINE</p>
        </div>
      )}
      
      {/* Hidden Canvas for Frame Capture */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Guardian Mode Overlay */}
      {mode === AppMode.GUARDIAN && cameraEnabled && (
        <div className="absolute inset-0 pointer-events-none">
          {/* Scanning Line Effect */}
          <div className="absolute inset-0 w-full h-[10%] bg-gradient-to-b from-transparent via-cyan-500/20 to-transparent animate-scanline z-10"></div>
          
          {/* HUD Grid */}
          <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 gap-0.5 opacity-20">
             <div className="border border-cyan-500/30"></div>
             <div className="border border-cyan-500/30"></div>
             <div className="border border-cyan-500/30"></div>
             <div className="border border-cyan-500/30"></div>
             <div className="border-2 border-cyan-500/50 rounded-full scale-50"></div> 
             <div className="border border-cyan-500/30"></div>
             <div className="border border-cyan-500/30"></div>
             <div className="border border-cyan-500/30"></div>
             <div className="border border-cyan-500/30"></div>
          </div>

          {/* Active Hazards Overlay */}
          {hazards.map(h => (
            <div 
              key={h.id}
              className={`absolute flex flex-col items-center justify-center p-4 border-2 rounded-lg backdrop-blur-sm transition-all duration-300 animate-pulse
                ${h.direction === 'LEFT' ? 'left-4 top-1/2 -translate-y-1/2' : 
                  h.direction === 'RIGHT' ? 'right-4 top-1/2 -translate-y-1/2' : 
                  'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2'}`}
              style={{
                borderColor: h.severity === 'HIGH' ? '#ef4444' : '#eab308',
                backgroundColor: h.severity === 'HIGH' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(234, 179, 8, 0.2)'
              }}
            >
              <span className="text-white font-bold text-xs tracking-widest uppercase mb-1">{h.type}</span>
              <span className="text-white text-xs">{h.severity} PRIORITY</span>
            </div>
          ))}
          
          {/* System Status Indicators */}
          <div className="absolute top-4 left-4 flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-xs text-green-500 font-mono tracking-widest">SYSTEM 1: ONLINE</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400 font-mono">LATENCY: &lt;20ms</span>
            </div>
          </div>
        </div>
      )}

      {/* Insight Mode Overlay */}
      {mode === AppMode.INSIGHT && (
        <div className="absolute inset-0 pointer-events-none bg-indigo-900/10">
          <div className="absolute top-4 left-4 flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${liveModeActive ? 'bg-red-500 animate-pulse' : 'bg-indigo-500'}`}></div>
              <span className="text-xs text-indigo-400 font-mono tracking-widest">
                {liveModeActive ? 'SYSTEM 2: LIVE CONNECTION' : 'SYSTEM 2: STANDBY'}
              </span>
            </div>
          </div>
          {isProcessing && (
             <div className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm z-20">
                <div className="flex flex-col items-center gap-4">
                  <div className="w-16 h-16 border-4 border-t-indigo-500 border-indigo-900 rounded-full animate-spin"></div>
                  <span className="text-indigo-300 font-bold tracking-widest animate-pulse">ANALYZING SCENE...</span>
                </div>
             </div>
          )}
        </div>
      )}

      {/* Camera/Session Control Button */}
      <div className="absolute bottom-6 right-6 z-50 pointer-events-auto">
        {liveModeActive ? (
            <button
                onClick={onToggleLive}
                className="flex items-center gap-3 px-6 py-3 bg-red-600/90 hover:bg-red-500 text-white rounded-full backdrop-blur-md shadow-[0_0_20px_rgba(220,38,38,0.5)] border border-red-400 transition-all hover:scale-105 active:scale-95 group"
            >
                <Power className="w-5 h-5 fill-current" />
                <span className="text-xs font-bold tracking-widest">END SESSION</span>
            </button>
        ) : (
            <button
                onClick={() => setCameraEnabled(!cameraEnabled)}
                className={`flex items-center gap-3 px-5 py-3 rounded-full backdrop-blur-md border transition-all hover:scale-105 active:scale-95 shadow-lg
                    ${cameraEnabled 
                        ? 'bg-slate-900/60 border-slate-700 text-slate-300 hover:bg-slate-800' 
                        : 'bg-green-900/60 border-green-500/50 text-green-400 hover:bg-green-900/80'}`}
            >
                {cameraEnabled ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
                <span className="text-xs font-bold tracking-widest">
                    {cameraEnabled ? 'CAMERA OFF' : 'CAMERA ON'}
                </span>
            </button>
        )}
      </div>
    </div>
  );
};

export default CameraView;