package model

import (
	"fmt"
	"time"

	"github.com/mcay23/hound/database"
	"github.com/mcay23/hound/internal"
	"github.com/mcay23/hound/sources"
)

const showSegmentsCacheKey = "intro_segments|%s-%s|tvshow|%d|%d|%d"

func GetTVShowIntroSegments(mediaSource string, sourceID string, season int, episode int, duration int) (*sources.IntroSegments, error) {
	cacheKey := fmt.Sprintf(showSegmentsCacheKey, mediaSource, sourceID, season, episode, duration)
	var cacheObject sources.IntroSegments
	cacheExists, _ := database.GetCache(cacheKey, &cacheObject)
	if cacheExists {
		return &cacheObject, nil
	}
	segments, err := sources.GetTVShowIntroSegmentsTIDB(mediaSource, sourceID, season, episode, duration)
	if err != nil {
		return nil, err
	}
	if segments == nil {
		return nil, fmt.Errorf("Error retrieving segments data: segments is nil: %w", internal.InternalServerError)
	}
	_, _ = database.SetCache(cacheKey, segments, 1*time.Hour)
	return segments, nil
}
