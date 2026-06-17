import { writable } from 'svelte/store';
import { idToken } from './auth';
import { get } from 'svelte/store';

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

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

async function getHeaders() {
	const token = get(idToken);
	return {
		'Content-Type': 'application/json',
		Authorization: `Bearer ${token}`
	};
}

export async function fetchPortfolio() {
	portfolioLoading.set(true);
	portfolioError.set(null);
	try {
		const headers = await getHeaders();
		const res = await fetch(`${API_URL}/api/portfolio`, { headers });
		if (!res.ok) throw new Error('Failed to fetch portfolio');
		const data = await res.json();
		portfolio.set(data);
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
		const headers = await getHeaders();
		const res = await fetch(`${API_URL}/api/portfolio/asset`, {
			method: 'POST',
			headers,
			body: JSON.stringify(asset)
		});
		if (!res.ok) throw new Error('Failed to add asset');
		await fetchPortfolio();
	} catch (err) {
		console.error(err);
		throw err;
	}
}

export async function deleteAsset(assetId: string) {
	try {
		const headers = await getHeaders();
		const res = await fetch(`${API_URL}/api/portfolio/asset/${assetId}`, {
			method: 'DELETE',
			headers
		});
		if (!res.ok) throw new Error('Failed to delete asset');
		await fetchPortfolio();
	} catch (err) {
		console.error(err);
		throw err;
	}
}
