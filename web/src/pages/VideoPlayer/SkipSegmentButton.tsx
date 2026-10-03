import { Button } from "@mui/material";
import { useEffect } from "react";
import type { SegmentAction } from "../../utils/videoSegments";
import "./SkipSegmentButton.css";

export function SkipSegmentButton({
  segment,
  onSkip,
  bottom,
  controlsVisible,
}: {
  segment: SegmentAction;
  onSkip: () => void;
  bottom: number;
  controlsVisible: boolean;
}) {
  useEffect(() => {
    if (controlsVisible) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Enter" || event.isComposing) return;
      event.preventDefault();
      event.stopPropagation();
      if (!event.repeat) onSkip();
    };
    window.addEventListener("keydown", handleKeyDown, true);
    return () => window.removeEventListener("keydown", handleKeyDown, true);
  }, [controlsVisible, onSkip]);

  return (
    <Button
      className="controls-skip-button"
      onClick={onSkip}
      style={{ bottom }}
      disableRipple
    >
      {segment.label}
    </Button>
  );
}
