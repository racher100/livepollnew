package handlers

import (
	"crypto/rand"
	"encoding/hex"
	"errors"
	"net/http"

	"livepoll/internal/models"
	"livepoll/internal/store"

	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
)

type Handler struct {
	S         *store.Store
	JWTSecret []byte
}

func randHex(n int) string {
	b := make([]byte, n)
	_, _ = rand.Read(b)
	return hex.EncodeToString(b)
}

const alphabet = "abcdefghijkmnpqrstuvwxyz23456789" // 32 chars, no modulo bias

func shortID(n int) string {
	b := make([]byte, n)
	_, _ = rand.Read(b)
	for i := range b {
		b[i] = alphabet[int(b[i])%len(alphabet)]
	}
	return string(b)
}

func fail(c *gin.Context, code int, msg string) { c.AbortWithStatusJSON(code, gin.H{"error": msg}) }

func (h *Handler) findPoll(c *gin.Context) (*models.Poll, bool) {
	var p models.Poll
	err := h.S.Polls.FindOne(c.Request.Context(), bson.M{"_id": c.Param("id")}).Decode(&p)
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
