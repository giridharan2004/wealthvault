/// Calculate CAGR (Compound Annual Growth Rate)
/// buy_price: initial investment
/// current_price: current value
/// days: number of days held
pub fn cagr(buy_price: f64, current_price: f64, days: u32) -> f64 {
    if buy_price <= 0.0 || days == 0 {
        return 0.0;
    }
    let years = days as f64 / 365.0;
    ((current_price / buy_price).powf(1.0 / years) - 1.0) * 100.0
}

/// Calculate absolute returns percentage
pub fn absolute_returns(buy_price: f64, current_price: f64) -> f64 {
    if buy_price <= 0.0 {
        return 0.0;
    }
    ((current_price - buy_price) / buy_price) * 100.0
}

/// Calculate XIRR using Newton-Raphson method
/// cashflows: Vec of (amount, days_from_start)
/// Negative amounts = investments, positive = redemptions/current value
pub fn xirr(cashflows: &[(f64, i64)]) -> f64 {
    if cashflows.is_empty() {
        return 0.0;
    }

    let mut rate = 0.1_f64;

    for _ in 0..1000 {
        let npv: f64 = cashflows
            .iter()
            .map(|(cf, t)| cf / (1.0 + rate).powf(*t as f64 / 365.0))
            .sum();

        let dnpv: f64 = cashflows
            .iter()
            .map(|(cf, t)| -cf * (*t as f64 / 365.0) / (1.0 + rate).powf(*t as f64 / 365.0 + 1.0))
            .sum();

        if dnpv.abs() < 1e-10 {
            break;
        }

        let new_rate = rate - npv / dnpv;

        if (new_rate - rate).abs() < 1e-10 {
            break;
        }

        rate = new_rate;
    }

    rate * 100.0
}

/// Calculate portfolio allocation percentage
pub fn allocation_percent(asset_value: f64, total_value: f64) -> f64 {
    if total_value <= 0.0 {
        return 0.0;
    }
    (asset_value / total_value) * 100.0
}

/// Calculate FD maturity amount
/// principal: initial deposit
/// rate: annual interest rate (percentage)
/// months: tenure in months
pub fn fd_maturity(principal: f64, rate: f64, months: u32) -> f64 {
    let years = months as f64 / 12.0;
    let quarterly_rate = rate / 4.0 / 100.0;
    let quarters = years * 4.0;
    principal * (1.0 + quarterly_rate).powf(quarters)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_cagr() {
        let result = cagr(100000.0, 150000.0, 365);
        assert!((result - 50.0).abs() < 0.01);
    }

    #[test]
    fn test_absolute_returns() {
        let result = absolute_returns(100000.0, 120000.0);
        assert!((result - 20.0).abs() < 0.01);
    }

    #[test]
    fn test_fd_maturity() {
        let result = fd_maturity(100000.0, 7.0, 12);
        assert!(result > 107000.0);
    }
}
