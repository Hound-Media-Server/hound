import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react";
import toast from "react-hot-toast";
import { fetchMediaFiles } from "../../api/services/media";
import { fetchProviders } from "../../api/services/providers";
import StreamModal from "./StreamModal";

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
};

type StreamModalContextValue = {
  isOpen: boolean;
  openStream: (request: StreamPlaybackRequest) => Promise<void>;
  closeStream: () => void;
};

const StreamModalContext = createContext<StreamModalContextValue | null>(null);
const flattenStreams = (data: any) =>
  data?.providers?.flatMap((provider: any) => provider.streams || []) || [];

export function StreamModalProvider({ children }: { children: ReactNode }) {
  const [request, setRequest] = useState<StreamPlaybackRequest | null>(null);
  const requestId = useRef(0);
  const closeStream = useCallback(() => setRequest(null), []);

  const openStream = useCallback(async (next: StreamPlaybackRequest) => {
    const currentRequestId = ++requestId.current;
    if (next.stream || next.encodedData) {
      setRequest(next);
      return;
    }

    const loadingToast = toast.loading("Searching streams...");
    const [files, providers] = await Promise.all([
      fetchMediaFiles(
        next.mediaType,
        next.mediaSource,
        next.sourceId,
        next.season,
        next.episode,
      ).catch(() => null),
      fetchProviders(
        next.mediaType,
        next.mediaSource,
        next.sourceId,
        next.season,
        next.episode,
      ).catch(() => null),
    ]);
    if (currentRequestId !== requestId.current) {
      toast.dismiss(loadingToast);
      return;
    }
    const streams = [...flattenStreams(files), ...flattenStreams(providers)];
    if (!streams.length) {
      toast.error("No streams found", { id: loadingToast });
      return;
    }
    toast.dismiss(loadingToast);
    setRequest({ ...next, stream: streams[0] });
  }, []);

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
