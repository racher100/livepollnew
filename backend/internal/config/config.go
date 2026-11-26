package config

import (
	"log"
	"os"
)

type Config struct {
	Port, MongoURI, MongoDB, RedisURL, JWTSecret, StaticDir string
}

func Load() Config {
	c := Config{
		Port:      get("PORT", "8080"),
		MongoURI:  get("MONGO_URI", "mongodb://localhost:27017"),
		MongoDB:   get("MONGO_DB", "livepoll"),
		RedisURL:  get("REDIS_URL", "redis://localhost:6379"),
		JWTSecret: os.Getenv("JWT_SECRET"),
		StaticDir: get("STATIC_DIR", "./static"),
	}
	if len(c.JWTSecret) < 16 {
		log.Fatal("JWT_SECRET must be set (at least 16 characters)")
	}
	return c
}

func get(k, d string) string {
	if v := os.Getenv(k); v != "" {
		return v
	}
	return d
}
