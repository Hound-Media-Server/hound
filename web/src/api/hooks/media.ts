import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  cancelDownload,
  deleteMediaFile,
  downloadSeason,
  fetchDownloads,
  fetchMediaFiles,
  fetchSeasonDetails,
} from "../services/media";

export const useDownloads = (
  limit: number,
  offset: number,
  refetchInterval?: number,
) => {
  return useQuery({
    queryKey: ["downloads", limit, offset],
    queryFn: () => fetchDownloads(limit, offset),
    refetchInterval,
  });
};

export const useCancelDownload = (taskID: number) => {
  return useMutation({
    mutationFn: () => cancelDownload(taskID),
  });
};

export const useMediaFiles = (
  mediaType: string,
  mediaSource: string,
  sourceID: string,
  season?: number | null,
  episode?: number | null,
  checkFile = false,
) => {
  return useQuery({
    queryKey: [
      "media-files",
      mediaType,
      mediaSource,
      sourceID,
      season,
      episode,
      checkFile,
    ],
    queryFn: () =>
      fetchMediaFiles(
        mediaType,
        mediaSource,
        sourceID,
        season,
        episode,
        checkFile,
      ),
  });
};

export const useSeasonDetails = (
  mediaSource: string,
  sourceID: string,
  seasonNumber: number,
  enabled = true,
) => {
  return useQuery({
    queryKey: ["season-details", mediaSource, sourceID, seasonNumber],
    queryFn: () => fetchSeasonDetails(mediaSource, sourceID, seasonNumber),
    enabled:
      enabled && !!mediaSource && !!sourceID && seasonNumber !== undefined,
    staleTime: 30 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
};

export const useDownloadSeason = () => {
  return useMutation({
    mutationFn: downloadSeason,
  });
};

export const useDeleteMediaFileMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (fileID: number) => deleteMediaFile(fileID),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["media-files"] });
    },
  });
};

export const useDeleteMediaFile = useDeleteMediaFileMutation;
