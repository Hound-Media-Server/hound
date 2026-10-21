package v1

import (
	"fmt"
	"sort"
	"strconv"
	"strings"

	"github.com/mcay23/hound/database"
	"github.com/mcay23/hound/internal"
	"github.com/mcay23/hound/sources"
	"github.com/mcay23/hound/view"

	"github.com/gin-gonic/gin"
)

type CommentRequest struct {
	CommentType   string `json:"comment_type" binding:"required,gt=0"` // review, etc.
	SeasonNumber  *int   `json:"season_number"`                        // only for tvshows, when commenting on a particular episode
	EpisodeNumber *int   `json:"episode_number"`
	CommentTitle  string `json:"title"`
	Comment       string `json:"comment"` // actual content of comment, review
	Score         int    `json:"score"`   // only required for reviews
}

// @Router /api/v1/tv/{id}/comments [get]
// @Summary Get Comments for a TV Show
// @ID get-tvshow-comments
// @Tags Comments
// @Accept json
// @Produce json
// @Param id path string true "Media ID" example(tmdb-1234)
// @Param type query string true "Comment Type"
// @Param season_number query int false "Season number; aggregates episode comments when episode_number is omitted"
// @Param episode_number query int false "Episode number; requires season_number"
// @Success 200 {object} V1SuccessResponse{data=[]view.CommentObject}
// @Failure 400 {object} V1ErrorResponse
// @Failure 500 {object} V1ErrorResponse
func GetCommentsTVHandler(c *gin.Context) {
	handleGetComments(c, database.RecordTypeTVShow)
}

// @Router /api/v1/movie/{id}/comments [get]
// @Summary Get Comments for a Movie
// @ID get-movie-comments
// @Tags Comments
// @Accept json
// @Produce json
// @Param id path string true "Media ID" example(tmdb-1234)
// @Param type query string true "Comment Type"
// @Success 200 {object} V1SuccessResponse{data=[]view.CommentObject}
// @Failure 400 {object} V1ErrorResponse
// @Failure 500 {object} V1ErrorResponse
func GetCommentsMovieHandler(c *gin.Context) {
	handleGetComments(c, database.RecordTypeMovie)
}

func handleGetComments(c *gin.Context, recordType string) {
	mediaSource, sourceID, err := getSourceIDFromParams(c.Param("id"))
	if err != nil {
		internal.ErrorResponse(c, err)
		return
	}
	userID, err := getUserIDFromContext(c)
	if err != nil {
		internal.ErrorResponse(c, err)
		return
	}
	seasonQuery, episodeQuery := c.Query("season_number"), c.Query("episode_number")
	commentType := c.Query("type")
	if commentType == "" {
		internal.ErrorResponse(c, fmt.Errorf("invalid type param: %w", internal.BadRequestError))
		return
	}
	var recordIDs []int64
	recordsByID := make(map[int64]database.MediaRecord)
	if recordType == database.RecordTypeTVShow && seasonQuery != "" {
		seasonNumber, err := strconv.Atoi(seasonQuery)
		if err != nil {
			internal.ErrorResponse(c, fmt.Errorf("invalid season_number: %w", internal.BadRequestError))
			return
		}
		var episodeNumber *int
		if episodeQuery != "" {
			parsedEpisodeNumber, parseErr := strconv.Atoi(episodeQuery)
			if parseErr != nil {
				internal.ErrorResponse(c, fmt.Errorf("invalid episode_number: %w", internal.BadRequestError))
				return
			}
			episodeNumber = &parsedEpisodeNumber
		}
		episodes, err := database.GetEpisodeMediaRecords(mediaSource, strconv.Itoa(sourceID), &seasonNumber, episodeNumber)
		if err != nil {
			internal.ErrorResponse(c, fmt.Errorf("failed to get episode media records: %w", err))
			return
		}
		for _, episode := range episodes {
			recordIDs = append(recordIDs, episode.RecordID)
			recordsByID[episode.RecordID] = episode
		}
	} else if recordType == database.RecordTypeTVShow && episodeQuery != "" {
		internal.ErrorResponse(c, fmt.Errorf("season_number is required with episode_number: %w", internal.BadRequestError))
		return
	} else if recordType != database.RecordTypeTVShow && (seasonQuery != "" || episodeQuery != "") {
		internal.ErrorResponse(c, fmt.Errorf("season and episode parameters are only valid for TV shows: %w", internal.BadRequestError))
		return
	} else {
		var record *database.MediaRecord
		var has bool
		has, record, err = database.GetMediaRecord(recordType, mediaSource, strconv.Itoa(sourceID))
		if err != nil {
			internal.ErrorResponse(c, fmt.Errorf("failed to get media record: %w", err))
			return
		}
		if !has {
			internal.SuccessResponse(c, nil, 200)
			return
		}
		if record == nil {
			internal.ErrorResponse(c, fmt.Errorf("failed to get media record: %w", internal.InternalServerError))
			return
		}
		recordIDs = []int64{record.RecordID}
		recordsByID[record.RecordID] = *record
	}
	var commentsView []view.CommentObject
	comments, err := database.GetCommentsForRecords(recordIDs, &commentType)
	if err != nil {
		internal.ErrorResponse(c, fmt.Errorf("error retrieving comments: %w", internal.InternalServerError))
		return
	}
	for _, item := range *comments {
		commenter, _ := database.GetUser(item.UserID)
		// by default, reviews are being treated as public while notes are private
		// will change as a user-level preference in the future
		if item.CommentType != database.CommentTypeReview && userID != commenter.UserID {
			continue
		}
		record := recordsByID[item.RecordID]
		commentsView = append(commentsView, view.CommentObject{
			CommentID:        item.CommentID,
			CommentType:      item.CommentType,
			OwnerUsername:    commenter.Username,
			OwnerDisplayName: commenter.DisplayName,
			RecordID:         item.RecordID,
			SourceID:         record.SourceID,
			MediaSource:      record.MediaSource,
			MediaType:        record.RecordType,
			SeasonNumber:     record.SeasonNumber,
			EpisodeNumber:    record.EpisodeNumber,
			CommentTitle:     item.CommentTitle,
			Comment:          string(item.Comment),
			Score:            item.Score,
			CreatedAt:        item.CreatedAt,
			UpdatedAt:        item.UpdatedAt,
		})
	}
	sort.SliceStable(commentsView, func(i, j int) bool {
		return commentsView[i].UpdatedAt.After(commentsView[j].UpdatedAt)
	})
	internal.SuccessResponse(c, commentsView, 200)
}

// @Router /api/v1/tv/{id}/comments [post]
// @Summary Post Comment for a TV Show
// @ID post-tvshow-comment
// @Tags Comments
// @Accept json
// @Produce json
// @Param id path string true "Media ID" example(tmdb-1234)
// @Param comment body CommentRequest true "Comment"
// @Success 200 {object} V1SuccessResponse{data=object}
// @Failure 400 {object} V1ErrorResponse
// @Failure 500 {object} V1ErrorResponse
func PostCommentTVHandler(c *gin.Context) {
	handlePostComment(c, database.RecordTypeTVShow)
}

// @Router /api/v1/movie/{id}/comments [post]
// @Summary Post Comment for a Movie
// @ID post-movie-comment
// @Tags Comments
// @Accept json
// @Produce json
// @Param id path string true "Media ID" example(tmdb-1234)
// @Param comment body CommentRequest true "Comment"
// @Success 200 {object} V1SuccessResponse{data=object}
// @Failure 400 {object} V1ErrorResponse
// @Failure 500 {object} V1ErrorResponse
func PostCommentMovieHandler(c *gin.Context) {
	handlePostComment(c, database.RecordTypeMovie)
}

func handlePostComment(c *gin.Context, recordType string) {
	var body CommentRequest
	err := c.ShouldBindJSON(&body)
	if err != nil {
		internal.ErrorResponse(c, err)
		return
	}
	mediaSource, sourceID, err := getSourceIDFromParams(c.Param("id"))
	if err != nil {
		internal.ErrorResponse(c, err)
		return
	}
	if recordType == database.RecordTypeTVShow && (body.SeasonNumber == nil) != (body.EpisodeNumber == nil) {
		internal.ErrorResponse(c, fmt.Errorf("season_number and episode_number must be provided together: %w", internal.BadRequestError))
		return
	}
	if recordType != database.RecordTypeTVShow && (body.SeasonNumber != nil || body.EpisodeNumber != nil) {
		internal.ErrorResponse(c, fmt.Errorf("season and episode parameters are only valid for TV shows: %w", internal.BadRequestError))
		return
	}
	if body.CommentType == database.CommentTypeReview && (body.Score > 100 || body.Score < 0) {
		internal.ErrorResponse(c, fmt.Errorf("invalid score %d not (0<=score<=100): %w", body.Score, internal.BadRequestError))
		return
	}
	// get userID
	userID, err := getUserIDFromContext(c)
	if err != nil {
		internal.ErrorResponse(c, err)
		return
	}
	// upsert top level record
	record, err := sources.UpsertMediaRecordTMDB(recordType, sourceID)
	if err != nil {
		internal.ErrorResponse(c, fmt.Errorf("failed to upsert media record: %w", err))
		return
	}
	// if season and episode is specified, use episode record
	if recordType == database.RecordTypeTVShow && body.SeasonNumber != nil {
		record, err = database.GetEpisodeMediaRecord(mediaSource, strconv.Itoa(sourceID), body.SeasonNumber, body.EpisodeNumber)
		if err != nil {
			internal.ErrorResponse(c, fmt.Errorf("failed to get episode media record: %w", err))
			return
		}
	}
	comment := database.CommentRecord{
		UserID:       userID,
		CommentTitle: body.CommentTitle,
		CommentType:  body.CommentType,
		Comment:      body.Comment,
		Score:        body.Score,
		RecordID:     record.RecordID,
	}
	err = database.AddComment(&comment)
	if err != nil {
		internal.ErrorResponse(c, fmt.Errorf("failed to add comment: %w", err))
		return
	}
	internal.SuccessResponse(c, gin.H{"status": "success", "comment_id": comment.CommentID}, 200)
}

// @Router /api/v1/comments/{id} [put]
// @Summary Update a Comment
// @ID update-comment
// @Tags Comments
// @Accept json
// @Produce json
// @Param id path string true "Comment ID"
// @Param comment body database.CommentUpdate true "Comment"
// @Success 200 {object} V1SuccessResponse{data=object}
// @Failure 400 {object} V1ErrorResponse
// @Failure 404 {object} V1ErrorResponse
// @Failure 500 {object} V1ErrorResponse
func UpdateCommentHandler(c *gin.Context) {
	var body database.CommentUpdate
	if err := c.ShouldBindJSON(&body); err != nil {
		internal.ErrorResponse(c, err)
		return
	}
	if body.Score != nil && (*body.Score > 100 || *body.Score < 0) {
		internal.ErrorResponse(c, fmt.Errorf("invalid score %d not (0<=score<=100): %w", *body.Score, internal.BadRequestError))
		return
	}
	userID, err := getUserIDFromContext(c)
	if err != nil {
		internal.ErrorResponse(c, err)
		return
	}
	commentID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		internal.ErrorResponse(c, fmt.Errorf("invalid comment id: %w", internal.BadRequestError))
		return
	}
	if err = database.UpdateComment(userID, int64(commentID), &body); err != nil {
		internal.ErrorResponse(c, err)
		return
	}
	internal.SuccessResponse(c, nil, 200)
}

// @Router /api/v1/comments/{id} [delete]
// @Summary Delete a Comment
// @ID delete-comment
// @Tags Comments
// @Accept json
// @Produce json
// @Param id path string true "Comment ID"
// @Success 200 {object} V1SuccessResponse{data=object}
// @Failure 400 {object} V1ErrorResponse
// @Failure 500 {object} V1ErrorResponse
func DeleteCommentHandler(c *gin.Context) {
	userID, err := getUserIDFromContext(c)
	if err != nil {
		internal.ErrorResponse(c, err)
		return
	}
	// for batch deletion, split query params /comment?ids=1,2,3
	idSplit := strings.Split(c.Query("ids"), ",")
	if c.Query("ids") != "" {
		var batchIDs []int64
		for _, item := range idSplit {
			tempID, err := strconv.Atoi(item)
			if err != nil {
				internal.ErrorResponse(c, internal.LogErrorWithMessage(err, "Batch deletion: Invalid comment id in url query"))
				return
			}
			batchIDs = append(batchIDs, int64(tempID))
		}
		err = database.DeleteCommentBatch(userID, batchIDs)
		if err != nil {
			internal.ErrorResponse(c, err)
			return
		}
	} else if c.Param("id") != "" {
		// single delete case
		commentID, err := strconv.Atoi(c.Param("id"))
		if err != nil {
			internal.ErrorResponse(c, internal.LogErrorWithMessage(err, "Invalid comment id in url param"))
			return
		}
		err = database.DeleteComment(userID, int64(commentID))
		if err != nil {
			internal.ErrorResponse(c, err)
			return
		}
	} else {
		internal.ErrorResponse(c, internal.LogErrorWithMessage(err, "Invalid comment id in url param/query"))
		return
	}
	internal.SuccessResponse(c, nil, 200)
}
