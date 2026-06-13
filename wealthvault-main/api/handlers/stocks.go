package handlers

import (
	"encoding/json"
	"fmt"
	"net/http"

	"github.com/gin-gonic/gin"
)

// YahooResponse maps the Yahoo Finance v8 chart API response structure
type YahooResponse struct {
	Chart struct {
		Result []struct {
			Meta struct {
				RegularMarketPrice float64 `json:"regularMarketPrice"`
				Currency           string  `json:"currency"`
				Symbol             string  `json:"symbol"`
				LongName           string  `json:"longName"`
				PreviousClose      float64 `json:"previousClose"`
			} `json:"meta"`
		} `json:"result"`
		Error interface{} `json:"error"`
	} `json:"chart"`
}

// GetStockPrice fetches the live price of an NSE stock using Yahoo Finance.
// It expects the NSE ticker symbol as a URL param e.g. /api/stocks/price/RELIANCE
func GetStockPrice(c *gin.Context) {
	symbol := c.Param("symbol")
	if symbol == "" {
		c.JSON(400, gin.H{"error": "symbol is required"})
		return
	}

	// Yahoo Finance uses .NS suffix for NSE stocks (e.g. RELIANCE.NS)
	url := fmt.Sprintf(
		"https://query1.finance.yahoo.com/v8/finance/chart/%s.NS",
		symbol,
	)

	// Yahoo Finance blocks requests without a User-Agent header — must set one
	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		c.JSON(500, gin.H{"error": "failed to create request"})
		return
	}
	req.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36")

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		c.JSON(500, gin.H{"error": "failed to fetch stock price"})
		return
	}
	defer resp.Body.Close()

	// Parse the Yahoo Finance JSON response
	var yahooResp YahooResponse
	if err := json.NewDecoder(resp.Body).Decode(&yahooResp); err != nil {
		c.JSON(500, gin.H{"error": "failed to parse response"})
		return
	}

	// Empty result means the symbol doesn't exist on NSE
	if len(yahooResp.Chart.Result) == 0 {
		c.JSON(404, gin.H{"error": "stock not found"})
		return
	}

	// Calculate price change and percentage change from previous close
	result := yahooResp.Chart.Result[0].Meta
	change := result.RegularMarketPrice - result.PreviousClose
	changePc := 0.0
	if result.PreviousClose > 0 {
		changePc = (change / result.PreviousClose) * 100
	}

	c.JSON(200, gin.H{
		"symbol":   result.Symbol,
		"name":     result.LongName,
		"price":    result.RegularMarketPrice,
		"currency": result.Currency,
		"change":   change,
		"changePc": changePc,
	})
}
