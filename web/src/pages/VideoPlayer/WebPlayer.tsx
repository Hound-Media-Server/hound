import { useCallback, useEffect, useRef, useState } from "react";
import { IconButton } from "@mui/material";
import {
  ArrowBack,
  InfoOutlined,
  PlaylistPlay,
  VideoLibraryOutlined,
} from "@mui/icons-material";
import { MoviPlayer, type MoviElement } from "movi-player/react";
import { get2LetterLangCode } from "../../helpers/locale";
import { SegmentMedia, useVideoSegments } from "../../api/hooks/segments";
import {
  canSkipSegment,
  nextEpisodePlayerSettings,
  skipVideoSegment,
} from "../../utils/videoSegments";
import { SkipSegmentButton } from "./SkipSegmentButton";

type PlayerSettings = {
  player?: string;
  audio_idx?: number | null;
  audio_lang?: string;
  subtitle_idx?: number | null;
  subtitle_lang?: string;
  resize_mode?: string;
};

type WebPlayerProps = {
  src: string;
  startTime?: number;
  playerSettings?: PlayerSettings;
  isStreamsMatch?: boolean;
  originalAudioLang?: string;
  mediaDetails?: any;
  onVideoProgress?: (
    current: number,
    total: number,
    playerSettings: PlayerSettings,
  ) => void;
  handleClose?: () => void;
  setInfoModalOpen?: (open: boolean) => void;
  onChangeSource?: (currentTime: number) => void;
  onViewEpisodes?: () => void;
  segmentMedia?: SegmentMedia;
  onNextEpisode?: (settings: PlayerSettings) => Promise<void>;
  isOverlayOpen?: boolean;
};

export function WebPlayer({
  src,
  startTime = 0,
  playerSettings,
  isStreamsMatch,
  originalAudioLang,
  mediaDetails,
  onVideoProgress,
  handleClose,
  setInfoModalOpen,
  onChangeSource,
  onViewEpisodes,
  segmentMedia,
  onNextEpisode,
  isOverlayOpen,
}: WebPlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<MoviElement>(null);
  const controlsRef = useRef<HTMLDivElement>(null);
  const controlsHoveredRef = useRef(false);
  const inactivityTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const lastReportTimeRef = useRef(0);
  const skipSegment = useVideoSegments(
    segmentMedia,
    src,
    duration,
    currentTime,
    !!onNextEpisode,
  );
  const latestRef = useRef({
    startTime,
    playerSettings,
    isStreamsMatch,
    originalAudioLang,
    onVideoProgress,
  });
  latestRef.current = {
    startTime,
    playerSettings,
    isStreamsMatch,
    originalAudioLang,
    onVideoProgress,
  };

  const showControls = useCallback(() => {
    setControlsVisible(true);
    if (inactivityTimerRef.current !== null) {
      clearTimeout(inactivityTimerRef.current);
    }
    inactivityTimerRef.current = setTimeout(() => {
      if (
        !controlsHoveredRef.current &&
        !controlsRef.current?.contains(document.activeElement)
      ) {
        setControlsVisible(false);
      }
      inactivityTimerRef.current = null;
    }, 3000);
  }, []);

  useEffect(() => {
    showControls();
    return () => {
      if (inactivityTimerRef.current !== null) {
        clearTimeout(inactivityTimerRef.current);
      }
    };
  }, [showControls]);

  useEffect(() => {
    const container = containerRef.current;
    const player = playerRef.current;
    if (!container || !player) return;

    const syncFullscreen = () => {
      player.setHostFullscreen(document.fullscreenElement === container);
    };
    const handleFullscreenRequest = (event: Event) => {
      if (!document.fullscreenEnabled || !container.requestFullscreen) return;
      event.preventDefault();
      const request =
        document.fullscreenElement === container
          ? document.exitFullscreen()
          : container.requestFullscreen();
      void request.catch((error) => {
        console.error("Failed to toggle player fullscreen:", error);
      });
    };

    container.addEventListener(
      "movi-fullscreen-request",
      handleFullscreenRequest,
    );
    document.addEventListener("fullscreenchange", syncFullscreen);
    syncFullscreen();
    return () => {
      container.removeEventListener(
        "movi-fullscreen-request",
        handleFullscreenRequest,
      );
      document.removeEventListener("fullscreenchange", syncFullscreen);
      if (document.fullscreenElement === container) {
        void document.exitFullscreen();
      }
      player.setHostFullscreen(false);
    };
  }, []);

  useEffect(() => {
    const element = playerRef.current;
    if (!element) return;

    let audioInitialized = false;
    let subtitlesInitialized = false;
    lastReportTimeRef.current = 0;

    const initializeTracks = () => {
      const player = element.player;
      if (!player) return;
      const {
        playerSettings: settings,
        isStreamsMatch: sameStream,
        originalAudioLang: originalLang,
      } = latestRef.current;

      const audioTracks = player.getAudioTracks();
      if (!audioInitialized && audioTracks.length > 0) {
        audioInitialized = true;
        let audioTrack =
          sameStream && settings?.audio_idx != null && settings.audio_idx > 0
            ? audioTracks[settings.audio_idx - 1]
            : undefined;
        if (!audioTrack) {
          const language =
            get2LetterLangCode(settings?.audio_lang) ||
            get2LetterLangCode(originalLang);
          audioTrack = audioTracks.find(
            (track) => get2LetterLangCode(track.language) === language,
          );
        }
        if (
          audioTrack &&
          player.trackManager.getActiveAudioTrack()?.id !== audioTrack.id
        ) {
          player.selectAudioTrack(audioTrack.id);
        }
      }

      const subtitleTracks = player.getSubtitleTracks();
      if (!subtitlesInitialized && subtitleTracks.length > 0) {
        subtitlesInitialized = true;
        let subtitleTrack;
        if (sameStream && settings?.subtitle_idx === 0) {
          void player.selectSubtitleTrack(null).catch((err) => {
            console.error("Failed to restore subtitle selection:", err);
          });
          return;
        }
        if (
          sameStream &&
          settings?.subtitle_idx != null &&
          settings.subtitle_idx > 0
        ) {
          subtitleTrack = subtitleTracks[settings.subtitle_idx - 1];
        }
        if (!subtitleTrack) {
          const language = get2LetterLangCode(settings?.subtitle_lang) || "en";
          subtitleTrack = subtitleTracks.find(
            (track) => get2LetterLangCode(track.language) === language,
          );
        }
        if (
          subtitleTrack &&
          player.trackManager.getActiveSubtitleTrack()?.id !== subtitleTrack.id
        ) {
          void player.selectSubtitleTrack(subtitleTrack.id).catch((err) => {
            console.error("Failed to restore subtitle selection:", err);
          });
        }
      }
    };

    element.addEventListener("trackschange", initializeTracks);
    element.addEventListener("loadedmetadata", initializeTracks);
    initializeTracks();
    return () => {
      element.removeEventListener("trackschange", initializeTracks);
      element.removeEventListener("loadedmetadata", initializeTracks);
    };
  }, [src]);

  // handle initial seek, not using the players startat prop because that
  // is somehow much slower than this solution, by my testing
  useEffect(() => {
    const element = playerRef.current;
    if (!element) return;
    const restorePosition = () => {
      const time = latestRef.current.startTime;
      if (Number.isFinite(time) && time > 0) {
        element.currentTime = time;
      }
    };
    if (element.playing) {
      restorePosition();
    } else {
      element.addEventListener("play", restorePosition, { once: true });
    }
    return () => element.removeEventListener("play", restorePosition);
  }, [src]);

  const handleTimeUpdate = useCallback((current: number) => {
    const element = playerRef.current;
    const player = element?.player;
    const duration = element?.duration;
    if (Number.isFinite(current)) setCurrentTime(Math.floor(current));
    if (
      typeof duration === "number" &&
      Number.isFinite(duration) &&
      duration > 0
    ) {
      setDuration(duration);
    }
    if (
      !player ||
      typeof duration !== "number" ||
      !Number.isFinite(current) ||
      !Number.isFinite(duration) ||
      duration <= 0 ||
      Math.abs(current - lastReportTimeRef.current) < 5
    ) {
      return;
    }

    lastReportTimeRef.current = current;
    const audioTrack = player.trackManager.getActiveAudioTrack();
    const subtitleTrack = player.trackManager.getActiveSubtitleTrack();
    const audioTracks = player.getAudioTracks();
    const subtitleTracks = player.getSubtitleTracks();
    const audioIndex = audioTrack
      ? audioTracks.findIndex((track) => track.id === audioTrack.id)
      : -1;
    const subtitleIndex = subtitleTrack
      ? subtitleTracks.findIndex((track) => track.id === subtitleTrack.id)
      : -1;
    let subtitleIdx: number | null = 0;
    if (subtitleTrack) {
      subtitleIdx = subtitleIndex >= 0 ? subtitleIndex + 1 : null;
    }
    const fit = element.objectFit;
    const resizeMode =
      fit === "cover" || fit === "fill" || fit === "zoom" ? "cover" : "contain";
    latestRef.current.onVideoProgress?.(Math.min(current, duration), duration, {
      player: "web",
      audio_idx: audioIndex >= 0 ? audioIndex + 1 : null,
      audio_lang: get2LetterLangCode(audioTrack?.language),
      subtitle_idx: subtitleIdx,
      subtitle_lang: get2LetterLangCode(subtitleTrack?.language),
      resize_mode: resizeMode,
    });
  }, []);

  const handleSkip = async () => {
    if (!canSkipSegment(skipSegment, duration <= 0, isOverlayOpen)) return;
    const element = playerRef.current;
    if (!element) return;
    try {
      await skipVideoSegment(
        skipSegment,
        (time) => {
          element.currentTime = time;
        },
        () => {
          const player = element.player;
          const fit = element.objectFit;
          return onNextEpisode?.(
            nextEpisodePlayerSettings(
              "web",
              fit,
              get2LetterLangCode(
                player?.trackManager.getActiveAudioTrack()?.language,
              ),
              get2LetterLangCode(
                player?.trackManager.getActiveSubtitleTrack()?.language,
              ),
            ),
          );
        },
      );
    } catch (error) {
      console.error("Movi skip error:", error);
    }
  };

  const pausePlayer = () => {
    void playerRef.current?.pause();
  };

  const savedFit = playerSettings?.resize_mode;
  const objectFit =
    savedFit === "cover" || savedFit === "fill" || savedFit === "zoom"
      ? "cover"
      : "contain";

  return (
    <div
      ref={containerRef}
      onPointerEnter={showControls}
      onPointerMove={showControls}
      onFocusCapture={showControls}
      onBlurCapture={showControls}
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        background: "black",
      }}
    >
      <MoviPlayer
        ref={playerRef}
        persist=""
        thumb
        objectfit={objectFit}
        src={src}
        controls
        fastseek
        autoplay
        poster={mediaDetails?.backdrop_uri}
        subtitleedge="shadow"
        posterfit="cover"
        onTimeUpdate={handleTimeUpdate}
        style={{ display: "block", width: "100%", height: "100%" }}
      />
      <div
        ref={controlsRef}
        onPointerEnter={() => {
          controlsHoveredRef.current = true;
          showControls();
        }}
        onPointerLeave={() => {
          controlsHoveredRef.current = false;
          showControls();
        }}
        style={{
          position: "absolute",
          top: 16,
          left: 16,
          // Movi's iOS fullscreen fallback uses this layer level on its host.
          zIndex: 2147483647,
          display: "flex",
          background: "rgba(0, 0, 0, 0.45)",
          borderRadius: 8,
          opacity: controlsVisible ? 1 : 0,
          pointerEvents: controlsVisible ? "auto" : "none",
          transition: "opacity 0.25s ease",
        }}
      >
        <IconButton
          aria-label="Close player"
          onClick={() => {
            pausePlayer();
            handleClose?.();
          }}
          sx={{ color: "white" }}
        >
          <ArrowBack />
        </IconButton>
        {onChangeSource && (
          <IconButton
            aria-label="Change source"
            onClick={() => {
              pausePlayer();
              onChangeSource(playerRef.current?.currentTime ?? 0);
            }}
            sx={{ color: "white" }}
          >
            <VideoLibraryOutlined />
          </IconButton>
        )}
        {onViewEpisodes && (
          <IconButton
            aria-label="View episodes"
            onClick={() => {
              pausePlayer();
              onViewEpisodes();
            }}
            sx={{ color: "white" }}
          >
            <PlaylistPlay />
          </IconButton>
        )}
        {setInfoModalOpen && (
          <IconButton
            aria-label="Stream info"
            onClick={() => setInfoModalOpen(true)}
            sx={{ color: "white" }}
          >
            <InfoOutlined />
          </IconButton>
        )}
      </div>
      {canSkipSegment(skipSegment, duration <= 0, isOverlayOpen) && (
        <SkipSegmentButton
          segment={skipSegment}
          onSkip={handleSkip}
          bottom={controlsVisible ? 112 : 24}
          controlsVisible={controlsVisible}
        />
      )}
    </div>
  );
}
