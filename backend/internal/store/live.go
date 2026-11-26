package store

import (
	"context"
	"encoding/json"
	"errors"
	"strconv"
	"time"

	"livepoll/internal/models"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
)

var ErrAlreadyVoted = errors.New("already voted")

func countsKey(id string) string  { return "poll:" + id + ":counts" }
func viewersKey(id string) string { return "poll:" + id + ":viewers" }
func Channel(id string) string    { return "poll:" + id + ":events" }

// Counts reads live tallies from the Redis hash. If the hash is missing
// (eviction/restart) it is rebuilt from MongoDB, the source of truth.
func (s *Store) Counts(ctx context.Context, p *models.Poll) (map[string]int64, int64, error) {
	key := countsKey(p.ID)
	ex, err := s.Redis.Exists(ctx, key).Result()
	if err != nil {
		return nil, 0, err
	}
	if ex == 0 {
		if err := s.rebuild(ctx, p); err != nil {
			return nil, 0, err
		}
	}
	raw, err := s.Redis.HGetAll(ctx, key).Result()
	if err != nil {
		return nil, 0, err
	}
	counts := make(map[string]int64, len(p.Options))
	var total int64
	for _, o := range p.Options {
		n, _ := strconv.ParseInt(raw[o.ID], 10, 64)
		counts[o.ID] = n
		total += n
	}
	return counts, total, nil
}

func (s *Store) rebuild(ctx context.Context, p *models.Poll) error {
	cur, err := s.Votes.Aggregate(ctx, mongo.Pipeline{
		{{Key: "$match", Value: bson.D{{Key: "pollId", Value: p.ID}}}},
		{{Key: "$group", Value: bson.D{{Key: "_id", Value: "$optionId"}, {Key: "n", Value: bson.D{{Key: "$sum", Value: 1}}}}}},
	})
	if err != nil {
		return err
	}
	var rows []struct {
		ID string `bson:"_id"`
		N  int64  `bson:"n"`
	}
	if err := cur.All(ctx, &rows); err != nil {
		return err
	}
	vals := map[string]interface{}{}
	for _, o := range p.Options {
		vals[o.ID] = 0
	}
	for _, r := range rows {
		vals[r.ID] = r.N
	}
	return s.Redis.HSet(ctx, countsKey(p.ID), vals).Err()
}

func (s *Store) InitCounts(ctx context.Context, p *models.Poll) error { return s.rebuild(ctx, p) }

// CastVote: MongoDB unique index guarantees one vote per voter; then Redis
// increments the live tally and publishes the new results to all watchers.
func (s *Store) CastVote(ctx context.Context, p *models.Poll, voterID, optionID string) error {
	_, err := s.Votes.InsertOne(ctx, models.Vote{PollID: p.ID, VoterID: voterID, OptionID: optionID, CreatedAt: time.Now()})
	if mongo.IsDuplicateKeyError(err) {
		return ErrAlreadyVoted
	}
	if err != nil {
		return err
	}
	// If the hash is missing, Counts() rebuilds it from Mongo (which already has this vote).
	if ex, _ := s.Redis.Exists(ctx, countsKey(p.ID)).Result(); ex == 1 {
		s.Redis.HIncrBy(ctx, countsKey(p.ID), optionID, 1)
	}
	counts, total, err := s.Counts(ctx, p)
	if err != nil {
		return err
	}
	s.Publish(ctx, p.ID, map[string]any{"counts": counts, "total": total})
	return nil
}

func (s *Store) Publish(ctx context.Context, pollID string, msg map[string]any) {
	b, _ := json.Marshal(msg)
	s.Redis.Publish(ctx, Channel(pollID), b)
}

// Viewers tracks how many people are watching a poll right now.
func (s *Store) Viewers(ctx context.Context, id string, delta int64) int64 {
	n, _ := s.Redis.IncrBy(ctx, viewersKey(id), delta).Result()
	if n < 0 {
		n = 0
		s.Redis.Set(ctx, viewersKey(id), 0, 0)
	}
	s.Redis.Expire(ctx, viewersKey(id), 24*time.Hour)
	s.Publish(ctx, id, map[string]any{"viewers": n})
	return n
}

func (s *Store) ViewerCount(ctx context.Context, id string) int64 {
	n, _ := s.Redis.Get(ctx, viewersKey(id)).Int64()
	return n
}

func (s *Store) Purge(ctx context.Context, id string) {
	s.Redis.Del(ctx, countsKey(id), viewersKey(id))
	s.Votes.DeleteMany(ctx, bson.M{"pollId": id})
}
