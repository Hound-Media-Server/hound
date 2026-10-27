package database

import (
	"fmt"
	"time"

	"github.com/mcay23/hound/internal"
)

const (
	// for notes and reviews
	commentsTable     = "comments"
	CommentTypeReview = "review"
	CommentTypeNote   = "note"
)

type CommentRecord struct {
	CommentID    int64     `xorm:"pk autoincr 'comment_id'" json:"id"`
	CommentType  string    `json:"comment_type"`
	UserID       int64     `xorm:"'user_id'" json:"user_id"`
	RecordID     int64     `xorm:"index 'record_id'" json:"record_id"`
	CommentTitle string    `xorm:"'title'" json:"title"`
	Comment      string    `xorm:"text 'comment'" json:"comment"` // actual content of comment, review
	Score        int       `xorm:"'score'" json:"score"`          // for review types
	CreatedAt    time.Time `xorm:"timestampz created" json:"created_at"`
	UpdatedAt    time.Time `xorm:"timestampz updated" json:"updated_at"`
}

func instantiateCommentTable() error {
	err := databaseEngine.Table(commentsTable).Sync2(new(CommentRecord))
	if err != nil {
		return err
	}
	return nil
}

func AddComment(comment *CommentRecord) error {
	if comment.CommentType != CommentTypeReview && comment.CommentType != CommentTypeNote {
		return fmt.Errorf("invalid comment type %s: %w", comment.CommentType, internal.BadRequestError)
	}
	_, err := databaseEngine.Table(commentsTable).Insert(comment)
	return err
}

type CommentUpdate struct {
	CommentTitle *string   `xorm:"'title'" json:"title"`
	Comment      *string   `xorm:"text 'comment'" json:"comment"`
	Score        *int      `xorm:"'score'" json:"score"`
	UpdatedAt    time.Time `xorm:"timestampz updated" json:"-"`
}

func UpdateComment(userID int64, commentID int64, update *CommentUpdate) error {
	affected, err := databaseEngine.Table(commentsTable).
		Where("user_id = ? AND comment_id = ?", userID, commentID).
		Update(update)
	if err != nil {
		return fmt.Errorf("failed to update commentid %d: %w", commentID, err)
	}
	if affected <= 0 {
		return fmt.Errorf("no comment found with userID %d, commentID %d: %w", userID, commentID, internal.NotFoundError)
	}
	return nil
}

func AddCommentsBatch(comments *[]CommentRecord) error {
	_, err := databaseEngine.Table(commentsTable).Insert(comments)
	return err
}

func GetComments(recordID int64, commentType *string) (*[]CommentRecord, error) {
	return GetCommentsForRecords([]int64{recordID}, commentType)
}

func GetCommentsForRecords(recordIDs []int64, commentType *string) (*[]CommentRecord, error) {
	var comments []CommentRecord
	if len(recordIDs) == 0 {
		return &comments, nil
	}
	sess := databaseEngine.Table(commentsTable).In("record_id", recordIDs).OrderBy("updated_at desc")
	if commentType != nil && *commentType != "" {
		sess.Where("comment_type = ?", commentType)
	}
	err := sess.Find(&comments)
	if err != nil {
		return nil, fmt.Errorf("failed to get comments for recordIDs %v: %w", recordIDs, err)
	}
	return &comments, nil
}

func DeleteComment(userID int64, commentID int64) error {
	affected, err := databaseEngine.Table(commentsTable).Delete(&CommentRecord{
		UserID:    userID,
		CommentID: commentID,
	})
	if err != nil {
		return fmt.Errorf("failed to delete commentid %d: %w", commentID, err)
	}
	if affected <= 0 {
		return fmt.Errorf("no comment found with userID %d, commentID %d: %w", userID, commentID, internal.NotFoundError)
	}
	return nil
}

func DeleteCommentBatch(userID int64, commentIDs []int64) error {
	session := databaseEngine.NewSession()
	defer session.Close()
	_ = session.Begin()
	for _, item := range commentIDs {
		affected, err := session.Table(commentsTable).Delete(&CommentRecord{UserID: userID, CommentID: item})
		if err != nil {
			session.Rollback()
			return err
		}
		if affected <= 0 {
			session.Rollback()
			return fmt.Errorf("no comment found with userID %d, commentID %d: %w", userID, item, internal.NotFoundError)
		}
	}
	err := session.Commit()
	return err
}
