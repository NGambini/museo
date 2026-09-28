import { act, renderHook } from '@testing-library/react-native';
import { audioRegistry, useAudioPlayer } from '../useAudioPlayer';

// ---------------------------------------------------------------------------
// Mock expo-audio
// ---------------------------------------------------------------------------
const mockPlay = jest.fn();
const mockPause = jest.fn();
const mockRemove = jest.fn();
const mockSeekTo = jest.fn().mockResolvedValue(undefined);
const mockSetAudioModeAsync = jest.fn().mockResolvedValue(undefined);

let capturedStatusCallback: ((status: any) => void) | null = null;

const mockCreateAudioPlayer = jest.fn().mockImplementation(() => ({
  play: mockPlay,
  pause: mockPause,
  remove: mockRemove,
  seekTo: mockSeekTo,
  addListener: (_event: string, listener: (s: any) => void) => {
    capturedStatusCallback = listener;
    return { remove: jest.fn() };
  },
}));

jest.mock('expo-audio', () => ({
  createAudioPlayer: (...args: any[]) => mockCreateAudioPlayer(...args),
  setAudioModeAsync: (...args: any[]) => mockSetAudioModeAsync(...args),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const SOURCE = 1 as unknown as number;

// expo-audio reports currentTime and duration in seconds.
function emitStatus(overrides: object) {
  capturedStatusCallback?.({
    isLoaded: true,
    currentTime: 0,
    duration: 60,
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
  it('toggle creates the player and calls play', async () => {
    const { result } = renderHook(() => useAudioPlayer(SOURCE));

    await act(async () => { result.current.toggle(); });

    expect(mockCreateAudioPlayer).toHaveBeenCalledTimes(1);
    expect(mockPlay).toHaveBeenCalledTimes(1);
    expect(result.current.isPlaying).toBe(true);
  });

  it('does not recreate the player when toggle is called again', async () => {
    const { result } = renderHook(() => useAudioPlayer(SOURCE));

    await act(async () => { result.current.toggle(); }); // play
    await act(async () => { result.current.toggle(); }); // pause
    await act(async () => { result.current.toggle(); }); // play again

    expect(mockCreateAudioPlayer).toHaveBeenCalledTimes(1);
    expect(mockPlay).toHaveBeenCalledTimes(2);
  });

  it('toggle pauses when already playing', async () => {
    const { result } = renderHook(() => useAudioPlayer(SOURCE));

    await act(async () => { result.current.toggle(); }); // play
    await act(async () => { result.current.toggle(); }); // pause

    expect(mockPause).toHaveBeenCalledTimes(1);
    expect(result.current.isPlaying).toBe(false);
  });
});

describe('useAudioPlayer — status updates', () => {
  it('updates progress, currentTime and totalTime via the status callback', async () => {
    const { result } = renderHook(() => useAudioPlayer(SOURCE));

    await act(async () => { result.current.toggle(); });

    act(() => {
      emitStatus({ currentTime: 30, duration: 60 });
    });

    expect(result.current.progress).toBeCloseTo(0.5);
    expect(result.current.currentTime).toBe('0:30');
    expect(result.current.totalTime).toBe('1:00');
  });

  it('sets isPlaying to false when the track finishes', async () => {
    const { result } = renderHook(() => useAudioPlayer(SOURCE));

    await act(async () => { result.current.toggle(); });

    act(() => {
      emitStatus({ currentTime: 60, duration: 60, didJustFinish: true });
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

    expect(mockPause).toHaveBeenCalledTimes(1);
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
  it('seekTo calls player.seekTo with the position in seconds', async () => {
    const { result } = renderHook(() => useAudioPlayer(SOURCE));

    await act(async () => { result.current.toggle(); });
    act(() => { emitStatus({ currentTime: 0, duration: 60 }); });
    await act(async () => { result.current.seekTo(0.5); });

    expect(mockSeekTo).toHaveBeenCalledWith(30);
  });

  it('seekTo has no effect if the duration is not yet known', async () => {
    const { result } = renderHook(() => useAudioPlayer(SOURCE));
    await act(async () => { result.current.seekTo(0.5); });
    expect(mockSeekTo).not.toHaveBeenCalled();
  });

  it('seekTo updates the local position immediately', async () => {
    const { result } = renderHook(() => useAudioPlayer(SOURCE));

    await act(async () => { result.current.toggle(); });
    act(() => { emitStatus({ currentTime: 0, duration: 60 }); });
    await act(async () => { result.current.seekTo(0.25); });

    expect(result.current.currentTime).toBe('0:15');
  });
});

describe('useAudioPlayer — cleanup', () => {
  it('unmount pauses then removes the player and releases the registry', async () => {
    const { result, unmount } = renderHook(() => useAudioPlayer(SOURCE));

    await act(async () => { result.current.toggle(); });
    expect(audioRegistry.stopActive).not.toBeNull();
    mockPause.mockClear();

    await act(async () => { unmount(); });

    // remove() alone does not stop native playback: the sound must be paused
    // first so switching chapters cuts the previous one immediately.
    expect(mockPause).toHaveBeenCalledTimes(1);
    expect(mockRemove).toHaveBeenCalledTimes(1);
    expect(mockPause.mock.invocationCallOrder[0]).toBeLessThan(mockRemove.mock.invocationCallOrder[0]);
    expect(audioRegistry.stopActive).toBeNull();
  });
});
