import { ReactNode, useEffect, useState } from "react";
import { IconButton } from "@mui/material";
import { ArrowBack } from "@mui/icons-material";
import "./ElectronVideoControls.css";

const loadedBackdrops = new Set<string>();

type Props = {
  visible: boolean;
  mediaDetails?: any;
  onClose?: () => void;
  children?: ReactNode;
};

export function PlayerLoadingOverlay({
  visible,
  mediaDetails,
  onClose,
  children,
}: Props) {
  const backdropUri = mediaDetails?.backdrop_uri as string | undefined;
  const [loadedBackdropUri, setLoadedBackdropUri] = useState<string | null>(
    () =>
      backdropUri && loadedBackdrops.has(backdropUri) ? backdropUri : null,
  );
  useEffect(() => {
    if (!backdropUri) return;
    if (loadedBackdrops.has(backdropUri)) {
      setLoadedBackdropUri(backdropUri);
      return;
    }
    const image = new Image();
    image.onload = () => {
      loadedBackdrops.add(backdropUri);
      setLoadedBackdropUri(backdropUri);
    };
    image.onerror = () => setLoadedBackdropUri(backdropUri);
    image.src = backdropUri;
    return () => {
      image.onload = image.onerror = null;
    };
  }, [backdropUri]);

  const releaseYear =
    mediaDetails?.release_date?.slice(0, 4) ||
    mediaDetails?.first_air_date?.slice(0, 4);
  return (
    <div
      className={`mpv-loading-overlay${visible ? "" : " mpv-loading-overlay-hidden"}`}
      aria-busy={visible}
    >
      {onClose && (
        <IconButton
          aria-label="Close player"
          onClick={onClose}
          sx={{
            position: "absolute",
            top: 16,
            left: 16,
            color: "white",
            zIndex: 10,
          }}
        >
          <ArrowBack />
        </IconButton>
      )}
      {backdropUri && (
        <div
          className={`mpv-loading-backdrop${loadedBackdropUri === backdropUri ? " mpv-loading-backdrop-visible" : ""}`}
          style={{ backgroundImage: `url(${backdropUri})` }}
        />
      )}
      <div className="mpv-loading-shade" />
      {mediaDetails?.logo_uri ? (
        <img className="mpv-loading-logo" src={mediaDetails.logo_uri} alt="" />
      ) : (
        <div className="mpv-loading-title">
          {mediaDetails?.media_title}
          {releaseYear ? ` (${releaseYear})` : ""}
        </div>
      )}
      {children && <div className="stream-loading-message">{children}</div>}
    </div>
  );
}
