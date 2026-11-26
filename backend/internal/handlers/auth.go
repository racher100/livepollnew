package handlers

import (
	"errors"
	"net/http"
	"net/mail"
	"strings"
	"time"
	"unicode/utf8"

	"livepoll/internal/models"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"golang.org/x/crypto/bcrypt"
)

type credentials struct {
	Name     string `json:"name"`
	Email    string `json:"email"`
	Password string `json:"password"`
}

func validateCreds(cr *credentials, signup bool) error {
	cr.Email = strings.ToLower(strings.TrimSpace(cr.Email))
	cr.Name = strings.TrimSpace(cr.Name)
	if a, err := mail.ParseAddress(cr.Email); err != nil || a.Address != cr.Email || len(cr.Email) > 254 {
		return errors.New("enter a valid email")
	}
	// bcrypt only uses the first 72 bytes, so cap there.
	if len(cr.Password) < 8 || len(cr.Password) > 72 {
		return errors.New("password must be 8-72 characters")
	}
	if signup {
		if n := utf8.RuneCountInString(cr.Name); n < 1 || n > 60 {
			return errors.New("name must be 1-60 characters")
		}
	}
	return nil
}

func (h *Handler) token(uid string) (string, error) {
	now := time.Now()
	return jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.RegisteredClaims{
		Subject: uid, IssuedAt: jwt.NewNumericDate(now), ExpiresAt: jwt.NewNumericDate(now.Add(7 * 24 * time.Hour)),
	}).SignedString(h.JWTSecret)
}

func (h *Handler) respondAuth(c *gin.Context, code int, u *models.User) {
	t, err := h.token(u.ID)
	if err != nil {
		fail(c, http.StatusInternalServerError, "server error")
		return
	}
	c.JSON(code, gin.H{"token": t, "user": u})
}

func (h *Handler) Signup(c *gin.Context) {
	var cr credentials
	if err := c.ShouldBindJSON(&cr); err != nil {
		fail(c, http.StatusBadRequest, "invalid request body")
		return
	}
	if err := validateCreds(&cr, true); err != nil {
		fail(c, http.StatusBadRequest, err.Error())
		return
	}
	hash, err := bcrypt.GenerateFromPassword([]byte(cr.Password), 10)
	if err != nil {
		fail(c, http.StatusInternalServerError, "server error")
		return
	}
	u := &models.User{ID: randHex(12), Name: cr.Name, Email: cr.Email, PasswordHash: string(hash), CreatedAt: time.Now()}
	if _, err := h.S.Users.InsertOne(c.Request.Context(), u); err != nil {
		if mongo.IsDuplicateKeyError(err) {
			fail(c, http.StatusConflict, "email already registered")
			return
		}
		fail(c, http.StatusInternalServerError, "server error")
		return
	}
	h.respondAuth(c, http.StatusCreated, u)
}

func (h *Handler) Login(c *gin.Context) {
	var cr credentials
	if err := c.ShouldBindJSON(&cr); err != nil {
		fail(c, http.StatusBadRequest, "invalid request body")
		return
	}
	if err := validateCreds(&cr, false); err != nil {
		fail(c, http.StatusBadRequest, err.Error())
		return
	}
	var u models.User
	err := h.S.Users.FindOne(c.Request.Context(), bson.M{"email": cr.Email}).Decode(&u)
	// Same message for unknown email and wrong password: don't leak which emails exist.
	if err != nil || bcrypt.CompareHashAndPassword([]byte(u.PasswordHash), []byte(cr.Password)) != nil {
		fail(c, http.StatusUnauthorized, "incorrect email or password")
		return
	}
	h.respondAuth(c, http.StatusOK, &u)
}

func (h *Handler) Me(c *gin.Context) {
	var u models.User
	if err := h.S.Users.FindOne(c.Request.Context(), bson.M{"_id": c.GetString("uid")}).Decode(&u); err != nil {
		fail(c, http.StatusUnauthorized, "account not found")
		return
	}
	c.JSON(http.StatusOK, gin.H{"user": u})
}
