'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Video, VideoOff, Maximize, Minimize, Loader2 } from 'lucide-react';

interface VideoPlayerProps {
  cameraId: string;
  cameraName: string;
  streamUrl?: string;
}

type ConnectionState = 'connecting' | 'connected' | 'offline';

const BASE_URL =
  process.env.NEXT_PUBLIC_STREAM_URL || 'http://localhost:1984';

const MAX_RECONNECT_ATTEMPTS = 8;
const BASE_RECONNECT_DELAY = 1000; // 1s

export default function VideoPlayer({
  cameraId,
  cameraName,
  streamUrl,
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const attemptRef = useRef(0);

  const [connectionState, setConnectionState] =
    useState<ConnectionState>('connecting');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // ── Cleanup ──────────────────────────────────────────────────────────
  const cleanup = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }
  }, []);

  // ── HLS Fallback ─────────────────────────────────────────────────────
  const tryHls = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    const url = streamUrl || `${BASE_URL}/stream/${cameraId}.m3u8`;
    video.src = url;
    video.play().catch(() => {
      setConnectionState('offline');
    });
  }, [cameraId, streamUrl]);

  // ── WebRTC Connect ───────────────────────────────────────────────────
  const connectWebRTC = useCallback(async () => {
    const video = videoRef.current;
    if (!video) return;

    cleanup();
    setConnectionState('connecting');

    try {
      const pc = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
      });
      pcRef.current = pc;

      pc.addTransceiver('video', { direction: 'recvonly' });
      pc.addTransceiver('audio', { direction: 'recvonly' });

      pc.ontrack = (event) => {
        if (event.streams[0]) {
          video.srcObject = event.streams[0];
          video.play().catch(() => {});
        }
      };

      pc.onconnectionstatechange = () => {
        switch (pc.connectionState) {
          case 'connected':
            attemptRef.current = 0;
            setConnectionState('connected');
            break;
          case 'failed':
          case 'disconnected':
            setConnectionState('offline');
            scheduleReconnect();
            break;
        }
      };

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      const resp = await fetch(
        `${BASE_URL}/api/webrtc?src=${cameraId}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/sdp' },
          body: (offer as RTCSessionDescription).sdp,
        },
      );

      if (!resp.ok) throw new Error(`WebRTC SDP exchange failed: ${resp.status}`);

      const answerSDP = await resp.text();
      await pc.setRemoteDescription(
        new RTCSessionDescription({ type: 'answer', sdp: answerSDP }),
      );
    } catch (err) {
      console.warn('[VideoPlayer] WebRTC failed, falling back to HLS', err);
      tryHls();
    }
  }, [cameraId, cleanup, tryHls]);

  // ── Reconnect with exponential backoff ───────────────────────────────
  const scheduleReconnect = useCallback(() => {
    if (attemptRef.current >= MAX_RECONNECT_ATTEMPTS) {
      setConnectionState('offline');
      return;
    }

    const delay = BASE_RECONNECT_DELAY * Math.pow(2, attemptRef.current);
    attemptRef.current += 1;

    reconnectTimeoutRef.current = setTimeout(() => {
      connectWebRTC();
    }, delay);
  }, [connectWebRTC]);

  // ── Initial connection ───────────────────────────────────────────────
  useEffect(() => {
    connectWebRTC();
    return cleanup;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cameraId]);

  // ── Fullscreen ───────────────────────────────────────────────────────
  const toggleFullscreen = useCallback(async () => {
    if (!containerRef.current) return;

    try {
      if (!document.fullscreenElement) {
        await containerRef.current.requestFullscreen();
        setIsFullscreen(true);
      } else {
        await document.exitFullscreen();
        setIsFullscreen(false);
      }
    } catch {
      // fullscreen not supported / denied
    }
  }, []);

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

  // ── Quality indicator color ──────────────────────────────────────────
  const qualityColor: Record<ConnectionState, string> = {
    connected: 'bg-green-500',
    connecting: 'bg-yellow-500 animate-pulse',
    offline: 'bg-red-500',
  };

  const qualityLabel: Record<ConnectionState, string> = {
    connected: 'Connecté',
    connecting: 'Connexion…',
    offline: 'Hors ligne',
  };

  // ── Render ───────────────────────────────────────────────────────────
  return (
    <div
      ref={containerRef}
      className="group relative overflow-hidden rounded-lg bg-gray-900 text-white"
    >
      {/* Video element */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="h-full w-full object-cover"
      />

      {/* ── Loading overlay ──────────────────────────────────────────── */}
      {connectionState === 'connecting' && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900/80">
          <Loader2 className="h-10 w-10 animate-spin text-blue-400" />
        </div>
      )}

      {/* ── Offline overlay ──────────────────────────────────────────── */}
      {connectionState === 'offline' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-gray-900/90">
          <VideoOff className="h-12 w-12 text-red-400" />
          <span className="text-sm text-gray-400">Caméra hors ligne</span>
          <button
            onClick={() => {
              attemptRef.current = 0;
              connectWebRTC();
            }}
            className="mt-2 rounded bg-blue-600 px-3 py-1 text-xs font-medium transition-colors hover:bg-blue-500"
          >
            Réessayer
          </button>
        </div>
      )}

      {/* ── Top bar: camera name + quality ───────────────────────────── */}
      <div className="absolute inset-x-0 top-0 flex items-center justify-between bg-gradient-to-b from-black/60 to-transparent px-3 py-2 opacity-0 transition-opacity group-hover:opacity-100">
        <div className="flex items-center gap-2">
          <Video className="h-4 w-4 text-blue-400" />
          <span className="text-sm font-medium">{cameraName}</span>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`inline-block h-2 w-2 rounded-full ${qualityColor[connectionState]}`}
          />
          <span className="text-xs text-gray-300">
            {qualityLabel[connectionState]}
          </span>
        </div>
      </div>

      {/* ── Bottom bar: fullscreen ───────────────────────────────────── */}
      <button
        onClick={toggleFullscreen}
        className="absolute bottom-2 right-2 rounded bg-black/50 p-1.5 opacity-0 transition-opacity hover:bg-black/70 group-hover:opacity-100"
        title={isFullscreen ? 'Quitter le plein écran' : 'Plein écran'}
      >
        {isFullscreen ? (
          <Minimize className="h-4 w-4" />
        ) : (
          <Maximize className="h-4 w-4" />
        )}
      </button>
    </div>
  );
}
