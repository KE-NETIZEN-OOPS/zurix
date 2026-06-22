'use client'
import { useEffect, useRef, useState } from 'react'
import { FILTER_CSS, FILTER_NAMES } from './filters'

export default function CameraCapture({ onCapture, onClose }: { onCapture: (file: File) => void; onClose: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [filter, setFilter] = useState('none')
  const [error, setError] = useState(false)
  const [facing, setFacing] = useState<'user' | 'environment'>('user')

  useEffect(() => {
    let stream: MediaStream | null = null
    navigator.mediaDevices.getUserMedia({ video: { facingMode: facing }, audio: false })
      .then(s => { stream = s; if (videoRef.current) videoRef.current.srcObject = s })
      .catch(() => setError(true))
    return () => { stream?.getTracks().forEach(t => t.stop()) }
  }, [facing])

  function capture() {
    const v = videoRef.current
    if (!v || !v.videoWidth) return
    const canvas = document.createElement('canvas')
    canvas.width = v.videoWidth
    canvas.height = v.videoHeight
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.filter = FILTER_CSS[filter]
    ctx.drawImage(v, 0, 0)
    canvas.toBlob(b => {
      if (b) onCapture(new File([b], `camera-${Date.now()}.jpg`, { type: 'image/jpeg' }))
    }, 'image/jpeg', 0.9)
  }

  return (
    <div className="fixed inset-0 bg-black z-[70] flex flex-col">
      <div className="flex items-center justify-between p-3 text-white">
        <button onClick={onClose}>✕</button>
        <span className="text-sm font-semibold">Camera</span>
        <button onClick={() => setFacing(f => f === 'user' ? 'environment' : 'user')}>🔄</button>
      </div>
      <div className="flex-1 flex items-center justify-center overflow-hidden">
        {error ? (
          <p className="text-white text-center px-6 text-sm">Camera unavailable. Grant camera permission or use file upload instead.</p>
        ) : (
          <video ref={videoRef} autoPlay playsInline muted className="max-h-full w-auto" style={{ filter: FILTER_CSS[filter], transform: facing === 'user' ? 'scaleX(-1)' : 'none' }} />
        )}
      </div>
      <div className="flex gap-2 overflow-x-auto px-3 py-2 scrollbar-hide">
        {FILTER_NAMES.map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`text-xs px-3 py-1.5 rounded-full whitespace-nowrap capitalize ${filter === f ? 'bg-amber-500 text-black font-bold' : 'bg-zinc-800 text-zinc-300'}`}>{f}</button>
        ))}
      </div>
      <div className="flex justify-center py-4">
        <button onClick={capture} disabled={error} className="w-16 h-16 rounded-full bg-white border-4 border-zinc-400 disabled:opacity-40" aria-label="Capture" />
      </div>
    </div>
  )
}
