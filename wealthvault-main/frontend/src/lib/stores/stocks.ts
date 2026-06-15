import { writable, get } from 'svelte/store';
import {
  collection, doc, setDoc, deleteDoc,
  query, getDocs, updateDoc, getDoc
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

export function calculateTarget(investedVal: number, soldFrequency: number): number {
  const multipliers = [1.10, 1.15, 1.20, 1.25];
  const idx = Math.min(soldFrequency, multipliers.length - 1);
  return investedVal * multipliers[idx];
}

export function calculateStock(s: Partial<Stock>): Partial<Stock> {
  const investedVal = (s.buyQty || 0) * (s.buyAmt || 0);
  const qtyHeld = (s.buyQty || 0) - (s.soldQty || 0);
  const currentVal = (s.todaysRate || 0) * qtyHeld;
  const diffPL = currentVal - investedVal;
  const plPercent = investedVal > 0 ? (diffPL / investedVal) * 100 : 0;
  const stopLoss = investedVal * 0.9;
  const target = calculateTarget(investedVal, s.soldFrequency || 0);
  const qtyNeedToSell = qtyHeld > 0 ? diffPL / qtyHeld : 0;

  let status = "Don't sell";
  if (currentVal >= target) status = 'Sell now';
  else if (currentVal <= stopLoss) status = 'Stop loss';

  return { ...s, investedVal, qtyHeld, currentVal, diffPL, plPercent, stopLoss, target, qtyNeedToSell, status };
}

export async function loadStocks(uid?: string): Promise<void> {
  const currentUser = get(user);
  const targetUid = uid || currentUser?.uid;
  if (!targetUid) return;

  stocksLoading.set(true);
  try {
    const q = query(collection(db, 'users', targetUid, 'stocks'));
    const snap = await getDocs(q);
    const list: Stock[] = [];
    snap.forEach(d => list.push({ id: d.id, ...d.data() } as Stock));
    list.sort((a, b) => a.no - b.no);
    stocks.set(list);
  } finally {
    stocksLoading.set(false);
  }
}

export async function addStock(data: Partial<Stock>): Promise<void> {
  const currentUser = get(user);
  if (!currentUser) return;
  const calculated = calculateStock(data);
  const id = Date.now().toString();
  await setDoc(doc(db, 'users', currentUser.uid, 'stocks', id), {
    ...calculated, id, soldFrequency: 0, soldQty: 0,
    soldDate: '', releaseStatus: false, lastUpdated: new Date().toISOString()
  });
  await loadStocks();
}

export async function updateStock(id: string, data: Partial<Stock>): Promise<void> {
  const currentUser = get(user);
  if (!currentUser) return;
  const ref = doc(db, 'users', currentUser.uid, 'stocks', id);
  const snap = await getDoc(ref);
  if (!snap.exists()) return;
  const merged = { ...snap.data() as Stock, ...data };
  const calculated = calculateStock(merged);
  await updateDoc(ref, { ...calculated, lastUpdated: new Date().toISOString() });
  await loadStocks();
}

export async function sellStock(id: string, soldQty: number): Promise<void> {
  const currentUser = get(user);
  if (!currentUser) return;
  const ref = doc(db, 'users', currentUser.uid, 'stocks', id);
  const snap = await getDoc(ref);
  if (!snap.exists()) return;
  const existing = snap.data() as Stock;
  const updated = calculateStock({
    ...existing,
    soldQty: (existing.soldQty || 0) + soldQty,
    soldFrequency: (existing.soldFrequency || 0) + 1,
    soldDate: new Date().toISOString().split('T')[0]
  });
  await updateDoc(ref, { ...updated, lastUpdated: new Date().toISOString() });
  await loadStocks();
}

export async function deleteStock(id: string): Promise<void> {
  const currentUser = get(user);
  if (!currentUser) return;
  await deleteDoc(doc(db, 'users', currentUser.uid, 'stocks', id));
  await loadStocks();
}
