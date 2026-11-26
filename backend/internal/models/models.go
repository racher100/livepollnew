package models

import "time"

type User struct {
	ID           string    `bson:"_id" json:"id"`
	Name         string    `bson:"name" json:"name"`
	Email        string    `bson:"email" json:"email"`
	PasswordHash string    `bson:"passwordHash" json:"-"`
	CreatedAt    time.Time `bson:"createdAt" json:"createdAt"`
}

type Option struct {
	ID   string `bson:"id" json:"id"`
	Text string `bson:"text" json:"text"`
}

type Poll struct {
	ID        string    `bson:"_id" json:"id"`
	Question  string    `bson:"question" json:"question"`
	Options   []Option  `bson:"options" json:"options"`
	CreatorID string    `bson:"creatorId" json:"creatorId"`
	Closed    bool      `bson:"closed" json:"closed"`
	Display   string    `bson:"display,omitempty" json:"display"` // projector state: lobby | voting | results
	CreatedAt time.Time `bson:"createdAt" json:"createdAt"`
}

type Vote struct {
	PollID    string    `bson:"pollId"`
	VoterID   string    `bson:"voterId"`
	OptionID  string    `bson:"optionId"`
	CreatedAt time.Time `bson:"createdAt"`
}
