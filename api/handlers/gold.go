package handlers

import (
	"encoding/json"
	"net/http"
	"os"

	"github.com/gin-gonic/gin"
)

type GoldResponse struct {
	Price     float64 `json:"price"`
	Currency  string  `json:"currency"`
	Timestamp int64   `json:"timestamp"`
}

func GetGoldRate(c *gin.Context) {
	apiKey := os.Getenv("GOLD_API_KEY")

	req, _ := http.NewRequest("GET", "https://www.goldapi.io/api/XAU/INR", nil)
	req.Header.Set("x-access-token", apiKey)
	req.Header.Set("Content-Type", "application/json")

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		// Fallback: return approximate rate
		c.JSON(200, gin.H{
			"price":    7200.00,
			"currency": "INR",
			"unit":     "per gram (24K)",
			"source":   "fallback",
		})
		return
	}
	defer resp.Body.Close()

	var goldResp GoldResponse
	json.NewDecoder(resp.Body).Decode(&goldResp)

	// Gold API returns per troy ounce, convert to per gram
	pricePerGram := goldResp.Price / 31.1035

	c.JSON(200, gin.H{
		"price":    pricePerGram,
		"currency": "INR",
		"unit":     "per gram (24K)",
		"source":   "live",
	})
}
