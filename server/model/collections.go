package model

import (
	"fmt"
	"log/slog"
	"slices"
	"time"

	"github.com/mcay23/hound/database"
	"github.com/mcay23/hound/internal"
	"github.com/mcay23/hound/sources"
)

const collectionKindCacheKeyFmt = "collection_kind|%d|%s" // userID, kind

func IsInKindCollection(userID int64, kind, mediaType, mediaSource, sourceID string) (bool, error) {
	cacheKey := fmt.Sprintf(collectionKindCacheKeyFmt, userID, kind)
	var items []string
	if found, err := database.GetCache(cacheKey, &items); err != nil || !found {
		records, err := database.GetKindCollectionItems(userID, kind)
		if err != nil {
			return false, err
		}
		items = make([]string, 0, len(records))
		for _, r := range records {
			items = append(items, r.MediaType+"|"+r.MediaSource+"|"+r.SourceID)
		}
		_, _ = database.SetCache(cacheKey, items, 2*time.Hour)
	}
	return slices.Contains(items, mediaType+"|"+mediaSource+"|"+sourceID), nil
}

func AddMediaToCollection(userID int64, mediaType, mediaSource string, sourceID int, collectionID int64) error {
	switch mediaType {
	case database.MediaTypeTVShow:
		if err := sources.AddTVShowToCollectionTMDB(userID, mediaSource, sourceID, collectionID); err != nil {
			return fmt.Errorf("failed to add tv show to collection: %w", err)
		}
	case database.MediaTypeMovie:
		if err := sources.AddMovieToCollectionTMDB(userID, mediaSource, sourceID, collectionID); err != nil {
			return fmt.Errorf("failed to add movie to collection: %w", err)
		}
	default:
		return fmt.Errorf("unsupported media type: %s", mediaType)
	}
	invalidateKindCollection(userID, collectionID)
	return nil
}

func RemoveMediaFromCollection(userID int64, mediaType, mediaSource, sourceID string, collectionID int64) error {
	has, record, err := database.GetMediaRecord(mediaType, mediaSource, sourceID)
	if err != nil {
		return fmt.Errorf("failed to get media record: %w", err)
	}
	if !has {
		return fmt.Errorf("could not find media record: %w", internal.BadRequestError)
	}
	if err = database.DeleteCollectionRelation(userID, record.RecordID, collectionID); err != nil {
		return fmt.Errorf("failed to delete collection record: %w", err)
	}
	invalidateKindCollection(userID, collectionID)
	return nil
}

func invalidateKindCollection(userID, collectionID int64) {
	collection, err := database.GetCollection(collectionID)
	if err != nil || collection.Kind == "" {
		return
	}
	if err = database.DeleteCache(fmt.Sprintf(collectionKindCacheKeyFmt, userID, collection.Kind)); err != nil {
		slog.Error("failed to invalidate kind collection cache", "user_id", userID, "kind", collection.Kind, "err", err)
	}
}
