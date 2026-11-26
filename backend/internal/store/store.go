// Package store owns all database access: MongoDB (durable data) and Redis (live counts + pub/sub).
package store

import (
	"context"
	"fmt"
	"time"

	"github.com/redis/go-redis/v9"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

type Store struct {
	Users, Polls, Votes *mongo.Collection
	Redis               *redis.Client
	mongo               *mongo.Client
}

func New(ctx context.Context, mongoURI, dbName, redisURL string) (*Store, error) {
	ctx, cancel := context.WithTimeout(ctx, 15*time.Second)
	defer cancel()

	mc, err := mongo.Connect(ctx, options.Client().ApplyURI(mongoURI))
	if err != nil {
		return nil, fmt.Errorf("connect MongoDB: %w", err)
	}
	if err := mc.Ping(ctx, nil); err != nil {
		return nil, fmt.Errorf("ping MongoDB: %w", err)
	}
	opt, err := redis.ParseURL(redisURL)
	if err != nil {
		return nil, fmt.Errorf("parse Redis URL: %w", err)
	}
	rdb := redis.NewClient(opt)
	if err := rdb.Ping(ctx).Err(); err != nil {
		return nil, fmt.Errorf("ping Redis: %w", err)
	}

	db := mc.Database(dbName)
	s := &Store{Users: db.Collection("users"), Polls: db.Collection("polls"), Votes: db.Collection("votes"), Redis: rdb, mongo: mc}

	indexes := []struct {
		c *mongo.Collection
		m mongo.IndexModel
	}{
		{s.Users, mongo.IndexModel{Keys: bson.D{{Key: "email", Value: 1}}, Options: options.Index().SetUnique(true)}},
		{s.Polls, mongo.IndexModel{Keys: bson.D{{Key: "creatorId", Value: 1}, {Key: "createdAt", Value: -1}}}},
		// One vote per voter per poll is enforced by the database itself.
		{s.Votes, mongo.IndexModel{Keys: bson.D{{Key: "pollId", Value: 1}, {Key: "voterId", Value: 1}}, Options: options.Index().SetUnique(true)}},
	}
	for _, i := range indexes {
		if _, err := i.c.Indexes().CreateOne(ctx, i.m); err != nil {
			return nil, err
		}
	}
	return s, nil
}

func (s *Store) Close(ctx context.Context) {
	_ = s.mongo.Disconnect(ctx)
	_ = s.Redis.Close()
}
