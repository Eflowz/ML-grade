import { useState, useRef, useEffect, useCallback } from 'react'
import Tesseract from 'tesseract.js'
import toast from 'react-hot-toast'
import { LuCamera, LuCircle, LuScan, LuPlay } from 'react-icons/lu'

interface LiveCaptureProps {
  onDetected: (multiplier: number) => Promise<void>
}

export default function LiveCapture({ onDetected }: LiveCaptureProps) {
  const [isCapturing, setIsCapturing] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [currentValue, setCurrentValue] = useState<number | null>(null)
  const [isCrashed, setIsCrashed] = useState(false)

  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const workerRef = useRef<Tesseract.Worker | null>(null)
  const requestRef = useRef<number | null>(null)
  const lastProcessedTime = useRef<number>(0)
  const isOcrBusy = useRef<boolean>(false)
  const isCapturingRef = useRef<boolean>(false)

  // FIX 1: Store lastValue in a ref so it doesn't trigger processFrame recreation
  const lastValueRef = useRef<number | null>(null)

  // FIX 2: Store onDetected in a ref so parent re-renders don't recreate processFrame
  const onDetectedRef = useRef(onDetected)
  useEffect(() => {
    onDetectedRef.current = onDetected
  }, [onDetected])

  const [crop, setCrop] = useState({ x: 40, y: 40, w: 20, h: 20 })
  // FIX 3: Store crop in a ref too so processFrame doesn't need it as a dependency
  const cropRef = useRef(crop)
  useEffect(() => {
    cropRef.current = crop
  }, [crop])

  const initWorker = useCallback(async () => {
    if (workerRef.current) return
    const worker = await Tesseract.createWorker('eng')
    await worker.setParameters({
      tessedit_char_whitelist: '0123456789.xX',
      tessedit_pageseg_mode: '7' as any, // Treat as a single text line
    })
    workerRef.current = worker
  }, [])

  useEffect(() => {
    if (stream && videoRef.current) {
      videoRef.current.srcObject = stream
    }
  }, [stream, isCapturing])

  const stopCapture = useCallback(() => {
    isCapturingRef.current = false
    if (requestRef.current) {
      cancelAnimationFrame(requestRef.current)
      requestRef.current = null
    }
    setStream(prev => {
      prev?.getTracks().forEach(track => track.stop())
      return null
    })
    setIsCapturing(false)
    setIsProcessing(false)
    setCurrentValue(null)
    lastValueRef.current = null
  }, [])

  useEffect(() => {
    return () => stopCapture()
  }, [stopCapture])

  // FIX 4: processFrame has NO changing dependencies — fully stable
  const processFrame = useCallback(async () => {
    if (!isCapturingRef.current) return

    if (!videoRef.current || !canvasRef.current || !workerRef.current || isOcrBusy.current) {
      requestRef.current = requestAnimationFrame(processFrame)
      return
    }

    const now = Date.now()
    if (now - lastProcessedTime.current < 400) {
      requestRef.current = requestAnimationFrame(processFrame)
      return
    }
    lastProcessedTime.current = now

    const video = videoRef.current
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d', { alpha: false })
    if (!ctx) {
      requestRef.current = requestAnimationFrame(processFrame)
      return
    }

    const { x, y, w, h } = cropRef.current
    const sourceX = (x / 100) * video.videoWidth
    const sourceY = (y / 100) * video.videoHeight
    const sourceW = (w / 100) * video.videoWidth
    const sourceH = (h / 100) * video.videoHeight

    canvas.width = sourceW
    canvas.height = sourceH
    
    // Image processing for better OCR
    ctx.filter = 'grayscale(1) contrast(2) brightness(1.2)'
    ctx.drawImage(video, sourceX, sourceY, sourceW, sourceH, 0, 0, sourceW, sourceH)

    try {
      isOcrBusy.current = true
      const { data: { text } } = await workerRef.current.recognize(canvas)
      const cleanText = text.replace(/[xX]/g, '').trim()
      const val = parseFloat(cleanText)

      if (!isNaN(val) && val >= 1.0) {
        setCurrentValue(val)

        const prev = lastValueRef.current
        if (prev !== null && val < prev && prev > 1.05) {
          // Crash detected
          setIsCrashed(true)
          setIsProcessing(true)
          lastValueRef.current = null
          try {
            await onDetectedRef.current(prev)
          } finally {
            setIsProcessing(false)
          }
          setTimeout(() => setIsCrashed(false), 2000)
        } else {
          lastValueRef.current = val
        }
      }
    } catch (err) {
      console.warn('OCR Error:', err)
    } finally {
      isOcrBusy.current = false
    }

    // FIX 5: Only schedule next frame if still capturing
    if (isCapturingRef.current) {
      requestRef.current = requestAnimationFrame(processFrame)
    }
  }, []) // ← empty deps: processFrame is now fully stable

  const startCapture = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getDisplayMedia({
        video: { displaySurface: 'window' },
        audio: false,
      })
      setStream(mediaStream)
      await initWorker()
      isCapturingRef.current = true
      setIsCapturing(true)
      lastValueRef.current = null

      // FIX 6: Start the loop directly here, not via useEffect
      // Cancel any stale loop first
      if (requestRef.current) cancelAnimationFrame(requestRef.current)
      requestRef.current = requestAnimationFrame(processFrame)

      toast.success('Live capture started. Align the multiplier in the scanner.')

      // Handle stream ending externally (user stops share)
      mediaStream.getTracks().forEach(track => {
        track.onended = () => stopCapture()
      })
    } catch (err) {
      console.error(err)
      toast.error('Failed to start screen capture')
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`h-3 w-3 rounded-full ${isCapturing ? 'animate-pulse bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]' : 'bg-black/20'}`} />
          <h3 className="text-base font-bold text-black/90">Automation Scanner</h3>
        </div>

        <button
          onClick={isCapturing ? stopCapture : startCapture}
          className={`flex items-center gap-2 rounded-2xl px-5 py-2.5 text-sm font-bold transition-all ${
            isCapturing
              ? 'bg-red-500 text-white shadow-lg shadow-red-100 hover:bg-red-600'
              : 'bg-black text-white hover:bg-black/80 shadow-lg shadow-black/10'
          }`}
        >
          {isCapturing ? (
            <>
              <LuCircle className="h-4 w-4" />
              Stop Scanner
            </>
          ) : (
            <>
              <LuPlay className="h-4 w-4" />
              Start Scanner
            </>
          )}
        </button>
      </div>

      {!isCapturing && (
        <div className="rounded-3xl border-2 border-dashed border-black/5 bg-black/[0.01] py-12 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-black/5">
            <LuScan className="h-6 w-6 text-black/20" />
          </div>
          <p className="text-sm font-medium text-black/40">
            Click Start to open the scanner
          </p>
        </div>
      )}

      {isCapturing && (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-4">
          {/* Main Scanner Window */}
          <div className="relative aspect-video overflow-hidden rounded-3xl border-2 border-black bg-black shadow-2xl">
            <video
              ref={videoRef}
              autoPlay
              muted
              playsInline
              className="h-full w-full object-contain opacity-60"
            />

            {/* Scanner target box */}
            <div
              className="absolute border-[3px] border-green-500 bg-green-500/10 shadow-[0_0_20px_rgba(34,197,94,0.3)] transition-all duration-75"
              style={{
                left: `${crop.x}%`,
                top: `${crop.y}%`,
                width: `${crop.w}%`,
                height: `${crop.h}%`,
              }}
            >
              <div className="absolute -left-1 -top-1 h-4 w-4 border-l-4 border-t-4 border-white" />
              <div className="absolute -right-1 -top-1 h-4 w-4 border-r-4 border-t-4 border-white" />
              <div className="absolute -bottom-1 -left-1 h-4 w-4 border-b-4 border-l-4 border-white" />
              <div className="absolute -bottom-1 -right-1 h-4 w-4 border-b-4 border-r-4 border-white" />
              <div className="absolute -top-7 left-0 whitespace-nowrap rounded bg-green-500 px-2 py-0.5 text-[10px] font-black uppercase tracking-tighter text-white">
                OCR TARGET AREA
              </div>
            </div>

            {/* Real-time OCR Display */}
            <div className="absolute bottom-4 right-4 flex flex-col items-end gap-2">
              {isProcessing && (
                <div className="animate-pulse rounded-full bg-blue-600 px-3 py-1 text-[10px] font-black uppercase text-white shadow-lg">
                  Sending to Engine...
                </div>
              )}
              {currentValue !== null && (
                <div className="rounded-2xl bg-white/90 px-4 py-2 text-center shadow-xl backdrop-blur-md ring-1 ring-black/5">
                  <div className="text-[10px] font-black uppercase tracking-widest text-black/40">Reading</div>
                  <div className="text-2xl font-black tabular-nums text-black">
                    {currentValue.toFixed(2)}<span className="text-blue-600">x</span>
                  </div>
                </div>
              )}
            </div>

            {isCrashed && (
              <div className="absolute inset-0 flex items-center justify-center bg-red-600/40 backdrop-blur-sm transition-all">
                <div className="scale-110 rounded-full bg-white px-8 py-4 text-xl font-black text-red-600 shadow-2xl ring-4 ring-red-600">
                  ROUND CRASHED!
                </div>
              </div>
            )}
          </div>

          {/* Controls Panel */}
          <div className="rounded-3xl border border-black/10 bg-black/[0.02] p-5 space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-black uppercase tracking-widest text-black/40">Target Position</label>
                <span className="text-[10px] font-mono font-bold text-black/20">X: {crop.x}% Y: {crop.y}%</span>
              </div>
              <div className="grid grid-cols-1 gap-4">
                <div className="relative">
                  <input
                    type="range" min="0" max="90" value={crop.x}
                    onChange={(e) => setCrop(c => ({ ...c, x: parseInt(e.target.value) }))}
                    className="h-1.5 w-full cursor-pointer appearance-none rounded-lg bg-black/10 accent-black"
                  />
                  <div className="mt-1 flex justify-between text-[8px] font-bold text-black/20"><span>LEFT</span><span>RIGHT</span></div>
                </div>
                <div className="relative">
                  <input
                    type="range" min="0" max="90" value={crop.y}
                    onChange={(e) => setCrop(c => ({ ...c, y: parseInt(e.target.value) }))}
                    className="h-1.5 w-full cursor-pointer appearance-none rounded-lg bg-black/10 accent-black"
                  />
                  <div className="mt-1 flex justify-between text-[8px] font-bold text-black/20"><span>TOP</span><span>BOTTOM</span></div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-black uppercase tracking-widest text-black/40">Target Size</label>
                <span className="text-[10px] font-mono font-bold text-black/20">{crop.w}% × {crop.h}%</span>
              </div>
              <div className="grid grid-cols-1 gap-4">
                <div className="relative">
                  <input
                    type="range" min="5" max="50" value={crop.w}
                    onChange={(e) => setCrop(c => ({ ...c, w: parseInt(e.target.value) }))}
                    className="h-1.5 w-full cursor-pointer appearance-none rounded-lg bg-black/10 accent-black"
                  />
                  <div className="mt-1 flex justify-between text-[8px] font-bold text-black/20"><span>NARROW</span><span>WIDE</span></div>
                </div>
                <div className="relative">
                  <input
                    type="range" min="5" max="50" value={crop.h}
                    onChange={(e) => setCrop(c => ({ ...c, h: parseInt(e.target.value) }))}
                    className="h-1.5 w-full cursor-pointer appearance-none rounded-lg bg-black/10 accent-black"
                  />
                  <div className="mt-1 flex justify-between text-[8px] font-bold text-black/20"><span>SHORT</span><span>TALL</span></div>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl bg-blue-50/50 p-4 ring-1 ring-blue-100">
            <div className="flex items-start gap-3">
              <div className="rounded-full bg-blue-500 p-1 mt-0.5">
                <LuCamera className="h-3 w-3 text-white" />
              </div>
              <div className="space-y-1">
                <p className="text-xs font-bold text-blue-900">How to Setup:</p>
                <p className="text-[11px] leading-relaxed text-blue-700/80">
                  1. Share your browser tab or screen.<br />
                  2. Use sliders to move the <span className="font-bold text-green-600">Green Box</span> over the multiplier number on the site.<br />
                  3. When the box reads the number correctly (shown in white box), it is ready!
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Hidden canvas for OCR processing */}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  )
}