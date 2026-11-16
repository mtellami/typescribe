import { create } from 'zustand';
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
  segmentStats: Record<number, SegmentStats>;
  sessionStartedAt: number | null;
  sessionCompletedAt: number | null;
  selectOpen: boolean;

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
  setSelectOpen: (open: boolean) => void;
  startSession: () => void;
  recordSegmentStats: (index: number, stats: SegmentStats) => void;
  completeSession: () => void;
}

export const useSession = create<SessionState>((set, get) => ({
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
  segmentStats: {},
  sessionStartedAt: null,
  sessionCompletedAt: null,
  selectOpen: false,

  setScreen: (screen) => set({ screen }),
  setError: (error) => set({ error }),
  setFeatured: (videos) => set({ featured: videos, featuredLoaded: true }),

  loadDetail: (detail) =>
    set((state) => ({
      video: detail.video,
      track: detail.track,
      segments: detail.segments,
      segmentIndex: 0,
      engineSnapshot: null,
      engineEpoch: state.engineEpoch + 1,
      segmentStats: {},
      sessionStartedAt: null,
      sessionCompletedAt: null,
      error: null,
    })),

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
  setSelectOpen: (open) => set({ selectOpen: open }),

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
}));

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
