package v1

import (
	"fmt"

	"github.com/mcay23/hound/database"
	"github.com/mcay23/hound/internal"
	"github.com/mcay23/hound/sources"

	"github.com/gin-gonic/gin"
)

// @Router /v1/movie/{id}/scores [get]
// @Summary Get Movie Scores
// @ID get-movie-scores
// @Tags Movie
// @Accept json
// @Produce json
// @Param id path string true "Media ID" example(tmdb-1234)
// @Success 200 {object} V1SuccessResponse{data=sources.ScoresResponse}
// @Failure 400 {object} V1ErrorResponse
// @Failure 404 {object} V1ErrorResponse
// @Failure 500 {object} V1ErrorResponse
func GetMovieScoresHandler(c *gin.Context) {
	getScoresHandler(c, database.MediaTypeMovie)
}

// @Router /v1/tv/{id}/scores [get]
// @Summary Get TV Show Scores
// @ID get-tv-show-scores
// @Tags TV Show
// @Accept json
// @Produce json
// @Param id path string true "Media ID" example(tmdb-1234)
// @Success 200 {object} V1SuccessResponse{data=sources.ScoresResponse}
// @Failure 400 {object} V1ErrorResponse
// @Failure 404 {object} V1ErrorResponse
// @Failure 500 {object} V1ErrorResponse
func GetTVShowScoresHandler(c *gin.Context) {
	getScoresHandler(c, database.MediaTypeTVShow)
}

func getScoresHandler(c *gin.Context, mediaType string) {
	mediaSource, sourceID, err := getSourceIDFromParams(c.Param("id"))
	if err != nil || mediaSource != sources.MediaSourceTMDB {
		internal.ErrorResponse(c, fmt.Errorf("failed to get source id from params: %w: %w", internal.BadRequestError, err))
		return
	}
	scores, err := sources.GetScoresHoundPlus(mediaType, sourceID)
	if err != nil {
		internal.ErrorResponse(c, err)
		return
	}
	internal.SuccessResponse(c, scores, 200)
}
