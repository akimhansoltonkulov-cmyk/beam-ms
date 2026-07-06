import { useEffect, useRef, useState } from 'react'
import { secs } from '../lib/format'

// Voice message with animated waveform (Functions.pdf §2: waveform visualization).
// When `src` is a real audio URL it plays actual audio; otherwise it falls back
// to a timed animation (used by demo seed messages).
export default function Waveform({
  data,
  duration,
  mine,
  src,
}: {
  data: number[]
  duration: number
  mine: boolean
  src?: string
}) {
  const [playing, setPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  const raf = useRef<number>()
  const start = useRef(0)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  // Fake-timer playback (no real audio source)
  useEffect(() => {
    if (src || !playing) return
    start.current = performance.now() - progress * duration * 1000
    const tick = (now: number) => {
      const p = Math.min((now - start.current) / (duration * 1000), 1)
      setProgress(p)
      if (p >= 1) {
        setPlaying(false)
        setProgress(0)
      } else raf.current = requestAnimationFrame(tick)
    }
    raf.current = requestAnimationFrame(tick)
    return () => {
      if (raf.current) cancelAnimationFrame(raf.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing])

  const toggle = () => {
    if (src) {
      const a = audioRef.current
      if (!a) return
      if (a.paused) a.play()
      else a.pause()
    } else {
      setPlaying((v) => !v)
    }
  }

  const bars = data.length ? data : Array.from({ length: 40 }, (_, i) => 0.3 + Math.abs(Math.sin(i)) * 0.5)
  const active = mine
  const remaining = duration * (1 - progress)

  return (
    <div className="mb-1 flex w-64 items-center gap-3 py-1">
      {src && (
        <audio
          ref={audioRef}
          src={src}
          preload="metadata"
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onEnded={() => {
            setPlaying(false)
            setProgress(0)
          }}
          onTimeUpdate={(e) => {
            const a = e.currentTarget
            const dur = a.duration && isFinite(a.duration) ? a.duration : duration
            if (dur) setProgress(Math.min(a.currentTime / dur, 1))
          }}
        />
      )}
      <button
        onClick={toggle}
        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${
          active ? 'bg-lime text-black' : 'bg-black text-lime'
        }`}
      >
        {playing ? (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <rect x="6" y="5" width="4" height="14" rx="1.5" />
            <rect x="14" y="5" width="4" height="14" rx="1.5" />
          </svg>
        ) : (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M7 5v14l12-7z" />
          </svg>
        )}
      </button>
      <div className="flex flex-1 items-center gap-[2px]">
        {bars.map((h, i) => {
          const on = i / bars.length <= progress
          return (
            <span
              key={i}
              className="w-[3px] rounded-full transition-colors"
              style={{
                height: `${8 + h * 22}px`,
                background: on
                  ? active
                    ? '#E1FF00'
                    : '#000'
                  : active
                    ? 'rgba(255,255,255,0.35)'
                    : 'rgba(0,0,0,0.2)',
              }}
            />
          )
        })}
      </div>
      <span className={`w-9 shrink-0 text-body-s ${active ? 'text-white/70' : 'text-grey-mid'}`}>
        {secs(playing ? remaining : duration)}
      </span>
    </div>
  )
}
