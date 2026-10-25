import { useInWatchlist, useSetWatchlist } from "../../api/hooks/collections";
import "./MediaPreview.css";

function WatchlistBookmark({
  mediaType,
  mediaSource,
  sourceId,
  enabled = true,
}: {
  mediaType: string;
  mediaSource: string;
  sourceId: string;
  enabled?: boolean;
}) {
  const { data: inWatchlist } = useInWatchlist(
    mediaType,
    mediaSource,
    sourceId,
    enabled,
  );
  const { mutate: setWatchlist } = useSetWatchlist();
  return (
    <button
      className={`media-preview-bookmark${inWatchlist ? " active" : ""}`}
      title={inWatchlist ? "Remove from Watchlist" : "Add to Watchlist"}
      onClick={() =>
        setWatchlist({ mediaType, mediaSource, sourceId, add: !inWatchlist })
      }
    />
  );
}

export default WatchlistBookmark;
