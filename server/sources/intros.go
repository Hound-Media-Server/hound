package sources

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"
	"time"

	"github.com/mcay23/hound/database"
	"github.com/mcay23/hound/internal"
)

// we are using theIntroDB (https://theintrodb.org/docs) for our intros provider, since they natively support tmdb ids
const (
	tidbURL = "https://api.theintrodb.org/v3/media?tmdb_id=%d&season=%d&episode=%d"
)

// intro is a misnomer, since credits, etc. are also included, but it's easier to remember
type IntroSegments struct {
	MediaType       string      `json:"media_type"`
	MediaSource     string      `json:"media_source"`
	SourceID        string      `json:"source_id"`
	Season          *int        `json:"season,omitempty"`
	Episode         *int        `json:"episode,omitempty"`
	IntroSegments   []timestamp `json:"intro"`
	TecapSegments   []timestamp `json:"recap"`
	CreditsSegments []timestamp `json:"credits"`
	PreviewSegments []timestamp `json:"preview"`
}

type tidbResponse struct {
	MediaType       string      `json:"type"`
	TmdbID          int         `json:"tmdb_id"`
	Season          *int        `json:"season,omitempty"`
	Episode         *int        `json:"episode,omitempty"`
	IntroSegments   []timestamp `json:"intro"`
	TecapSegments   []timestamp `json:"recap"`
	CreditsSegments []timestamp `json:"credits"`
	PreviewSegments []timestamp `json:"preview"`
}

type timestamp struct {
	StartMillis int `json:"start_ms"`
	EndMillis   int `json:"end_ms"`
}

func GetTVShowIntroSegmentsTIDB(mediaSource string, sourceID string, season int, episode int, duration int) (*IntroSegments, error) {
	if mediaSource != MediaSourceTMDB {
		return nil, fmt.Errorf("invalid media source: %w", internal.BadRequestError)
	}
	tmdbID, err := strconv.Atoi(sourceID)
	if sourceID == "" || err != nil {
		return nil, fmt.Errorf("invalid sourceID: %w", internal.BadRequestError)
	}
	requestURL := fmt.Sprintf(tidbURL, tmdbID, season, episode)
	if duration > 0 {
		requestURL += fmt.Sprintf("&duration_ms=%d", duration)
	}
	tidbResponse, err := fetchTIDBResponse(requestURL)
	if err != nil {
		return nil, err
	}
	segments := tidbResponse.toIntroSegments()
	return &segments, nil
}

func (t tidbResponse) toIntroSegments() IntroSegments {
	mediaType := t.MediaType
	if t.MediaType == "tv" {
		mediaType = database.MediaTypeTVShow
	}
	return IntroSegments{
		MediaSource:     MediaSourceTMDB,
		MediaType:       mediaType,
		SourceID:        strconv.Itoa(t.TmdbID),
		Season:          t.Season,
		Episode:         t.Episode,
		IntroSegments:   t.IntroSegments,
		TecapSegments:   t.TecapSegments,
		CreditsSegments: t.CreditsSegments,
		PreviewSegments: t.PreviewSegments,
	}
}

func fetchTIDBResponse(url string) (*tidbResponse, error) {
	httpClient := &http.Client{
		Timeout: 10 * time.Second,
	}
	resp, err := httpClient.Get(url)
	if err != nil {
		return nil, fmt.Errorf("Failed to fetch from tidb: %w", err)
	}
	defer resp.Body.Close()
	var tidbResponse tidbResponse
	err = json.NewDecoder(resp.Body).Decode(&tidbResponse)
	if err != nil {
		return nil, fmt.Errorf("Failed to decode tidb response: %w", err)
	}
	return &tidbResponse, nil
}
