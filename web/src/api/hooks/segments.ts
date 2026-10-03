import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import {
  getSkipSegment,
  normalizeSegments,
  VideoSegments,
} from "../../utils/videoSegments";

export type SegmentMedia = {
  media_type: string;
  media_source: string;
  source_id: string;
  season_number?: number;
  episode_number?: number;
};

export function useVideoSegments(
  media: SegmentMedia | undefined,
  source: string,
  duration: number,
  position: number,
  hasNextEpisode: boolean,
) {
  const id = `${media?.media_source}-${media?.source_id}`;
  const season = media?.season_number;
  const episode = media?.episode_number;
  const durationMs = Math.round(duration * 1000);
  const enabled =
    media?.media_type === "tvshow" &&
    !!media.media_source && !!media.source_id &&
    season !== undefined && episode !== undefined && !!source &&
    Number.isFinite(durationMs) && durationMs > 0;
  const { data } = useQuery({
    queryKey: ["video-segments", id, season, episode, source, durationMs],
    enabled,
    queryFn: async ({ signal }) => {
      const { data: segments } = await axios.get<VideoSegments | null>(
        `/api/v1/tv/${id}/segments`,
        { params: { season, episode, duration_ms: durationMs }, signal },
      );
      if (
        !segments ||
        `${segments.media_source}-${segments.source_id}` !== id ||
        segments.season !== season || segments.episode !== episode
      ) {
        return [];
      }
      return normalizeSegments(segments, durationMs / 1000);
    },
    retry: false,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
  return enabled
    ? getSkipSegment(data || [], position, duration, hasNextEpisode)
    : null;
}
