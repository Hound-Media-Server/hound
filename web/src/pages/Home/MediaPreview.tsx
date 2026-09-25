import PlaylistAddIcon from "@mui/icons-material/PlaylistAdd";
import PlayArrowRoundedIcon from "@mui/icons-material/PlayArrowRounded";
import { Button, Chip, Fade, Paper, Popper, Skeleton } from "@mui/material";
import {
  FocusEvent,
  PointerEvent,
  ReactNode,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  useMediaFiles,
  useMediaDetails,
  useWatchAction,
} from "../../api/hooks/media";
import type { WatchableMediaType } from "../../api/services/media";
import AddToCollectionModal from "../Modals/AddToCollectionModal";
import { useStreamModal } from "../Modals/StreamModalContext";
import "./MediaPreview.css";

const OPEN_DELAY = 500;
const CLOSE_DELAY = 180;

type MediaPreviewItem = {
  media_type: string;
  media_source: string;
  source_id: string | number;
  media_title?: string;
  release_date?: string;
  status?: string;
  overview?: string;
  duration?: number;
  genres?: Array<{ genre?: string }>;
  creators?: Array<{ name?: string }>;
  backdrop_uri?: string;
  logo_uri?: string;
  original_language?: string;
};

function formatDuration(minutes?: number) {
  if (!minutes) return "";
  if (minutes < 60) return `${minutes}m`;
  const remainingMinutes = minutes % 60;
  return `${Math.floor(minutes / 60)}h${remainingMinutes ? ` ${remainingMinutes}m` : ""}`;
}

function MediaPreview({
  item,
  children,
}: {
  item: MediaPreviewItem;
  children: ReactNode;
}) {
  const anchorRef = useRef<HTMLDivElement>(null);
  const openTimer = useRef<ReturnType<typeof setTimeout>>();
  const closeTimer = useRef<ReturnType<typeof setTimeout>>();
  const [open, setOpen] = useState(false);
  const [collectionOpen, setCollectionOpen] = useState(false);
  const mediaType: WatchableMediaType =
    item.media_type === "movie" ? "movie" : "tv";
  const sourceID = item.source_id?.toString() ?? "";
  const canPreview =
    ["movie", "tv", "tvshow"].includes(item.media_type) &&
    !!item.media_source &&
    !!sourceID;

  const {
    data: details,
    isLoading,
    isError,
  } = useMediaDetails(
    mediaType,
    item.media_source,
    sourceID,
    open && canPreview,
  );
  const { data: watchAction } = useWatchAction(
    mediaType,
    item.media_source,
    sourceID,
    open && canPreview,
  );
  const { data: mediaFiles } = useMediaFiles(
    mediaType,
    item.media_source,
    sourceID,
    undefined,
    undefined,
    false,
    open && canPreview,
  );
  const { openStream } = useStreamModal();
  const preview = { ...item, ...details };

  const clearTimers = () => {
    if (openTimer.current) clearTimeout(openTimer.current);
    if (closeTimer.current) clearTimeout(closeTimer.current);
  };

  useEffect(() => clearTimers, []);

  const scheduleOpen = () => {
    if (!canPreview) return;
    if (closeTimer.current) clearTimeout(closeTimer.current);
    if (open) return;
    if (openTimer.current) clearTimeout(openTimer.current);
    openTimer.current = setTimeout(() => setOpen(true), OPEN_DELAY);
  };

  const scheduleClose = () => {
    if (openTimer.current) clearTimeout(openTimer.current);
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => setOpen(false), CLOSE_DELAY);
  };

  const handlePointerEnter = (event: PointerEvent) => {
    if (event.pointerType === "mouse") scheduleOpen();
  };

  const handleFocus = () => scheduleOpen();

  const handleBlur = (event: FocusEvent<HTMLDivElement>) => {
    if (!event.currentTarget.contains(event.relatedTarget)) scheduleClose();
  };

  const handlePlay = () => {
    const progress = watchAction?.watch_progress;
    const nextEpisode = watchAction?.next_episode;
    const request = {
      mediaType,
      mediaSource: item.media_source,
      sourceId: sourceID,
      originalAudioLang: preview.original_language,
      ...(mediaType === "tv"
        ? {
            season: progress?.season_number ?? nextEpisode?.season_number ?? 1,
            episode:
              progress?.episode_number ?? nextEpisode?.episode_number ?? 1,
          }
        : {}),
      ...(progress
        ? {
            encodedData: progress.encoded_data,
            watchProgress: progress,
          }
        : {}),
    };
    setOpen(false);
    void openStream(request);
  };

  const isInHound = mediaFiles?.providers?.some(
    (provider: any) => provider?.streams?.length > 0,
  );
  const year = preview.release_date?.slice(0, 4);
  const genres = preview.genres
    ?.map((genre: { genre?: string }) => genre.genre)
    .filter(Boolean)
    .slice(0, 3)
    .join(", ");
  const metadata = [
    year,
    preview.status === "Ended" ? "Finished Airing" : preview.status,
    formatDuration(preview.duration),
    genres,
  ]
    .filter(Boolean)
    .join("  ·  ");
  const creators = preview.creators
    ?.map((creator: { name?: string }) => creator.name)
    .filter(Boolean)
    .slice(0, 3)
    .join(", ");
  const progress = watchAction?.watch_progress;
  const nextEpisode = watchAction?.next_episode;
  const playLabel = progress
    ? mediaType === "tv"
      ? `Resume S${progress.season_number}E${progress.episode_number}`
      : "Resume"
    : mediaType === "tv" && nextEpisode
      ? `Play S${nextEpisode.season_number}E${nextEpisode.episode_number}`
      : mediaType === "tv"
        ? "Play S1E1"
        : "Play Movie";

  return (
    <>
      <div
        ref={anchorRef}
        className="media-preview-anchor"
        onPointerEnter={handlePointerEnter}
        onPointerLeave={scheduleClose}
        onFocus={handleFocus}
        onBlur={handleBlur}
      >
        {children}
      </div>
      <Popper
        open={open}
        anchorEl={anchorRef.current}
        placement="right-start"
        transition
        className="media-preview-popper"
        modifiers={[
          {
            name: "offset",
            options: { offset: [0, 12] },
          },
          {
            name: "flip",
            options: {
              fallbackPlacements: ["left-start", "bottom", "top"],
            },
          },
          {
            name: "preventOverflow",
            options: { padding: 16 },
          },
        ]}
      >
        {({ TransitionProps }) => (
          <Fade {...TransitionProps} timeout={180}>
            <Paper
              elevation={18}
              className="media-preview-card"
              role="dialog"
              aria-label={`${preview.media_title ?? "Media"} preview`}
              onFocus={() => {
                if (closeTimer.current) clearTimeout(closeTimer.current);
              }}
              onBlur={scheduleClose}
              onPointerEnter={(event) => {
                if (event.pointerType === "mouse" && closeTimer.current) {
                  clearTimeout(closeTimer.current);
                }
              }}
              onPointerLeave={scheduleClose}
            >
              {preview.backdrop_uri && (
                <div
                  className="media-preview-backdrop"
                  style={{ backgroundImage: `url(${preview.backdrop_uri})` }}
                />
              )}
              <div className="media-preview-shade" />
              <div className="media-preview-content">
                {isInHound && (
                  <Chip
                    label="In Hound"
                    size="small"
                    className="media-preview-hound-chip"
                  />
                )}
                <div className="media-preview-heading">
                  {preview.logo_uri ? (
                    <img
                      className="media-preview-logo"
                      src={preview.logo_uri}
                      alt={preview.media_title ?? ""}
                    />
                  ) : (
                    <div className="media-preview-title">
                      {preview.media_title}
                    </div>
                  )}
                </div>

                {isLoading && !details ? (
                  <div className="media-preview-loading">
                    <Skeleton variant="text" width="72%" />
                    <Skeleton variant="text" width="92%" />
                    <Skeleton variant="text" width="84%" />
                  </div>
                ) : (
                  <>
                    <div className="media-preview-badges">
                      {metadata && (
                        <div className="media-preview-metadata">{metadata}</div>
                      )}
                    </div>
                    <div className="media-preview-overview">
                      {preview.overview ||
                        (isError
                          ? "Details are currently unavailable."
                          : "No description available.")}
                    </div>
                    {creators && (
                      <div className="media-preview-creators">
                        by {creators}
                      </div>
                    )}
                  </>
                )}
                <div className="media-preview-actions">
                  <Button
                    id="media-preview-play-button"
                    variant="contained"
                    startIcon={<PlayArrowRoundedIcon />}
                    onClick={handlePlay}
                  >
                    {playLabel}
                  </Button>
                  <Button
                    id="media-preview-collection-button"
                    variant="contained"
                    startIcon={<PlaylistAddIcon />}
                    onClick={() => {
                      setOpen(false);
                      setCollectionOpen(true);
                    }}
                  >
                    Add to Collection
                  </Button>
                </div>
              </div>
            </Paper>
          </Fade>
        )}
      </Popper>
      {collectionOpen && (
        <AddToCollectionModal
          open={collectionOpen}
          onClose={() => setCollectionOpen(false)}
          item={preview}
        />
      )}
    </>
  );
}

export default MediaPreview;
