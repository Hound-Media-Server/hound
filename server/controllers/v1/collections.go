package v1

import (
	"fmt"
	"log/slog"
	"sort"
	"strconv"

	"github.com/mcay23/hound/database"
	"github.com/mcay23/hound/internal"
	"github.com/mcay23/hound/model"
	"github.com/mcay23/hound/view"

	"github.com/gin-gonic/gin"
)

type AddToCollectionRequest struct {
	MediaSource string `json:"media_source" binding:"required,gt=0"`
	MediaType   string `json:"media_type"  binding:"required,gt=0"`
	SourceID    string `json:"source_id" binding:"required,gt=0"`
}

type CreateCollectionRequest struct {
	OwnerUserID     int64  `json:"owner_user_id"`
	CollectionTitle string `json:"collection_title"` // my collection, etc.
	Description     string `json:"description"`
	IsPublic        bool   `json:"is_public"`
}

// resolveCollectionID accepts a collection id or a collection kind (eg. watchlist)
func resolveCollectionID(param string, userID int64) (int64, error) {
	if id, err := strconv.ParseInt(param, 10, 64); err == nil {
		return id, nil
	}
	if !database.IsCollectionKind(param) {
		return 0, fmt.Errorf("failed to convert collection id to int: %w", internal.BadRequestError)
	}
	return database.GetCollectionIDByKind(userID, param)
}

// @Router /v1/collection/{id} [post]
// @Summary Add Media to Collection
// @ID collections-add-media
// @Description id can be a collection id or a collection kind (eg. watchlist)
// @Tags Collection
// @Accept json
// @Produce json
// @Param id path string true "Collection ID or kind"
// @Param body body AddToCollectionRequest true "Add to Collection Request"
// @Success 200 {object} V1SuccessResponse{data=object}
// @Failure 400 {object} V1ErrorResponse
// @Failure 500 {object} V1ErrorResponse
func AddToCollectionHandler(c *gin.Context) {
	userID, err := getUserIDFromContext(c)
	if err != nil {
		internal.ErrorResponse(c, err)
		return
	}
	body := AddToCollectionRequest{}
	if err := c.ShouldBindJSON(&body); err != nil {
		internal.ErrorResponse(c, fmt.Errorf("failed to bind body: %w : %w", internal.BadRequestError, err))
		return
	}
	collectionID, err := resolveCollectionID(c.Param("id"), userID)
	if err != nil {
		internal.ErrorResponse(c, err)
		return
	}
	// check valid mediaType and source
	err = validateMediaParams(body.MediaType, body.MediaSource)
	if err != nil {
		internal.ErrorResponse(c, err)
		return
	}
	// get source ID as int, right now all sources have int ids
	sourceID, err := strconv.Atoi(body.SourceID)
	if err != nil {
		internal.ErrorResponse(c, fmt.Errorf("failed to convert id to int: %w", internal.BadRequestError))
		return
	}
	if err = model.AddMediaToCollection(userID, body.MediaType, body.MediaSource, sourceID, collectionID); err != nil {
		internal.ErrorResponse(c, err)
		return
	}
	internal.SuccessResponse(c, nil, 200)
}

// @Router /v1/collection/{id} [delete]
// @Summary Delete A Media from Collection
// @ID colllections-delete-media
// @Description id can be a collection id or a collection kind (eg. watchlist)
// @Tags Collection
// @Accept json
// @Produce json
// @Param id path string true "Collection ID or kind"
// @Param body body AddToCollectionRequest true "Delete from Collection Request"
// @Success 200 {object} V1SuccessResponse{data=object}
// @Failure 400 {object} V1ErrorResponse
// @Failure 500 {object} V1ErrorResponse
func DeleteFromCollectionHandler(c *gin.Context) {
	userID, err := getUserIDFromContext(c)
	if err != nil {
		internal.ErrorResponse(c, err)
		return
	}
	body := AddToCollectionRequest{}
	if err := c.ShouldBindJSON(&body); err != nil {
		internal.ErrorResponse(c, fmt.Errorf("failed to bind body: %w: %w", internal.BadRequestError, err))
		return
	}
	collectionID, err := resolveCollectionID(c.Param("id"), userID)
	if err != nil {
		internal.ErrorResponse(c, err)
		return
	}
	// check valid mediaType and source
	err = validateMediaParams(body.MediaType, body.MediaSource)
	if err != nil {
		internal.ErrorResponse(c, err)
		return
	}
	if err = model.RemoveMediaFromCollection(userID, body.MediaType, body.MediaSource, body.SourceID, collectionID); err != nil {
		internal.ErrorResponse(c, err)
		return
	}
	internal.SuccessResponse(c, nil, 200)
}

// @Router /v1/collection/all [get]
// @Summary Get a User's Collections
// @ID get-user-collections
// @Tags Collection
// @Accept json
// @Produce json
// @Success 200 {object} V1SuccessResponse{data=[]view.CollectionObject}
// @Failure 400 {object} V1ErrorResponse
// @Failure 500 {object} V1ErrorResponse
func GetUserCollectionsHandler(c *gin.Context) {
	userID, err := getUserIDFromContext(c)
	if err != nil {
		internal.ErrorResponse(c, err)
		return
	}
	records, _, err := database.FindCollection(database.CollectionRecord{OwnerUserID: userID}, -1, 0)
	if err != nil {
		internal.ErrorResponse(c, fmt.Errorf("failed to find collection: %w: %w", internal.InternalServerError, err))
		return
	}
	sort.SliceStable(records, func(i, j int) bool {
		return records[i].Kind != "" && records[j].Kind == ""
	})
	user, err := database.GetUser(userID)
	if err != nil {
		internal.ErrorResponse(c, fmt.Errorf("failed to get user: %w", err))
		return
	}
	var collectionResponse = []view.CollectionObject{}
	for _, record := range records {
		temp := view.CollectionObject{
			CollectionID:     record.CollectionID,
			CollectionTitle:  record.CollectionTitle,
			Description:      string(record.Description),
			OwnerUsername:    user.Username,
			OwnerDisplayName: user.DisplayName,
			IsPublic:         record.IsPublic,
			Kind:             record.Kind,
			ThumbnailURI:     record.ThumbnailURI,
			CreatedAt:        record.CreatedAt,
			UpdatedAt:        record.UpdatedAt,
		}
		collectionResponse = append(collectionResponse, temp)
	}
	internal.SuccessResponse(c, collectionResponse, 200)
}

// @Router /v1/collection/public [get]
// @Summary Get public collections
// @ID get-public-collections
// @Tags Collection
// @Accept json
// @Produce json
// @Param limit query int false "Limit"
// @Param offset query int false "Offset"
// @Success 200 {object} V1SuccessResponse{data=[]view.CollectionObject}
// @Failure 400 {object} V1ErrorResponse
// @Failure 500 {object} V1ErrorResponse
func GetPublicCollectionsHandler(c *gin.Context) {
	limit := c.DefaultQuery("limit", "20")
	parsedLimit, err := strconv.Atoi(limit)
	if err != nil {
		internal.ErrorResponse(c, fmt.Errorf("failed to convert limit to int: %w: %w", internal.BadRequestError, err))
		return
	}
	offset := c.DefaultQuery("offset", "0")
	parsedOffset, err := strconv.Atoi(offset)
	if err != nil {
		internal.ErrorResponse(c, fmt.Errorf("failed to convert offset to int: %w: %w", internal.BadRequestError, err))
		return
	}
	records, _, err := database.FindCollection(database.CollectionRecord{IsPublic: true}, parsedLimit, parsedOffset)
	if err != nil {
		internal.ErrorResponse(c, fmt.Errorf("failed to find collection: %w: %w", internal.InternalServerError, err))
		return
	}
	var collectionResponse = []view.CollectionObject{}
	for _, record := range records {
		// cached call, but could get expensive in reality
		user, err := database.GetUser(record.OwnerUserID)
		if err != nil {
			slog.Error("Invalid collection user", "error", err, "user_id", record.OwnerUserID)
			continue
		}
		temp := view.CollectionObject{
			CollectionID:     record.CollectionID,
			CollectionTitle:  record.CollectionTitle,
			Description:      string(record.Description),
			OwnerUsername:    user.Username,
			OwnerDisplayName: user.DisplayName,
			IsPublic:         record.IsPublic,
			Kind:             record.Kind,
			ThumbnailURI:     record.ThumbnailURI,
			CreatedAt:        record.CreatedAt,
			UpdatedAt:        record.UpdatedAt,
		}
		collectionResponse = append(collectionResponse, temp)
	}
	internal.SuccessResponse(c, collectionResponse, 200)
}

// @Router /v1/collection/new [post]
// @Summary Create New Collection
// @ID create-collection
// @Tags Collection
// @Param id path int true "Collection ID"
// @Param body body CreateCollectionRequest true "Create Collection Request"
// @Accept json
// @Produce json
// @Success 200 {object} V1SuccessResponse{data=object}
// @Failure 400 {object} V1ErrorResponse
// @Failure 500 {object} V1ErrorResponse
func CreateCollectionHandler(c *gin.Context) {
	userID, err := getUserIDFromContext(c)
	if err != nil {
		internal.ErrorResponse(c, err)
		return
	}
	body := CreateCollectionRequest{}
	if err := c.ShouldBindJSON(&body); err != nil {
		internal.ErrorResponse(c, fmt.Errorf("failed to bind body: %w: %w", internal.BadRequestError, err))
		return
	}
	record := database.CollectionRecord{
		CollectionTitle: body.CollectionTitle,
		Description:     body.Description,
		OwnerUserID:     userID,
		IsPublic:        body.IsPublic,
		ThumbnailURI:    "",
	}
	collectionID, err := database.CreateCollection(record)
	if err != nil {
		internal.ErrorResponse(c, fmt.Errorf("failed to create collection: %w", err))
		return
	}
	internal.SuccessResponse(c, gin.H{"collection_id": collectionID}, 200)
}

// @Router /v1/collection/{id} [put]
// @Summary Update Collection
// @ID update-collection
// @Tags Collection
// @Param id path int true "Collection ID"
// @Param body body CreateCollectionRequest true "Update Collection Request"
// @Accept json
// @Produce json
// @Success 200 {object} V1SuccessResponse{data=object}
// @Failure 400 {object} V1ErrorResponse
// @Failure 500 {object} V1ErrorResponse
func UpdateCollectionHandler(c *gin.Context) {
	userID, err := getUserIDFromContext(c)
	if err != nil {
		internal.ErrorResponse(c, err)
		return
	}
	collectionID, err := resolveCollectionID(c.Param("id"), userID)
	if err != nil {
		internal.ErrorResponse(c, err)
		return
	}
	body := CreateCollectionRequest{}
	if err := c.ShouldBindJSON(&body); err != nil {
		internal.ErrorResponse(c, fmt.Errorf("failed to bind body: %w: %w", internal.BadRequestError, err))
		return
	}
	record := database.CollectionRecord{
		CollectionTitle: body.CollectionTitle,
		Description:     body.Description,
		IsPublic:        body.IsPublic,
	}
	err = database.UpdateCollection(collectionID, userID, &record)
	if err != nil {
		internal.ErrorResponse(c, fmt.Errorf("failed to update collection: %w", err))
		return
	}
	internal.SuccessResponse(c, nil, 200)
}

// @Router /v1/collection/{id} [get]
// @Summary Get Collection Contents
// @ID get-collection-contents
// @Tags Collection
// @Accept json
// @Produce json
// @Param id path int true "Collection ID"
// @Param limit query int false "Limit"
// @Param offset query int false "Offset"
// @Success 200 {object} V1SuccessResponse{data=view.CollectionView}
// @Failure 400 {object} V1ErrorResponse
// @Failure 500 {object} V1ErrorResponse
func GetCollectionContentsHandler(c *gin.Context) {
	idParam := c.Param("id")
	limitQuery := c.Query("limit")
	offsetQuery := c.Query("offset")
	// -1 means no limit, offset
	limit, offset, err := getLimitOffset(limitQuery, offsetQuery)
	if err != nil {
		internal.ErrorResponse(c, fmt.Errorf("failed to get limit/offset: %w: %w", internal.BadRequestError, err))
		return
	}
	userID, err := getUserIDFromContext(c)
	if err != nil {
		internal.ErrorResponse(c, err)
		return
	}
	collectionID, err := resolveCollectionID(idParam, userID)
	if err != nil {
		internal.ErrorResponse(c, err)
		return
	}
	records, collection, totalRecords, err := database.GetCollectionRecords(userID, collectionID, limit, offset)
	if err != nil {
		internal.ErrorResponse(c, fmt.Errorf("failed to get collection records: %w", err))
		return
	}
	var viewArray = []view.MediaRecordCatalog{}
	for _, item := range records {
		viewObject := model.CreateMediaRecordCatalogObject(item)
		viewArray = append(viewArray, viewObject)
	}
	// note collection owner can be different from calling user (public collections)
	collectionOwner, err := database.GetUser(collection.OwnerUserID)
	if err != nil {
		internal.ErrorResponse(c, fmt.Errorf("invalid user: %w", err))
		return
	}
	res := view.CollectionView{
		Records: viewArray,
		Collection: &view.CollectionObject{
			CollectionID:     collection.CollectionID,
			CollectionTitle:  collection.CollectionTitle,
			Description:      string(collection.Description),
			OwnerUsername:    collectionOwner.Username,
			OwnerDisplayName: collectionOwner.DisplayName,
			IsPublic:         collection.IsPublic,
			Kind:             collection.Kind,
			ThumbnailURI:     collection.ThumbnailURI,
			CreatedAt:        collection.CreatedAt,
			UpdatedAt:        collection.UpdatedAt,
		},
		TotalRecords: totalRecords,
		Limit:        limit,
		Offset:       offset,
	}
	internal.SuccessResponse(c, res, 200)
}

// @Router /v1/collection/{id}/contains [get]
// @Summary Check if Media is in Collection
// @ID collection-contains-media
// @Description id can be a collection id or a collection kind (eg. watchlist)
// @Tags Collection
// @Accept json
// @Produce json
// @Param id path string true "Collection ID or kind"
// @Param media_type query string true "Media Type eg. tvshow or movie"
// @Param media_source query string true "Media Source eg. tmdb"
// @Param source_id query string true "Source ID"
// @Success 200 {object} V1SuccessResponse{data=object}
// @Failure 400 {object} V1ErrorResponse
// @Failure 500 {object} V1ErrorResponse
func CollectionContainsHandler(c *gin.Context) {
	userID, err := getUserIDFromContext(c)
	if err != nil {
		internal.ErrorResponse(c, err)
		return
	}
	mediaType, mediaSource, sourceID := c.Query("media_type"), c.Query("media_source"), c.Query("source_id")
	if err = validateMediaParams(mediaType, mediaSource); err != nil {
		internal.ErrorResponse(c, err)
		return
	}
	if kind := c.Param("id"); database.IsCollectionKind(kind) {
		contains, err := model.IsInKindCollection(userID, kind, mediaType, mediaSource, sourceID)
		if err != nil {
			internal.ErrorResponse(c, err)
			return
		}
		internal.SuccessResponse(c, gin.H{"contains": contains}, 200)
		return
	}
	collectionID, err := resolveCollectionID(c.Param("id"), userID)
	if err != nil {
		internal.ErrorResponse(c, err)
		return
	}
	has, record, err := database.GetMediaRecord(mediaType, mediaSource, sourceID)
	if err != nil {
		internal.ErrorResponse(c, fmt.Errorf("failed to get media record: %w", err))
		return
	}
	contains := false
	if has {
		contains, err = database.CollectionContainsRecord(userID, collectionID, record.RecordID)
		if err != nil {
			internal.ErrorResponse(c, err)
			return
		}
	}
	internal.SuccessResponse(c, gin.H{"contains": contains}, 200)
}

// @Router /v1/collection/recent [get]
// @Summary Get User's Recent Collection Records
// @ID get-user-recent-collections
// @Description Gets 20 most recent records added to any collection
// @Tags Collection
// @Accept json
// @Produce json
// @Success 200 {object} V1SuccessResponse{data=[]view.MediaRecordCatalog}
// @Failure 400 {object} V1ErrorResponse
// @Failure 500 {object} V1ErrorResponse
func GetRecentCollectionContentsHandler(c *gin.Context) {
	userID, err := getUserIDFromContext(c)
	if err != nil {
		internal.ErrorResponse(c, err)
		return
	}
	// return 20 most recent
	records, err := database.GetRecentCollectionRecords(userID, 20)
	if err != nil {
		internal.ErrorResponse(c, fmt.Errorf("failed to get recent collection records: %w: %w", internal.InternalServerError, err))
		return
	}
	var viewArray []view.MediaRecordCatalog
	for _, item := range records {
		viewObject := model.CreateMediaRecordCatalogObject(item)
		viewArray = append(viewArray, viewObject)
	}
	internal.SuccessResponse(c, viewArray, 200)
}

// @Router /v1/collection/{id}/delete [delete]
// @Summary Delete Collection
// @ID delete-collection
// @Tags Collection
// @Accept json
// @Produce json
// @Param id path int true "Collection ID"
// @Success 200 {object} V1SuccessResponse{data=object}
// @Failure 400 {object} V1ErrorResponse
// @Failure 500 {object} V1ErrorResponse
func DeleteCollectionHandler(c *gin.Context) {
	userID, err := getUserIDFromContext(c)
	if err != nil {
		internal.ErrorResponse(c, err)
		return
	}
	collectionID, err := resolveCollectionID(c.Param("id"), userID)
	if err != nil {
		internal.ErrorResponse(c, err)
		return
	}
	err = database.DeleteCollection(userID, collectionID)
	if err != nil {
		internal.ErrorResponse(c, fmt.Errorf("failed to delete collection: %w", err))
		return
	}
	internal.SuccessResponse(c, nil, 200)
}
