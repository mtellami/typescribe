export interface RawCue {
  startMs: number;
  endMs: number;
  text: string;
}

export interface VideoDetails {
  title: string;
  channel: string;
  thumbnail: string;
  durationSeconds: number;
  isLive: boolean;
}

export interface TranscriptResult {
  track: { lang: string; kind: 'manual' | 'auto'; label: string };
  details: VideoDetails;
  cues: RawCue[];
}

export interface TranscriptClient {
  fetch(videoId: string, lang: string): Promise<TranscriptResult>;
}
