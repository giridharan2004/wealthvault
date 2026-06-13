package handlers

import (
	"context"
	"time"

	"os"
	"wealthvault/api/models"

	"cloud.google.com/go/firestore"
	firebase "firebase.google.com/go/v4"
	"github.com/gin-gonic/gin"
	"google.golang.org/api/option"
)

func getFirestoreClient(c *gin.Context) (*firestore.Client, error) {
	ctx := context.Background()
	credPath := os.Getenv("FIREBASE_CREDENTIALS")
	if credPath == "" {
		credPath = "../secrets/firebase-key.json"
	}
	app, err := firebase.NewApp(ctx, nil, option.WithCredentialsFile(credPath))
	if err != nil {
		return nil, err
	}
	return app.Firestore(ctx)
}

func GetPortfolio(c *gin.Context) {
	uid := c.GetString("uid")
	ctx := context.Background()

	client, err := getFirestoreClient(c)
	if err != nil {
		c.JSON(500, gin.H{"error": "database connection failed"})
		return
	}
	defer client.Close()

	docs, err := client.Collection("users").Doc(uid).
		Collection("assets").Documents(ctx).GetAll()
	if err != nil {
		c.JSON(500, gin.H{"error": "failed to fetch portfolio"})
		return
	}

	var assets []models.Asset
	totalValue := 0.0
	totalInvested := 0.0

	for _, doc := range docs {
		var asset models.Asset
		doc.DataTo(&asset)
		totalValue += asset.CurrentValue
		totalInvested += asset.BuyPrice * asset.Quantity
		assets = append(assets, asset)
	}

	portfolio := models.Portfolio{
		ID:            uid,
		Name:          "My Portfolio",
		TotalValue:    totalValue,
		TotalInvested: totalInvested,
		TotalReturns:  totalValue - totalInvested,
		ReturnsPc:     ((totalValue - totalInvested) / totalInvested) * 100,
		Assets:        assets,
	}

	c.JSON(200, portfolio)
}

func AddAsset(c *gin.Context) {
	uid := c.GetString("uid")
	ctx := context.Background()

	var req models.AddAssetRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(400, gin.H{"error": err.Error()})
		return
	}

	client, err := getFirestoreClient(c)
	if err != nil {
		c.JSON(500, gin.H{"error": "database connection failed"})
		return
	}
	defer client.Close()

	asset := models.Asset{
		ID:       time.Now().Format("20060102150405"),
		Type:     req.Type,
		Name:     req.Name,
		Symbol:   req.Symbol,
		Quantity: req.Quantity,
		BuyPrice: req.BuyPrice,
		BuyDate:  req.BuyDate,
		Metadata: req.Metadata,
	}

	_, err = client.Collection("users").Doc(uid).
		Collection("assets").Doc(asset.ID).Set(ctx, asset)
	if err != nil {
		c.JSON(500, gin.H{"error": "failed to save asset"})
		return
	}

	c.JSON(201, gin.H{"message": "asset added", "asset": asset})
}

func UpdateAsset(c *gin.Context) {
	uid := c.GetString("uid")
	assetID := c.Param("id")
	ctx := context.Background()

	var req models.AddAssetRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(400, gin.H{"error": err.Error()})
		return
	}

	client, err := getFirestoreClient(c)
	if err != nil {
		c.JSON(500, gin.H{"error": "database connection failed"})
		return
	}
	defer client.Close()

	_, err = client.Collection("users").Doc(uid).
		Collection("assets").Doc(assetID).Set(ctx, req)
	if err != nil {
		c.JSON(500, gin.H{"error": "failed to update asset"})
		return
	}

	c.JSON(200, gin.H{"message": "asset updated"})
}

func DeleteAsset(c *gin.Context) {
	uid := c.GetString("uid")
	assetID := c.Param("id")
	ctx := context.Background()

	client, err := getFirestoreClient(c)
	if err != nil {
		c.JSON(500, gin.H{"error": "database connection failed"})
		return
	}
	defer client.Close()

	_, err = client.Collection("users").Doc(uid).
		Collection("assets").Doc(assetID).Delete(ctx)
	if err != nil {
		c.JSON(500, gin.H{"error": "failed to delete asset"})
		return
	}

	c.JSON(200, gin.H{"message": "asset deleted"})
}
