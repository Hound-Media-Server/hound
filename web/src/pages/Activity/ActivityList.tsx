import { useState } from "react";
import dayjs from "dayjs";
import { Button, Dialog } from "@mui/material";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import toast from "react-hot-toast";
import { WatchActivity } from "../../api/services/watchHistory";
import { useDeleteWatchHistoryMutation } from "../../api/hooks/watchHistory";
import "./ActivityList.css";

function formatDuration(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h ? `${h}h${m ? ` ${m}m` : ""}` : `${m}m`;
}

export default function ActivityList({
  activity,
}: {
  activity: WatchActivity[];
}) {
  const [pendingDelete, setPendingDelete] = useState<WatchActivity | null>(
    null,
  );
  const deleteMutation = useDeleteWatchHistoryMutation();

  const handleDelete = () => {
    if (!pendingDelete) return;
    const isEpisode = pendingDelete.record_type === "episode";
    deleteMutation.mutate(
      {
        mediaType: isEpisode ? "tv" : "movie",
        mediaSource: pendingDelete.media_source,
        sourceID: (isEpisode
          ? pendingDelete.show_source_id
          : pendingDelete.source_id) as string,
        watchEventIDs: [pendingDelete.watch_event_id],
      },
      {
        onSuccess: () => toast.success("Watch history deleted"),
        onError: () => toast.error("Error deleting watch history"),
        onSettled: () => setPendingDelete(null),
      },
    );
  };

  if (activity.length === 0) {
    return (
      <div className="activity-list-empty">No watch activity this month.</div>
    );
  }

  return (
    <div className="activity-list">
      {activity.map((item, i) => {
        const day = dayjs(item.watched_at).format("YYYY-MM-DD");
        const isNewDay =
          i === 0 ||
          day !== dayjs(activity[i - 1].watched_at).format("YYYY-MM-DD");
        const isEpisode = item.record_type === "episode";
        const image = isEpisode
          ? item.thumbnail_uri || item.show_backdrop_uri
          : item.backdrop_uri || item.thumbnail_uri;
        const title = isEpisode
          ? item.show_media_title || "Unknown Show"
          : item.media_title;
        const subtitle = isEpisode
          ? `S${item.season_number}E${item.episode_number} · ${item.media_title}`
          : item.release_date?.substring(0, 4);

        return (
          <div key={item.watch_event_id}>
            {isNewDay && (
              <h3 className="activity-list-date">
                {dayjs(item.watched_at).format("dddd, D MMMM YYYY")}
              </h3>
            )}
            <div className="activity-list-item">
              <a
                className="activity-list-image-link"
                href={
                  isEpisode
                    ? `/tv/${item.media_source}-${item.show_source_id}`
                    : `/movie/${item.media_source}-${item.source_id}`
                }
              >
                {image ? (
                  <img
                    className="activity-list-image"
                    src={image}
                    alt=""
                    loading="lazy"
                  />
                ) : (
                  <div className="activity-list-image" />
                )}
              </a>
              <div className="activity-list-details">
                <div className="activity-list-title">{title}</div>
                {subtitle && (
                  <div className="activity-list-subtitle">{subtitle}</div>
                )}
                <div className="activity-list-muted">
                  {item.duration ? `${formatDuration(item.duration)} · ` : ""}
                  Watched {dayjs(item.watched_at).format("h:mm A")}
                </div>
                <div className="activity-list-actions">
                  <Button
                    size="small"
                    variant="outlined"
                    className="activity-list-delete"
                    startIcon={<DeleteOutlineIcon />}
                    onClick={() => setPendingDelete(item)}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            </div>
          </div>
        );
      })}
      <Dialog open={!!pendingDelete} onClose={() => setPendingDelete(null)}>
        <div className="activity-delete-modal">
          <h4>Delete Watch History</h4>
          <p>
            Remove this watch of{" "}
            {pendingDelete?.record_type === "episode"
              ? `${pendingDelete.show_media_title} S${pendingDelete.season_number}E${pendingDelete.episode_number}`
              : pendingDelete?.media_title}{" "}
            from your history?
          </p>
          <div className="d-flex justify-content-end">
            <Button onClick={() => setPendingDelete(null)}>Cancel</Button>
            <Button
              color="error"
              disabled={deleteMutation.isPending}
              onClick={handleDelete}
            >
              Delete
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
