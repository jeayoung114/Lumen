import React, { useRef, useEffect, useState } from 'react';
import { AppMode, Hazard } from '../types';
import { audioService } from '../services/audioService';
import { Power, Video, VideoOff } from 'lucide-react';

interface CameraViewProps {
  mode: AppMode;
  guardianActive: boolean;
  onFrameCapture: (imageData: string) => void;
  isProcessing: boolean;
  liveModeActive: boolean;
  onToggleLive: () => void;
  setCameraEnabled: (enabled: boolean) => void;
  cameraEnabled: boolean;
}

const CameraView: React.FC<CameraViewProps> = ({ 
    mode, 
    guardianActive,
    onFrameCapture, 
    isProcessing, 
    liveModeActive, 
    onToggleLive,
    setCameraEnabled,
    cameraEnabled
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [streamActive, setStreamActive] = useState(false);
  const [hazards, setHazards] = useState<Hazard[]>([]);

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

  // Guardian Mode Simulation Loop (Runs independent of Primary Mode)
  useEffect(() => {
    if (!guardianActive || !cameraEnabled) {
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
  }, [guardianActive, cameraEnabled]);

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
    if (liveModeActive && cameraEnabled) {
        intervalId = setInterval(() => {
            if (videoRef.current && canvasRef.current) {
                const ctx = canvasRef.current.getContext('2d');
                if (ctx) {
                    canvasRef.current.width = videoRef.current.videoWidth;
                    canvasRef.current.height = videoRef.current.videoHeight;
                    ctx.drawImage(videoRef.current, 0, 0);
                    const dataUrl = canvasRef.current.toDataURL('image/jpeg', 0.5); 
                    onFrameCapture(dataUrl);
                }
            }
        }, 1000); 
    }
    return () => clearInterval(intervalId);
  }, [liveModeActive, cameraEnabled]);


  return (
    <div className="relative w-full h-full bg-stone-900 overflow-hidden rounded-3xl shadow-2xl border-[6px] border-white ring-1 ring-stone-200 group">
      {/* Raw Video Feed */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className={`w-full h-full object-cover transition-opacity duration-500 ${streamActive && cameraEnabled ? 'opacity-90' : 'opacity-0'}`}
      />
      
      {/* Camera Off State */}
      {!cameraEnabled && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-stone-100 z-10">
            <VideoOff className="w-12 h-12 text-stone-300 mb-4" />
            <p className="text-stone-400 font-bold tracking-widest text-sm">VISUAL SENSORS OFFLINE</p>
        </div>
      )}
      
      {/* Hidden Canvas for Frame Capture */}
      <canvas ref={canvasRef} className="hidden" />

      {/* GUARDIAN LAYER (Always visible if active) */}
      {guardianActive && cameraEnabled && (
        <div className="absolute inset-0 pointer-events-none z-20">
          {/* Scanning Line Effect - Amber */}
          <div className="absolute inset-0 w-full h-[10%] bg-gradient-to-b from-transparent via-amber-500/20 to-transparent animate-scanline"></div>
          
          {/* HUD Grid - Amber */}
          <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 gap-0.5 opacity-30">
             <div className="border border-amber-500/30"></div>
             <div className="border border-amber-500/30"></div>
             <div className="border border-amber-500/30"></div>
             <div className="border border-amber-500/30"></div>
             <div className="border-2 border-amber-500/50 rounded-full scale-50"></div> 
             <div className="border border-amber-500/30"></div>
             <div className="border border-amber-500/30"></div>
             <div className="border border-amber-500/30"></div>
             <div className="border border-amber-500/30"></div>
          </div>

          {/* Active Hazards */}
          {hazards.map(h => (
            <div 
              key={h.id}
              className={`absolute flex flex-col items-center justify-center p-4 border-2 rounded-xl backdrop-blur-md transition-all duration-300 animate-pulse shadow-lg
                ${h.direction === 'LEFT' ? 'left-4 top-1/2 -translate-y-1/2' : 
                  h.direction === 'RIGHT' ? 'right-4 top-1/2 -translate-y-1/2' : 
                  'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2'}`}
              style={{
                borderColor: h.severity === 'HIGH' ? '#ef4444' : '#f59e0b',
                backgroundColor: h.severity === 'HIGH' ? 'rgba(239, 68, 68, 0.3)' : 'rgba(245, 158, 11, 0.3)',
                color: '#fff'
              }}
            >
              <span className="font-bold text-xs tracking-widest uppercase mb-1 drop-shadow-md">{h.type}</span>
              <span className="text-xs font-medium drop-shadow-md">{h.severity} PRIORITY</span>
            </div>
          ))}
          
           {/* Guardian Status Badge */}
           <div className="absolute top-4 right-4 flex flex-col gap-2">
            <div className="flex items-center gap-2 px-3 py-1 bg-amber-500/90 backdrop-blur rounded-full shadow-sm border border-amber-400">
              <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
              <span className="text-xs text-amber-50 font-bold tracking-widest">GUARDIAN ACTIVE</span>
            </div>
          </div>
        </div>
      )}

      {/* SYSTEM 2/3 OVERLAYS (Base Layer) */}
      <div className="absolute inset-0 pointer-events-none z-10">
        <div className="absolute top-4 left-4 flex flex-col gap-2">
            {mode === AppMode.NAVIGATION ? (
                 <div className="flex items-center gap-2 px-3 py-1 bg-white/80 backdrop-blur rounded-full shadow-sm">
                    <div className={`w-2 h-2 rounded-full ${liveModeActive ? 'bg-emerald-500 animate-pulse' : 'bg-stone-400'}`}></div>
                    <span className={`text-xs font-bold tracking-widest ${liveModeActive ? 'text-emerald-600' : 'text-stone-500'}`}>
                        {liveModeActive ? 'SYSTEM 3: NAVIGATING' : 'SYSTEM 3: STANDBY'}
                    </span>
                 </div>
            ) : (
                <div className="flex items-center gap-2 px-3 py-1 bg-white/80 backdrop-blur rounded-full shadow-sm">
                    <div className={`w-2 h-2 rounded-full ${liveModeActive ? 'bg-rose-500 animate-pulse' : 'bg-stone-400'}`}></div>
                    <span className={`text-xs font-bold tracking-widest ${liveModeActive ? 'text-rose-600' : 'text-stone-500'}`}>
                        {liveModeActive ? 'SYSTEM 2: LIVE' : 'SYSTEM 2: STANDBY'}
                    </span>
                 </div>
            )}
        </div>

        {/* Processing Spinner */}
        {isProcessing && (
             <div className="absolute inset-0 flex items-center justify-center bg-white/30 backdrop-blur-sm">
                <div className="flex flex-col items-center gap-4 bg-white p-6 rounded-2xl shadow-xl">
                  <div className={`w-12 h-12 border-4 rounded-full animate-spin ${mode === AppMode.NAVIGATION ? 'border-t-emerald-500 border-emerald-100' : 'border-t-rose-500 border-rose-100'}`}></div>
                  <span className={`font-bold tracking-widest text-xs animate-pulse ${mode === AppMode.NAVIGATION ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {mode === AppMode.NAVIGATION ? 'CALCULATING ROUTE...' : 'ANALYZING SCENE...'}
                  </span>
                </div>
             </div>
        )}
      </div>

      {/* Camera/Session Control Button */}
      <div className="absolute bottom-6 right-6 z-50 pointer-events-auto">
        {liveModeActive ? (
            <button
                onClick={onToggleLive}
                className="flex items-center gap-3 px-6 py-3 bg-red-500 hover:bg-red-600 text-white rounded-full shadow-lg shadow-red-500/30 transition-all hover:scale-105 active:scale-95 group"
            >
                <Power className="w-5 h-5 fill-current" />
                <span className="text-xs font-bold tracking-widest">END SESSION</span>
            </button>
        ) : (
            <button
                onClick={() => setCameraEnabled(!cameraEnabled)}
                className={`flex items-center gap-3 px-5 py-3 rounded-full backdrop-blur-md border transition-all hover:scale-105 active:scale-95 shadow-lg
                    ${cameraEnabled 
                        ? 'bg-white/90 border-stone-200 text-stone-600 hover:bg-white hover:text-stone-900' 
                        : 'bg-stone-800 border-stone-700 text-stone-200 hover:bg-stone-700'}`}
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