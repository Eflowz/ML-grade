import { useCallback, useEffect, useRef, useState } from 'react'
import Tesseract from 'tesseract.js'
import toast from 'react-hot-toast'
import { LuCamera, LuCircle, LuPlay, LuScan } from 'react-icons/lu'

interface LiveCaptureProps {
  onDetected: (multiplier: number) => Promise<void>
}

const OCR_INTERVAL_MS = 350
const RED_PIXEL_THRESHOLD = 0.04
const RED_CONFIRM_FRAMES = 2
const DISAPPEAR_FRAMES = 5
const MIN_CRASH_VALUE = 1.05
const CANVAS_SCALE = 2

type SensorStatus = 'idle' | 'tracking' | 'red' | 'missing'

function getErrorMessage(error: unknown): string {
  if (
    typeof error === 'object' &&
    error !== null &&
    'response' in error
  ) {
    const response = (error as { response?: { data?: { error?: string }; status?: number } }).response
    return response?.data?.error ?? `Request failed${response?.status ? ` (${response.status})` : ''}`
  }

  return error instanceof Error ? error.message : 'Unknown error'
}

function parseOcrMultiplier(text: string): number | null {
  const normalized = text
    .replace(/[Oo]/g, '0')
    .replace(/[Il|]/g, '1')
    .replace(/[,;:]/g, '.')
    .replace(/[\u00d7xX]/g, ' ')
    .trim()

  const spacedDecimal = normalized.match(/(\d{1,3})\s+(\d{1,2})(?!\d)/)
  const decimal = normalized.match(/(\d{1,4})\s*\.\s*(\d{1,2})/)
  const digitsOnly = normalized.replace(/[^\d]/g, '')

  let value: number | null = null

  if (spacedDecimal) {
    value = Number(`${spacedDecimal[1]}.${spacedDecimal[2]}`)
  } else if (decimal) {
    value = Number(`${decimal[1]}.${decimal[2]}`)
  } else if (digitsOnly.length >= 3 && digitsOnly.length <= 6) {
    value = Number(`${digitsOnly.slice(0, -2)}.${digitsOnly.slice(-2)}`)
  } else if (digitsOnly.length > 0 && digitsOnly.length <= 2) {
    value = Number(digitsOnly)
  }

  if (value === null || Number.isNaN(value) || value < 1 || value > 10000) {
    return null
  }

  return value
}

export default function LiveCapture({ onDetected }: LiveCaptureProps) {
  const [isCapturing, setIsCapturing] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [currentValue, setCurrentValue] = useState<number | null>(null)
  const [isCrashed, setIsCrashed] = useState(false)
  const [lastSubmittedValue, setLastSubmittedValue] = useState<number | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [sensorStatus, setSensorStatus] = useState<SensorStatus>('idle')
  const [crop, setCrop] = useState({ x: 40, y: 40, w: 20, h: 20 })

  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const workerRef = useRef<Tesseract.Worker | null>(null)
  const requestRef = useRef<number | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const processFrameRef = useRef<() => void>(() => undefined)

  const isCapturingRef = useRef(false)
  const isOcrBusy = useRef(false)
  const isCrashingRef = useRef(false)
  const lastProcessedTime = useRef(0)
  const lastValueRef = useRef<number | null>(null)
  const cropRef = useRef(crop)
  const onDetectedRef = useRef(onDetected)
  const redFrameCount = useRef(0)
  const missingFrameCount = useRef(0)

  useEffect(() => {
    onDetectedRef.current = onDetected
  }, [onDetected])

  useEffect(() => {
    cropRef.current = crop
  }, [crop])

  useEffect(() => {
    if (isCapturing && streamRef.current && videoRef.current) {
      videoRef.current.srcObject = streamRef.current
      void videoRef.current.play().catch(() => undefined)
    }
  }, [isCapturing])

  const scheduleNextFrame = useCallback(() => {
    if (!isCapturingRef.current) return
    requestRef.current = requestAnimationFrame(() => processFrameRef.current())
  }, [])

  const initWorker = useCallback(async () => {
    if (workerRef.current) return

    const worker = await Tesseract.createWorker('eng')
    await worker.setParameters({
      tessedit_char_whitelist: '0123456789.,xX',
      tessedit_pageseg_mode: Tesseract.PSM.SINGLE_LINE,
    })
    workerRef.current = worker
  }, [])

  const updateCrop = (patch: Partial<typeof crop>) => {
    setCrop((current) => {
      const next = { ...current, ...patch }
      next.w = Math.max(5, Math.min(50, next.w))
      next.h = Math.max(5, Math.min(50, next.h))
      next.x = Math.max(0, Math.min(100 - next.w, next.x))
      next.y = Math.max(0, Math.min(100 - next.h, next.y))
      return next
    })
  }

  const checkRedPixels = (
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
  ): boolean => {
    const pixels = ctx.getImageData(0, 0, width, height).data
    let redCount = 0
    const totalPixels = pixels.length / 4

    for (let i = 0; i < pixels.length; i += 4) {
      const r = pixels[i]
      const g = pixels[i + 1]
      const b = pixels[i + 2]

      if (r > 135 && r > g * 1.35 && r > b * 1.35) {
        redCount++
      }
    }

    return redCount / totalPixels >= RED_PIXEL_THRESHOLD
  }

  const resetSensors = () => {
    redFrameCount.current = 0
    missingFrameCount.current = 0
    lastValueRef.current = null
  }

  const triggerCrash = useCallback(async (value: number, reason: string): Promise<boolean> => {
    if (isCrashingRef.current) return false

    const roundedValue = Number(value.toFixed(2))
    if (roundedValue < MIN_CRASH_VALUE) {
      resetSensors()
      return false
    }

    isCrashingRef.current = true
    resetSensors()

    setIsCrashed(true)
    setIsProcessing(true)
    setSubmitError(null)
    setSensorStatus('idle')

    try {
      await onDetectedRef.current(roundedValue)
      setLastSubmittedValue(roundedValue)
      console.log(`[Scanner] submitted ${roundedValue}x via ${reason}`)
    } catch (error) {
      const message = getErrorMessage(error)
      setSubmitError(message)
      toast.error(`Auto add failed: ${message}`)
      console.error('[Scanner] add failed:', error)
    } finally {
      setIsProcessing(false)
    }

    window.setTimeout(() => {
      setIsCrashed(false)
      isCrashingRef.current = false
      setSensorStatus('tracking')
      scheduleNextFrame()
    }, 2500)

    return true
  }, [scheduleNextFrame])

  const processFrame = useCallback(async () => {
    if (!isCapturingRef.current || isCrashingRef.current) return

    if (
      !videoRef.current ||
      !canvasRef.current ||
      !workerRef.current ||
      isOcrBusy.current
    ) {
      scheduleNextFrame()
      return
    }

    const now = Date.now()
    if (now - lastProcessedTime.current < OCR_INTERVAL_MS) {
      scheduleNextFrame()
      return
    }
    lastProcessedTime.current = now

    const video = videoRef.current
    if (video.readyState < 2 || video.videoWidth === 0 || video.videoHeight === 0) {
      scheduleNextFrame()
      return
    }

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d', { alpha: false })
    if (!ctx) {
      scheduleNextFrame()
      return
    }

    const { x, y, w, h } = cropRef.current
    const sourceX = Math.round((x / 100) * video.videoWidth)
    const sourceY = Math.round((y / 100) * video.videoHeight)
    const sourceW = Math.max(1, Math.round(Math.min((w / 100) * video.videoWidth, video.videoWidth - sourceX)))
    const sourceH = Math.max(1, Math.round(Math.min((h / 100) * video.videoHeight, video.videoHeight - sourceY)))
    const targetW = sourceW * CANVAS_SCALE
    const targetH = sourceH * CANVAS_SCALE

    canvas.width = targetW
    canvas.height = targetH
    ctx.imageSmoothingEnabled = false

    try {
      ctx.drawImage(video, sourceX, sourceY, sourceW, sourceH, 0, 0, targetW, targetH)
    } catch (error) {
      console.warn('[Scanner] frame draw failed:', error)
      scheduleNextFrame()
      return
    }

    const isRed = checkRedPixels(ctx, targetW, targetH)
    redFrameCount.current = isRed ? redFrameCount.current + 1 : 0

    if (isRed) {
      setSensorStatus('red')
    }

    try {
      isOcrBusy.current = true
      const { data: { text } } = await workerRef.current.recognize(canvas)
      const value = parseOcrMultiplier(text)

      if (value !== null) {
        const previousValue = lastValueRef.current
        missingFrameCount.current = 0
        setCurrentValue(value)
        setSensorStatus(isRed ? 'red' : 'tracking')

        if (isRed && redFrameCount.current >= RED_CONFIRM_FRAMES && value > MIN_CRASH_VALUE) {
          if (await triggerCrash(value, 'RED_COLOR')) return
        }

        if (previousValue !== null && previousValue > MIN_CRASH_VALUE && value <= 1.02) {
          if (await triggerCrash(previousValue, 'NUMBER_DROP')) return
        }

        lastValueRef.current = value
      } else {
        if (isRed && redFrameCount.current >= RED_CONFIRM_FRAMES && lastValueRef.current !== null) {
          if (await triggerCrash(lastValueRef.current, 'RED_COLOR')) return
        }

        missingFrameCount.current++
        setSensorStatus('missing')

        if (missingFrameCount.current >= DISAPPEAR_FRAMES && lastValueRef.current !== null) {
          if (await triggerCrash(lastValueRef.current, 'DISAPPEARANCE')) return
        }
      }
    } catch (error) {
      console.warn('[Scanner] OCR failed:', error)
      missingFrameCount.current++
    } finally {
      isOcrBusy.current = false
    }

    scheduleNextFrame()
  }, [scheduleNextFrame, triggerCrash])

  useEffect(() => {
    processFrameRef.current = () => {
      void processFrame()
    }
  }, [processFrame])

  const stopCapture = useCallback(() => {
    isCapturingRef.current = false
    isCrashingRef.current = false

    if (requestRef.current) {
      cancelAnimationFrame(requestRef.current)
      requestRef.current = null
    }

    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null

    if (videoRef.current) {
      videoRef.current.srcObject = null
    }

    resetSensors()
    lastProcessedTime.current = 0

    setIsCapturing(false)
    setIsProcessing(false)
    setCurrentValue(null)
    setIsCrashed(false)
    setLastSubmittedValue(null)
    setSubmitError(null)
    setSensorStatus('idle')
  }, [])

  const startCapture = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getDisplayMedia({
        video: { displaySurface: 'window' },
        audio: false,
      })

      streamRef.current = mediaStream
      await initWorker()

      resetSensors()
      lastProcessedTime.current = 0
      isCrashingRef.current = false
      isCapturingRef.current = true

      setCurrentValue(null)
      setLastSubmittedValue(null)
      setSubmitError(null)
      setIsCapturing(true)
      setSensorStatus('tracking')

      mediaStream.getTracks().forEach((track) => {
        track.onended = () => stopCapture()
      })

      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current)
      }
      scheduleNextFrame()

      toast.success('Scanner started. Align the green box over the multiplier.')
    } catch (error) {
      console.error(error)
      toast.error('Failed to start screen capture')
    }
  }

  useEffect(() => () => stopCapture(), [stopCapture])

  const sensorBadge = {
    idle: null,
    tracking: { label: 'Tracking', cls: 'bg-green-500' },
    red: { label: 'Red detected', cls: 'bg-red-500 animate-pulse' },
    missing: { label: 'Signal lost', cls: 'bg-yellow-500 animate-pulse' },
  }[sensorStatus]

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`h-3 w-3 rounded-full transition-colors ${
            isCapturing
              ? 'animate-pulse bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]'
              : 'bg-black/20'
          }`} />
          <h3 className="text-base font-bold text-black/90">Automation Scanner</h3>
          {sensorBadge && (
            <span className={`rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-white ${sensorBadge.cls}`}>
              {sensorBadge.label}
            </span>
          )}
        </div>

        <button
          onClick={isCapturing ? stopCapture : startCapture}
          className={`flex items-center gap-2 rounded-2xl px-5 py-2.5 text-sm font-bold transition-all ${
            isCapturing
              ? 'bg-red-500 text-white shadow-lg shadow-red-100 hover:bg-red-600'
              : 'bg-black text-white hover:bg-black/80 shadow-lg shadow-black/10'
          }`}
        >
          {isCapturing
            ? <><LuCircle className="h-4 w-4" /> Stop Scanner</>
            : <><LuPlay className="h-4 w-4" /> Start Scanner</>}
        </button>
      </div>

      {!isCapturing && (
        <div className="rounded-3xl border-2 border-dashed border-black/5 bg-black/[0.01] py-12 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-black/5">
            <LuScan className="h-6 w-6 text-black/20" />
          </div>
          <p className="text-sm font-medium text-black/40">Click Start to open the scanner</p>
        </div>
      )}

      {isCapturing && (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-4">
          <div className="relative aspect-video overflow-hidden rounded-3xl border-2 border-black bg-black shadow-2xl">
            <video
              ref={videoRef}
              autoPlay
              muted
              playsInline
              className="h-full w-full object-contain opacity-60"
            />

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
                OCR target area
              </div>
            </div>

            <div className="absolute bottom-4 right-4 flex max-w-[70%] flex-col items-end gap-2">
              {isProcessing && (
                <div className="animate-pulse rounded-full bg-blue-600 px-3 py-1 text-[10px] font-black uppercase text-white shadow-lg">
                  Sending to engine...
                </div>
              )}

              {submitError && (
                <div className="rounded-xl bg-red-600 px-3 py-2 text-right text-[10px] font-bold text-white shadow-lg">
                  Add failed: {submitError}
                </div>
              )}

              {lastSubmittedValue !== null && !submitError && !isProcessing && (
                <div className="rounded-full bg-green-600 px-3 py-1 text-[10px] font-black uppercase text-white shadow-lg">
                  Added {lastSubmittedValue.toFixed(2)}x
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

            <div className="absolute bottom-4 left-4 flex flex-col gap-1">
              {[
                { label: 'Color sensor', active: sensorStatus === 'red' },
                { label: 'OCR sensor', active: sensorStatus === 'tracking' },
                { label: 'Missing sensor', active: sensorStatus === 'missing' },
              ].map((item) => (
                <div
                  key={item.label}
                  className={`rounded px-2 py-0.5 text-[9px] font-black uppercase tracking-wider transition-all ${
                    item.active ? 'bg-white text-black' : 'bg-black/30 text-white/30'
                  }`}
                >
                  {item.label}
                </div>
              ))}
            </div>

            {isCrashed && (
              <div className="absolute inset-0 flex items-center justify-center bg-red-600/40 backdrop-blur-sm">
                <div className="scale-110 rounded-full bg-white px-8 py-4 text-xl font-black text-red-600 shadow-2xl ring-4 ring-red-600">
                  Round crashed
                </div>
              </div>
            )}
          </div>

          <div className="rounded-3xl border border-black/10 bg-black/[0.02] p-5 space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-black uppercase tracking-widest text-black/40">Target position</label>
                <span className="text-[10px] font-mono font-bold text-black/20">X: {crop.x}% Y: {crop.y}%</span>
              </div>

              <div className="grid grid-cols-1 gap-4">
                <div>
                  <input
                    type="range"
                    min="0"
                    max={100 - crop.w}
                    value={crop.x}
                    onChange={(event) => updateCrop({ x: Number(event.target.value) })}
                    className="h-1.5 w-full cursor-pointer appearance-none rounded-lg bg-black/10 accent-black"
                  />
                  <div className="mt-1 flex justify-between text-[8px] font-bold text-black/20"><span>LEFT</span><span>RIGHT</span></div>
                </div>

                <div>
                  <input
                    type="range"
                    min="0"
                    max={100 - crop.h}
                    value={crop.y}
                    onChange={(event) => updateCrop({ y: Number(event.target.value) })}
                    className="h-1.5 w-full cursor-pointer appearance-none rounded-lg bg-black/10 accent-black"
                  />
                  <div className="mt-1 flex justify-between text-[8px] font-bold text-black/20"><span>TOP</span><span>BOTTOM</span></div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-black uppercase tracking-widest text-black/40">Target size</label>
                <span className="text-[10px] font-mono font-bold text-black/20">{crop.w}% x {crop.h}%</span>
              </div>

              <div className="grid grid-cols-1 gap-4">
                <div>
                  <input
                    type="range"
                    min="5"
                    max="50"
                    value={crop.w}
                    onChange={(event) => updateCrop({ w: Number(event.target.value) })}
                    className="h-1.5 w-full cursor-pointer appearance-none rounded-lg bg-black/10 accent-black"
                  />
                  <div className="mt-1 flex justify-between text-[8px] font-bold text-black/20"><span>NARROW</span><span>WIDE</span></div>
                </div>

                <div>
                  <input
                    type="range"
                    min="5"
                    max="50"
                    value={crop.h}
                    onChange={(event) => updateCrop({ h: Number(event.target.value) })}
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
                <p className="text-xs font-bold text-blue-900">Triple-lock detection active</p>
                <p className="text-[11px] leading-relaxed text-blue-700/80">
                  <span className="font-bold">Color:</span> reads the red crash frame and submits that value.<br />
                  <span className="font-bold">Number drop:</span> submits the previous value when the next round starts near 1.00x.<br />
                  <span className="font-bold">Missing:</span> submits the last known value if the number disappears for {DISAPPEAR_FRAMES} frames.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      <canvas ref={canvasRef} className="hidden" />
    </div>
  )
}
