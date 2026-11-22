import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type {
  PracticeMode,
  SegmentDto,
  TrackDto,
  VideoDetailResponse,
  VideoDto,
} from '@/lib/contracts';
import type { Density, EngineSnapshot } from '@/lib/typing/types';

export type ScreenState =
  'idle' | 'loading' | 'ready' | 'playing' | 'paused' | 'completed' | 'error';

export type DisplayMode = 'default' | 'textFocus' | 'expandVideo';

export type { KeySound, ErrorSound } from '@/lib/sound-options';
import {
  KEY_SOUNDS,
  ERROR_SOUNDS,
  type KeySound,
  type ErrorSound,
} from '@/lib/sound-options';

export type PlaybackRate = '0.5' | '0.75' | '1' | '1.25' | '1.5' | '2';

export interface SegmentStats {
  correctKeystrokes: number;
  keystrokes: number;
  hintCount: number;
  activeMs: number;
}

interface SessionState {
  screen: ScreenState;
  error: string | null;
  featured: VideoDto[];
  featuredLoaded: boolean;
  video: VideoDto | null;
  track: TrackDto | null;
  segments: SegmentDto[];
  segmentIndex: number;
  engineSnapshot: EngineSnapshot | null;
  engineEpoch: number;
  mode: PracticeMode;
  density: Density;
  ignoreCase: boolean;
  ignorePunctuation: boolean;
  displayMode: DisplayMode;
  playbackRate: PlaybackRate;
  practiceFont: string;
  keySound: KeySound;
  errorSounds: ErrorSound[];
  segmentStats: Record<number, SegmentStats>;
  sessionStartedAt: number | null;
  sessionCompletedAt: number | null;
  selectOpen: boolean;
  recentVideos: VideoDto[];

  setScreen: (screen: ScreenState) => void;
  setError: (error: string | null) => void;
  setFeatured: (videos: VideoDto[]) => void;
  loadDetail: (detail: VideoDetailResponse) => void;
  clearSession: () => void;
  restartSession: () => void;
  setSegmentIndex: (index: number) => void;
  setEngineSnapshot: (snapshot: EngineSnapshot | null) => void;
  setMode: (mode: PracticeMode) => void;
  setDensity: (density: Density) => void;
  setIgnoreCase: (value: boolean) => void;
  setIgnorePunctuation: (value: boolean) => void;
  setDisplayMode: (mode: DisplayMode) => void;
  setPlaybackRate: (rate: PlaybackRate) => void;
  setPracticeFont: (font: string) => void;
  setKeySound: (sound: KeySound) => void;
  setErrorSounds: (sounds: ErrorSound[]) => void;
  setSelectOpen: (open: boolean) => void;
  startSession: () => void;
  recordSegmentStats: (index: number, stats: SegmentStats) => void;
  completeSession: () => void;
  addRecentVideo: (video: VideoDto) => void;
}

const SETTINGS_KEYS = [
  'mode',
  'density',
  'ignoreCase',
  'ignorePunctuation',
  'displayMode',
  'playbackRate',
  'practiceFont',
  'keySound',
  'errorSounds',
  'recentVideos',
] as const;

export const useSession = create<SessionState>()(
  persist(
    (set, get) => ({
      screen: 'idle',
      error: null,
      featured: [],
      featuredLoaded: false,
      video: null,
      track: null,
      segments: [],
      segmentIndex: 0,
      engineSnapshot: null,
      engineEpoch: 0,
      mode: 'type',
      density: 'all',
      ignoreCase: false,
      ignorePunctuation: false,
      displayMode: 'default',
      playbackRate: '1',
      practiceFont: 'Be Vietnam Pro',
      keySound: 'muted',
      errorSounds: [],
      segmentStats: {},
      sessionStartedAt: null,
      sessionCompletedAt: null,
      selectOpen: false,
      recentVideos: [],

      setScreen: (screen) => set({ screen }),
      setError: (error) => set({ error }),
      setFeatured: (videos) => set({ featured: videos, featuredLoaded: true }),

      loadDetail: (detail) =>
        set((state) => {
          const video = detail.video;
          const recent = [
            video,
            ...state.recentVideos.filter((v) => v.id !== video.id),
          ].slice(0, 10);
          return {
            video,
            track: detail.track,
            segments: detail.segments,
            segmentIndex: 0,
            engineSnapshot: null,
            engineEpoch: state.engineEpoch + 1,
            segmentStats: {},
            sessionStartedAt: null,
            sessionCompletedAt: null,
            error: null,
            recentVideos: recent,
          };
        }),

      clearSession: () =>
        set((state) => ({
          screen: 'idle',
          error: null,
          video: null,
          track: null,
          segments: [],
          segmentIndex: 0,
          engineSnapshot: null,
          engineEpoch: state.engineEpoch + 1,
          segmentStats: {},
          sessionStartedAt: null,
          sessionCompletedAt: null,
        })),

      restartSession: () =>
        set((state) => ({
          screen: 'ready',
          segmentIndex: 0,
          engineSnapshot: null,
          engineEpoch: state.engineEpoch + 1,
          segmentStats: {},
          sessionStartedAt: null,
          sessionCompletedAt: null,
          error: null,
        })),

      setSegmentIndex: (index) => set({ segmentIndex: index }),
      setEngineSnapshot: (snapshot) => set({ engineSnapshot: snapshot }),
      setMode: (mode) =>
        set((state) => ({
          mode,
          engineEpoch: state.engineEpoch + 1,
          engineSnapshot: null,
        })),
      setDensity: (density) =>
        set((state) => ({
          density,
          engineEpoch: state.engineEpoch + 1,
          engineSnapshot: null,
        })),
      setIgnoreCase: (value) =>
        set((state) => ({
          ignoreCase: value,
          engineEpoch: state.engineEpoch + 1,
          engineSnapshot: null,
        })),
      setIgnorePunctuation: (value) =>
        set((state) => ({
          ignorePunctuation: value,
          engineEpoch: state.engineEpoch + 1,
          engineSnapshot: null,
        })),
      setDisplayMode: (mode) => set({ displayMode: mode }),
      setPlaybackRate: (rate: PlaybackRate) => set({ playbackRate: rate }),
      setPracticeFont: (practiceFont) => set({ practiceFont }),
      setKeySound: (keySound) => set({ keySound }),
      setErrorSounds: (errorSounds) => set({ errorSounds }),
      setSelectOpen: (open: boolean) => set({ selectOpen: open }),
      addRecentVideo: (video) =>
        set((state) => ({
          recentVideos: [
            video,
            ...state.recentVideos.filter((v) => v.id !== video.id),
          ].slice(0, 10),
        })),

      startSession: () => {
        if (get().sessionStartedAt === null) {
          set({ sessionStartedAt: Date.now() });
        }
      },

      recordSegmentStats: (index, stats) =>
        set((state) => ({
          segmentStats: { ...state.segmentStats, [index]: stats },
        })),

      completeSession: () =>
        set({ screen: 'completed', sessionCompletedAt: Date.now() }),
    }),
    {
      name: 'typescribe-settings',
      version: 1,
      migrate: (persisted) => {
        const saved = persisted as Record<string, unknown>;
        const candidates = Array.isArray(saved.errorSounds)
          ? saved.errorSounds
          : [saved.errorSound];
        const settings = { ...saved };
        delete settings.errorSound;
        return {
          ...settings,
          keySound:
            typeof saved.keySound === 'string' && saved.keySound in KEY_SOUNDS
              ? saved.keySound
              : 'muted',
          errorSounds: candidates.filter(
            (sound): sound is ErrorSound =>
              typeof sound === 'string' && sound in ERROR_SOUNDS,
          ),
        };
      },
      storage: createJSONStorage(() => localStorage),
      partialize: (state) =>
        Object.fromEntries(
          SETTINGS_KEYS.map((key) => [key, state[key as keyof typeof state]]),
        ),
    },
  ),
);

export function sumSegmentStats(
  segmentStats: Record<number, SegmentStats>,
): SegmentStats {
  const totals: SegmentStats = {
    correctKeystrokes: 0,
    keystrokes: 0,
    hintCount: 0,
    activeMs: 0,
  };
  for (const stats of Object.values(segmentStats)) {
    totals.correctKeystrokes += stats.correctKeystrokes;
    totals.keystrokes += stats.keystrokes;
    totals.hintCount += stats.hintCount;
    totals.activeMs += stats.activeMs;
  }
  return totals;
}
