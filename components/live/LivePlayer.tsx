'use client'
import { useEffect, useRef } from 'react'

declare global { interface Window { Hls: any } }

export default function LivePlayer({ hlsUrl }: { hlsUrl: string }) {
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    const video = videoRef.current; if (!video) return
    if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = hlsUrl; return
    }
    const script = document.createElement('script')
    script.src = 'https://cdn.jsdelivr.net/npm/hls.js@latest'
    script.onload = () => {
      if (window.Hls?.isSupported()) {
        const hls = new window.Hls()
        hls.loadSource(hlsUrl); hls.attachMedia(video)
        return () => hls.destroy()
      }
    }
    document.head.appendChild(script)
    return () => { document.head.removeChild(script) }
  }, [hlsUrl])

  return (
    <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-black">
      <video ref={videoRef} controls autoPlay muted className="absolute inset-0 w-full h-full" playsInline />
    </div>
  )
}
