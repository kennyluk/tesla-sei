import { useState, useEffect, useRef } from 'react'
import SteeringWheel from './components/SteeringWheel'
import FileDropzone from './components/FileDropzone'
import { SeiParser, SeiBuffer, SeiMetadata } from './services/SeiParser'
import { useSeiSync } from './hooks/useSeiSync'

function App() {
    const [view, setView] = useState<'upload' | 'dashboard'>('upload')
    const [isParsing, setIsParsing] = useState(false)
    const [parseProgress, setParseProgress] = useState(0)
    const [error, setError] = useState<string | null>(null)
    const [videoUrl, setVideoUrl] = useState<string | null>(null)
    const [hudMetadata, setHudMetadata] = useState<SeiMetadata | null>(null)
    const videoRef = useRef<HTMLVideoElement | null>(null)
    const [seiBuffer, setSeiBuffer] = useState<SeiBuffer | null>(null)
    const metadataRef = useSeiSync(videoRef, seiBuffer)

    const handleFileAccepted = async (file: File) => {
        setError(null)
        setIsParsing(true)
        setParseProgress(0)

        try {
            const buffer = await file.arrayBuffer()
            const isValid = await SeiParser.validateMp4(buffer.slice(0)) // Use slice to avoid transferring the buffer yet

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

            if (results.length === 0) {
                // If no real SEI found, we'll still show the dashboard but with a warning or mock data
                // For this mission, we'll just log it
                console.warn('No SEI metadata found in clip. Using mock data for demonstration.')

                // Fallback to mock data if needed, but for now let's just use results
            }

            const newBuffer = new SeiBuffer()
            newBuffer.addEntries(results)
            setSeiBuffer(newBuffer)

            // Mission requirement: Print first 5 frames to console
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

    // Update HUD from Ref 60 times a second
    useEffect(() => {
        if (view !== 'dashboard') return
        const updateHud = () => {
            if (metadataRef.current) {
                // Set the entire object to trigger a re-render every frame
                // even if individual values didn't change (e.g. driving straight)
                setHudMetadata({ ...metadataRef.current })

                // Debug logging to verify SEQ speed
                if (metadataRef.current.frameSeqNo % 30 === 0) {
                    console.log(`[HUD Update] Time: ${videoRef.current?.currentTime.toFixed(3)}s | SEQ: ${metadataRef.current.frameSeqNo}`);
                }
            }
            requestAnimationFrame(updateHud)
        }
        const rafId = requestAnimationFrame(updateHud)
        return () => cancelAnimationFrame(rafId)
    }, [metadataRef, view])

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
                    className="absolute inset-0 w-full h-full object-cover z-0 opacity-60"
                    src={videoUrl}
                    autoPlay
                    muted
                    loop
                />
            )}

            {/* HUD Overlay */}
            <div className="relative z-10 w-full h-full flex flex-col justify-end pointer-events-none">
                {/* Top Bar (Simplified for now) */}
                <div className="absolute top-0 left-0 w-full p-10 flex justify-between items-start">
                    <button
                        onClick={() => setView('upload')}
                        className="pointer-events-auto px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full text-xs font-bold uppercase tracking-widest transition-colors"
                    >
                        ← New Clip
                    </button>
                </div>

                {/* Bottom Bar Shell */}
                <div className="w-full h-20 bg-glass-bg backdrop-blur-xl border-t border-glass-border flex justify-between items-center px-10 pointer-events-auto">
                    <div className="flex-1 flex justify-start gap-6">
                        <div className="text-xs text-white/50">
                            {hudMetadata ? `SEQ: ${hudMetadata.frameSeqNo}` : 'WAITING FOR DATA...'}
                        </div>
                    </div>

                    <div className="flex-1.2 flex justify-center">
                        <div className="text-2xl font-bold font-outfit">
                            {hudMetadata ? Math.round(hudMetadata.vehicleSpeedMps * 2.237) : 0}
                            <span className="text-xs ml-1 opacity-50">MPH</span>
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
