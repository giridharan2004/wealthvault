package handlers

import (
	"encoding/json"
	"fmt"
	"net/http"

	"github.com/gin-gonic/gin"
)

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

func GetStockPrice(c *gin.Context) {
	symbol := c.Param("symbol")
	if symbol == "" {
		c.JSON(400, gin.H{"error": "symbol is required"})
		return
	}

	// Append .NS for NSE or .BO for BSE
	url := fmt.Sprintf(
		"https://query1.finance.yahoo.com/v8/finance/chart/%s.NS",
		symbol,
	)

	resp, err := http.Get(url)
	if err != nil {
		c.JSON(500, gin.H{"error": "failed to fetch stock price"})
		return
	}
	defer resp.Body.Close()

	var yahooResp YahooResponse
	if err := json.NewDecoder(resp.Body).Decode(&yahooResp); err != nil {
		c.JSON(500, gin.H{"error": "failed to parse response"})
		return
	}

	if len(yahooResp.Chart.Result) == 0 {
		c.JSON(404, gin.H{"error": "stock not found"})
		return
	}

	result := yahooResp.Chart.Result[0].Meta
	change := result.RegularMarketPrice - result.PreviousClose
	changePc := (change / result.PreviousClose) * 100

	c.JSON(200, gin.H{
		"symbol":   result.Symbol,
		"name":     result.LongName,
		"price":    result.RegularMarketPrice,
		"currency": result.Currency,
		"change":   change,
		"changePc": changePc,
	})
}
