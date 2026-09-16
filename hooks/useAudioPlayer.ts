import {
  createAudioPlayer,
  setAudioModeAsync,
  type AudioPlayer,
  type AudioSource,
  type AudioStatus,
} from 'expo-audio';
import { useCallback, useEffect, useRef, useState } from 'react';

// ---------------------------------------------------------------------------
// audioRegistry — named API to ensure only one player is active at a time.
// claim() stops the previous player and registers the new one.
// release() clears the registry when a player stops or unmounts.
// ---------------------------------------------------------------------------
export const audioRegistry = {
  stopActive: null as (() => void) | null,

  claim(stop: () => void) {
    if (this.stopActive && this.stopActive !== stop) {
      this.stopActive();
    }
    this.stopActive = stop;
  },

  release(stop: () => void) {
    if (this.stopActive === stop) {
      this.stopActive = null;
    }
  },
};

// ---------------------------------------------------------------------------
// usePlayer — isolated concern: lazily create and release a single player.
// ---------------------------------------------------------------------------
const STATUS_UPDATE_INTERVAL_MS = 250;

function usePlayer(source: AudioSource) {
  const playerRef = useRef<AudioPlayer | null>(null);
  const subscriptionRef = useRef<{ remove(): void } | null>(null);

  const ensureLoaded = useCallback(
    (onStatus: (s: AudioStatus) => void): AudioPlayer => {
      if (!playerRef.current) {
        const player = createAudioPlayer(source, { updateInterval: STATUS_UPDATE_INTERVAL_MS });
        subscriptionRef.current = player.addListener('playbackStatusUpdate', onStatus);
        playerRef.current = player;
      }
      return playerRef.current;
    },
    [source]
  );

  const unload = useCallback(() => {
    subscriptionRef.current?.remove();
    subscriptionRef.current = null;
    playerRef.current?.remove();
    playerRef.current = null;
  }, []);

  return { playerRef, ensureLoaded, unload };
}

// ---------------------------------------------------------------------------

export type AudioPlayerState = {
  isPlaying: boolean;
  progress: number;
  currentTime: string;
  totalTime: string;
  positionMillis: number;
  durationMillis: number;
  toggle: () => void;
  seekTo: (ratio: number) => void;
};

function formatTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

// ---------------------------------------------------------------------------
// useAudioPlayer
// ---------------------------------------------------------------------------
export function useAudioPlayer(source: AudioSource): AudioPlayerState {
  const [isPlaying, setIsPlaying] = useState(false);
  const [positionMs, setPositionMs] = useState(0);
  const [durationMs, setDurationMs] = useState(0);

  const { playerRef, ensureLoaded, unload } = usePlayer(source);

  const pause = useCallback(() => {
    playerRef.current?.pause();
    setIsPlaying(false);
  }, []);

  const onStatus = useCallback(
    (status: AudioStatus) => {
      if (!status.isLoaded) return;
      // expo-audio reports times in seconds; the hook exposes milliseconds.
      setPositionMs(Math.round(status.currentTime * 1000));
      if (status.duration > 0) setDurationMs(Math.round(status.duration * 1000));
      if (status.didJustFinish) {
        setIsPlaying(false);
        audioRegistry.release(pause);
      }
    },
    [pause]
  );

  const play = useCallback(async () => {
    await setAudioModeAsync({ playsInSilentMode: true });
    audioRegistry.claim(pause);
    ensureLoaded(onStatus).play();
    setIsPlaying(true);
  }, [pause, ensureLoaded, onStatus]);

  const toggle = useCallback(
    () => (isPlaying ? pause() : play()),
    [isPlaying, pause, play]
  );

  const seekTo = useCallback(
    async (ratio: number) => {
      if (!playerRef.current || durationMs === 0) return;
      const posMs = Math.floor(ratio * durationMs);
      await playerRef.current.seekTo(posMs / 1000);
      setPositionMs(posMs);
    },
    [durationMs]
  );

  useEffect(() => {
    ensureLoaded(onStatus);
  }, [ensureLoaded, onStatus]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      unload();
      audioRegistry.release(pause);
    };
  }, [unload, pause]);

  return {
    isPlaying,
    progress: durationMs > 0 ? positionMs / durationMs : 0,
    currentTime: formatTime(positionMs),
    totalTime: formatTime(durationMs),
    positionMillis: positionMs,
    durationMillis: durationMs,
    toggle,
    seekTo,
  };
}
