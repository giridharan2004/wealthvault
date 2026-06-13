package main

import (
	"context"
	"log"
	"os"

	"wealthvault/api/config"
	"wealthvault/api/handlers"
	"wealthvault/api/middleware"

	"github.com/gin-gonic/gin"
)

func main() {
	firebaseApp := config.InitFirebase()

	authClient, err := firebaseApp.Auth(context.Background())
	if err != nil {
		log.Fatalf("Failed to create auth client: %v", err)
	}

	r := gin.Default()

	r.Use(func(c *gin.Context) {
		c.Header("Access-Control-Allow-Origin", "*")
		c.Header("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS")
		c.Header("Access-Control-Allow-Headers", "Authorization,Content-Type")
		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}
		c.Next()
	})

	r.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{"status": "ok", "app": "WealthVault API"})
	})

	auth := r.Group("/api")
	auth.Use(middleware.FirebaseAuth(authClient))
	{
		// Portfolio
		auth.GET("/portfolio", handlers.GetPortfolio)
		auth.POST("/portfolio/asset", handlers.AddAsset)
		auth.PUT("/portfolio/asset/:id", handlers.UpdateAsset)
		auth.DELETE("/portfolio/asset/:id", handlers.DeleteAsset)

		// Market data
		auth.GET("/stocks/price/:symbol", handlers.GetStockPrice)
		auth.GET("/mutualfunds/nav/:code", handlers.GetMFNav)
		auth.GET("/gold/rate", handlers.GetGoldRate)

		// Family
		auth.POST("/family/create", handlers.CreateFamily)
		auth.POST("/family/join", handlers.JoinFamily)
		auth.GET("/family", handlers.GetFamily)
		auth.GET("/family/member/:uid/assets", handlers.GetFamilyMemberAssets)
	}

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}
	log.Printf("WealthVault API running on port %s", port)
	r.Run(":" + port)
}
