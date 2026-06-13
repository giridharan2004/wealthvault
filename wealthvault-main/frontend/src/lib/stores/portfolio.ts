import { writable } from 'svelte/store';
import { auth, db } from '$lib/firebase';
import { collection, doc, addDoc, deleteDoc, getDocs, serverTimestamp } from 'firebase/firestore';

export interface Asset {
	id: string;
	type: 'STOCK' | 'GOLD' | 'MUTUAL_FUND' | 'PROPERTY' | 'FD' | 'NPS';
	name: string;
	symbol: string;
	quantity: number;
	buyPrice: number;
	buyDate: string;
	currentPrice: number;
	currentValue: number;
	returns: number;
	returnsPc: number;
	metadata: Record<string, unknown>;
}

export interface Portfolio {
	id: string;
	name: string;
	totalValue: number;
	totalInvested: number;
	totalReturns: number;
	returnsPc: number;
	assets: Asset[];
}

export const portfolio = writable<Portfolio | null>(null);
export const portfolioLoading = writable<boolean>(false);
export const portfolioError = writable<string | null>(null);

// Default portfolio id — adjust if you support multiple portfolios
const DEFAULT_PORTFOLIO_ID = 'main';

function getUserId(): string {
	const user = auth.currentUser;
	if (!user) throw new Error('Not authenticated');
	return user.uid;
}

function assetsCollection(uid: string) {
	return collection(db, 'users', uid, 'portfolios', DEFAULT_PORTFOLIO_ID, 'assets');
}

function computeAssetDerived(
	a: Omit<Asset, 'id' | 'currentPrice' | 'currentValue' | 'returns' | 'returnsPc'>
) {
	// Placeholder: currentPrice = buyPrice until live pricing is wired up
	const currentPrice = a.buyPrice;
	const currentValue = currentPrice * a.quantity;
	const invested = a.buyPrice * a.quantity;
	const returns = currentValue - invested;
	const returnsPc = invested > 0 ? (returns / invested) * 100 : 0;
	return { currentPrice, currentValue, returns, returnsPc };
}

export async function fetchPortfolio() {
	portfolioLoading.set(true);
	portfolioError.set(null);
	try {
		const uid = getUserId();
		const snap = await getDocs(assetsCollection(uid));

		const assets: Asset[] = snap.docs.map((d) => {
			const data = d.data() as Omit<Asset, 'id'>;
			return { id: d.id, ...data };
		});

		const totalInvested = assets.reduce((sum, a) => sum + a.buyPrice * a.quantity, 0);
		const totalValue = assets.reduce((sum, a) => sum + a.currentValue, 0);
		const totalReturns = totalValue - totalInvested;
		const returnsPc = totalInvested > 0 ? (totalReturns / totalInvested) * 100 : 0;

		portfolio.set({
			id: DEFAULT_PORTFOLIO_ID,
			name: 'My Portfolio',
			totalValue,
			totalInvested,
			totalReturns,
			returnsPc,
			assets
		});
	} catch (err) {
		portfolioError.set('Could not load portfolio');
		console.error(err);
	} finally {
		portfolioLoading.set(false);
	}
}

export async function addAsset(
	asset: Omit<Asset, 'id' | 'currentPrice' | 'currentValue' | 'returns' | 'returnsPc'>
) {
	try {
		const uid = getUserId();
		const derived = computeAssetDerived(asset);

		const payload = {
			...asset,
			...derived,
			metadata: asset.metadata ?? {},
			createdAt: serverTimestamp()
		};

		await addDoc(assetsCollection(uid), payload);
		await fetchPortfolio();
	} catch (err) {
		console.error(err);
		throw err;
	}
}

export async function deleteAsset(assetId: string) {
	try {
		const uid = getUserId();
		await deleteDoc(doc(assetsCollection(uid), assetId));
		await fetchPortfolio();
	} catch (err) {
		console.error(err);
		throw err;
	}
}
