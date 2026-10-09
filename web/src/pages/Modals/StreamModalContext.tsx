import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react";
import { useMediaDetails } from "../../api/hooks/media";
import { useDirectStreamMutation } from "../../api/hooks/providers";
import StreamModal from "./StreamModal";
import SelectStreamModal from "./StreamSelectModal";
import SeasonModal from "./SeasonModal";

export type StreamPlaybackRequest = {
  mediaType: "movie" | "tv";
  mediaSource: string;
  sourceId: string;
  season?: number;
  episode?: number;
  stream?: any;
  encodedData?: string;
  watchProgress?: any;
  originalAudioLang?: string;
  mediaDetails?: any;
  getWatchProgress?: () => Promise<any>;
};

type StreamModalContextValue = {
  isOpen: boolean;
  openStream: (request: StreamPlaybackRequest) => Promise<void>;
  closeStream: () => void;
};

const StreamModalContext = createContext<StreamModalContextValue | null>(null);
const streamKey = (request: StreamPlaybackRequest) =>
  JSON.stringify([
    request.mediaType,
    request.mediaSource,
    request.sourceId,
    request.season,
    request.episode,
  ]);

export function StreamModalProvider({ children }: { children: ReactNode }) {
  const { mutateAsync: resolveStream } = useDirectStreamMutation();
  const prefetchedEpisode = useRef<string | null>(null);
  const [request, setRequest] = useState<StreamPlaybackRequest | null>(null);
  const [streamError, setStreamError] = useState<string | null>(null);
  const [isSourceSelectOpen, setIsSourceSelectOpen] = useState(false);
  const [isEpisodeSelectOpen, setIsEpisodeSelectOpen] = useState(false);
  const [switchProgress, setSwitchProgress] = useState<any>(null);
  const [sourceSelectTarget, setSourceSelectTarget] =
    useState<StreamPlaybackRequest | null>(null);
  const { data: mediaDetails } = useMediaDetails(
    request?.mediaType === "tv" ? "tv" : "movie",
    request?.mediaSource ?? "",
    request?.sourceId ?? "",
    request !== null,
  );
  const requestId = useRef(0);
  const nextEpisodePending = useRef(false);
  const closeStream = useCallback(() => {
    requestId.current++;
    prefetchedEpisode.current = null;
    setIsSourceSelectOpen(false);
    setIsEpisodeSelectOpen(false);
    setSwitchProgress(null);
    setSourceSelectTarget(null);
    setRequest(null);
    setStreamError(null);
  }, []);

  const openStream = useCallback(
    async (next: StreamPlaybackRequest) => {
      const currentRequestId = ++requestId.current;
      setStreamError(null);
      setRequest(next);
      if (next.stream || next.encodedData) {
        return;
      }
      try {
        const progress = next.getWatchProgress
          ? await next.getWatchProgress()
          : next.watchProgress;
        if (currentRequestId !== requestId.current) return;
        const { selectedStream: stream, startedImmediately } =
          await resolveStream({
            ...next,
            encodedData: progress?.encoded_data,
            onImmediateStream: (immediateStream: any) => {
              if (currentRequestId === requestId.current) {
                setRequest({
                  ...next,
                  watchProgress: progress,
                  stream: immediateStream,
                });
              }
            },
          });
        if (currentRequestId === requestId.current) {
          if (stream) {
            if (!startedImmediately)
              setRequest({ ...next, watchProgress: progress, stream });
          } else {
            setStreamError("No streams found.");
          }
        }
      } catch {
        if (currentRequestId === requestId.current) {
          setStreamError("Could not search for streams.");
        }
      }
    },
    [resolveStream],
  );

  const value = useMemo(
    () => ({ isOpen: request !== null, openStream, closeStream }),
    [request, openStream, closeStream],
  );
  const stream =
    request?.stream ||
    (request?.encodedData
      ? {
          encoded_data: request.encodedData,
          stream_protocol: request.watchProgress?.stream_protocol || "http",
          uri: request.watchProgress?.source_uri,
        }
      : null);
  const streamContext = request
    ? {
        media_type: request.mediaType === "tv" ? "tvshow" : "movie",
        media_source: request.mediaSource,
        source_id: request.sourceId,
        season_number: request.season,
        episode_number: request.episode,
      }
    : null;
  const nextEpisode = useMemo(() => {
    if (
      request?.mediaType !== "tv" ||
      request.season === undefined ||
      request.episode === undefined
    )
      return null;
    const seasons = mediaDetails?.seasons || [];
    const current = seasons.find(
      (s: any) => s.season_number === request.season,
    );
    if (!current) return null;
    if (request.episode < current.episode_count) {
      return { season: request.season, episode: request.episode + 1 };
    }
    const next = [...seasons]
      .filter(
        (s: any) => s.season_number > request.season! && s.episode_count > 0,
      )
      .sort((a: any, b: any) => a.season_number - b.season_number)[0];
    return next ? { season: next.season_number, episode: 1 } : null;
  }, [request, mediaDetails]);

  return (
    <StreamModalContext.Provider value={value}>
      {children}
      <StreamModal
        open={request !== null}
        setOpen={(open: boolean) => !open && closeStream()}
        streamDetails={stream}
        streams={streamContext}
        watchProgress={request?.watchProgress}
        originalAudioLang={request?.originalAudioLang}
        mediaDetails={request?.mediaDetails ?? mediaDetails}
        streamError={streamError}
        isOverlayOpen={isSourceSelectOpen || isEpisodeSelectOpen}
        onPrefetchNextEpisode={
          nextEpisode && request
            ? () => {
                const target = {
                  ...request,
                  ...nextEpisode,
                  encodedData: undefined,
                };
                const key = streamKey(target);
                if (prefetchedEpisode.current === key) return;
                prefetchedEpisode.current = key;
                void resolveStream(target).catch(() => null);
              }
            : undefined
        }
        onNextEpisode={
          nextEpisode && request
            ? async (playerSettings: any) => {
                if (nextEpisodePending.current) return;
                nextEpisodePending.current = true;
                try {
                  await openStream({
                    ...request,
                    ...nextEpisode,
                    stream: undefined,
                    encodedData: undefined,
                    watchProgress: {
                      current_progress_seconds: 0,
                      player_settings: playerSettings,
                    },
                  });
                } finally {
                  nextEpisodePending.current = false;
                }
              }
            : undefined
        }
        onChangeSource={(currentTime: number) => {
          requestId.current++;
          setSwitchProgress({
            ...request?.watchProgress,
            current_progress_seconds: Math.floor(currentTime),
          });
          setSourceSelectTarget(request);
          setIsSourceSelectOpen(true);
        }}
        onViewEpisodes={
          request?.mediaType === "tv"
            ? () => {
                requestId.current++;
                setIsEpisodeSelectOpen(true);
              }
            : undefined
        }
      />
      {request?.mediaType === "tv" && request.season !== undefined && (
        <SeasonModal
          open={isEpisodeSelectOpen}
          onClose={() => setIsEpisodeSelectOpen(false)}
          mediaSource={request.mediaSource}
          sourceID={request.sourceId}
          seasonNumber={request.season}
          mediaTitle={request.watchProgress?.media_title || ""}
          isStreamSelectButtonLoading={false}
          isStreamModalOpen={request !== null}
          handleStreamButtonClick={(
            season: number,
            episode: number,
            mode: string,
            _episodeID: number,
            encodedData?: string,
            progress?: any,
          ) => {
            setIsEpisodeSelectOpen(false);
            const target: StreamPlaybackRequest = {
              ...request,
              season,
              episode,
              stream: undefined,
              encodedData,
              watchProgress: progress,
            };
            if (mode === "select") {
              setSwitchProgress(progress);
              setSourceSelectTarget({ ...target, encodedData: undefined });
              setIsSourceSelectOpen(true);
              return;
            }
            void openStream(target);
          }}
        />
      )}
      <SelectStreamModal
        modalType="select-stream"
        open={isSourceSelectOpen && request !== null}
        setOpen={(open) => {
          setIsSourceSelectOpen(open);
          if (!open) setSourceSelectTarget(null);
        }}
        currentStreamEncodedData={
          sourceSelectTarget?.season === request?.season &&
          sourceSelectTarget?.episode === request?.episode
            ? stream?.encoded_data
            : undefined
        }
        fetchParams={
          sourceSelectTarget
            ? {
                mediaType: sourceSelectTarget.mediaType,
                mediaSource: sourceSelectTarget.mediaSource,
                sourceId: sourceSelectTarget.sourceId,
                season: sourceSelectTarget.season,
                episode: sourceSelectTarget.episode,
              }
            : undefined
        }
        onStreamSelected={(stream) => {
          setIsSourceSelectOpen(false);
          setRequest(
            sourceSelectTarget
              ? {
                  ...sourceSelectTarget,
                  stream,
                  encodedData: undefined,
                  watchProgress: switchProgress,
                }
              : request,
          );
          setSourceSelectTarget(null);
        }}
      />
    </StreamModalContext.Provider>
  );
}

export function useStreamModal() {
  const context = useContext(StreamModalContext);
  if (!context) {
    throw new Error("useStreamModal must be used inside StreamModalProvider");
  }
  return context;
}
