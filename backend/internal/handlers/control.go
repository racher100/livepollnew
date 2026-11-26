package handlers

import (
	"errors"
	"net/http"

	"livepoll/internal/models"

	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
)

// What the projector display (/d/:id) is currently showing.
//   lobby   - join QR code + link
//   voting  - question is pushed, results hidden
//   results - live results revealed (default, same as the original behaviour)
var displayModes = map[string]bool{"lobby": true, "voting": true, "results": true}

func displayOf(p *models.Poll) string {
	if displayModes[p.Display] {
		return p.Display
	}
	return "results"
}

// ownedPoll loads the poll only if the logged-in user created it.
func (h *Handler) ownedPoll(c *gin.Context) (*models.Poll, bool) {
	var p models.Poll
	err := h.S.Polls.FindOne(c.Request.Context(), bson.M{"_id": c.Param("id"), "creatorId": c.GetString("uid")}).Decode(&p)
	if errors.Is(err, mongo.ErrNoDocuments) {
		fail(c, http.StatusNotFound, "poll not found")
		return nil, false
	}
	if err != nil {
		fail(c, http.StatusInternalServerError, "server error")
		return nil, false
	}
	return &p, true
}

// SetDisplay is the presenter's remote control: Lobby / Push / Reveal.
func (h *Handler) SetDisplay(c *gin.Context) {
	var r struct {
		Display string `json:"display"`
	}
	if err := c.ShouldBindJSON(&r); err != nil || !displayModes[r.Display] {
		fail(c, http.StatusBadRequest, "display must be lobby, voting or results")
		return
	}
	p, ok := h.ownedPoll(c)
	if !ok {
		return
	}
	ctx := c.Request.Context()
	if _, err := h.S.Polls.UpdateOne(ctx, bson.M{"_id": p.ID}, bson.M{"$set": bson.M{"display": r.Display}}); err != nil {
		fail(c, http.StatusInternalServerError, "server error")
		return
	}
	h.S.Publish(ctx, p.ID, map[string]any{"display": r.Display})
	c.JSON(http.StatusOK, gin.H{"display": r.Display})
}

// ResetVotes clears every vote on a poll (owner only) and tells all watchers.
func (h *Handler) ResetVotes(c *gin.Context) {
	p, ok := h.ownedPoll(c)
	if !ok {
		return
	}
	if err := h.S.ResetVotes(c.Request.Context(), p); err != nil {
		fail(c, http.StatusInternalServerError, "could not reset votes")
		return
	}
	c.JSON(http.StatusOK, gin.H{"reset": true})
}
