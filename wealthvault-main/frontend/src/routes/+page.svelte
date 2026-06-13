<script lang="ts">
import { onMount } from 'svelte';
import { portfolio, fetchPortfolio, portfolioLoading, addAsset, deleteAsset } from '$lib/stores/portfolio';

let showForm = $state(false);
let submitting = $state(false);
let error = $state('');
let symbolValid = $state<boolean | null>(null);

let form = $state({ name: '', symbol: '', quantity: '', buyPrice: '', buyDate: '' });

onMount(() => fetchPortfolio());

const stocks = $derived(($portfolio?.assets ?? []).filter((a) => a.type === 'STOCK'));

function formatINR(value: number) {
return new Intl.NumberFormat('en-IN', {
style: 'currency', currency: 'INR', maximumFractionDigits: 0
}).format(value);
}

function validateSymbol() {
const sym = form.symbol.trim().toUpperCase();
if (!sym) return;
form.symbol = sym;
symbolValid = true;
}

async function handleAdd() {
if (!form.name || !form.symbol || !form.quantity || !form.buyPrice || !form.buyDate) {
error = 'All fields are required';
return;
}
submitting = true;
error = '';
try {
await addAsset({
type: 'STOCK',
name: form.name,
symbol: form.symbol.toUpperCase(),
quantity: Number(form.quantity),
buyPrice: Number(form.buyPrice),
buyDate: form.buyDate,
metadata: {}
});
form = { name: '', symbol: '', quantity: '', buyPrice: '', buyDate: '' };
symbolValid = null;
showForm = false;
} catch {
error = 'Failed to add stock';
} finally {
submitting = false;
}
}

async function handleDelete(id: string) {
if (!confirm('Remove this stock?')) return;
await deleteAsset(id);
}
</script>

<div class="space-y-6">
<div class="flex items-center justify-between">
<div>
<h1 class="text-2xl font-bold text-white">Stocks</h1>
<p class="text-gray-400 text-sm mt-1">Track your NSE/BSE holdings</p>
</div>
<button onclick={() => { showForm = !showForm; error = ''; }}
class="bg-emerald-500 hover:bg-emerald-400 text-black font-semibold px-4 py-2 rounded-xl transition text-sm">
{showForm ? '✕ Cancel' : '+ Add Stock'}
</button>
</div>

{#if showForm}
<div class="bg-gray-900 border border-gray-800 rounded-xl p-6">
<h2 class="text-white font-semibold mb-4">Add Stock Holding</h2>
<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
<div>
<label for="symbol" class="text-gray-400 text-xs mb-1 block">Symbol (NSE)</label>
<input id="symbol" bind:value={form.symbol} placeholder="e.g. RELIANCE" onblur={validateSymbol}
class="w-full bg-gray-800 border rounded-lg px-3 py-2 text-white text-sm focus:outline-none border-gray-700" />
</div>
<div>
<label for="name" class="text-gray-400 text-xs mb-1 block">Company Name</label>
<input id="name" bind:value={form.name} placeholder="e.g. Reliance Industries"
class="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-emerald-500" />
</div>
<div>
<label for="qty" class="text-gray-400 text-xs mb-1 block">Quantity</label>
<input id="qty" bind:value={form.quantity} type="number" min="1" placeholder="e.g. 10"
class="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-emerald-500" />
</div>
<div>
<label for="price" class="text-gray-400 text-xs mb-1 block">Buy Price (₹)</label>
<input id="price" bind:value={form.buyPrice} type="number" min="0" placeholder="e.g. 2450"
class="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-emerald-500" />
</div>
<div>
<label for="date" class="text-gray-400 text-xs mb-1 block">Buy Date</label>
<input id="date" bind:value={form.buyDate} type="date"
class="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-emerald-500" />
</div>
</div>
{#if error}<p class="text-red-400 text-sm mt-3">{error}</p>{/if}
<button onclick={handleAdd} disabled={submitting}
class="mt-4 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-black font-semibold px-6 py-2 rounded-xl transition text-sm">
{submitting ? 'Adding...' : 'Add Stock'}
</button>
</div>
{/if}

{#if $portfolioLoading}
<div class="flex justify-center py-20">
<div class="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
</div>
{:else if stocks.length > 0}
<div class="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
<div class="px-6 py-4 border-b border-gray-800">
<h2 class="font-semibold text-white">{stocks.length} holding{stocks.length > 1 ? 's' : ''}</h2>
</div>
<div class="overflow-x-auto">
<table class="w-full text-sm">
<thead>
<tr class="text-gray-400 border-b border-gray-800 text-xs uppercase tracking-wide">
<th class="text-left px-6 py-3">Stock</th>
<th class="text-right px-6 py-3">Qty</th>
<th class="text-right px-6 py-3">Buy Price</th>
<th class="text-right px-6 py-3">Invested</th>
<th class="text-right px-6 py-3">Current</th>
<th class="text-right px-6 py-3">Returns</th>
<th class="px-6 py-3"></th>
</tr>
</thead>
<tbody>
{#each stocks as stock}
<tr class="border-b border-gray-800 hover:bg-gray-800/50 transition">
<td class="px-6 py-4">
<div class="font-medium text-white">{stock.name}</div>
<div class="text-gray-500 text-xs">{stock.symbol}</div>
</td>
<td class="px-6 py-4 text-right text-gray-300">{stock.quantity}</td>
<td class="px-6 py-4 text-right text-gray-300">{formatINR(stock.buyPrice)}</td>
<td class="px-6 py-4 text-right text-gray-300">{formatINR(stock.buyPrice * stock.quantity)}</td>
<td class="px-6 py-4 text-right text-white font-medium">{formatINR(stock.currentValue)}</td>
<td class="px-6 py-4 text-right font-medium {stock.returnsPc >= 0 ? 'text-emerald-400' : 'text-red-400'}">
{stock.returnsPc >= 0 ? '+' : ''}{stock.returnsPc.toFixed(2)}%
</td>
<td class="px-6 py-4 text-right">
<button onclick={() => handleDelete(stock.id)}
class="text-gray-600 hover:text-red-400 transition text-xs">✕</button>
</td>
</tr>
{/each}
</tbody>
</table>
</div>
</div>
{:else}
<div class="text-center py-20 bg-gray-900 border border-gray-800 rounded-xl">
<p class="text-white font-medium">No stocks added yet</p>
<p class="text-gray-500 text-sm mt-1">Add your NSE/BSE holdings to track performance</p>
<button onclick={() => (showForm = true)}
class="mt-4 bg-emerald-500 hover:bg-emerald-400 text-black font-semibold px-6 py-3 rounded-xl transition text-sm">
+ Add your first stock
</button>
</div>
{/if}
</div>
