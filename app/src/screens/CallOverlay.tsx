import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { useStore } from '../store'
import { Avatar } from '../components/ui'
import {
  IconMic,
  IconMicOff,
  IconPhone,
  IconPhoneOff,
  IconVideo,
  IconVideoOff,
} from '../components/Icons'
import { useTranslation } from '../lib/i18n'

// Full-screen call surface — incoming / outgoing / active, audio or video.
export default function CallOverlay() {
  const call = useStore((s) => s.call)
  const acceptCall = useStore((s) => s.acceptCall)
  const declineCall = useStore((s) => s.declineCall)
  const hangUp = useStore((s) => s.hangUp)
  const toggleMute = useStore((s) => s.toggleCallMute)
  const toggleCamera = useStore((s) => s.toggleCallCamera)
  const { lang } = useTranslation()

  const localRef = useRef<HTMLVideoElement>(null)
  const remoteRef = useRef<HTMLVideoElement>(null)
  const [elapsed, setElapsed] = useState(0)
  const [audioBlocked, setAudioBlocked] = useState(false)

  // Attach streams to their <video> elements whenever they change.
  useEffect(() => {
    if (localRef.current && call?.localStream) localRef.current.srcObject = call.localStream
  }, [call?.localStream])
  useEffect(() => {
    const el = remoteRef.current
    if (!el || !call?.remoteStream) return
    el.srcObject = call.remoteStream
    // Some mobile browsers (Safari especially) won't actually start
    // playback from a srcObject assigned outside a direct tap handler,
    // even with the autoplay attribute — silently, with no error anywhere
    // else. Kick it explicitly and surface a tap-to-unmute affordance if
    // the browser refuses.
    el.play().then(() => setAudioBlocked(false)).catch(() => setAudioBlocked(true))
  }, [call?.remoteStream])

  // Call timer once connected.
  useEffect(() => {
    if (call?.status !== 'active' || !call.startedAt) return
    const started = call.startedAt
    const id = setInterval(() => setElapsed(Math.floor((Date.now() - started) / 1000)), 1000)
    return () => clearInterval(id)
  }, [call?.status, call?.startedAt])

  if (!call) return null

  const ru = lang === 'ru'
  const showRemoteVideo = call.status === 'active' && call.video && !!call.remoteStream

  const statusLabel =
    call.status === 'incoming'
      ? call.video
        ? ru ? 'Входящий видеозвонок' : 'Incoming video call'
        : ru ? 'Входящий звонок' : 'Incoming call'
      : call.status === 'outgoing'
        ? ru ? 'Вызываем…' : 'Ringing…'
        : call.status === 'connecting'
          ? ru ? 'Соединение…' : 'Connecting…'
          : fmt(elapsed)

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 z-50 flex flex-col items-center justify-between overflow-hidden bg-black text-white sm:rounded-[40px]"
    >
      {/* Remote media — always mounted so audio plays on voice calls too;
          only shown full-screen once there's actual video to display. */}
      <video
        ref={remoteRef}
        autoPlay
        playsInline
        className={showRemoteVideo ? 'absolute inset-0 h-full w-full object-cover' : 'hidden'}
      />
      {!showRemoteVideo && <div className="halftone pointer-events-none absolute inset-0 opacity-[0.08]" />}

      {/* Local self-view (video calls only) */}
      {call.video && (
        <video
          ref={localRef}
          autoPlay
          playsInline
          muted
          className="absolute right-4 top-6 z-10 h-40 w-28 rounded-2xl border border-white/20 object-cover shadow-card"
          style={{ transform: 'scaleX(-1)', display: call.cameraOff ? 'none' : undefined }}
        />
      )}

      {/* Peer identity + status */}
      <div className="relative z-10 mt-16 flex flex-col items-center gap-4 px-6 text-center">
        {!showRemoteVideo && <Avatar name={call.peerName} color={call.peerColor} size={120} />}
        <div>
          <h2 className="text-2xl font-bold">{call.peerName}</h2>
          <p className="mt-1 text-body-s text-white/70">{statusLabel}</p>
        </div>
        {audioBlocked && call.status === 'active' && (
          <button
            onClick={() => remoteRef.current?.play().then(() => setAudioBlocked(false)).catch(() => {})}
            className="rounded-pill bg-lime px-4 py-2 text-body-s font-bold text-black"
          >
            {ru ? '🔊 Включить звук' : '🔊 Tap to enable audio'}
          </button>
        )}
      </div>

      {/* Controls */}
      <div className="relative z-10 mb-14 flex items-center gap-5">
        {call.status === 'incoming' ? (
          <>
            <CallBtn color="#FF3B30" onClick={declineCall} label={ru ? 'Отклонить' : 'Decline'}>
              <IconPhoneOff size={26} />
            </CallBtn>
            <CallBtn color="#22C55E" onClick={acceptCall} label={ru ? 'Ответить' : 'Answer'}>
              {call.video ? <IconVideo size={26} /> : <IconPhone size={26} />}
            </CallBtn>
          </>
        ) : (
          <>
            <CallBtn
              color={call.muted ? '#FF5A1A' : 'rgba(255,255,255,0.15)'}
              dark={call.muted}
              onClick={toggleMute}
              label={call.muted ? (ru ? 'Вкл. микрофон' : 'Unmute') : (ru ? 'Выкл. микрофон' : 'Mute')}
            >
              {call.muted ? <IconMicOff size={24} /> : <IconMic size={24} />}
            </CallBtn>

            {call.video && (
              <CallBtn
                color={call.cameraOff ? '#FF5A1A' : 'rgba(255,255,255,0.15)'}
                dark={call.cameraOff}
                onClick={toggleCamera}
                label={call.cameraOff ? (ru ? 'Вкл. камеру' : 'Camera on') : (ru ? 'Выкл. камеру' : 'Camera off')}
              >
                {call.cameraOff ? <IconVideoOff size={24} /> : <IconVideo size={24} />}
              </CallBtn>
            )}

            <CallBtn color="#FF3B30" onClick={hangUp} label={ru ? 'Завершить' : 'End'}>
              <IconPhoneOff size={26} />
            </CallBtn>
          </>
        )}
      </div>
    </motion.div>
  )
}

function CallBtn({
  children,
  color,
  onClick,
  label,
  dark,
}: {
  children: React.ReactNode
  color: string
  onClick: () => void
  label: string
  dark?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      className="flex h-16 w-16 items-center justify-center rounded-full transition-transform active:scale-90"
      style={{ background: color, color: dark ? '#000' : '#fff' }}
    >
      {children}
    </button>
  )
}

function fmt(s: number): string {
  const m = Math.floor(s / 60)
  const sec = s % 60
  return `${m}:${sec.toString().padStart(2, '0')}`
}
