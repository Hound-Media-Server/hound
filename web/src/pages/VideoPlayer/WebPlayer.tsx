import { MoviPlayer } from "movi-player/react";

export function WebPlayer({ src }: { src: string }) {
  return (
    <MoviPlayer
      src={src}
      controls
      autoplay
      style={{ display: "block", width: "100%", height: "100%" }}
    />
  );
}
