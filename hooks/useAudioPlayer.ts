import { Audio, AVPlaybackSource, AVPlaybackStatus } from 'expo-av';
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
// useSound — isolated concern: lazy load and unload a single sound file.
// ---------------------------------------------------------------------------
function useSound(source: AVPlaybackSource) {
  const soundRef = useRef<Audio.Sound | null>(null);

  const ensureLoaded = useCallback(
    async (onStatus: (s: AVPlaybackStatus) => void): Promise<Audio.Sound> => {
      if (!soundRef.current) {
        const { sound } = await Audio.Sound.createAsync(
          source,
          { shouldPlay: false },
          onStatus
        );
        soundRef.current = sound;
      }
      return soundRef.current;
    },
    [source]
  );

  const unload = useCallback(async () => {
    await soundRef.current?.unloadAsync();
    soundRef.current = null;
  }, []);

  return { soundRef, ensureLoaded, unload };
}

// ---------------------------------------------------------------------------

export type AudioPlayerState = {
  isPlaying: boolean;
  progress: number;
  currentTime: string;
  totalTime: string;
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
export function useAudioPlayer(source: AVPlaybackSource): AudioPlayerState {
  const [isPlaying, setIsPlaying] = useState(false);
  const [positionMs, setPositionMs] = useState(0);
  const [durationMs, setDurationMs] = useState(0);

  const { soundRef, ensureLoaded, unload } = useSound(source);

  const pause = useCallback(async () => {
    await soundRef.current?.pauseAsync();
    setIsPlaying(false);
  }, []);

  const onStatus = useCallback(
    (status: AVPlaybackStatus) => {
      if (!status.isLoaded) return;
      setPositionMs(status.positionMillis);
      if (status.durationMillis != null) setDurationMs(status.durationMillis);
      if (status.didJustFinish) {
        setIsPlaying(false);
        audioRegistry.release(pause);
      }
    },
    [pause]
  );

  const play = useCallback(async () => {
    await Audio.setAudioModeAsync({ playsInSilentModeIOS: true });
    audioRegistry.claim(pause);
    const sound = await ensureLoaded(onStatus);
    await sound.playAsync();
    setIsPlaying(true);
  }, [pause, ensureLoaded, onStatus]);

  const toggle = useCallback(
    () => (isPlaying ? pause() : play()),
    [isPlaying, pause, play]
  );

  const seekTo = useCallback(
    async (ratio: number) => {
      if (!soundRef.current || durationMs === 0) return;
      const posMs = Math.floor(ratio * durationMs);
      await soundRef.current.setPositionAsync(posMs);
      setPositionMs(posMs);
    },
    [durationMs]
  );

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
    toggle,
    seekTo,
  };
}
