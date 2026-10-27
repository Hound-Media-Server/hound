import axios from "axios";

export const fetchAllCollections = async () => {
  const { data } = await axios.get("/api/v1/collection/all");
  return data;
};

export const fetchPublicCollections = async () => {
  const { data } = await axios.get("/api/v1/collection/public");
  return data;
}

export const fetchCollectionContents = async (id: number | string, limit = 20, offset = 0) => {
  const { data } = await axios.get(`/api/v1/collection/${id}?limit=${limit}&offset=${offset}`);
  return data;
};

export const fetchRecentCollectionItems = async () => {
  const { data } = await axios.get("/api/v1/collection/recent");
  return data;
};

export const fetchInWatchlist = async (mediaType: string, mediaSource: string, sourceId: string) => {
  const { data } = await axios.get("/api/v1/collection/watchlist/contains", {
    params: { media_type: mediaType, media_source: mediaSource, source_id: sourceId },
  });
  return data.contains as boolean;
};

export const setWatchlist = async (item: {
  mediaType: string;
  mediaSource: string;
  sourceId: string;
  add: boolean;
}) => {
  const body = { media_type: item.mediaType, media_source: item.mediaSource, source_id: item.sourceId };
  if (item.add) {
    await axios.post("/api/v1/collection/watchlist", body);
  } else {
    await axios.delete("/api/v1/collection/watchlist", { data: body });
  }
};

export const createCollection = async (collectionData: {
  collection_title: string;
  description: string;
  is_public: boolean;
}) => {
  const { data } = await axios.post("/api/v1/collection/new", collectionData);
  return data;
};

export const updateCollection = async (collectionData: {
  collectionID: number;
  collection_title?: string;
  description?: string;
  is_public: boolean;
}) => {
  const { data } = await axios.put(`/api/v1/collection/${collectionData.collectionID}`, {
    collection_title: collectionData.collection_title,
    description: collectionData.description,
    is_public: collectionData.is_public,
  });
  return data;
};