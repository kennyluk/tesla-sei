import { useState, useEffect, useRef } from 'react'
import SteeringWheel from './components/SteeringWheel'
import Compass from './components/Compass'
import GForceBall from './components/GForceBall'
import FileDropzone from './components/FileDropzone'
import { Play, Pause, ChevronLeft, Eye, EyeOff, Download } from 'lucide-react'
import { SeiParser, SeiBuffer } from './services/SeiParser'
import { SeiMetadata } from './types'
import wheelIcon from './assets/icons/wheel.svg'
import { useSeiSync } from './hooks/useSeiSync'
import BrakePedal from './components/BrakePedal'
import AcceleratorPedal from './components/AcceleratorPedal'

function App() {
    const [file, setFile] = useState<File | null>(null);
    const [videoUrl, setVideoUrl] = useState<string | null>(null);
    const [seiBuffer, setSeiBuffer] = useState<SeiBuffer | null>(null);

    // Parsing State
    const [isParsing, setIsParsing] = useState(false);
    const [parseProgress, setParseProgress] = useState(0);
    const [error, setError] = useState<string | null>(null);

    // Export State
    const [isExporting, setIsExporting] = useState(false);
    const [exportProgress, setExportProgress] = useState(0);

    // View State
    const [view, setView] = useState<'upload' | 'dashboard'>('upload');
    const [showGps, setShowGps] = useState(true);
    const [isPlaying, setIsPlaying] = useState(true);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [hudMetadata, setHudMetadata] = useState<SeiMetadata | null>(null);

    const videoRef = useRef<HTMLVideoElement | null>(null);
    const { metadataRef, updateSync } = useSeiSync(videoRef, seiBuffer);

    // Sync HUD with hook updates
    useEffect(() => {
        let animId: number;
        const syncLoop = () => {
            if (metadataRef.current) {
                setHudMetadata(metadataRef.current);
            }
            animId = requestAnimationFrame(syncLoop);
        };
        animId = requestAnimationFrame(syncLoop);
        return () => cancelAnimationFrame(animId);
    }, [metadataRef]);

    const togglePlayback = () => {
        const video = videoRef.current
        if (!video) return

        if (isPlaying) {
            video.pause()
        } else {
            video.play()
        }
        setIsPlaying(!isPlaying)
    }

    const handleTimeUpdate = () => {
        if (videoRef.current) {
            setCurrentTime(videoRef.current.currentTime)
        }
    }

    const handleLoadedMetadata = () => {
        if (videoRef.current) {
            setDuration(videoRef.current.duration)
        }
    }

    const handleScrub = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!videoRef.current) return
        const rect = e.currentTarget.getBoundingClientRect()
        const x = e.clientX - rect.left
        const percent = Math.max(0, Math.min(1, x / rect.width))
        const newTime = percent * duration

        videoRef.current.currentTime = newTime
        setCurrentTime(newTime)
        updateSync(newTime)
    }

    const handleExport = async () => {
        if (!file || !seiBuffer) return;
        setIsExporting(true);
        setExportProgress(0);
        setError(null); // Clear previous errors

        try {
            // Load Assets
            // Load Assets via HTMLImageElement to support SVG
            const loadBitmap = (src: string) => new Promise<ImageBitmap>((resolve, reject) => {
                const img = new Image();
                img.onload = () => {
                    createImageBitmap(img).then(resolve).catch(reject);
                };
                img.onerror = reject;
                img.src = src;
            });

            const wheelBmp = await loadBitmap(wheelIcon);

            const worker = new Worker(new URL('./workers/export.worker.ts', import.meta.url), { type: 'module' });

            worker.onmessage = (e) => {
                const { type, progress, buffer, error } = e.data;
                if (type === 'progress') {
                    setExportProgress(progress * 100);
                } else if (type === 'done') {
                    // Download
                    const blob = new Blob([buffer], { type: 'video/mp4' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `tesla_overlay_${Date.now()}.mp4`; // Timestamped filename
                    a.click();
                    URL.revokeObjectURL(url);

                    setIsExporting(false);
                    worker.terminate();
                } else if (type === 'error') {
                    console.error('Export worker error:', error);
                    setError('Export failed: ' + error);
                    setIsExporting(false);
                    worker.terminate();
                }
            };

            worker.postMessage({
                type: 'start',
                file: file,
                metadata: seiBuffer.getEntries(),
                assets: { steeringWheel: wheelBmp },
                config: {
                    bitrate: 12000000,
                    showGps: showGps
                }
            }, [wheelBmp]);

        } catch (err: any) {
            console.error('Export initialization failed:', err);
            setError('Export initialization failed: ' + err.message);
            setIsExporting(false);
        }
    };

    // Keep isPlaying state in sync with video element events
    useEffect(() => {
        const video = videoRef.current
        if (!video) return

        const onPlay = () => setIsPlaying(true)
        const onPause = () => setIsPlaying(false)

        video.addEventListener('play', onPlay)
        video.addEventListener('pause', onPause)

        // requestVideoFrameCallback provides high-precision media time
        let rvfcId: number | undefined;
        const onVideoFrame = (_now: DOMHighResTimeStamp, metadata: any) => {
            updateSync(metadata.mediaTime);
            rvfcId = (video as any).requestVideoFrameCallback(onVideoFrame);
        };

        // Fallback for browsers without requestVideoFrameCallback
        let rafId: number | undefined;
        let lastMediaTime = -1;
        const onFrame = () => {
            const v = video as HTMLVideoElement;
            if (v.currentTime !== lastMediaTime) {
                lastMediaTime = v.currentTime;
                updateSync(v.currentTime);
            }
            rafId = requestAnimationFrame(onFrame);
        };

        if ('requestVideoFrameCallback' in video) {
            rvfcId = (video as any).requestVideoFrameCallback(onVideoFrame);
        } else {
            rafId = requestAnimationFrame(onFrame);
        }

        return () => {
            video.removeEventListener('play', onPlay)
            video.removeEventListener('pause', onPause)
            if (rvfcId !== undefined) {
                (video as any).cancelVideoFrameCallback(rvfcId);
            }
            if (rafId !== undefined) {
                cancelAnimationFrame(rafId);
            }
        }
    }, [videoUrl, updateSync]) // Added updateSync to dependencies

    // Update HUD from Ref 60 times a second
    useEffect(() => {
        if (view !== 'dashboard') return

        const updateHud = () => {
            if (metadataRef.current) {
                // Set the entire object to trigger a re-render every frame
                setHudMetadata({ ...metadataRef.current })
            }
            requestAnimationFrame(updateHud)
        }
        const rafId = requestAnimationFrame(updateHud)
        return () => cancelAnimationFrame(rafId)
    }, [metadataRef, view])

    const handleFileAccepted = async (file: File) => {
        setError(null)
        setIsParsing(true)
        setParseProgress(0)

        try {
            setFile(file);
            const buffer = await file.arrayBuffer()
            const isValid = await SeiParser.validateMp4(buffer.slice(0))

            if (!isValid) {
                setError('Invalid Tesla Clip: No H.264 video track found.')
                setIsParsing(false)
                return
            }

            // Create Object URL for instant playback
            const url = URL.createObjectURL(file)
            setVideoUrl(url)

            // Parse SEI Data using Worker
            const results = await SeiParser.parseSei(buffer, (count) => {
                setParseProgress(count)
            })

            const newBuffer = new SeiBuffer()
            newBuffer.addEntries(results)
            setSeiBuffer(newBuffer)

            if (results.length > 0) {
                console.log('--- SEI DATA SAMPLE (First 5 Frames) ---')
                console.log(JSON.stringify(results.slice(0, 5), null, 2))
            }

            setView('dashboard')
        } catch (err) {
            console.error('File processing error:', err)
            setError('Failed to process video file.')
        } finally {
            setIsParsing(false)
        }
    }

    if (view === 'upload') {
        return (
            <div className="w-screen h-screen bg-[#0a0a0a] flex items-center justify-center p-10">
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-tesla-blue/10 blur-[120px] rounded-full" />
                    <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-tesla-red/5 blur-[120px] rounded-full" />
                </div>

                <div className="relative z-10 w-full max-w-4xl">
                    <div className="text-center mb-12">
                        <h1 className="text-5xl font-bold font-outfit text-white mb-4 tracking-tight">
                            Tesla <span className="text-tesla-blue">SEI</span> Explorer
                        </h1>
                        <p className="text-white/40 font-inter text-lg">
                            Visualize Supplemental Enhancement Information from your dashcam.
                        </p>
                    </div>

                    {isParsing ? (
                        <div className="flex flex-col items-center gap-6 p-12 bg-glass-bg/50 backdrop-blur-xl rounded-3xl border border-glass-border shadow-2xl animate-in fade-in zoom-in-95">
                            <div className="relative w-24 h-24">
                                <div className="absolute inset-0 border-4 border-tesla-blue/20 rounded-full" />
                                <div className="absolute inset-0 border-4 border-tesla-blue rounded-full border-t-transparent animate-spin" />
                                <div className="absolute inset-0 flex items-center justify-center text-tesla-blue font-bold font-outfit">
                                    {parseProgress}
                                </div>
                            </div>
                            <div className="text-center">
                                <h3 className="text-xl font-bold font-outfit text-white mb-2">Extracting Metadata</h3>
                                <p className="text-sm text-white/40 font-inter">Demuxing MP4 and decoding SEI NAL units...</p>
                            </div>
                        </div>
                    ) : (
                        <FileDropzone onFileAccepted={handleFileAccepted} error={error} />
                    )}
                </div>
            </div>
        )
    }

    return (
        <div className="relative w-screen h-screen bg-black overflow-hidden font-inter text-white">
            {/* Background Video */}
            {videoUrl && (
                <video
                    ref={videoRef}
                    className="absolute inset-0 w-full h-full object-cover z-0 opacity-60 pointer-events-auto"
                    src={videoUrl}
                    autoPlay
                    muted
                    loop
                    onClick={togglePlayback}
                    onTimeUpdate={handleTimeUpdate}
                    onLoadedMetadata={handleLoadedMetadata}
                />
            )}

            {/* HUD Overlay */}
            <div className="relative z-10 w-full h-full flex flex-col justify-end pointer-events-none">
                {/* Top Bar */}
                <div className="absolute top-0 left-0 w-full p-10 flex justify-between items-start">
                    <button
                        onClick={() => setView('upload')}
                        className="pointer-events-auto flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full text-xs font-bold uppercase tracking-widest transition-colors backdrop-blur-md"
                    >
                        <ChevronLeft size={14} /> New Clip
                    </button>

                    {/* GPS Coordinates Toggle & Display */}
                    <div className="flex items-center gap-3">
                        <button
                            onClick={handleExport}
                            disabled={isExporting}
                            className="pointer-events-auto flex items-center gap-2 px-4 py-2 bg-tesla-blue/20 hover:bg-tesla-blue/30 border border-tesla-blue/30 hover:border-tesla-blue/50 rounded-full text-xs font-bold uppercase tracking-widest transition-all backdrop-blur-md text-tesla-blue hover:text-[#2962FF] disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isExporting ? (
                                <div className="w-3 h-3 border-2 border-tesla-blue rounded-full border-t-transparent animate-spin" />
                            ) : (
                                <Download size={14} />
                            )}
                            {isExporting ? `${Math.round(exportProgress)}%` : 'Export'}
                        </button>

                        <div className="w-px h-8 bg-white/10 mx-2" />
                        {showGps && (
                            <div className="flex items-center gap-3 px-4 py-2 bg-glass-bg/90 border border-glass-border rounded-full shadow-lg backdrop-blur-2xl pointer-events-auto animate-in fade-in slide-in-from-right-2 duration-300">
                                <span className="text-[11px] font-mono text-[#00E5FF] tracking-widest leading-none pt-0.5 border-r border-white/10 pr-3">
                                    {hudMetadata?.latitudeDeg.toFixed(6) || '---'}°
                                </span>
                                <span className="text-[11px] font-mono text-[#00E5FF] tracking-widest leading-none pt-0.5">
                                    {hudMetadata?.longitudeDeg.toFixed(6) || '---'}°
                                </span>
                            </div>
                        )}
                        <button
                            onClick={() => setShowGps(!showGps)}
                            className="pointer-events-auto flex items-center justify-center p-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full transition-colors backdrop-blur-md text-white/40 hover:text-white/80 h-[34px] w-[34px]"
                            title={showGps ? "Hide GPS" : "Show GPS"}
                        >
                            {showGps ? <Eye size={16} /> : <EyeOff size={16} />}
                        </button>
                    </div>
                </div>

                {/* Unified Scrubber & Controls */}
                <div className="absolute bottom-40 left-10 right-10 flex items-center gap-4 z-50 pointer-events-none">
                    <div className="flex-1 flex items-center gap-4 p-2 pl-4 pr-6 rounded-full bg-glass-bg/90 border border-glass-border shadow-2xl backdrop-blur-2xl pointer-events-auto">
                        <button
                            onClick={togglePlayback}
                            className="flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-full bg-tesla-red hover:bg-red-600 transition-all active:scale-95 group shadow-lg"
                        >
                            {isPlaying ? (
                                <Pause size={18} className="text-white fill-white" />
                            ) : (
                                <Play size={18} className="text-white fill-white ml-0.5" />
                            )}
                        </button>

                        {/* Scrubber Track */}
                        <div
                            className="flex-1 h-8 flex items-center cursor-pointer group/scrubber"
                            onClick={handleScrub}
                            onMouseMove={(e) => e.buttons === 1 && handleScrub(e)}
                        >
                            <div className="w-full h-1 bg-white/20 rounded-full relative overflow-visible">
                                <div
                                    className="h-full bg-tesla-red rounded-full relative"
                                    style={{ width: `${(currentTime / duration) * 100}% ` }}
                                >
                                    <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-3 h-3 bg-white rounded-full shadow-md scale-0 group-hover/scrubber:scale-100 transition-transform" />
                                </div>
                            </div>
                        </div>

                        {/* Integrated SEQ Display */}
                        <div className="flex-shrink-0 px-3 py-1 rounded-md bg-white/5 border border-white/5">
                            <span className="text-[10px] font-mono text-white/40 tracking-widest">
                                {hudMetadata ? `SEQ: ${hudMetadata.frameSeqNo.toString().padStart(6, '0')} ` : '---'}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Bottom Bar Shell */}
                <div className="w-full h-36 bg-glass-bg/95 backdrop-blur-xl border-t border-glass-border flex justify-between items-center px-10 pointer-events-auto transition-all">
                    <div className="flex-1 flex justify-start gap-10 items-start">
                        <BrakePedal isApplied={hudMetadata?.brakeApplied} />

                        <div className="flex flex-col items-center">
                            <div className="h-6 mb-2 invisible" /> {/* Top Spacer */}
                            <div className="h-16 flex items-center">
                                <div className="h-10 w-px bg-white/10" />
                            </div>
                            <div className="mt-2 h-5 invisible" /> {/* Bottom Spacer */}
                        </div>

                        <div className="flex flex-col items-center">
                            <div className="h-6 mb-2 invisible" />
                            <GForceBall
                                x={hudMetadata?.linearAccelerationMps2X || 0}
                                y={hudMetadata?.linearAccelerationMps2Y || 0}
                                z={hudMetadata?.linearAccelerationMps2Z || 0}
                            />
                            <div className="mt-2 h-5 invisible" />
                        </div>
                    </div>

                    <div className="flex-1 flex flex-col items-center justify-start self-stretch">
                        <div className="h-6 mb-2 invisible" /> {/* Top Spacer matching side components */}

                        <div className="flex items-center gap-10">
                            {/* Left Blinker */}
                            <div className={`text-2xl transition-all duration-200 transform ${hudMetadata?.blinkerOnLeft ? 'text-[#4caf50] drop-shadow-[0_0_8px_#4caf50] opacity-100 scale-110' : 'text-white/10 scale-100'}`}>
                                ◀
                            </div>

                            <div className="flex flex-col items-center">
                                <div className="h-16 flex flex-col justify-center items-center">
                                    <span className="text-4xl font-bold font-outfit text-white/90 leading-none">
                                        {hudMetadata ? Math.round(hudMetadata.vehicleSpeedMps * 2.237) : 0}
                                    </span>
                                    <span className="text-[10px] opacity-50 uppercase tracking-widest font-inter mt-1">km/h</span>
                                </div>

                                <div className="mt-4 h-5 flex items-center justify-center">
                                    {hudMetadata && (
                                        <span className="text-[14px] font-extrabold text-tesla-blue font-outfit drop-shadow-[0_0_8px_#00E5FF] transition-all duration-300">
                                            {hudMetadata.gearState.replace('GEAR_', '')[0]}
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* Right Blinker */}
                            <div className={`text-2xl transition-all duration-200 transform ${hudMetadata?.blinkerOnRight ? 'text-[#4caf50] drop-shadow-[0_0_8px_#4caf50] opacity-100 scale-110' : 'text-white/10 scale-100'}`}>
                                ▶
                            </div>
                        </div>
                    </div>

                    <div className="flex-1 flex justify-end gap-10 items-start">
                        <Compass headingDeg={hudMetadata?.headingDeg || 0} />

                        <div className="flex flex-col items-center">
                            <div className="h-6 mb-2 invisible" />
                            <div className="h-16 flex items-center">
                                <div className="h-10 w-px bg-white/10" />
                            </div>
                            <div className="mt-2 h-5 invisible" />
                        </div>

                        <SteeringWheel
                            angle={hudMetadata?.steeringWheelAngle || 0}
                            blinkerOnLeft={hudMetadata?.blinkerOnLeft}
                            blinkerOnRight={hudMetadata?.blinkerOnRight}
                            brakeApplied={hudMetadata?.brakeApplied}
                            autopilotEnabled={['AUTOSTEER', 'SELF_DRIVING'].includes(hudMetadata?.autopilotState || '')}
                            autopilotState={hudMetadata?.autopilotState}
                        />

                        <div className="flex flex-col items-center">
                            <div className="h-6 mb-2 invisible" />
                            <div className="h-16 flex items-center">
                                <div className="h-10 w-px bg-white/10" />
                            </div>
                            <div className="mt-2 h-5 invisible" />
                        </div>

                        <AcceleratorPedal value={hudMetadata?.acceleratorPedalPosition} />
                    </div>
                </div>
            </div>
        </div>
    )
}

export default App
