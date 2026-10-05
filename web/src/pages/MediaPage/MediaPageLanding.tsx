import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import MediaPageTV from "./MediaPageTV";
import MediaPageMovie from "./MediaPageMovie";
import { LinearProgress } from "@mui/material";
import toast from "react-hot-toast";
import { useMediaDetails } from "../../api/hooks/media";
import type { MediaType } from "../../api/services/media";

function MediaPageLanding() {
  const location = useLocation();
  const pathData = location.pathname.split("/");
  const mediaType = pathData[1];
  const isSupportedMediaType = ["movie", "tv", "game"].includes(mediaType);
  const queryMediaType: MediaType = isSupportedMediaType
    ? (mediaType as MediaType)
    : "movie";
  const mediaID = pathData[2] ?? "";
  const mediaSource = mediaID.split("-")?.[0] || "";
  const sourceID = mediaID.split("-")?.[1] || "";
  const { data, isLoading, isError } = useMediaDetails(
    queryMediaType,
    mediaSource,
    sourceID,
    isSupportedMediaType,
  );

  useEffect(() => {
    if (isError) toast.error("Failed to load content");
  }, [isError]);

  var mediaComponent;
  switch (mediaType) {
    case "tv":
      mediaComponent = <MediaPageTV data={data} />;
      break;
    case "movie":
      mediaComponent = <MediaPageMovie data={data} />;
      break;
  }
  return (
    <div className="dark-page media-page">
      {!isLoading && data ? (
        <>{mediaComponent}</>
      ) : (
        <LinearProgress className="progress-margin" />
      )}
    </div>
  );
}

export default MediaPageLanding;
