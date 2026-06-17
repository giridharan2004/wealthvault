<script lang="ts">
  import { onMount } from 'svelte';
  import { user } from '$lib/stores/auth';
  import {
    stocks, stocksLoading, pricesFetching, pricesLastUpdated,
    loadStocks, addStock, updateStock, sellStock, deleteStock, fetchLivePrices
  } from '$lib/stores/stocks';

  let showAddModal = $state(false);
  let showSellModal = $state(false);
  let showRateModal = $state(false);
  let selectedStock = $state<any>(null);
  let sellQty = $state(0);
  let newRate = $state(0);
  let fetchResult = $state<{ updated: number; failed: string[] } | null>(null);

  let form = $state({
    no: 0, shareName: '', shortName: '',
    buyQty: 0, buyAmt: 0, buyDate: '', todaysRate: 0
  });

  onMount(async () => {
    await loadStocks();
  });

  async function handleRefreshPrices() {
    fetchResult = null;
    const result = await fetchLivePrices();
    fetchResult = result;
    setTimeout(() => fetchResult = null, 6000);
  }

  async function handleAddStock() {
    if (!form.shareName || !form.buyQty || !form.buyAmt) return;
    await addStock({ ...form });
    showAddModal = false;
    form = { no: 0, shareName: '', shortName: '', buyQty: 0, buyAmt: 0, buyDate: '', todaysRate: 0 };
  }

  async function handleSell() {
    if (!selectedStock || sellQty <= 0) return;
    await sellStock(selectedStock.id, sellQty);
    showSellModal = false;
    sellQty = 0;
  }

  async function handleRateUpdate() {
    if (!selectedStock || newRate <= 0) return;
    await updateStock(selectedStock.id, { todaysRate: newRate });
    showRateModal = false;
    newRate = 0;
  }

  function formatINR(val: number): string {
    if (!val && val !== 0) return '₹0';
    return new Intl.NumberFormat('en-IN', {
      style: 'currency', currency: 'INR', maximumFractionDigits: 0
    }).format(val);
  }

  function statusClass(status: string): string {
    if (status?.startsWith('Sell')) return 'text-emerald-600 font-semibold';
    if (status === 'Stop loss') return 'text-red-500 font-semibold';
    return 'text-yellow-600';
  }

  function plClass(val: number): string {
    return val >= 0 ? 'text-emerald-600' : 'text-red-500';
  }

  const totalInvested = $derived($stocks.reduce((s, x) => s + (x.investedVal || 0), 0));
  const totalCurrent = $derived($stocks.reduce((s, x) => s + (x.currentVal || 0), 0));
  const totalPL = $derived(totalCurrent - totalInvested);
  const totalPLPc = $derived(totalInvested > 0 ? (totalPL / totalInvested) * 100 : 0);
</script>

<div class="space-y-4">

  <!-- Header -->
  <div class="flex items-center justify-between flex-wrap gap-3">
    <div>
      <h1 class="text-2xl font-bold text-gray-900">Stock Portfolio</h1>
      <p class="text-gray-400 text-sm mt-1">NSE/BSE holdings tracker</p>
    </div>
    <div class="flex items-center gap-2 flex-wrap">
      <div class="flex flex-col items-end">
        <button
          onclick={handleRefreshPrices}
          disabled={$pricesFetching || $stocks.length === 0}
          class="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 disabled:opacity-40 text-white text-sm font-semibold px-4 py-2 rounded-2xl transition"
        >
          {#if $pricesFetching}
            <svg class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
            </svg>
            Fetching...
          {:else}
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
            </svg>
            Refresh Prices
          {/if}
        </button>
        {#if $pricesLastUpdated}
          <span class="text-gray-400 text-xs mt-1">Updated {$pricesLastUpdated}</span>
        {/if}
      </div>
      <button
        onclick={() => showAddModal = true}
        class="bg-emerald-500 hover:bg-emerald-600 text-white font-semibold px-5 py-2 rounded-2xl transition"
      >
        + Add Stock
      </button>
    </div>
  </div>

  <!-- Fetch result -->
  {#if fetchResult}
    <div class="rounded-2xl px-4 py-3 text-sm
      {fetchResult.failed.length === 0
        ? 'bg-emerald-50 border border-emerald-100 text-emerald-700'
        : 'bg-yellow-50 border border-yellow-100 text-yellow-700'}">
      {#if fetchResult.failed.length === 0}
        ✓ Updated {fetchResult.updated} stock{fetchResult.updated !== 1 ? 's' : ''} with live NSE prices
      {:else}
        ✓ Updated {fetchResult.updated} stocks. Could not fetch: {fetchResult.failed.join(', ')}
      {/if}
    </div>
  {/if}

  <!-- Summary cards -->
  <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
    <div class="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
      <p class="text-gray-400 text-xs font-medium">Total Invested</p>
      <p class="text-gray-900 font-bold text-lg mt-1">{formatINR(totalInvested)}</p>
    </div>
    <div class="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
      <p class="text-gray-400 text-xs font-medium">Current Value</p>
      <p class="text-gray-900 font-bold text-lg mt-1">{formatINR(totalCurrent)}</p>
    </div>
    <div class="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
      <p class="text-gray-400 text-xs font-medium">Total P&L</p>
      <p class="font-bold text-lg mt-1 {plClass(totalPL)}">{formatINR(totalPL)}</p>
    </div>
    <div class="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
      <p class="text-gray-400 text-xs font-medium">Returns</p>
      <p class="font-bold text-lg mt-1 {plClass(totalPLPc)}">{totalPLPc.toFixed(2)}%</p>
    </div>
  </div>

  <!-- Table -->
  <div class="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
    {#if $stocksLoading}
      <div class="flex items-center justify-center py-20">
        <div class="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    {:else if $stocks.length === 0}
      <div class="text-center py-20 px-6">
        <div class="w-16 h-16 bg-emerald-50 rounded-3xl flex items-center justify-center mx-auto mb-4">
          <svg class="w-8 h-8 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z"/>
          </svg>
        </div>
        <p class="text-gray-900 font-semibold mb-1">No stocks yet</p>
        <p class="text-gray-400 text-sm mb-4">Add your first NSE/BSE stock to start tracking</p>
        <button onclick={() => showAddModal = true}
          class="bg-emerald-500 hover:bg-emerald-600 text-white font-semibold px-6 py-2.5 rounded-2xl transition">
          + Add First Stock
        </button>
      </div>
    {:else}
      <div class="overflow-x-auto">
        <table class="w-full text-xs">
          <thead>
            <tr class="text-gray-400 border-b border-gray-100 bg-gray-50/50 text-left">
              <th class="px-3 py-3 font-semibold">No</th>
              <th class="px-3 py-3 font-semibold">Share</th>
              <th class="px-3 py-3 font-semibold text-right">Buy Qty</th>
              <th class="px-3 py-3 font-semibold text-right">Buy Amt</th>
              <th class="px-3 py-3 font-semibold text-right">Invested Val</th>
              <th class="px-3 py-3 font-semibold text-right">Sold Freq</th>
              <th class="px-3 py-3 font-semibold text-right">Qty Held</th>
              <th class="px-3 py-3 font-semibold text-right">Today Rate</th>
              <th class="px-3 py-3 font-semibold text-right">Current Val</th>
              <th class="px-3 py-3 font-semibold text-right">P/L%</th>
              <th class="px-3 py-3 font-semibold text-right">Stop Loss</th>
              <th class="px-3 py-3 font-semibold text-right">Target</th>
              <th class="px-3 py-3 font-semibold text-center">Status</th>
              <th class="px-3 py-3 font-semibold text-right">Diff P/L</th>
              <th class="px-3 py-3 font-semibold text-right">Qty/Sell</th>
              <th class="px-3 py-3 font-semibold text-right">Sold Qty</th>
              <th class="px-3 py-3 font-semibold text-right">Sold Date</th>
              <th class="px-3 py-3 font-semibold text-center">Released</th>
              <th class="px-3 py-3 font-semibold text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {#each $stocks as stock}
              <tr class="border-b border-gray-50 hover:bg-gray-50/50 transition">
                <td class="px-3 py-3 text-gray-400">{stock.no}</td>
                <td class="px-3 py-3">
                  <div class="font-semibold text-gray-900 whitespace-nowrap">{stock.shareName}</div>
                  <div class="text-gray-400">{stock.shortName}</div>
                  <div class="text-gray-300">{stock.buyDate}</div>
                </td>
                <td class="px-3 py-3 text-right text-gray-600">{stock.buyQty}</td>
                <td class="px-3 py-3 text-right text-gray-600">{formatINR(stock.buyAmt)}</td>
                <td class="px-3 py-3 text-right text-gray-900 font-medium">{formatINR(stock.investedVal)}</td>
                <td class="px-3 py-3 text-right text-gray-600">{stock.soldFrequency || 0}x</td>
                <td class="px-3 py-3 text-right text-gray-600">{stock.qtyHeld}</td>
                <td class="px-3 py-3 text-right">
                  <button
                    onclick={() => { selectedStock = stock; newRate = stock.todaysRate; showRateModal = true; }}
                    class="text-blue-500 hover:text-blue-600 font-medium transition"
                  >
                    {formatINR(stock.todaysRate)}
                  </button>
                </td>
                <td class="px-3 py-3 text-right text-gray-900 font-medium">{formatINR(stock.currentVal)}</td>
                <td class="px-3 py-3 text-right {plClass(stock.plPercent)}">{stock.plPercent?.toFixed(2)}%</td>
                <td class="px-3 py-3 text-right text-red-500">{formatINR(stock.stopLoss)}</td>
                <td class="px-3 py-3 text-right text-blue-500">{formatINR(stock.target)}</td>
                <td class="px-3 py-3 text-center">
                  <span class="px-2 py-1 rounded-full text-xs {statusClass(stock.status)}">{stock.status}</span>
                </td>
                <td class="px-3 py-3 text-right {plClass(stock.diffPL)}">{formatINR(stock.diffPL)}</td>
                <td class="px-3 py-3 text-right text-gray-600">{stock.qtyNeedToSell?.toFixed(0) || 0}</td>
                <td class="px-3 py-3 text-right text-gray-600">{stock.soldQty || 0}</td>
                <td class="px-3 py-3 text-right text-gray-400">{stock.soldDate || '-'}</td>
                <td class="px-3 py-3 text-center">
                  <button
                    onclick={() => updateStock(stock.id, { releaseStatus: !stock.releaseStatus })}
                    class="w-5 h-5 rounded border-2 flex items-center justify-center mx-auto transition
                      {stock.releaseStatus ? 'bg-emerald-500 border-emerald-500' : 'border-gray-200 hover:border-emerald-400'}"
                  >
                    {#if stock.releaseStatus}
                      <svg class="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"/>
                      </svg>
                    {/if}
                  </button>
                </td>
                <td class="px-3 py-3 text-center">
                  <div class="flex items-center gap-1 justify-center">
                    <button
                      onclick={() => { selectedStock = stock; showSellModal = true; }}
                      class="text-xs bg-emerald-50 hover:bg-emerald-100 text-emerald-700 px-2 py-1 rounded-lg transition"
                    >Sell</button>
                    <button
                      onclick={() => deleteStock(stock.id)}
                      class="text-xs bg-red-50 hover:bg-red-100 text-red-600 px-2 py-1 rounded-lg transition"
                    >Del</button>
                  </div>
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    {/if}
  </div>
</div>

<!-- Add Modal -->
{#if showAddModal}
  <div class="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
    <div class="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl">
      <h2 class="text-gray-900 font-bold text-lg mb-5">Add New Stock</h2>
      <div class="space-y-3">
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label for="no" class="text-gray-600 text-xs block mb-1">Serial No</label>
            <input id="no" type="number" bind:value={form.no}
              class="w-full bg-gray-50 border border-gray-200 rounded-2xl px-3 py-2.5 text-gray-900 text-sm focus:border-emerald-500 outline-none"/>
          </div>
          <div>
            <label for="buyDate" class="text-gray-600 text-xs block mb-1">Buy Date</label>
            <input id="buyDate" type="date" bind:value={form.buyDate}
              class="w-full bg-gray-50 border border-gray-200 rounded-2xl px-3 py-2.5 text-gray-900 text-sm focus:border-emerald-500 outline-none"/>
          </div>
        </div>
        <div>
          <label for="shareName" class="text-gray-600 text-xs block mb-1">Share Name</label>
          <input id="shareName" type="text" bind:value={form.shareName} placeholder="Tata Consultancy Services"
            class="w-full bg-gray-50 border border-gray-200 rounded-2xl px-3 py-2.5 text-gray-900 text-sm focus:border-emerald-500 outline-none"/>
        </div>
        <div>
          <label for="shortName" class="text-gray-600 text-xs block mb-1">NSE Symbol</label>
          <input id="shortName" type="text" bind:value={form.shortName} placeholder="TCS"
            class="w-full bg-gray-50 border border-gray-200 rounded-2xl px-3 py-2.5 text-gray-900 text-sm focus:border-emerald-500 outline-none"/>
          <p class="text-gray-400 text-xs mt-1">Used to auto-fetch live NSE prices</p>
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label for="buyQty" class="text-gray-600 text-xs block mb-1">Buy Qty</label>
            <input id="buyQty" type="number" bind:value={form.buyQty}
              class="w-full bg-gray-50 border border-gray-200 rounded-2xl px-3 py-2.5 text-gray-900 text-sm focus:border-emerald-500 outline-none"/>
          </div>
          <div>
            <label for="buyAmt" class="text-gray-600 text-xs block mb-1">Buy Price (₹)</label>
            <input id="buyAmt" type="number" bind:value={form.buyAmt}
              class="w-full bg-gray-50 border border-gray-200 rounded-2xl px-3 py-2.5 text-gray-900 text-sm focus:border-emerald-500 outline-none"/>
          </div>
        </div>
        <div>
          <label for="todaysRate" class="text-gray-600 text-xs block mb-1">Today's Rate (optional — will auto-fetch)</label>
          <input id="todaysRate" type="number" bind:value={form.todaysRate}
            class="w-full bg-gray-50 border border-gray-200 rounded-2xl px-3 py-2.5 text-gray-900 text-sm focus:border-emerald-500 outline-none"/>
        </div>
        {#if form.buyQty && form.buyAmt}
          <div class="bg-gray-50 rounded-2xl p-3 text-xs space-y-1.5">
            <div class="flex justify-between">
              <span class="text-gray-400">Invested Val</span>
              <span class="text-gray-900 font-medium">{formatINR(form.buyQty * form.buyAmt)}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-gray-400">Stop Loss (90%)</span>
              <span class="text-red-500">{formatINR(form.buyQty * form.buyAmt * 0.9)}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-gray-400">Target +10%</span>
              <span class="text-blue-500">{formatINR(form.buyQty * form.buyAmt * 1.1)}</span>
            </div>
          </div>
        {/if}
      </div>
      <div class="flex gap-3 mt-5">
        <button onclick={() => showAddModal = false}
          class="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-2.5 rounded-2xl transition font-medium">
          Cancel
        </button>
        <button onclick={handleAddStock}
          class="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold py-2.5 rounded-2xl transition">
          Add Stock
        </button>
      </div>
    </div>
  </div>
{/if}

<!-- Sell Modal -->
{#if showSellModal && selectedStock}
  <div class="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
    <div class="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl">
      <h2 class="text-gray-900 font-bold text-lg mb-1">Sell Stock</h2>
      <p class="text-gray-400 text-sm mb-4">{selectedStock.shareName}</p>
      <div class="bg-gray-50 rounded-2xl p-3 text-xs space-y-1.5 mb-4">
        <div class="flex justify-between">
          <span class="text-gray-400">Qty Held</span>
          <span class="text-gray-900 font-medium">{selectedStock.qtyHeld}</span>
        </div>
        <div class="flex justify-between">
          <span class="text-gray-400">Sold so far</span>
          <span class="text-gray-900 font-medium">{selectedStock.soldFrequency}x partial sells</span>
        </div>
        <div class="flex justify-between">
          <span class="text-gray-400">Next Target</span>
          <span class="text-blue-500 font-medium">{formatINR(selectedStock.target)}</span>
        </div>
        <div class="flex justify-between">
          <span class="text-gray-400">Current Status</span>
          <span class="font-medium {statusClass(selectedStock.status)}">{selectedStock.status}</span>
        </div>
      </div>
      <label for="sellQty" class="text-gray-600 text-xs block mb-1">Qty to Sell (max {selectedStock.qtyHeld})</label>
      <input id="sellQty" type="number" bind:value={sellQty} max={selectedStock.qtyHeld} min="1"
        class="w-full bg-gray-50 border border-gray-200 rounded-2xl px-3 py-2.5 text-gray-900 text-sm focus:border-emerald-500 outline-none mb-4"/>
      <div class="flex gap-3">
        <button onclick={() => { showSellModal = false; sellQty = 0; }}
          class="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-2.5 rounded-2xl transition font-medium">
          Cancel
        </button>
        <button onclick={handleSell}
          class="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold py-2.5 rounded-2xl transition">
          Confirm Sell
        </button>
      </div>
    </div>
  </div>
{/if}

<!-- Rate Update Modal -->
{#if showRateModal && selectedStock}
  <div class="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
    <div class="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl">
      <h2 class="text-gray-900 font-bold text-lg mb-1">Update Rate</h2>
      <p class="text-gray-400 text-sm mb-4">{selectedStock.shareName}</p>
      <label for="newRate" class="text-gray-600 text-xs block mb-1">Today's Rate (₹)</label>
      <input id="newRate" type="number" bind:value={newRate}
        class="w-full bg-gray-50 border border-gray-200 rounded-2xl px-3 py-2.5 text-gray-900 text-sm focus:border-emerald-500 outline-none mb-4"/>
      <div class="flex gap-3">
        <button onclick={() => { showRateModal = false; newRate = 0; }}
          class="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-2.5 rounded-2xl transition font-medium">
          Cancel
        </button>
        <button onclick={handleRateUpdate}
          class="flex-1 bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2.5 rounded-2xl transition">
          Update Rate
        </button>
      </div>
    </div>
  </div>
{/if}