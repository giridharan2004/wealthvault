package main

import (
    "log"
    "os"

    "github.com/gin-gonic/gin"
    "wealthvault/api/config"
    "wealthvault/api/handlers"
    "wealthvault/api/middleware"
)

func main() {
    // Initialize Firebase
    firebaseApp := config.InitFirebase()

    // Setup Gin router
    r := gin.Default()

    // CORS middleware
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

    // Public routes
    r.GET("/health", func(c *gin.Context) {
        c.JSON(200, gin.H{"status": "ok", "app": "WealthVault API"})
    })

    // Protected routes
    auth := r.Group("/api")
    auth.Use(middleware.FirebaseAuth(firebaseApp))
    {
        auth.GET("/portfolio", handlers.GetPortfolio)
        auth.POST("/portfolio/asset", handlers.AddAsset)
        auth.PUT("/portfolio/asset/:id", handlers.UpdateAsset)
        auth.DELETE("/portfolio/asset/:id", handlers.DeleteAsset)
        auth.GET("/stocks/price/:symbol", handlers.GetStockPrice)
        auth.GET("/mutualfunds/nav/:code", handlers.GetMFNav)
        auth.GET("/gold/rate", handlers.GetGoldRate)
    }

    // Start server
    port := os.Getenv("PORT")
    if port == "" {
        port = "8080"
    }
    log.Printf("WealthVault API running on port %s", port)
    r.Run(":" + port)
}
