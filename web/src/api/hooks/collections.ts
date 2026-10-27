import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import {
  fetchAllCollections,
  fetchCollectionContents,
  fetchRecentCollectionItems,
  createCollection,
  updateCollection,
  fetchPublicCollections,
  fetchInWatchlist,
  setWatchlist,
} from "../services/collections";

export const useCollections = () => {
  return useQuery({
    queryKey: ["collections", "all"],
    queryFn: fetchAllCollections,
  });
};

export const usePublicCollections = () => {
  return useQuery({
    queryKey: ["collections", "public"],
    queryFn: fetchPublicCollections,
  });
}

export const useCollectionContents = (id: number | string | undefined, limit?: number, offset?: number, enabled = true) => {
  return useQuery({
    queryKey: ["collections", id, "contents", limit, offset],
    queryFn: () => fetchCollectionContents(id!, limit, offset),
    enabled: !!id && enabled,
  });
};

export const useRecentCollectionItems = () => {
  return useQuery({
    queryKey: ["collections", "recent"],
    queryFn: fetchRecentCollectionItems,
  });
};

export const useInWatchlist = (mediaType: string, mediaSource: string, sourceId: string, enabled = true) => {
  return useQuery({
    queryKey: ["collections", "watchlist", mediaType, mediaSource, sourceId],
    queryFn: () => fetchInWatchlist(mediaType, mediaSource, sourceId),
    enabled,
  });
};

export const useSetWatchlist = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: setWatchlist,
    onSuccess: (_, variables) => {
      toast.success(variables.add ? "Added to Watchlist" : "Removed from Watchlist");
      queryClient.invalidateQueries({ queryKey: ["collections"] });
    },
  });
};

export const useCreateCollection = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createCollection,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["collections", "all"] });
    },
  });
};

export const useUpdateCollection = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateCollection,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["collections", String(variables.collectionID), "contents"] });
    },
  });
};
