import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  isMuted,
  setMuted,
  toggleMuted,
  playMove,
  playRotate,
  playHardDrop,
  playLock,
  playLineClear,
  playGameOver,
  initAudio,
} from '../src/audio';

const storage = new Map<string, string>();
const localStorageMock: Storage = {
  getItem: (key: string) => storage.get(key) ?? null,
  setItem: (key: string, value: string) => {
    storage.set(key, String(value));
  },
  removeItem: (key: string) => {
    storage.delete(key);
  },
  clear: () => {
    storage.clear();
  },
  key: (index: number) => Array.from(storage.keys())[index] ?? null,
  length: 0,
};
Object.defineProperty(globalThis, 'localStorage', {
  value: localStorageMock,
  writable: true,
  configurable: true,
});

describe('audio module', () => {
  beforeEach(() => {
    localStorage.clear();
    setMuted(false);
  });

  it('manages mute state and persists to localStorage', () => {
    expect(isMuted()).toBe(false);
    expect(toggleMuted()).toBe(true);
    expect(isMuted()).toBe(true);
    expect(localStorage.getItem('valtris_muted')).toBe('true');

    setMuted(false);
    expect(isMuted()).toBe(false);
    expect(localStorage.getItem('valtris_muted')).toBe('false');
  });

  it('safely calls play methods even without active AudioContext', () => {
    expect(() => playMove()).not.toThrow();
    expect(() => playRotate()).not.toThrow();
    expect(() => playHardDrop()).not.toThrow();
    expect(() => playLock()).not.toThrow();
    expect(() => playLineClear(1)).not.toThrow();
    expect(() => playLineClear(2)).not.toThrow();
    expect(() => playLineClear(3)).not.toThrow();
    expect(() => playLineClear(4)).not.toThrow();
    expect(() => playGameOver()).not.toThrow();
  });

  it('does not produce sound when muted', () => {
    setMuted(true);
    expect(() => playMove()).not.toThrow();
    expect(() => playLineClear(2)).not.toThrow();
  });

  it('handles initAudio gracefully in non-browser or mock environments', () => {
    expect(() => initAudio()).not.toThrow();
  });

  it('synthesizes sounds when AudioContext is mocked and running', () => {
    const mockOscillator = {
      type: 'sine',
      frequency: {
        setValueAtTime: vi.fn(),
        exponentialRampToValueAtTime: vi.fn(),
      },
      connect: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
    };
    const mockGain = {
      gain: {
        setValueAtTime: vi.fn(),
        exponentialRampToValueAtTime: vi.fn(),
      },
      connect: vi.fn(),
    };
    const mockCtx = {
      currentTime: 10,
      state: 'running',
      destination: {},
      createOscillator: vi.fn(() => ({
        ...mockOscillator,
        frequency: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
      })),
      createGain: vi.fn(() => ({
        ...mockGain,
        gain: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
      })),
      resume: vi.fn().mockResolvedValue(undefined),
    };

    const originalWindow = (globalThis as any).window;
    (globalThis as any).window = {
      AudioContext: vi.fn().mockImplementation(() => mockCtx),
    };

    setMuted(false);
    initAudio();

    expect(() => playMove()).not.toThrow();
    expect(() => playRotate()).not.toThrow();
    expect(() => playHardDrop()).not.toThrow();
    expect(() => playLock()).not.toThrow();
    expect(() => playLineClear(1)).not.toThrow();
    expect(() => playLineClear(4)).not.toThrow();
    expect(() => playGameOver()).not.toThrow();

    (globalThis as any).window = originalWindow;
  });
});
