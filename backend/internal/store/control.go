package store

import (
	"context"

	"livepoll/internal/models"

	"go.mongodb.org/mongo-driver/bson"
)

// ResetVotes deletes all votes for a poll in MongoDB (source of truth), clears the
// Redis counters (they are rebuilt as zeros) and pushes the empty tallies to watchers.
// myVote:null lets every voter vote again.
func (s *Store) ResetVotes(ctx context.Context, p *models.Poll) error {
	if _, err := s.Votes.DeleteMany(ctx, bson.M{"pollId": p.ID}); err != nil {
		return err
	}
	s.Redis.Del(ctx, countsKey(p.ID))
	counts, total, err := s.Counts(ctx, p)
	if err != nil {
		return err
	}
	s.Publish(ctx, p.ID, map[string]any{"counts": counts, "total": total, "myVote": nil})
	return nil
}
