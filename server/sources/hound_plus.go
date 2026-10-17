package sources

import (
	"encoding/json"
	"fmt"
	"log/slog"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/mcay23/hound/config"
	"github.com/mcay23/hound/database"
	"github.com/mcay23/hound/internal"
)

type ScoresResponse struct {
	MediaType           string   `json:"media_type"`
	MediaSource         string   `json:"media_source"`
	SourceID            string   `json:"source_id"`
	ShortOverview       string   `json:"short_overview,omitempty"`
	VoteAverage         *float32 `json:"vote_average,omitempty"`
	VoteCount           *int     `json:"vote_count,omitempty"`
	IMDBID              string   `json:"imdb_id,omitempty"`
	IMDBScore           *float32 `json:"imdb_score,omitempty"`
	IMDBVotes           *int     `json:"imdb_votes,omitempty"`
	RottenTomatoesScore *int     `json:"rt_score,omitempty"`
	MetacriticScore     *int     `json:"metacritic_score,omitempty"`
	Rated               string   `json:"rated,omitempty"` // pg-13, etc.
	Awards              string   `json:"awards,omitempty"`
}

type Client struct {
	baseURL    string
	httpClient *http.Client
}

var houndPlusClient *Client

func InitializeHoundPlus() {
	if config.HoundPlusHost == "" {
		slog.Info("Hound Plus is disabled, HOUND_PLUS_SERVER_HOST is not set")
		return
	}
	houndPlusClient = &Client{
		baseURL:    strings.TrimSuffix(config.HoundPlusHost, "/"),
		httpClient: &http.Client{Timeout: 5 * time.Second},
	}
}

func GetScoresHoundPlus(mediaType string, tmdbID int) (*ScoresResponse, error) {
	if houndPlusClient == nil {
		return nil, fmt.Errorf("hound plus server is not configured: %w", internal.NotFoundError)
	}
	cacheKey := fmt.Sprintf("houndplus|%s|scores|tmdb-%d", mediaType, tmdbID)
	var cacheObject ScoresResponse
	found, _ := database.GetCache(cacheKey, &cacheObject)
	if found {
		return &cacheObject, nil
	}
	pathSegment := "movie"
	if mediaType == database.MediaTypeTVShow {
		pathSegment = "tv"
	}
	req, err := http.NewRequest(http.MethodGet, fmt.Sprintf("%s/api/%s/tmdb-%d", houndPlusClient.baseURL, pathSegment, tmdbID), nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Authorization", "Bearer "+config.HoundPlusAPIKey)
	resp, err := houndPlusClient.httpClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	scores := ScoresResponse{}
	switch resp.StatusCode {
	case http.StatusOK:
		if err := json.NewDecoder(resp.Body).Decode(&scores); err != nil {
			return nil, err
		}
	case http.StatusNotFound:
	default:
		return nil, fmt.Errorf("hound plus returned status %d: %w", resp.StatusCode, internal.InternalServerError)
	}
	scores.MediaType = mediaType
	scores.MediaSource = MediaSourceTMDB
	scores.SourceID = strconv.Itoa(tmdbID)
	if resp.StatusCode == http.StatusOK {
		_, _ = database.SetCache(cacheKey, scores, getCacheTTL)
	}
	return &scores, nil
}
