import { act, renderHook } from '@testing-library/react-native';
import { audioRegistry, useAudioPlayer } from '../useAudioPlayer';

// ---------------------------------------------------------------------------
// Mock expo-av
// ---------------------------------------------------------------------------
const mockPlayAsync = jest.fn().mockResolvedValue(undefined);
const mockPauseAsync = jest.fn().mockResolvedValue(undefined);
const mockUnloadAsync = jest.fn().mockResolvedValue(undefined);
const mockSetPositionAsync = jest.fn().mockResolvedValue(undefined);
const mockSetAudioModeAsync = jest.fn().mockResolvedValue(undefined);

let capturedStatusCallback: ((status: any) => void) | null = null;

const mockCreateAsync = jest.fn().mockImplementation(
  async (_source: any, _opts: any, onPlaybackStatusUpdate: (s: any) => void) => {
    capturedStatusCallback = onPlaybackStatusUpdate;
    return {
      sound: {
        playAsync: mockPlayAsync,
        pauseAsync: mockPauseAsync,
        unloadAsync: mockUnloadAsync,
        setPositionAsync: mockSetPositionAsync,
      },
    };
  }
);

jest.mock('expo-av', () => ({
  Audio: {
    setAudioModeAsync: (...args: any[]) => mockSetAudioModeAsync(...args),
    Sound: {
      createAsync: (...args: any[]) => mockCreateAsync(...args),
    },
  },
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const SOURCE = 1 as unknown as number;

function emitStatus(overrides: object) {
  capturedStatusCallback?.({
    isLoaded: true,
    positionMillis: 0,
    durationMillis: 60000,
    didJustFinish: false,
    ...overrides,
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
beforeEach(() => {
  jest.clearAllMocks();
  capturedStatusCallback = null;
  audioRegistry.stopActive = null;
});

describe('audioRegistry', () => {
  it('claim stops the previously registered function', () => {
    const stop1 = jest.fn();
    const stop2 = jest.fn();
    audioRegistry.claim(stop1);
    audioRegistry.claim(stop2);
    expect(stop1).toHaveBeenCalledTimes(1);
    expect(audioRegistry.stopActive).toBe(stop2);
  });

  it('claim does not stop itself when called again with the same function', () => {
    const stop = jest.fn();
    audioRegistry.claim(stop);
    audioRegistry.claim(stop);
    expect(stop).not.toHaveBeenCalled();
  });

  it('release clears stopActive when called with the active function', () => {
    const stop = jest.fn();
    audioRegistry.claim(stop);
    audioRegistry.release(stop);
    expect(audioRegistry.stopActive).toBeNull();
  });

  it('release is a no-op when called with a non-active function', () => {
    const stop1 = jest.fn();
    const stop2 = jest.fn();
    audioRegistry.claim(stop1);
    audioRegistry.release(stop2);
    expect(audioRegistry.stopActive).toBe(stop1);
  });
});

describe('useAudioPlayer — initial state', () => {
  it('returns isPlaying=false, progress=0, times="0:00"', () => {
    const { result } = renderHook(() => useAudioPlayer(SOURCE));
    expect(result.current.isPlaying).toBe(false);
    expect(result.current.progress).toBe(0);
    expect(result.current.currentTime).toBe('0:00');
    expect(result.current.totalTime).toBe('0:00');
  });
});

describe('useAudioPlayer — playback', () => {
  it('toggle loads the sound and calls playAsync', async () => {
    const { result } = renderHook(() => useAudioPlayer(SOURCE));

    await act(async () => { result.current.toggle(); });

    expect(mockCreateAsync).toHaveBeenCalledTimes(1);
    expect(mockPlayAsync).toHaveBeenCalledTimes(1);
    expect(result.current.isPlaying).toBe(true);
  });

  it('does not reload the sound when toggle is called again', async () => {
    const { result } = renderHook(() => useAudioPlayer(SOURCE));

    await act(async () => { result.current.toggle(); }); // play
    await act(async () => { result.current.toggle(); }); // pause
    await act(async () => { result.current.toggle(); }); // play again

    expect(mockCreateAsync).toHaveBeenCalledTimes(1);
    expect(mockPlayAsync).toHaveBeenCalledTimes(2);
  });

  it('toggle pauses when already playing', async () => {
    const { result } = renderHook(() => useAudioPlayer(SOURCE));

    await act(async () => { result.current.toggle(); }); // play
    await act(async () => { result.current.toggle(); }); // pause

    expect(mockPauseAsync).toHaveBeenCalledTimes(1);
    expect(result.current.isPlaying).toBe(false);
  });
});

describe('useAudioPlayer — status updates', () => {
  it('updates progress, currentTime and totalTime via the status callback', async () => {
    const { result } = renderHook(() => useAudioPlayer(SOURCE));

    await act(async () => { result.current.toggle(); });

    act(() => {
      emitStatus({ positionMillis: 30000, durationMillis: 60000 });
    });

    expect(result.current.progress).toBeCloseTo(0.5);
    expect(result.current.currentTime).toBe('0:30');
    expect(result.current.totalTime).toBe('1:00');
  });

  it('sets isPlaying to false when the track finishes', async () => {
    const { result } = renderHook(() => useAudioPlayer(SOURCE));

    await act(async () => { result.current.toggle(); });

    act(() => {
      emitStatus({ positionMillis: 60000, durationMillis: 60000, didJustFinish: true });
    });

    expect(result.current.isPlaying).toBe(false);
  });

  it('releases the registry when the track finishes', async () => {
    const { result } = renderHook(() => useAudioPlayer(SOURCE));

    await act(async () => { result.current.toggle(); });
    expect(audioRegistry.stopActive).not.toBeNull();

    act(() => {
      emitStatus({ didJustFinish: true });
    });

    expect(audioRegistry.stopActive).toBeNull();
  });
});

describe('useAudioPlayer — singleton (one active player at a time)', () => {
  it('starting a second player pauses the first', async () => {
    const { result: player1 } = renderHook(() => useAudioPlayer(SOURCE));
    const { result: player2 } = renderHook(() => useAudioPlayer(SOURCE));

    await act(async () => { player1.current.toggle(); }); // play 1
    await act(async () => { player2.current.toggle(); }); // play 2 → should stop 1

    expect(mockPauseAsync).toHaveBeenCalledTimes(1);
    expect(player1.current.isPlaying).toBe(false);
    expect(player2.current.isPlaying).toBe(true);
  });

  it('audioRegistry.stopActive points to the last active player', async () => {
    const { result: player1 } = renderHook(() => useAudioPlayer(SOURCE));
    const { result: player2 } = renderHook(() => useAudioPlayer(SOURCE));

    await act(async () => { player1.current.toggle(); });
    const stopAfterPlayer1 = audioRegistry.stopActive;

    await act(async () => { player2.current.toggle(); });
    const stopAfterPlayer2 = audioRegistry.stopActive;

    expect(stopAfterPlayer1).not.toBeNull();
    expect(stopAfterPlayer2).not.toBeNull();
    expect(stopAfterPlayer1).not.toBe(stopAfterPlayer2);
  });
});

describe('useAudioPlayer — seekTo', () => {
  it('seekTo calls setPositionAsync with the correct position in ms', async () => {
    const { result } = renderHook(() => useAudioPlayer(SOURCE));

    await act(async () => { result.current.toggle(); });
    act(() => { emitStatus({ positionMillis: 0, durationMillis: 60000 }); });
    await act(async () => { result.current.seekTo(0.5); });

    expect(mockSetPositionAsync).toHaveBeenCalledWith(30000);
  });

  it('seekTo has no effect if the sound is not yet loaded', async () => {
    const { result } = renderHook(() => useAudioPlayer(SOURCE));
    await act(async () => { result.current.seekTo(0.5); });
    expect(mockSetPositionAsync).not.toHaveBeenCalled();
  });

  it('seekTo updates the local position immediately', async () => {
    const { result } = renderHook(() => useAudioPlayer(SOURCE));

    await act(async () => { result.current.toggle(); });
    act(() => { emitStatus({ positionMillis: 0, durationMillis: 60000 }); });
    await act(async () => { result.current.seekTo(0.25); });

    expect(result.current.currentTime).toBe('0:15');
  });
});

describe('useAudioPlayer — cleanup', () => {
  it('unmount unloads the sound and releases the registry', async () => {
    const { result, unmount } = renderHook(() => useAudioPlayer(SOURCE));

    await act(async () => { result.current.toggle(); });
    expect(audioRegistry.stopActive).not.toBeNull();

    await act(async () => { unmount(); });

    expect(mockUnloadAsync).toHaveBeenCalledTimes(1);
    expect(audioRegistry.stopActive).toBeNull();
  });
});
