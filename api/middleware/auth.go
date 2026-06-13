package middleware

import (
    "context"
    "strings"

    firebase "firebase.google.com/go/v4"
    "github.com/gin-gonic/gin"
)

func FirebaseAuth(app *firebase.App) gin.HandlerFunc {
    return func(c *gin.Context) {
        authHeader := c.GetHeader("Authorization")
        if authHeader == "" {
            c.AbortWithStatusJSON(401, gin.H{"error": "missing authorization header"})
            return
        }

        idToken := strings.TrimPrefix(authHeader, "Bearer ")
        if idToken == authHeader {
            c.AbortWithStatusJSON(401, gin.H{"error": "invalid token format"})
            return
        }

        client, err := app.Auth(context.Background())
        if err != nil {
            c.AbortWithStatusJSON(500, gin.H{"error": "auth client error"})
            return
        }

        decoded, err := client.VerifyIDToken(context.Background(), idToken)
        if err != nil {
            c.AbortWithStatusJSON(401, gin.H{"error": "invalid or expired token"})
            return
        }

        // Set uid in context for handlers to use
        c.Set("uid", decoded.UID)
        c.Next()
    }
}
