package handlers

import (
	"errors"
	"net/http"
	"strconv"
	"strings"
	"time"
	"unicode/utf8"

	"livepoll/internal/models"
	"livepoll/internal/store"

	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo/options"
)

type createReq struct {
	Question string   `json:"question"`
	Options  []string `json:"options"`
}

func validatePoll(r *createReq) ([]models.Option, error) {
	r.Question = strings.TrimSpace(r.Question)
	if n := utf8.RuneCountInString(r.Question); n < 3 || n > 200 {
		return nil, errors.New("question must be 3-200 characters")
	}
	if len(r.Options) < 2 || len(r.Options) > 10 {
		return nil, errors.New("provide 2-10 options")
	}
	seen := map[string]bool{}
	opts := make([]models.Option, 0, len(r.Options))
	for i, t := range r.Options {
		t = strings.TrimSpace(t)
		if n := utf8.RuneCountInString(t); n < 1 || n > 100 {
			return nil, errors.New("each option must be 1-100 characters")
		}
		k := strings.ToLower(t)
		if seen[k] {
			return nil, errors.New("options must be unique")
		}
		seen[k] = true
		opts = append(opts, models.Option{ID: strconv.Itoa(i), Text: t})
	}
	return opts, nil
}

func (h *Handler) CreatePoll(c *gin.Context) {
	var r createReq
	if err := c.ShouldBindJSON(&r); err != nil {
		fail(c, http.StatusBadRequest, "invalid request body")
		return
	}
	opts, err := validatePoll(&r)
	if err != nil {
		fail(c, http.StatusBadRequest, err.Error())
		return
	}
	ctx := c.Request.Context()
	p := &models.Poll{ID: shortID(8), Question: r.Question, Options: opts, CreatorID: c.GetString("uid"), CreatedAt: time.Now()}
	if _, err := h.S.Polls.InsertOne(ctx, p); err != nil {
		fail(c, http.StatusInternalServerError, "could not create poll")
		return
	}
	_ = h.S.InitCounts(ctx, p)
	c.JSON(http.StatusCreated, gin.H{"poll": p})
}

func (h *Handler) MyPolls(c *gin.Context) {
	ctx := c.Request.Context()
	cur, err := h.S.Polls.Find(ctx, bson.M{"creatorId": c.GetString("uid")},
		options.Find().SetSort(bson.D{{Key: "createdAt", Value: -1}}).SetLimit(100))
	var polls []models.Poll
	if err == nil {
		err = cur.All(ctx, &polls)
	}
	if err != nil {
		fail(c, http.StatusInternalServerError, "server error")
		return
	}
	out := make([]gin.H, 0, len(polls))
	for i := range polls {
		_, total, _ := h.S.Counts(ctx, &polls[i])
		out = append(out, gin.H{"poll": polls[i], "total": total})
	}
	c.JSON(http.StatusOK, gin.H{"polls": out})
}

// voterID identifies an anonymous voter with a random httpOnly cookie.
func (h *Handler) voterID(c *gin.Context) (string, bool) {
	if v, err := c.Cookie("voter_id"); err == nil && len(v) == 32 {
		return v, true
	}
	return "", false
}

func (h *Handler) GetPoll(c *gin.Context) {
	p, ok := h.findPoll(c)
	if !ok {
		return
	}
	ctx := c.Request.Context()
	counts, total, err := h.S.Counts(ctx, p)
	if err != nil {
		fail(c, http.StatusInternalServerError, "server error")
		return
	}
	var myVote any
	if vid, ok := h.voterID(c); ok {
		var v models.Vote
		if h.S.Votes.FindOne(ctx, bson.M{"pollId": p.ID, "voterId": vid}).Decode(&v) == nil {
			myVote = v.OptionID
		}
	}
	c.JSON(http.StatusOK, gin.H{"poll": p, "counts": counts, "total": total, "closed": p.Closed, "display": displayOf(p),
		"viewers": h.S.ViewerCount(ctx, p.ID), "myVote": myVote})
}

func (h *Handler) Vote(c *gin.Context) {
	var r struct {
		OptionID string `json:"optionId"`
	}
	if err := c.ShouldBindJSON(&r); err != nil {
		fail(c, http.StatusBadRequest, "invalid request body")
		return
	}
	p, ok := h.findPoll(c)
	if !ok {
		return
	}
	if p.Closed {
		fail(c, http.StatusConflict, "this poll is closed")
		return
	}
	valid := false
	for _, o := range p.Options {
		valid = valid || o.ID == r.OptionID
	}
	if !valid {
		fail(c, http.StatusBadRequest, "invalid option")
		return
	}
	vid, ok := h.voterID(c)
	if !ok {
		vid = randHex(16)
		c.SetSameSite(http.SameSiteLaxMode)
		secure := c.Request.TLS != nil || c.GetHeader("X-Forwarded-Proto") == "https"
		c.SetCookie("voter_id", vid, 365*24*3600, "/", "", secure, true)
	}
	ctx := c.Request.Context()
	if err := h.S.CastVote(ctx, p, vid, r.OptionID); err != nil {
		if errors.Is(err, store.ErrAlreadyVoted) {
			fail(c, http.StatusConflict, "you have already voted on this poll")
			return
		}
		fail(c, http.StatusInternalServerError, "could not record vote")
		return
	}
	counts, total, _ := h.S.Counts(ctx, p)
	c.JSON(http.StatusOK, gin.H{"counts": counts, "total": total, "myVote": r.OptionID})
}

func (h *Handler) SetClosed(c *gin.Context) {
	var r struct {
		Closed *bool `json:"closed"`
	}
	if err := c.ShouldBindJSON(&r); err != nil || r.Closed == nil {
		fail(c, http.StatusBadRequest, "closed (true/false) is required")
		return
	}
	ctx := c.Request.Context()
	res, err := h.S.Polls.UpdateOne(ctx, bson.M{"_id": c.Param("id"), "creatorId": c.GetString("uid")},
		bson.M{"$set": bson.M{"closed": *r.Closed}})
	if err != nil {
		fail(c, http.StatusInternalServerError, "server error")
		return
	}
	if res.MatchedCount == 0 {
		fail(c, http.StatusNotFound, "poll not found")
		return
	}
	h.S.Publish(ctx, c.Param("id"), map[string]any{"closed": *r.Closed})
	c.JSON(http.StatusOK, gin.H{"closed": *r.Closed})
}

func (h *Handler) DeletePoll(c *gin.Context) {
	ctx := c.Request.Context()
	res, err := h.S.Polls.DeleteOne(ctx, bson.M{"_id": c.Param("id"), "creatorId": c.GetString("uid")})
	if err != nil {
		fail(c, http.StatusInternalServerError, "server error")
		return
	}
	if res.DeletedCount == 0 {
		fail(c, http.StatusNotFound, "poll not found")
		return
	}
	h.S.Publish(ctx, c.Param("id"), map[string]any{"deleted": true})
	h.S.Purge(ctx, c.Param("id"))
	c.Status(http.StatusNoContent)
}
