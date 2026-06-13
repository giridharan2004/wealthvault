package handlers

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"strings"
	"sync"
	"time"

	"wealthvault/api/models"

	"cloud.google.com/go/firestore"
	firebase "firebase.google.com/go/v4"
	"github.com/gin-gonic/gin"
	"google.golang.org/api/option"
)

// Firestore client is initialized once and reused across all requests
var (
	firestoreClient *firestore.Client
	clientOnce      sync.Once
	clientErr       error
)

// getFirestoreClient returns a shared Firestore client, initializing it on first call
func getFirestoreClient() (*firestore.Client, error) {
	clientOnce.Do(func() {
		ctx := context.Background()

		// Use FIREBASE_CREDENTIALS env var or fall back to local secrets path
		credPath := os.Getenv("FIREBASE_CREDENTIALS")
		if credPath == "" {
			credPath = "../secrets/firebase-key.json"
		}

		app, err := firebase.NewApp(ctx, nil, option.WithCredentialsFile(credPath))
		if err != nil {
			log.Printf("Firebase init error: %v", err)
			clientErr = err
			return
		}

		firestoreClient, clientErr = app.Firestore(ctx)
		if clientErr != nil {
			log.Printf("Firestore init error: %v", clientErr)
		}
	})
	return firestoreClient, clientErr
}

// yahooMeta holds the fields we need from Yahoo Finance's meta object
type yahooMeta struct {
	RegularMarketPrice float64 `json:"regularMarketPrice"`
}

type yahooResult struct {
	Meta yahooMeta `json:"meta"`
}

type yahooChart struct {
	Result []yahooResult `json:"result"`
}

type yahooResponse struct {
	Chart yahooChart `json:"chart"`
}

// fetchCurrentPrice calls Yahoo Finance to get the live NSE price for a symbol.
// Returns 0 if the fetch fails — caller should fall back to buy price.
func fetchCurrentPrice(symbol string) float64 {
	// Trim any accidental whitespace from symbol
	symbol = strings.TrimSpace(symbol)

	url := fmt.Sprintf("https://query1.finance.yahoo.com/v8/finance/chart/%s.NS", symbol)

	// Yahoo Finance blocks requests without a User-Agent header
	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		log.Printf("Price fetch request error for %s: %v", symbol, err)
		return 0
	}
	req.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36")

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		log.Printf("Price fetch error for %s: %v", symbol, err)
		return 0
	}
	defer resp.Body.Close()

	var yr yahooResponse
	if err := json.NewDecoder(resp.Body).Decode(&yr); err != nil {
		log.Printf("Price parse error for %s: %v", symbol, err)
		return 0
	}

	if len(yr.Chart.Result) == 0 {
		log.Printf("No price result for symbol: %s", symbol)
		return 0
	}

	price := yr.Chart.Result[0].Meta.RegularMarketPrice
	log.Printf("Fetched price for %s: %.2f", symbol, price)
	return price
}

// GetPortfolio returns all assets for the authenticated user
func GetPortfolio(c *gin.Context) {
	uid := c.GetString("uid")
	ctx := context.Background()

	client, err := getFirestoreClient()
	if err != nil {
		log.Printf("Firestore connection error: %v", err)
		c.JSON(500, gin.H{"error": "database connection failed", "detail": err.Error()})
		return
	}

	// Fetch all assets from the user's subcollection
	docs, err := client.Collection("users").Doc(uid).
		Collection("assets").Documents(ctx).GetAll()
	if err != nil {
		log.Printf("Firestore fetch error: %v", err)
		c.JSON(500, gin.H{"error": "failed to fetch portfolio", "detail": err.Error()})
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

	// Return empty array instead of null when no assets exist
	if assets == nil {
		assets = []models.Asset{}
	}

	portfolio := models.Portfolio{
		ID:            uid,
		Name:          "My Portfolio",
		TotalValue:    totalValue,
		TotalInvested: totalInvested,
		TotalReturns:  totalValue - totalInvested,
		ReturnsPc:     0,
		Assets:        assets,
	}

	if totalInvested > 0 {
		portfolio.ReturnsPc = ((totalValue - totalInvested) / totalInvested) * 100
	}

	c.JSON(200, portfolio)
}

// AddAsset saves a new asset for the authenticated user.
// For stocks, it fetches the live price from Yahoo Finance and stores
// currentValue, returns, and returnsPc at save time.
func AddAsset(c *gin.Context) {
	uid := c.GetString("uid")
	ctx := context.Background()

	var req models.AddAssetRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		log.Printf("Bind error: %v", err)
		c.JSON(400, gin.H{"error": err.Error()})
		return
	}

	client, err := getFirestoreClient()
	if err != nil {
		log.Printf("Firestore connection error: %v", err)
		c.JSON(500, gin.H{"error": "database connection failed", "detail": err.Error()})
		return
	}

	// Clean up symbol — trim whitespace and uppercase
	symbol := strings.ToUpper(strings.TrimSpace(req.Symbol))

	// For stocks, fetch live price; fall back to buy price if fetch fails
	currentPrice := req.BuyPrice
	if req.Type == models.Stock && symbol != "" {
		if livePrice := fetchCurrentPrice(symbol); livePrice > 0 {
			currentPrice = livePrice
		}
	}

	// Calculate returns based on current vs buy price
	invested := req.BuyPrice * req.Quantity
	currentValue := currentPrice * req.Quantity
	returns := currentValue - invested
	returnsPc := 0.0
	if invested > 0 {
		returnsPc = (returns / invested) * 100
	}

	asset := models.Asset{
		ID:           time.Now().Format("20060102150405"),
		Type:         req.Type,
		Name:         strings.TrimSpace(req.Name),
		Symbol:       symbol,
		Quantity:     req.Quantity,
		BuyPrice:     req.BuyPrice,
		BuyDate:      req.BuyDate,
		Metadata:     req.Metadata,
		CurrentPrice: currentPrice,
		CurrentValue: currentValue,
		Returns:      returns,
		ReturnsPC:    returnsPc,
	}

	_, err = client.Collection("users").Doc(uid).
		Collection("assets").Doc(asset.ID).Set(ctx, asset)
	if err != nil {
		log.Printf("Firestore save error: %v", err)
		c.JSON(500, gin.H{"error": "failed to save asset", "detail": err.Error()})
		return
	}

	c.JSON(201, gin.H{"message": "asset added", "asset": asset})
}

// UpdateAsset replaces an existing asset document with new data
func UpdateAsset(c *gin.Context) {
	uid := c.GetString("uid")
	assetID := c.Param("id")
	ctx := context.Background()

	var req models.AddAssetRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(400, gin.H{"error": err.Error()})
		return
	}

	client, err := getFirestoreClient()
	if err != nil {
		c.JSON(500, gin.H{"error": "database connection failed", "detail": err.Error()})
		return
	}

	_, err = client.Collection("users").Doc(uid).
		Collection("assets").Doc(assetID).Set(ctx, req)
	if err != nil {
		c.JSON(500, gin.H{"error": "failed to update asset", "detail": err.Error()})
		return
	}

	c.JSON(200, gin.H{"message": "asset updated"})
}

// DeleteAsset removes an asset document from Firestore
func DeleteAsset(c *gin.Context) {
	uid := c.GetString("uid")
	assetID := c.Param("id")
	ctx := context.Background()

	client, err := getFirestoreClient()
	if err != nil {
		c.JSON(500, gin.H{"error": "database connection failed", "detail": err.Error()})
		return
	}

	_, err = client.Collection("users").Doc(uid).
		Collection("assets").Doc(assetID).Delete(ctx)
	if err != nil {
		c.JSON(500, gin.H{"error": "failed to delete asset", "detail": err.Error()})
		return
	}

	c.JSON(200, gin.H{"message": "asset deleted"})
}
