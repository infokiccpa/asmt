"use client";
import { useRef, useEffect, useState } from 'react';
import { Camera, Shield, AlertCircle, Eye, EyeOff } from 'lucide-react';

const CameraMonitor = ({ onViolation }: { onViolation?: (type: string) => void }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
  const logsRef = useRef<{time: string, event: string}[]>([]);
  
  const [isActive, setIsActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<any>(null);
  const [showOverlay, setShowOverlay] = useState(true);
  const [liveLogs, setLiveLogs] = useState<{time: string, event: string, type: 'info' | 'warning' | 'error'}[]>([]);

  useEffect(() => {
    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: { width: 320, height: 240, frameRate: 15 } 
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          setIsActive(true);
        }
      } catch (err) {
        console.error("Error accessing webcam:", err);
        setError("Camera access required for proctoring.");
        onViolation?.('camera-blocked');
      }
    };

    startCamera();

    return () => {
      if (videoRef.current && videoRef.current.srcObject) {
        const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
        tracks.forEach(track => track.stop());
      }
    };
  }, []); // Only start camera once on mount

  // Analysis Loop
  useEffect(() => {
    if (!isActive) return;

    let isProcessing = false;
    const interval = setInterval(async () => {
      if (isProcessing) return;
      if (videoRef.current && canvasRef.current) {
        const canvas = canvasRef.current;
        const video = videoRef.current;
        
        if (video.videoWidth === 0) return;
        isProcessing = true;

        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(video, 0, 0);
          const base64Image = canvas.toDataURL('image/jpeg', 0.5);
          
          try {
            const response = await fetch('http://localhost:8000/api/proctor/analyze-base64', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ image: base64Image })
            });
            
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            
            const data = await response.json();
            setAnalysis(data);
            
            if (data.keypoints || data.objects) {
               if (overlayCanvasRef.current) {
                  const oCanvas = overlayCanvasRef.current;
                  const oCtx = oCanvas.getContext('2d');
                  if (oCtx) {
                     // Sync canvas size with video/analysis frame
                     if (oCanvas.width !== video.videoWidth) {
                        oCanvas.width = video.videoWidth;
                        oCanvas.height = video.videoHeight;
                     }
                     
                     oCtx.clearRect(0, 0, oCanvas.width, oCanvas.height);
                     
                     // 1. Draw Skeleton (Keypoints)
                     if (data.keypoints) {
                        const kp = data.keypoints;
                        oCtx.fillStyle = '#10b981'; // emerald-500
                        oCtx.strokeStyle = '#10b981';
                        oCtx.lineWidth = 2;
                        
                        // Draw points
                        Object.values(kp).forEach((p: any) => {
                           oCtx.beginPath();
                           oCtx.arc(p.x, p.y, 3, 0, Math.PI * 2);
                           oCtx.fill();
                        });
                        
                        // Draw connections (Simplified)
                        const connections = [
                           ['nose', 'l_eye'], ['nose', 'r_eye'], ['l_eye', 'l_ear'], ['r_eye', 'r_ear'],
                           ['l_shldr', 'r_shldr'], ['l_shldr', 'l_elbow'], ['l_elbow', 'l_wrist'],
                           ['r_shldr', 'r_elbow'], ['r_elbow', 'r_wrist'],
                           ['l_shldr', 'l_hip'], ['r_shldr', 'r_hip'], ['l_hip', 'r_hip']
                        ];
                        
                        connections.forEach(([p1, p2]) => {
                           if (kp[p1] && kp[p2]) {
                              oCtx.beginPath();
                              oCtx.moveTo(kp[p1].x, kp[p1].y);
                              oCtx.lineTo(kp[p2].x, kp[p2].y);
                              oCtx.stroke();
                           }
                        });
                     }
                     
                     // 2. Draw Object Boxes
                     if (data.objects) {
                        oCtx.strokeStyle = '#ef4444'; // red-500
                        oCtx.lineWidth = 2;
                        oCtx.font = 'bold 10px sans-serif';
                        data.objects.forEach((obj: any) => {
                           const [x1, y1, x2, y2] = obj.box;
                           oCtx.strokeRect(x1, y1, x2 - x1, y2 - y1);
                           oCtx.fillStyle = '#ef4444';
                           oCtx.fillText(obj.label, x1, y1 > 15 ? y1 - 5 : y1 + 15);
                        });
                     }
                  }
               }
            }
            
            const addLog = (event: string, type: 'info' | 'warning' | 'error' = 'info') => {
               const newLog = { time: new Date().toISOString(), event, type };
               logsRef.current.push(newLog);
               setLiveLogs(prev => [newLog, ...prev].slice(0, 5));
            };

            if (data.status === 'Bad' && data.issues) {
               const issueStr = (data.issues as string[]).join(', ');
               const violationType = issueStr.toLowerCase().includes('phone') ? 'phone-detected'
                 : issueStr.toLowerCase().includes('person') ? 'multiple-persons'
                 : 'looking-away';
               onViolation?.(violationType);
               addLog(`Poor Posture: ${issueStr}`, 'error');
            } else if (data.status === 'Warning' && data.issues) {
               addLog(`Warning: ${(data.issues as string[]).join(', ')}`, 'warning');
            } else if (data.status === 'No Person') {
               onViolation?.('no-person');
               addLog("Student Not Detected", 'error');
            } else if (data.status === 'Good') {
               addLog(`Tracking Active - Score: ${data.score}/100`, 'info');
            }
          } catch (err) {
            console.error("AI Analysis failed:", err);
            setAnalysis((prev: any) => ({ ...prev, status: 'Error' }));
          } finally {
            isProcessing = false;
          }
        } else {
            isProcessing = false;
        }
      }
    }, 500);

    return () => clearInterval(interval);
  }, [isActive, onViolation]);



  const statusColor = analysis?.status === 'Good' ? 'bg-emerald-500' : 
                      analysis?.status === 'Warning' ? 'bg-yellow-500' : 
                      analysis?.status === 'Bad' ? 'bg-red-500' : 
                      isActive ? 'bg-emerald-500 animate-pulse' : 'bg-red-500';

  return (
    <div className="relative group">
      <canvas ref={canvasRef} className="hidden" />
      {/* ── Outer Frame ── */}
      <div className="relative aspect-video rounded-2xl bg-black border-2 border-gray-100 overflow-hidden shadow-sm group-hover:shadow-md transition-all duration-300">
        
        {/* ── Video Feed ── */}
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          className={`w-full h-full object-cover transition-opacity duration-500 ${isActive ? 'opacity-100' : 'opacity-0'}`}
        />

        {/* ── Overlay Canvas ── */}
        <canvas
          ref={overlayCanvasRef}
          className={`absolute inset-0 w-full h-full pointer-events-none transition-opacity duration-300 ${showOverlay ? 'opacity-100' : 'opacity-0'}`}
        />

        {/* ── Overlay: Status ── */}
        <div className="absolute top-3 left-3 flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-black/40 backdrop-blur-md border border-white/20">
            <div className={`w-2 h-2 rounded-full ${statusColor}`} />
            <span className="text-[10px] font-black text-white uppercase tracking-wider">
              {analysis?.status || (isActive ? 'Live' : 'Offline')}
            </span>
          </div>
        </div>

        {/* ── Overlay: Scanning Animation ── */}
        {isActive && (
           <div className="absolute inset-0 pointer-events-none overflow-hidden">
             <div className="w-full h-[1px] bg-emerald-500/30 absolute top-0 animate-scan" />
             {/* Simple corner accents */}
             <div className="absolute top-2 left-2 w-4 h-4 border-t-2 border-l-2 border-white/40" />
             <div className="absolute top-2 right-2 w-4 h-4 border-t-2 border-r-2 border-white/40" />
             <div className="absolute bottom-2 left-2 w-4 h-4 border-b-2 border-l-2 border-white/40" />
             <div className="absolute bottom-2 right-2 w-4 h-4 border-b-2 border-r-2 border-white/40" />
           </div>
        )}

        {/* ── Error State ── */}
        {error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900/90 p-4 text-center">
            <AlertCircle className="w-8 h-8 text-red-500 mb-2" />
            <p className="text-xs font-bold text-white">{error}</p>
          </div>
        )}

        {/* ── AI Insights ── */}
        {isActive && (
           <div className="absolute bottom-3 left-3 right-3 flex justify-between items-end">
              <div className="space-y-1">
                 <p className="text-[9px] font-bold text-white/60 uppercase tracking-widest">Tracking Active</p>
                 <div className="flex gap-1">
                    {[1,2,3,4].map(i => (
                      <div key={i} className="w-1 h-3 bg-white/20 rounded-full overflow-hidden">
                        <div 
                          className="w-full bg-emerald-500 animate-pulse" 
                          style={{ 
                            height: `${40 + Math.random() * 60}%`,
                            animationDelay: `${i * 0.2}s` 
                          }} 
                        />
                      </div>
                    ))}
                 </div>
              </div>
               <div className="flex items-center gap-2 pointer-events-auto">
                 <button 
                   onClick={() => setShowOverlay(!showOverlay)}
                   className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition-colors backdrop-blur-sm"
                   title="Toggle Proctor Overlay"
                 >
                    {showOverlay ? <EyeOff className="w-4 h-4 text-white/80" /> : <Eye className="w-4 h-4 text-white/40" />}
                 </button>
                 <Shield className="w-4 h-4 text-white/40" />
               </div>
            </div>
        )}
      </div>

      {/* ── Label ── */}
      <div className="mt-3 flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
           <Camera className="w-4 h-4 text-gray-400" />
           <span className="text-[11px] font-black text-gray-400 uppercase tracking-widest">AI Proctoring Feed</span>
        </div>
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
           analysis?.status === 'Good' ? 'text-emerald-600 bg-emerald-50' :
           analysis?.status === 'Warning' ? 'text-yellow-600 bg-yellow-50' :
           analysis?.status === 'Bad' ? 'text-red-600 bg-red-50' :
           analysis?.status === 'No Person' ? 'text-gray-600 bg-gray-100' :
           'text-emerald-600 bg-emerald-50'
        }`}>
          {analysis?.status || 'Analyzing...'}
        </span>
      </div>

      {/* ── AI Insights Panel ── */}
      {analysis && (
         <div className="mt-3 p-3 rounded-xl bg-gray-50 border border-gray-100 space-y-2 animate-fade-in-up">
            <div className="flex justify-between items-center mb-1">
               <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Proctoring Score</span>
               <span className={`text-xs font-bold ${analysis.score >= 80 ? 'text-emerald-500' : analysis.score >= 50 ? 'text-yellow-500' : 'text-red-500'}`}>
                  {analysis.score}/100
               </span>
            </div>
            
            <div className="space-y-1.5 max-h-32 overflow-y-auto">
               {liveLogs.map((log, idx) => (
                  <div key={idx} className={`flex items-start gap-1.5 text-[10px] font-semibold p-1.5 rounded-lg border shadow-sm ${
                     log.type === 'error' ? 'text-red-600 bg-red-50 border-red-100/50' :
                     log.type === 'warning' ? 'text-yellow-600 bg-yellow-50 border-yellow-100/50' :
                     'text-emerald-600 bg-emerald-50 border-emerald-100/50'
                  }`}>
                     <AlertCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                     <span className="leading-tight">[{new Date(log.time).toLocaleTimeString()}] {log.event}</span>
                  </div>
               ))}
               {liveLogs.length === 0 && (
                  <div className="flex justify-center text-[10px] font-bold text-gray-500 bg-gray-100 p-2 rounded-lg border border-gray-200/50">
                     Waiting for camera activity...
                  </div>
               )}
            </div>
         </div>
      )}

      <style jsx global>{`
        @keyframes scan {
          0% { transform: translateY(0); }
          100% { transform: translateY(240px); }
        }
        .animate-scan {
          animation: scan 3s linear infinite;
        }
      `}</style>
    </div>
  );
};

export default CameraMonitor;
