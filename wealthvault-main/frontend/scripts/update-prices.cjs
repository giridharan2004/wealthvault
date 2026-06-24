const { initializeApp, cert, deleteApp } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const serviceAccount = require('../../firebase/firebase-admin.json');

const app = initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore(app);
const TARGET_MULTIPLIERS = [1.1, 1.15, 1.2, 1.25];

function calculateStock(stock) {
  const buyQty = Number(stock.buyQty || 0);
  const buyAmt = Number(stock.buyAmt || 0);
  const soldQty = Number(stock.soldQty || 0);
  const soldFrequency = Number(stock.soldFrequency || 0);
  const todaysRate = Number(stock.todaysRate || 0);

  const investedVal = buyQty * buyAmt;
  const qtyHeld = buyQty - soldQty;
  const currentVal = todaysRate * qtyHeld;
  const diffPL = currentVal - investedVal;
  const plPercent = investedVal > 0 ? (diffPL / investedVal) * 100 : 0;
  const stopLoss = investedVal * 0.9;
  const multiplier = TARGET_MULTIPLIERS[Math.min(soldFrequency, TARGET_MULTIPLIERS.length - 1)];
  const target = investedVal * multiplier;
  const targetPct = Math.round((multiplier - 1) * 100);
  const qtyNeedToSell = qtyHeld > 0 ? diffPL / qtyHeld : 0;

  let status = "Don't sell";
  if (currentVal >= target) status = `Sell now (+${targetPct}%)`;
  else if (currentVal <= stopLoss) status = 'Stop loss';

  return {
    investedVal,
    qtyHeld,
    currentVal,
    diffPL,
    plPercent,
    stopLoss,
    target,
    qtyNeedToSell,
    status
  };
}

async function fetchYahooPrice(shortName) {
  const symbol = `${String(shortName).trim().toUpperCase()}.NS`;
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=1d`;
  const response = await fetch(url, {
    headers: {
      Accept: 'application/json',
      'User-Agent': 'Mozilla/5.0 WealthVault price updater'
    }
  });

  if (!response.ok) {
    throw new Error(`Yahoo returned ${response.status}`);
  }

  const data = await response.json();
  const price = data?.chart?.result?.[0]?.meta?.regularMarketPrice;
  if (!price || price <= 0) {
    throw new Error('Price not found');
  }

  return price;
}

async function main() {
  const snapshot = await db.collectionGroup('stocks').get();
  let updated = 0;
  const failed = [];

  for (const doc of snapshot.docs) {
    const stock = doc.data();
    if (!stock.shortName) continue;

    try {
      const todaysRate = await fetchYahooPrice(stock.shortName);
      const calculated = calculateStock({ ...stock, todaysRate });
      await doc.ref.update({
        ...calculated,
        todaysRate,
        lastUpdated: new Date().toISOString()
      });
      updated += 1;
      console.log(`Updated ${stock.shortName}: ${todaysRate}`);
    } catch (error) {
      failed.push(stock.shortName);
      console.warn(`Failed ${stock.shortName}: ${error.message}`);
    }
  }

  console.log('');
  console.log(`Done. Updated: ${updated}. Failed: ${failed.length}`);
  if (failed.length) {
    console.log(`Failed symbols: ${failed.join(', ')}`);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await deleteApp(app);
  });
