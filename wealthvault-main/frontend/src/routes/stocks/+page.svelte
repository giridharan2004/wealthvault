<script lang="ts">
import { onMount } from 'svelte';
import { user } from '$lib/stores/auth';
import {
stocks,
stocksLoading,
pricesFetching,
pricesLastUpdated,
loadStocks,
addStock,
updateStock,
sellStock,
deleteStock,
fetchLivePrices
} from '$lib/stores/stocks';
import type { Stock } from '$lib/stores/stocks';
import { family, loadFamily } from '$lib/stores/family';
import ImportExcel from '$lib/components/ImportExcel.svelte';
import StockCard from '$lib/components/StockCard.svelte';
import StockModals from '$lib/components/StockModals.svelte';

let showAddModal = $state(false);
let showSellModal = $state(false);
let showRateModal = $state(false);
let showTargetsPanel = $state(false);
let showFilterMenu = $state(false);
let selectedStock = $state<any>(null);
let sellQty = $state(0);
let sellRate = $state(0);
let sellDate = $state(new Date().toISOString().split('T')[0]);
let newRate = $state(0);
let viewingUid = $state('');
let fetchResult = $state<{ updated: number; failed: string[] } | null>(null);
let isBuyMore = $state(false);
let filterShare = $state('');
let expandedRow = $state<string | null>(null);
let filterPLPreset = $state('all');

let form = $state({
no: 0,
shareName: '',
shortName: '',
buyQty: 0,
buyAmt: 0,
buyDate: '',
todaysRate: 0
});

onMount(async () => {
await loadFamily();
viewingUid = $user?.uid || '';
await loadStocks(viewingUid);
});

async function handleRefreshPrices() {
fetchResult = null;
const result = await fetchLivePrices(viewingUid || undefined);
fetchResult = result;
setTimeout(() => (fetchResult = null), 6000);
}

async function handleAddStock() {
if (!form.shareName || !form.buyQty || !form.buyAmt) return;
await addStock({ ...form }, viewingUid || undefined);
showAddModal = false;
isBuyMore = false;
form = { no: 0, shareName: '', shortName: '', buyQty: 0, buyAmt: 0, buyDate: '', todaysRate: 0 };
}

function openBuyMore(stock: any) {
isBuyMore = true;
form = {
no: stock.no,
shareName: stock.shareName,
shortName: stock.shortName,
buyQty: 0,
buyAmt: stock.buyAmt,
buyDate: new Date().toISOString().split('T')[0],
todaysRate: stock.todaysRate
};
showAddModal = true;
}

async function handleSell() {
if (!selectedStock || sellQty <= 0) return;
await sellStock(selectedStock.id, sellQty, viewingUid || undefined, sellRate, sellDate);
showSellModal = false;
sellQty = 0;
sellRate = 0;
sellDate = new Date().toISOString().split('T')[0];
}

async function handleRateUpdate() {
if (!selectedStock || newRate <= 0) return;
await updateStock(selectedStock.id, { todaysRate: newRate }, viewingUid || undefined);
showRateModal = false;
newRate = 0;
}

async function switchToMember(uid: string) {
viewingUid = uid;
await loadStocks(uid);
}

function openSell(stock: any) {
selectedStock = stock;
sellRate = stock.todaysRate;
showSellModal = true;
}

function openRate(stock: any) {
selectedStock = stock;
newRate = stock.todaysRate;
showRateModal = true;
}

function sellFromTargets(stock: any) {
selectedStock = stock;
sellRate = stock.todaysRate;
showSellModal = true;
showTargetsPanel = false;
}

function formatINR(val: number): string {
if (!val && val !== 0) return '₹0';
return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);
}

function statusClass(status: string): string {
if (status?.startsWith('Sell')) return 'text-emerald-600 font-semibold';
if (status === 'Stop loss') return 'text-red-500 font-semibold';
return 'text-yellow-600';
}

function plClass(val: number): string {
return val >= 0 ? 'text-emerald-600' : 'text-red-500';
}

const filteredStocks = $derived(
$stocks.filter((s) => {
const nameMatch = filterShare === '' || s.shareName.toLowerCase().includes(filterShare.toLowerCase()) || s.shortName.toLowerCase().includes(filterShare.toLowerCase());
let plMatch = true;
if (filterPLPreset === 'targets') plMatch = s.plPercent >= 10;
if (filterPLPreset === 'loss') plMatch = s.plPercent < 0;
if (filterPLPreset === 'stoploss') plMatch = s.status === 'Stop loss';
return nameMatch && plMatch;
})
);

const targetStocks = $derived($stocks.filter((s) => s.plPercent >= 10));
const totalInvested = $derived(filteredStocks.reduce((s, x) => s + (x.investedVal || 0), 0));
const totalCurrent = $derived(filteredStocks.reduce((s, x) => s + (x.currentVal || 0), 0));
const totalPL = $derived(totalCurrent - totalInvested);
const totalPLPc = $derived(totalInvested > 0 ? (totalPL / totalInvested) * 100 : 0);
const isOwnStocks = $derived(viewingUid === $user?.uid);
</script>
<div class="space-y-3 pb-0 min-h-0">
	<!-- Header -->
	<div class="flex items-center justify-between flex-wrap gap-2">
		<div>
			<h1 class="text-lg font-bold text-white">Stock Portfolio</h1>
			<p class="text-white/40 text-xs mt-0.5">
				{isOwnStocks
					? 'NSE/BSE holdings tracker'
					: 'Viewing: ' + ($family?.members.find((m) => m.uid === viewingUid)?.displayName || '')}
			</p>
		</div>
		<div class="flex items-center gap-1.5 flex-wrap">
			{#if targetStocks.length > 0}
				<button
					onclick={() => (showTargetsPanel = true)}
					class="flex items-center gap-1 bg-yellow-500/10 border border-yellow-500/20 hover:bg-yellow-500/20 text-yellow-400 font-medium px-2.5 py-1 rounded-lg transition text-xs"
				>
					🏆 {targetStocks.length} Target{targetStocks.length !== 1 ? 's' : ''} ≥10%
				</button>
			{/if}
			<div class="flex flex-col items-end">
				<button
					onclick={handleRefreshPrices}
					disabled={$pricesFetching || $stocks.length === 0}
					class="flex items-center gap-1.5 bg-blue-500 hover:bg-blue-600 disabled:opacity-40 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition"
				>
					{#if $pricesFetching}
						<svg class="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
							<circle
								class="opacity-25"
								cx="12"
								cy="12"
								r="10"
								stroke="currentColor"
								stroke-width="4"
							/>
							<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
						</svg>
						Fetching...
					{:else}
						<svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
							/>
						</svg>
						Refresh Prices
					{/if}
				</button>
				{#if $pricesLastUpdated}
					<span class="text-white/30 text-[10px] mt-0.5">Updated {$pricesLastUpdated}</span>
				{/if}
			</div>
			{#if isOwnStocks}
				<ImportExcel />
				<button
					onclick={() => {
						isBuyMore = false;
						showAddModal = true;
					}}
					class="bg-emerald-500 hover:bg-emerald-600 text-white font-semibold px-3 py-1.5 rounded-lg transition text-xs"
				>
					+ Add Stock
				</button>
			{/if}
		</div>
	</div>

	{#if fetchResult}
		<div
			class="rounded-xl px-3 py-2 text-xs
			{fetchResult.failed.length === 0
				? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
				: 'bg-yellow-500/10 border border-yellow-500/20 text-yellow-400'}"
		>
			{#if fetchResult.failed.length === 0}
				✓ Updated {fetchResult.updated} stock{fetchResult.updated !== 1 ? 's' : ''} with live NSE prices
			{:else}
				✓ Updated {fetchResult.updated} stocks. Could not fetch: {fetchResult.failed.join(', ')}
			{/if}
		</div>
	{/if}

	<!-- Member tabs -->
	{#if $family && $family.members.length > 1}
		<div class="flex gap-1.5 overflow-x-auto pb-1">
			{#each $family.members as member}
				<button
					onclick={() => switchToMember(member.uid)}
					class="px-3 py-1 rounded-lg text-xs font-medium transition whitespace-nowrap
					{viewingUid === member.uid
						? 'bg-emerald-500 text-white'
						: 'bg-white/8 text-white/50 border border-white/8 hover:bg-white/12'}"
				>
					{member.displayName}{member.uid === $user?.uid ? ' (You)' : ''}
				</button>
			{/each}
		</div>
	{/if}

	<!-- Filter bar -->
	<div class="flex flex-wrap gap-2 items-center">
		<div class="relative flex-1 min-w-[180px] max-w-xs">
			<input
				type="text"
				bind:value={filterShare}
				placeholder="🔍 Search share or symbol..."
				class="w-full bg-[#161616] border border-white/10 rounded-xl px-3 py-1.5 text-white text-xs focus:border-emerald-500 outline-none placeholder:text-white/30"
			/>
			{#if filterShare}
				<button
					onclick={() => (filterShare = '')}
					class="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 text-base leading-none"
					>✕</button
				>
			{/if}
		</div>
		<div class="relative">
			<button
				onclick={() => (showFilterMenu = !showFilterMenu)}
				class="flex items-center gap-2 bg-[#161616] border border-white/10 hover:border-emerald-500/40 rounded-xl px-3 py-1.5 text-xs transition min-w-[130px] justify-between"
			>
				<span>
					{#if filterPLPreset === 'targets'}<span class="text-emerald-400">📈 P&L ≥ 10%</span>
					{:else if filterPLPreset === 'loss'}<span class="text-red-400">📉 In Loss</span>
					{:else if filterPLPreset === 'stoploss'}<span class="text-red-400">🛑 Stop Loss</span>
					{:else}<span class="text-white/50">📊 All Stocks</span>{/if}
				</span>
				<svg
					class="w-3 h-3 text-white/30 {showFilterMenu ? 'rotate-180' : ''} transition-transform"
					fill="none"
					viewBox="0 0 24 24"
					stroke="currentColor"
				>
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M19 9l-7 7-7-7"
					/>
				</svg>
			</button>
			{#if showFilterMenu}
				<div
					class="absolute top-full mt-1 left-0 bg-[#1a1a1a] border border-white/10 rounded-xl shadow-lg z-20 min-w-[160px] overflow-hidden"
				>
					{#each [{ val: 'all', label: '📊 All Stocks', cls: 'text-white/60' }, { val: 'targets', label: '📈 P&L ≥ 10%', cls: 'text-emerald-400' }, { val: 'loss', label: '📉 In Loss', cls: 'text-red-400' }, { val: 'stoploss', label: '🛑 Stop Loss', cls: 'text-red-400' }] as opt}
						<button
							onclick={() => {
								filterPLPreset = opt.val;
								showFilterMenu = false;
							}}
							class="w-full text-left px-3 py-2.5 text-xs hover:bg-white/5 transition {opt.cls} {filterPLPreset ===
							opt.val
								? 'bg-white/5 font-semibold'
								: ''}"
						>
							{opt.label}
						</button>
					{/each}
				</div>
			{/if}
		</div>
		<div class="flex items-center gap-2">
			{#if filterPLPreset !== 'all' || filterShare}
				<button
					onclick={() => {
						filterShare = '';
						filterPLPreset = 'all';
					}}
					class="text-xs text-white/40 hover:text-white/70 bg-white/5 hover:bg-white/10 px-2.5 py-1.5 rounded-lg transition"
				>
					Clear
				</button>
			{/if}
			<span class="text-white/30 text-xs">{filteredStocks.length} of {$stocks.length}</span>
		</div>
	</div>

	<!-- Summary cards -->
	<div class="grid grid-cols-2 md:grid-cols-4 gap-2">
		<div class="bg-[#161616] border border-white/8 rounded-xl p-3">
			<p class="text-white/40 text-xs font-medium">Total Invested</p>
			<p class="text-white font-bold text-base mt-0.5">{formatINR(totalInvested)}</p>
		</div>
		<div class="bg-[#161616] border border-white/8 rounded-xl p-3">
			<p class="text-white/40 text-xs font-medium">Current Value</p>
			<p class="text-white font-bold text-base mt-0.5">{formatINR(totalCurrent)}</p>
		</div>
		<div class="bg-[#161616] border border-white/8 rounded-xl p-3">
			<p class="text-white/40 text-xs font-medium">Total P&L</p>
			<p class="font-bold text-base mt-0.5 {plClass(totalPL)}">{formatINR(totalPL)}</p>
		</div>
		<div class="bg-[#161616] border border-white/8 rounded-xl p-3">
			<p class="text-white/40 text-xs font-medium">Returns</p>
			<p class="font-bold text-base mt-0.5 {plClass(totalPLPc)}">{totalPLPc.toFixed(2)}%</p>
		</div>
	</div>

	<!-- Desktop table + Mobile cards -->
	<div class="bg-[#111] border border-white/8 rounded-2xl overflow-hidden">
		{#if $stocksLoading}
			<div class="flex items-center justify-center py-20">
				<div
					class="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"
				></div>
			</div>
		{:else if filteredStocks.length === 0}
			<div class="text-center py-16 px-6">
				<div
					class="w-12 h-12 bg-emerald-500/10 rounded-2xl flex items-center justify-center mx-auto mb-3"
				>
					<svg
						class="w-6 h-6 text-emerald-400"
						fill="none"
						viewBox="0 0 24 24"
						stroke="currentColor"
						stroke-width="1.5"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z"
						/>
					</svg>
				</div>
				<p class="text-white font-semibold text-sm mb-1">
					{$stocks.length === 0 ? 'No stocks yet' : 'No stocks match the filter'}
				</p>
				{#if filterPLPreset !== 'all' || filterShare}
					<button
						onclick={() => {
							filterShare = '';
							filterPLPreset = 'all';
						}}
						class="text-emerald-400 text-xs hover:underline">Clear filters</button
					>
				{:else if isOwnStocks}
					<p class="text-white/40 text-xs mb-3">Add your first NSE/BSE stock to start tracking</p>
					<button
						onclick={() => (showAddModal = true)}
						class="bg-emerald-500 hover:bg-emerald-600 text-white font-semibold px-5 py-2 rounded-xl transition text-sm"
					>
						+ Add First Stock
					</button>
				{/if}
			</div>
		{:else}
			<!-- Desktop table -->
			<div class="hidden md:block overflow-x-auto">
				<table class="w-full text-xs">
					<thead>
						<tr class="text-white/40 border-b border-white/8 bg-[#0d0d0d] text-left">
							<th class="px-3 py-2.5 font-semibold">No</th>
							<th class="px-3 py-2.5 font-semibold">Share</th>
							<th class="px-3 py-2.5 font-semibold text-right">Buy Qty</th>
							<th class="px-3 py-2.5 font-semibold text-right">Buy Amt</th>
							<th class="px-3 py-2.5 font-semibold text-right">Invested Val</th>
							<th class="px-3 py-2.5 font-semibold text-right">Sold Freq</th>
							<th class="px-3 py-2.5 font-semibold text-right">Qty Held</th>
							<th class="px-3 py-2.5 font-semibold text-right">Today Rate</th>
							<th class="px-3 py-2.5 font-semibold text-right">Current Val</th>
							<th class="px-3 py-2.5 font-semibold text-right">P/L%</th>
							<th class="px-3 py-2.5 font-semibold text-right">Stop Loss</th>
							<th class="px-3 py-2.5 font-semibold text-right">Target</th>
							<th class="px-3 py-2.5 font-semibold text-center">Status</th>
							<th class="px-3 py-2.5 font-semibold text-right">Diff P/L</th>
							<th class="px-3 py-2.5 font-semibold text-right">Qty/Sell</th>
							<th class="px-3 py-2.5 font-semibold text-right">Sold Qty</th>
							<th class="px-3 py-2.5 font-semibold text-right">Sold Date</th>
							<th class="px-3 py-2.5 font-semibold text-center">Released</th>
							{#if isOwnStocks}<th class="px-3 py-2.5 font-semibold text-center">Actions</th>{/if}
						</tr>
					</thead>
					<tbody>
						{#each filteredStocks as stock}
							<tr
								class="border-b border-white/5 hover:bg-white/3 transition
								{stock.plPercent >= 10 ? 'border-l-2 border-l-emerald-500' : ''}
								{stock.status === 'Stop loss' ? 'border-l-2 border-l-red-500' : ''}"
							>
								<td class="px-3 py-2.5 text-white/30">{stock.no}</td>
								<td class="px-3 py-2.5">
									<div class="font-semibold text-white whitespace-nowrap flex items-center gap-1">
										{stock.shareName}
										{#if stock.plPercent >= 10}<span class="text-yellow-400">🏆</span>{/if}
										{#if stock.status === 'Stop loss'}<span class="text-red-400">🛑</span>{/if}
									</div>
									<div class="text-white/40">{stock.shortName}</div>
									<div class="text-white/20">{stock.buyDate}</div>
								</td>
								<td class="px-3 py-2.5 text-right text-white/60">{stock.buyQty}</td>
								<td class="px-3 py-2.5 text-right text-white/60">{formatINR(stock.buyAmt)}</td>
								<td class="px-3 py-2.5 text-right text-white font-medium"
									>{formatINR(stock.investedVal)}</td
								>
								<td class="px-3 py-2.5 text-right text-white/60">{stock.soldFrequency || 0}x</td>
								<td class="px-3 py-2.5 text-right text-white/60">{stock.qtyHeld}</td>
								<td class="px-3 py-2.5 text-right">
									{#if isOwnStocks}
										<button
											onclick={() => openRate(stock)}
											class="text-blue-400 hover:text-blue-300 font-medium transition"
										>
											{formatINR(stock.todaysRate)}
										</button>
									{:else}
										<span class="text-blue-400 font-medium">{formatINR(stock.todaysRate)}</span>
									{/if}
								</td>
								<td class="px-3 py-2.5 text-right text-white font-medium"
									>{formatINR(stock.currentVal)}</td
								>
								<td class="px-3 py-2.5 text-right font-semibold {plClass(stock.plPercent)}"
									>{stock.plPercent?.toFixed(2)}%</td
								>
								<td class="px-3 py-2.5 text-right text-red-400">{formatINR(stock.stopLoss)}</td>
								<td class="px-3 py-2.5 text-right text-blue-400">{formatINR(stock.target)}</td>
								<td class="px-3 py-2.5 text-center">
									<span class="px-2 py-0.5 rounded-full text-xs {statusClass(stock.status)}"
										>{stock.status}</span
									>
								</td>
								<td class="px-3 py-2.5 text-right {plClass(stock.diffPL)}"
									>{formatINR(stock.diffPL)}</td
								>
								<td class="px-3 py-2.5 text-right text-white/60"
									>{Math.floor(stock.qtyNeedToSell ?? 0)}</td
								>
								<td class="px-3 py-2.5 text-right text-white/60">{stock.soldQty || 0}</td>
								<td class="px-3 py-2.5 text-right text-white/30">{stock.soldDate || '-'}</td>
								<td class="px-3 py-2.5 text-center">
									<button
										onclick={() =>
											isOwnStocks &&
											updateStock(
												stock.id,
												{ releaseStatus: !stock.releaseStatus },
												viewingUid || undefined
											)}
										class="w-5 h-5 rounded border-2 flex items-center justify-center mx-auto transition
										{stock.releaseStatus
											? 'bg-emerald-500 border-emerald-500'
											: 'border-white/20 hover:border-emerald-400'}"
									>
										{#if stock.releaseStatus}
											<svg
												class="w-3 h-3 text-white"
												fill="none"
												viewBox="0 0 24 24"
												stroke="currentColor"
											>
												<path
													stroke-linecap="round"
													stroke-linejoin="round"
													stroke-width="3"
													d="M5 13l4 4L19 7"
												/>
											</svg>
										{/if}
									</button>
								</td>
								{#if isOwnStocks}
									<td class="px-3 py-2.5">
										<div class="flex flex-col gap-1 items-stretch min-w-[56px]">
											<button
												onclick={() => openBuyMore(stock)}
												class="text-xs bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/20 px-2 py-1 rounded-lg transition text-center"
												>+ Buy</button
											>
											<button
												onclick={() => openSell(stock)}
												class="text-xs bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 px-2 py-1 rounded-lg transition text-center"
												>Sell</button
											>
											<button
												onclick={() => deleteStock(stock.id, viewingUid || undefined)}
												class="text-xs bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 px-2 py-1 rounded-lg transition text-center"
												>Del</button
											>
										</div>
									</td>
								{/if}
							</tr>
						{/each}
					</tbody>
				</table>
			</div>

			<!-- Mobile cards -->
			<div class="md:hidden bg-[#111] rounded-2xl overflow-hidden">
				{#each filteredStocks as stock}
					<StockCard
						{stock}
						{isOwnStocks}
						{expandedRow}
						{formatINR}
						{plClass}
						{statusClass}
						{viewingUid}
						onToggle={(id: string) => {
							expandedRow = expandedRow === id ? null : id;
						}}
						onBuyMore={openBuyMore}
						onSell={openSell}
						onDelete={(s: Stock) => deleteStock(s.id, viewingUid || undefined)}
						onRateClick={openRate}
						onReleaseToggle={(s: Stock) =>
							isOwnStocks &&
							updateStock(s.id, { releaseStatus: !s.releaseStatus }, viewingUid || undefined)}
					/>
				{/each}
			</div>
		{/if}
	</div>
</div>

<!-- Modals -->
<StockModals
	bind:showAddModal
	bind:showSellModal
	bind:showRateModal
	bind:showTargetsPanel
	bind:isBuyMore
	bind:selectedStock
	bind:sellQty
	bind:sellRate
	bind:sellDate
	bind:newRate
	bind:form
	{targetStocks}
	{isOwnStocks}
	{formatINR}
	{plClass}
	{statusClass}
	onAddStock={handleAddStock}
	onSell={handleSell}
	onRateUpdate={handleRateUpdate}
	onSellFromTargets={sellFromTargets}
/>



