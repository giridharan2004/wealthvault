package models

type AssetType string

const (
	Stock      AssetType = "STOCK"
	Gold       AssetType = "GOLD"
	MutualFund AssetType = "MUTUAL_FUND"
	Property   AssetType = "PROPERTY"
	FD         AssetType = "FD"
	NPS        AssetType = "NPS"
)

type Asset struct {
	ID           string    `json:"id" firestore:"id"`
	Type         AssetType `json:"type" firestore:"type"`
	Name         string    `json:"name" firestore:"name"`
	Symbol       string    `json:"symbol" firestore:"symbol"`
	Quantity     float64   `json:"quantity" firestore:"quantity"`
	BuyPrice     float64   `json:"buyPrice" firestore:"buyPrice"`
	BuyDate      string    `json:"buyDate" firestore:"buyDate"`
	CurrentPrice float64   `json:"currentPrice" firestore:"currentPrice"`
	CurrentValue float64   `json:"currentValue" firestore:"currentValue"`
	Returns      float64   `json:"returns" firestore:"returns"`
	ReturnsPC    float64   `json:"returnsPc" firestore:"returnsPc"`
	Metadata     Metadata  `json:"metadata" firestore:"metadata"`
}

type Metadata struct {
	// Gold specific
	Purity string  `json:"purity,omitempty" firestore:"purity,omitempty"`
	Grams  float64 `json:"grams,omitempty" firestore:"grams,omitempty"`

	// Property specific
	Address     string  `json:"address,omitempty" firestore:"address,omitempty"`
	AreaSqFt    float64 `json:"areaSqFt,omitempty" firestore:"areaSqFt,omitempty"`
	RentalYield float64 `json:"rentalYield,omitempty" firestore:"rentalYield,omitempty"`

	// FD specific
	BankName       string  `json:"bankName,omitempty" firestore:"bankName,omitempty"`
	InterestRate   float64 `json:"interestRate,omitempty" firestore:"interestRate,omitempty"`
	MaturityDate   string  `json:"maturityDate,omitempty" firestore:"maturityDate,omitempty"`
	MaturityAmount float64 `json:"maturityAmount,omitempty" firestore:"maturityAmount,omitempty"`

	// NPS specific
	Tier        string `json:"tier,omitempty" firestore:"tier,omitempty"`
	FundManager string `json:"fundManager,omitempty" firestore:"fundManager,omitempty"`
}

type Portfolio struct {
	ID            string  `json:"id" firestore:"id"`
	Name          string  `json:"name" firestore:"name"`
	TotalValue    float64 `json:"totalValue" firestore:"totalValue"`
	TotalInvested float64 `json:"totalInvested" firestore:"totalInvested"`
	TotalReturns  float64 `json:"totalReturns" firestore:"totalReturns"`
	ReturnsPc     float64 `json:"returnsPc" firestore:"returnsPc"`
	Assets        []Asset `json:"assets" firestore:"assets"`
}

type AddAssetRequest struct {
	Type     AssetType `json:"type" binding:"required"`
	Name     string    `json:"name" binding:"required"`
	Symbol   string    `json:"symbol"`
	Quantity float64   `json:"quantity" binding:"required"`
	BuyPrice float64   `json:"buyPrice" binding:"required"`
	BuyDate  string    `json:"buyDate" binding:"required"`
	Metadata Metadata  `json:"metadata"`
}
