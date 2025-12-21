import { useState, useEffect, useRef } from 'react'
import SteeringWheel from './components/SteeringWheel'
import Compass from './components/Compass'
import GForceBall from './components/GForceBall'
import FileDropzone from './components/FileDropzone'
import { Play, Pause, ChevronLeft } from 'lucide-react'
import { SeiParser, SeiBuffer, SeiMetadata } from './services/SeiParser'
import { useSeiSync } from './hooks/useSeiSync'

function App() {
    const [view, setView] = useState<'upload' | 'dashboard'>('upload')
    const [isParsing, setIsParsing] = useState(false)
    const [parseProgress, setParseProgress] = useState(0)
    const [error, setError] = useState<string | null>(null)
    const [videoUrl, setVideoUrl] = useState<string | null>(null)
    const [hudMetadata, setHudMetadata] = useState<SeiMetadata | null>(null)
    const [isPlaying, setIsPlaying] = useState(true)
    const [currentTime, setCurrentTime] = useState(0)
    const [duration, setDuration] = useState(0)
    const videoRef = useRef<HTMLVideoElement | null>(null)
    const [seiBuffer, setSeiBuffer] = useState<SeiBuffer | null>(null)
    const { metadataRef, updateSync } = useSeiSync(videoRef, seiBuffer)

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
                </div>

                {/* Unified Scrubber & Controls */}
                <div className="absolute bottom-24 left-10 right-10 flex items-center gap-4 z-50 pointer-events-none">
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
                                    style={{ width: `${(currentTime / duration) * 100}%` }}
                                >
                                    <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-3 h-3 bg-white rounded-full shadow-md scale-0 group-hover/scrubber:scale-100 transition-transform" />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Bottom Bar Shell */}
                <div className="w-full h-24 bg-glass-bg backdrop-blur-xl border-t border-glass-border flex justify-between items-center px-10 pointer-events-auto">
                    <div className="flex-1 flex justify-start gap-6 items-center">
                        <GForceBall
                            x={hudMetadata?.linearAccelerationMps2X || 0}
                            y={hudMetadata?.linearAccelerationMps2Y || 0}
                            z={hudMetadata?.linearAccelerationMps2Z || 0}
                        />

                        <div className="text-xs text-white/50 font-mono tracking-tighter">
                            {hudMetadata ? `SEQ: ${hudMetadata.frameSeqNo.toString().padStart(6, '0')}` : 'WAITING FOR DATA...'}
                        </div>
                    </div>

                    <div className="flex-1 flex flex-col items-center justify-center gap-1">
                        <Compass headingDeg={hudMetadata?.headingDeg || 0} />
                        <div className="text-2xl font-bold font-outfit mt-[-8px] text-white/90">
                            {hudMetadata ? Math.round(hudMetadata.vehicleSpeedMps * 2.237) : 0}
                            <span className="text-[10px] ml-1 opacity-50 uppercase tracking-widest font-inter">mph</span>
                        </div>
                    </div>

                    <div className="flex-1 flex justify-end gap-6 items-center">
                        <SteeringWheel
                            angle={hudMetadata?.steeringWheelAngle || 0}
                            blinkerOnLeft={hudMetadata?.blinkerOnLeft}
                            blinkerOnRight={hudMetadata?.blinkerOnRight}
                            brakeApplied={hudMetadata?.brakeApplied}
                        />
                    </div>
                </div>
            </div>
        </div>
    )
}

export default App
