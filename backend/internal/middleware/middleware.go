package middleware

import (
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"github.com/redis/go-redis/v9"
)

// Auth requires a valid JWT and stores the user id in the context as "uid".
func Auth(secret []byte) gin.HandlerFunc {
	return func(c *gin.Context) {
		h := c.GetHeader("Authorization")
		if !strings.HasPrefix(h, "Bearer ") {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "login required"})
			return
		}
		claims := &jwt.RegisteredClaims{}
		tok, err := jwt.ParseWithClaims(strings.TrimPrefix(h, "Bearer "), claims,
			func(*jwt.Token) (any, error) { return secret, nil },
			jwt.WithValidMethods([]string{"HS256"}))
		if err != nil || !tok.Valid || claims.Subject == "" {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "invalid or expired session"})
			return
		}
		c.Set("uid", claims.Subject)
		c.Next()
	}
}

// RateLimit is a fixed-window limiter per client IP, backed by Redis (fails open if Redis is down).
func RateLimit(rdb *redis.Client, name string, limit int64, window time.Duration) gin.HandlerFunc {
	return func(c *gin.Context) {
		key := fmt.Sprintf("rl:%s:%s", name, c.ClientIP())
		ctx := c.Request.Context()
		n, err := rdb.Incr(ctx, key).Result()
		if err == nil {
			if n == 1 {
				rdb.Expire(ctx, key, window)
			}
			if n > limit {
				c.AbortWithStatusJSON(http.StatusTooManyRequests, gin.H{"error": "too many requests, slow down"})
				return
			}
		}
		c.Next()
	}
}
