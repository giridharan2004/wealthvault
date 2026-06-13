package handlers

import (
	"encoding/json"
	"fmt"
	"net/http"

	"github.com/gin-gonic/gin"
)

type MFApiResponse struct {
	Meta struct {
		FundHouse  string `json:"fund_house"`
		SchemeType string `json:"scheme_type"`
		SchemeName string `json:"scheme_name"`
		SchemeCode int    `json:"scheme_code"`
	} `json:"meta"`
	Data []struct {
		Date string `json:"date"`
		Nav  string `json:"nav"`
	} `json:"data"`
}

func GetMFNav(c *gin.Context) {
	schemeCode := c.Param("code")
	if schemeCode == "" {
		c.JSON(400, gin.H{"error": "scheme code is required"})
		return
	}

	// mfapi.in is completely free for Indian MF data
	url := fmt.Sprintf("https://api.mfapi.in/mf/%s", schemeCode)

	resp, err := http.Get(url)
	if err != nil {
		c.JSON(500, gin.H{"error": "failed to fetch NAV"})
		return
	}
	defer resp.Body.Close()

	var mfResp MFApiResponse
	if err := json.NewDecoder(resp.Body).Decode(&mfResp); err != nil {
		c.JSON(500, gin.H{"error": "failed to parse response"})
		return
	}

	if len(mfResp.Data) == 0 {
		c.JSON(404, gin.H{"error": "scheme not found"})
		return
	}

	latestNav := mfResp.Data[0]

	c.JSON(200, gin.H{
		"schemeCode": schemeCode,
		"schemeName": mfResp.Meta.SchemeName,
		"fundHouse":  mfResp.Meta.FundHouse,
		"nav":        latestNav.Nav,
		"date":       latestNav.Date,
	})
}
