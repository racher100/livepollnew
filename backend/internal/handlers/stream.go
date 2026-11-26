package handlers

import (
	"context"
	"fmt"
	"io"
	"time"

	"livepoll/internal/store"

	"github.com/gin-gonic/gin"
)

// Stream pushes live updates to the browser over Server-Sent Events.
// Every event comes from a Redis Pub/Sub channel, so any number of backend
// instances can serve watchers and they all see the same votes.
func (h *Handler) Stream(c *gin.Context) {
	p, ok := h.findPoll(c)
	if !ok {
		return
	}
	ctx := c.Request.Context()
	sub := h.S.Redis.Subscribe(ctx, store.Channel(p.ID))
	defer sub.Close()
	if _, err := sub.Receive(ctx); err != nil {
		fail(c, 500, "stream unavailable")
		return
	}

	c.Header("Content-Type", "text/event-stream")
	c.Header("Cache-Control", "no-cache")
	c.Header("Connection", "keep-alive")
	c.Header("X-Accel-Buffering", "no")

	h.S.Viewers(ctx, p.ID, 1)
	defer h.S.Viewers(context.Background(), p.ID, -1)

	ch := sub.Channel()
	ping := time.NewTicker(20 * time.Second)
	defer ping.Stop()

	c.Stream(func(w io.Writer) bool {
		select {
		case <-ctx.Done():
			return false
		case m, ok := <-ch:
			if !ok {
				return false
			}
			c.SSEvent("message", m.Payload)
			return true
		case <-ping.C:
			fmt.Fprint(w, ": ping\n\n")
			return true
		}
	})
}
