// ─────────────────────────────────────────────────────────────
// WebRTC audio/video calls — peer-to-peer media with Supabase
// Realtime broadcast as the signaling channel.
//
// Two kinds of signaling channels are used:
//   • personal  `call:<userId>`  — always-on, receives invite/accept/decline/cancel
//   • room       `rtc:<dmId>`     — opened per call, carries offer/answer/ice/hangup
//
// The personal channel lets a peer ring you even when no call is in
// progress; once both sides agree, they meet in the deterministic room
// channel (same id both peers derive from the DM) to negotiate media.
// ─────────────────────────────────────────────────────────────

import { supabase } from './supabase'

const RTC_CONFIG: RTCConfiguration = {
  iceServers: [
    { urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] },
    // STUN alone only works when both peers have a NAT that allows direct
    // hole-punching. Mobile/carrier-grade NAT and most corporate networks
    // block that, so a TURN relay is required — and when BOTH peers are on
    // a restrictive network (e.g. two phones on cellular data), both legs
    // have to go through the relay, so it must actually be reachable on
    // port 443 (the one port carriers essentially never block, since it
    // looks like ordinary HTTPS traffic).
    //
    // openrelay.metered.ca:443 stopped accepting connections (confirmed —
    // refuses the TCP handshake outright), which is exactly the port
    // mobile-to-mobile calls depend on; only its port 80 still answers.
    // global.relay.metered.ca (same provider, current hostname) answers on
    // both, so it's listed first.
    {
      urls: 'turn:global.relay.metered.ca:80',
      username: 'openrelayproject',
      credential: 'openrelayproject',
    },
    {
      urls: 'turn:global.relay.metered.ca:443',
      username: 'openrelayproject',
      credential: 'openrelayproject',
    },
    {
      urls: 'turn:global.relay.metered.ca:443?transport=tcp',
      username: 'openrelayproject',
      credential: 'openrelayproject',
    },
    {
      urls: 'turn:openrelay.metered.ca:80',
      username: 'openrelayproject',
      credential: 'openrelayproject',
    },
  ],
}

export type EndReason = 'remote-hangup' | 'declined' | 'cancelled' | 'failed' | 'local'

export interface CallHandlers {
  onIncoming: (from: string, fromName: string, video: boolean, dmId: string) => void
  onLocalStream: (stream: MediaStream) => void
  onRemoteStream: (stream: MediaStream) => void
  onConnected: () => void
  onEnded: (reason: EndReason) => void
}

type Signal =
  | { kind: 'invite'; from: string; fromName: string; video: boolean; dmId: string }
  | { kind: 'cancel'; from: string }
  | { kind: 'accept'; from: string }
  | { kind: 'decline'; from: string }
  | { kind: 'offer'; from: string; sdp: RTCSessionDescriptionInit }
  | { kind: 'answer'; from: string; sdp: RTCSessionDescriptionInit }
  | { kind: 'ice'; from: string; candidate: RTCIceCandidateInit }
  | { kind: 'hangup'; from: string }
  | { kind: 'ready'; from: string }

let meId: string | null = null
let handlers: CallHandlers | null = null

let personalChannel: any = null
let roomChannel: any = null
let roomReady = false
let pendingSends: Signal[] = []

let pc: RTCPeerConnection | null = null
let localStream: MediaStream | null = null
let remoteStream: MediaStream | null = null

let peerId: string | null = null
let currentDmId: string | null = null
let isCaller = false
let wantVideo = false
let active = false

// ── signaling helpers ───────────────────────────────────────────

// Fire-and-forget broadcast to another user's personal channel.
function signalPersonal(toId: string, payload: Signal) {
  if (!supabase.channel) return
  const ch = supabase.channel(`call:${toId}`)
  ch.subscribe((status: string) => {
    if (status === 'SUBSCRIBED') {
      ch.send({ type: 'broadcast', event: 'sig', payload }).finally(() => {
        setTimeout(() => {
          try {
            supabase.removeChannel(ch)
          } catch {
            /* noop */
          }
        }, 600)
      })
    }
  })
}

function openRoom(dmId: string) {
  closeRoom()
  roomReady = false
  pendingSends = []
  roomChannel = supabase.channel(`rtc:${dmId}`)
  roomChannel
    .on('broadcast', { event: 'sig' }, ({ payload }: { payload: Signal }) => handleRoomSignal(payload))
    .subscribe((status: string) => {
      if (status === 'SUBSCRIBED') {
        roomReady = true
        const queued = pendingSends
        pendingSends = []
        queued.forEach((p) => roomSend(p))
        // Broadcasts aren't buffered for late subscribers — announce that
        // we're listening so the other side knows it's safe to send the
        // offer (and re-announce if they beat us here and already sent one).
        roomSend({ kind: 'ready', from: meId! })
      }
    })
}

function closeRoom() {
  if (roomChannel) {
    try {
      supabase.removeChannel(roomChannel)
    } catch {
      /* noop */
    }
    roomChannel = null
  }
  roomReady = false
  pendingSends = []
}

function roomSend(payload: Signal) {
  if (roomReady && roomChannel) roomChannel.send({ type: 'broadcast', event: 'sig', payload })
  else pendingSends.push(payload)
}

// ── media + peer connection ─────────────────────────────────────

async function getMedia(video: boolean): Promise<MediaStream> {
  localStream = await navigator.mediaDevices.getUserMedia({ audio: true, video })
  handlers?.onLocalStream(localStream)
  return localStream
}

function createPeer() {
  pc = new RTCPeerConnection(RTC_CONFIG)
  remoteStream = new MediaStream()

  pc.ontrack = (e) => {
    e.streams[0]?.getTracks().forEach((t) => remoteStream!.addTrack(t))
    handlers?.onRemoteStream(remoteStream!)
  }
  pc.onicecandidate = (e) => {
    if (e.candidate) roomSend({ kind: 'ice', from: meId!, candidate: e.candidate.toJSON() })
  }
  pc.onconnectionstatechange = () => {
    const st = pc?.connectionState
    if (st === 'connected') handlers?.onConnected()
    else if (st === 'failed' || st === 'closed') endCall('failed')
  }
  // `connectionState` is the modern aggregate signal, but it fires late or
  // not at all on some mobile browsers/WebViews — `iceConnectionState` is
  // older but far more consistently reported, so treat either as proof of
  // a working connection.
  pc.oniceconnectionstatechange = () => {
    const st = pc?.iceConnectionState
    if (st === 'connected' || st === 'completed') handlers?.onConnected()
    else if (st === 'failed') endCall('failed')
  }

  localStream?.getTracks().forEach((t) => pc!.addTrack(t, localStream!))
}

async function makeOffer() {
  if (!pc) return
  const offer = await pc.createOffer()
  await pc.setLocalDescription(offer)
  roomSend({ kind: 'offer', from: meId!, sdp: offer })
}

// ── inbound signal routing ──────────────────────────────────────

function handlePersonalSignal(sig: Signal) {
  switch (sig.kind) {
    case 'invite':
      // Reject a second incoming call while already busy.
      if (active) {
        signalPersonal(sig.from, { kind: 'decline', from: meId! })
        return
      }
      active = true
      isCaller = false
      peerId = sig.from
      currentDmId = sig.dmId
      wantVideo = sig.video
      handlers?.onIncoming(sig.from, sig.fromName, sig.video, sig.dmId)
      break
    case 'cancel':
      if (sig.from === peerId) cleanup('cancelled')
      break
    case 'accept':
      if (sig.from === peerId && isCaller) beginCallerNegotiation()
      break
    case 'decline':
      if (sig.from === peerId) cleanup('declined')
      break
  }
}

async function beginCallerNegotiation() {
  if (!currentDmId) return
  openRoom(currentDmId)
  createPeer()
  // Offer is sent once the callee's 'ready' signal confirms their room
  // channel is actually subscribed — see the 'ready' case below.
}

async function handleRoomSignal(sig: Signal) {
  if (sig.from === meId) return
  if (!pc && sig.kind !== 'offer') return
  switch (sig.kind) {
    case 'offer': {
      if (!pc) createPeer()
      await pc!.setRemoteDescription(new RTCSessionDescription(sig.sdp))
      const answer = await pc!.createAnswer()
      await pc!.setLocalDescription(answer)
      roomSend({ kind: 'answer', from: meId!, sdp: answer })
      break
    }
    case 'answer':
      if (pc && !pc.currentRemoteDescription) {
        await pc.setRemoteDescription(new RTCSessionDescription(sig.sdp))
      }
      break
    case 'ice':
      try {
        await pc?.addIceCandidate(new RTCIceCandidate(sig.candidate))
      } catch {
        /* candidate may arrive before remote description — safe to ignore */
      }
      break
    case 'hangup':
      cleanup('remote-hangup')
      break
    case 'ready':
      // Broadcasts only reach clients already joined at send time, so
      // whoever subscribes to the room first can miss the other side's
      // initial 'ready'. The callee is guaranteed to receive the caller's
      // 'ready' (it always subscribes first) and echoes it back, which the
      // caller — already subscribed by then — is guaranteed to receive.
      if (isCaller) {
        if (pc && !pc.localDescription) await makeOffer()
      } else {
        roomSend({ kind: 'ready', from: meId! })
      }
      break
  }
}

// ── public API ──────────────────────────────────────────────────

// Register the always-on personal channel. Call once after login.
export function initCallSignaling(userId: string, h: CallHandlers) {
  meId = userId
  handlers = h
  if (personalChannel) {
    try {
      supabase.removeChannel(personalChannel)
    } catch {
      /* noop */
    }
  }
  if (!supabase.channel) return
  personalChannel = supabase.channel(`call:${userId}`)
  personalChannel
    .on('broadcast', { event: 'sig' }, ({ payload }: { payload: Signal }) => handlePersonalSignal(payload))
    .subscribe()
}

export function teardownCallSignaling() {
  cleanup('local')
  if (personalChannel) {
    try {
      supabase.removeChannel(personalChannel)
    } catch {
      /* noop */
    }
    personalChannel = null
  }
  meId = null
  handlers = null
}

// Caller side — ring the peer and capture local media while ringing.
export async function startCall(toId: string, toName: string, video: boolean, dmId: string) {
  active = true
  isCaller = true
  peerId = toId
  currentDmId = dmId
  wantVideo = video
  await getMedia(video)
  signalPersonal(toId, { kind: 'invite', from: meId!, fromName: toName, video, dmId })
}

// Callee side — accept the ringing invite and prepare for the offer.
export async function acceptCall() {
  if (!peerId || !currentDmId) return
  await getMedia(wantVideo)
  createPeer()
  openRoom(currentDmId)
  signalPersonal(peerId, { kind: 'accept', from: meId! })
}

export function declineCall() {
  if (peerId) signalPersonal(peerId, { kind: 'decline', from: meId! })
  cleanup('local')
}

// Hang up an active/ringing call and notify the peer.
export function endCall(reason: EndReason = 'local') {
  if (peerId) {
    if (isCaller && active && !pc) signalPersonal(peerId, { kind: 'cancel', from: meId! })
    else roomSend({ kind: 'hangup', from: meId! })
    signalPersonal(peerId, { kind: 'cancel', from: meId! })
  }
  cleanup(reason)
}

export function toggleMute(): boolean {
  const track = localStream?.getAudioTracks()[0]
  if (!track) return false
  track.enabled = !track.enabled
  return !track.enabled // muted = !enabled
}

export function toggleCamera(): boolean {
  const track = localStream?.getVideoTracks()[0]
  if (!track) return false
  track.enabled = !track.enabled
  return !track.enabled // cameraOff = !enabled
}

function cleanup(reason: EndReason) {
  const wasActive = active
  active = false
  try {
    pc?.getSenders().forEach((s) => s.track?.stop())
    pc?.close()
  } catch {
    /* noop */
  }
  pc = null
  localStream?.getTracks().forEach((t) => t.stop())
  localStream = null
  remoteStream = null
  closeRoom()
  peerId = null
  currentDmId = null
  isCaller = false
  if (wasActive) handlers?.onEnded(reason)
}
