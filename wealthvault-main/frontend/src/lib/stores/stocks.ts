import { writable, get } from 'svelte/store';
import {
  collection, doc, setDoc, deleteDoc,
  getDocs, updateDoc, getDoc, query, orderBy
} from 'firebase/firestore';
import { db } from '$lib/firebase';
import { user } from './auth';

export interface Stock {
  id: string;
  no: number;
  shareName: string;
  shortName: string;
  buyQty: number;
  buyAmt: number;
  buyDate: string;
  investedVal: number;
  soldFrequency: number;
  qtyHeld: number;
  todaysRate: number;
  currentVal: number;
  plPercent: number;
  stopLoss: number;
  target: number;
  status: string;
  diffPL: number;
  qtyNeedToSell: number;
  soldQty: number;
  soldDate: string;
  releaseStatus: boolean;
  lastUpdated: string;
}

export const stocks = writable<Stock[]>([]);
export const stocksLoading = writable(false);
export const pricesFetching = writable(false);
export const pricesLastUpdated = writable<string>('');

const TARGET_MULTIPLIERS = [1.10, 1.15, 1.20, 1.25];

export function calculateStock(s: Partial<Stock>): Partial<Stock> {
  const buyQty = s.buyQty || 0;
  const buyAmt = s.buyAmt || 0;
  const soldQty = s.soldQty || 0;
  const soldFrequency = s.soldFrequency || 0;
  const todaysRate = s.todaysRate || 0;

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

  return { ...s, investedVal, qtyHeld, currentVal, diffPL, plPercent, stopLoss, target, qtyNeedToSell, status };
}

export async function loadStocks(uid?: string): Promise<void> {
  const currentUser = get(user);
  const targetUid = uid || currentUser?.uid;
  if (!targetUid) return;

  stocksLoading.set(true);
  try {
    const q = query(collection(db, 'users', targetUid, 'stocks'), orderBy('no', 'asc'));
    const snap = await getDocs(q);
    const list: Stock[] = [];
    snap.forEach(d => list.push({ id: d.id, ...d.data() } as Stock));
    stocks.set(list);
  } catch (e) {
    console.error('loadStocks error:', e);
    stocks.set([]);
  } finally {
    stocksLoading.set(false);
  }
}

export async function addStock(data: Partial<Stock>, uid?: string): Promise<void> {
  const currentUser = get(user);
  const targetUid = uid || currentUser?.uid;
  if (!targetUid) return;
  const calculated = calculateStock(data);
  const id = Date.now().toString();
  await setDoc(doc(db, 'users', targetUid, 'stocks', id), {
    ...calculated, id,
    soldFrequency: data.soldFrequency ?? 0,
    soldQty: data.soldQty ?? 0,
    soldDate: data.soldDate ?? '',
    releaseStatus: data.releaseStatus ?? false,
    lastUpdated: new Date().toISOString()
  });
  await loadStocks(targetUid);
}

export async function updateStock(id: string, data: Partial<Stock>, uid?: string): Promise<void> {
  const currentUser = get(user);
  const targetUid = uid || currentUser?.uid;
  if (!targetUid) return;
  const ref = doc(db, 'users', targetUid, 'stocks', id);
  const snap = await getDoc(ref);
  if (!snap.exists()) return;
  const merged = { ...snap.data() as Stock, ...data };
  const calculated = calculateStock(merged);
  await updateDoc(ref, { ...calculated, lastUpdated: new Date().toISOString() });
  await loadStocks(targetUid);
}

export async function sellStock(id: string, qty: number, uid?: string, _sellRate?: number, sellDate?: string): Promise<void> {
  const currentUser = get(user);
  const targetUid = uid || currentUser?.uid;
  if (!targetUid) return;
  const ref = doc(db, 'users', targetUid, 'stocks', id);
  const snap = await getDoc(ref);
  if (!snap.exists()) return;
  const existing = snap.data() as Stock;
  const updated = calculateStock({
    ...existing,
    soldQty: (existing.soldQty || 0) + qty,
    soldFrequency: (existing.soldFrequency || 0) + 1,
    soldDate: sellDate || new Date().toISOString().split('T')[0]
  });
  await updateDoc(ref, { ...updated, lastUpdated: new Date().toISOString() });
  await loadStocks(targetUid);
}

export async function deleteStock(id: string, uid?: string): Promise<void> {
  const currentUser = get(user);
  const targetUid = uid || currentUser?.uid;
  if (!targetUid) return;
  await deleteDoc(doc(db, 'users', targetUid, 'stocks', id));
  await loadStocks(targetUid);
}

export async function fetchLivePrices(uid?: string): Promise<{ updated: number; failed: string[] }> {
  const currentUser = get(user);
  const targetUid = uid || currentUser?.uid;
  if (!targetUid) return { updated: 0, failed: [] };

  pricesFetching.set(true);
  const list = get(stocks);
  let updated = 0;
  const failed: string[] = [];

  for (const stock of list) {
    if (!stock.shortName) continue;
    try {
      const symbol = stock.shortName.toUpperCase() + '.NS';
      const res = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=1d`);
      const data = await res.json();
      const price = data?.chart?.result?.[0]?.meta?.regularMarketPrice;
      if (price && price > 0) {
        await updateStock(stock.id, { todaysRate: price }, targetUid);
        updated++;
      } else {
        failed.push(stock.shortName);
      }
    } catch {
      failed.push(stock.shortName);
    }
  }

  pricesFetching.set(false);
  pricesLastUpdated.set(new Date().toLocaleTimeString('en-IN'));
  return { updated, failed };
}
