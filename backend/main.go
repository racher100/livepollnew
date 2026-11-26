package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"os/signal"
	"path/filepath"
	"strings"
	"syscall"
	"time"

	"livepoll/internal/config"
	"livepoll/internal/handlers"
	"livepoll/internal/middleware"
	"livepoll/internal/store"

	"github.com/gin-gonic/gin"
)

func main() {
	cfg := config.Load()
	st, err := store.New(context.Background(), cfg.MongoURI, cfg.MongoDB, cfg.RedisURL)
	if err != nil {
		log.Fatalf("connect databases: %v", err)
	}
	h := &handlers.Handler{S: st, JWTSecret: []byte(cfg.JWTSecret)}
	authMW := middleware.Auth(h.JWTSecret)

	r := gin.New()
	r.Use(gin.Logger(), gin.Recovery(), func(c *gin.Context) {
		c.Request.Body = http.MaxBytesReader(c.Writer, c.Request.Body, 1<<20) // 1 MB body cap
		c.Next()
	})

	api := r.Group("/api")
	api.GET("/healthz", func(c *gin.Context) { c.JSON(200, gin.H{"ok": true}) })
	api.POST("/auth/signup", middleware.RateLimit(st.Redis, "auth", 20, time.Minute), h.Signup)
	api.POST("/auth/login", middleware.RateLimit(st.Redis, "auth", 20, time.Minute), h.Login)
	api.GET("/auth/me", authMW, h.Me)

	api.POST("/polls", authMW, h.CreatePoll)
	api.GET("/my/polls", authMW, h.MyPolls)
	api.PATCH("/polls/:id/close", authMW, h.SetClosed)
	api.DELETE("/polls/:id", authMW, h.DeletePoll)
	api.POST("/polls/:id/reset", authMW, h.ResetVotes)     // clear all votes
	api.PATCH("/polls/:id/display", authMW, h.SetDisplay) // lobby / push / reveal

	api.GET("/polls/:id", h.GetPoll)
	api.GET("/polls/:id/stream", h.Stream)
	api.POST("/polls/:id/vote", middleware.RateLimit(st.Redis, "vote", 30, time.Minute), h.Vote)

	// Serve the built React app (single deployable unit); SPA fallback to index.html.
	r.NoRoute(func(c *gin.Context) {
		if strings.HasPrefix(c.Request.URL.Path, "/api/") {
			c.JSON(404, gin.H{"error": "not found"})
			return
		}
		f := filepath.Join(cfg.StaticDir, filepath.Clean("/"+c.Request.URL.Path))
		if info, err := os.Stat(f); err == nil && !info.IsDir() {
			c.File(f)
			return
		}
		c.File(filepath.Join(cfg.StaticDir, "index.html"))
	})

	// No WriteTimeout: SSE connections are long-lived.
	srv := &http.Server{Addr: ":" + cfg.Port, Handler: r, ReadHeaderTimeout: 10 * time.Second}
	go func() {
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatal(err)
		}
	}()
	log.Printf("listening on :%s", cfg.Port)

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	_ = srv.Shutdown(ctx)
	st.Close(ctx)
}
