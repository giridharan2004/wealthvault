pub enum AssetClass {
    EquityStock,
    EquityMutualFund,
    DebtMutualFund,
    Gold,
    Property,
    FD,
}

pub struct TaxResult {
    pub gain: f64,
    pub is_ltcg: bool,
    pub tax_amount: f64,
    pub tax_rate: f64,
    pub holding_days: u32,
}

/// Calculate India capital gains tax
/// Based on Budget 2024 rules
pub fn calculate_tax(
    asset_class: AssetClass,
    buy_price: f64,
    sell_price: f64,
    quantity: f64,
    holding_days: u32,
) -> TaxResult {
    let total_buy = buy_price * quantity;
    let total_sell = sell_price * quantity;
    let gain = total_sell - total_buy;

    // LTCG threshold in days
    let ltcg_days = match asset_class {
        AssetClass::EquityStock | AssetClass::EquityMutualFund => 365,
        AssetClass::DebtMutualFund | AssetClass::Gold | AssetClass::Property => 730,
        AssetClass::FD => 0, // FD is always taxed at slab rate
    };

    let is_ltcg = holding_days >= ltcg_days;

    // Tax rates post Budget 2024
    let tax_rate = match asset_class {
        AssetClass::EquityStock | AssetClass::EquityMutualFund => {
            if is_ltcg {
                // LTCG exempt up to 1.25 lakh, 12.5% above
                12.5
            } else {
                // STCG flat 20%
                20.0
            }
        }
        AssetClass::DebtMutualFund => {
            // Always at slab rate post 2023
            30.0
        }
        AssetClass::Gold => {
            if is_ltcg {
                20.0
            } else {
                30.0
            }
        }
        AssetClass::Property => {
            if is_ltcg {
                20.0
            } else {
                30.0
            }
        }
        AssetClass::FD => 30.0,
    };

    // Equity LTCG exemption of 1.25 lakh
    let taxable_gain = match asset_class {
        AssetClass::EquityStock | AssetClass::EquityMutualFund if is_ltcg => {
            let exempt = 125000.0;
            if gain > exempt {
                gain - exempt
            } else {
                0.0
            }
        }
        _ => {
            if gain > 0.0 {
                gain
            } else {
                0.0
            }
        }
    };

    let tax_amount = taxable_gain * tax_rate / 100.0;

    TaxResult {
        gain,
        is_ltcg,
        tax_amount,
        tax_rate,
        holding_days,
    }
}
