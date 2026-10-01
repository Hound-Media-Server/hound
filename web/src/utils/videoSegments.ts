export type SegmentType = "intro" | "recap" | "credits" | "preview";

export type VideoSegments = {
  media_source: string;
  source_id: string;
  season: number;
  episode: number;
} & Partial<Record<SegmentType, { start_ms: number; end_ms: number }[] | null>>;

export type SkipSegment = {
  start: number;
  end: number;
  type: SegmentType | "intro & recap";
};

export function normalizeSegments(data: VideoSegments, duration: number) {
  const segments: SkipSegment[] = [];
  if (!Number.isFinite(duration) || duration <= 0) return segments;

  for (const type of ["intro", "recap", "credits", "preview"] as const) {
    if (!Array.isArray(data[type])) continue;
    for (const range of data[type]) {
      const endMs =
        (type === "credits" || type === "preview") && range?.end_ms === 0
          ? duration * 1000
          : range?.end_ms;
      if (
        !range ||
        !Number.isFinite(range.start_ms) ||
        !Number.isFinite(endMs) ||
        range.start_ms < 0 ||
        endMs <= range.start_ms ||
        endMs > duration * 1000 + 1000
      ) {
        continue;
      }
      const start = range.start_ms / 1000;
      const end = Math.min(endMs / 1000, duration);
      if (end > start) segments.push({ start, end, type });
    }
  }
  segments.sort((a, b) => a.start - b.start || a.end - b.end);

  // intro and recap can be skipped at once if they're connected
  const merged: SkipSegment[] = [];
  const isOpening = (type: SkipSegment["type"]) =>
    type === "intro" || type === "recap" || type === "intro & recap";
  for (const segment of segments) {
    const previous = merged[merged.length - 1];
    if (
      previous &&
      segment.start <= previous.end &&
      (previous.type === segment.type ||
        (isOpening(previous.type) && isOpening(segment.type)))
    ) {
      previous.end = Math.max(previous.end, segment.end);
      if (previous.type !== segment.type) previous.type = "intro & recap";
    } else {
      merged.push({ ...segment });
    }
  }

  // don't offer for other ranges
  return merged.filter(
    (segment, index) =>
      !merged.some(
        (other, otherIndex) =>
          index !== otherIndex &&
          segment.start < other.end &&
          other.start < segment.end,
      ),
  );
}

export function getSkipSegment(
  segments: SkipSegment[],
  position: number,
  duration: number,
  hasNextEpisode: boolean,
) {
  const segment = segments.find(
    (s) => position >= s.start && s.end - position >= 2,
  );
  if (!segment) return null;
  const terminal = segment.end >= duration - 1;
  // Don't seek to EOF, it bypasses the existing next-episode countdown.
  if (
    terminal &&
    (!hasNextEpisode ||
      (segment.type !== "credits" && segment.type !== "preview"))
  ) {
    return null;
  }
  const labels: Record<SkipSegment["type"], string> = {
    intro: "Skip Intro",
    recap: "Skip Recap",
    "intro & recap": "Skip Recap",
    credits: "Skip Credits",
    preview: "Skip Preview",
  };
  return {
    ...segment,
    nextEpisode: terminal,
    label: terminal ? "Next Episode" : labels[segment.type],
  };
}

export type SegmentAction = NonNullable<ReturnType<typeof getSkipSegment>>;
