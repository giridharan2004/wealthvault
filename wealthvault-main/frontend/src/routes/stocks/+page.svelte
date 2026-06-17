<script lang="ts">
  import { onMount } from 'svelte';
  import { user } from '$lib/stores/auth';
  import {
    stocks, stocksLoading, pricesFetching, pricesLastUpdated,
    loadStocks, addStock, updateStock, sellStock, deleteStock, fetchLivePrices
  } from '$lib/stores/stocks';
  import { family, loadFamily } from '$lib/stores/family';

  let showAddModal     = $state(false);
  let showSellModal    = $state(false);
  let showRateModal    = $state(false);
  let showTargetsPanel = $state(false);
  let showFilterMenu   = $state(false);
  let selectedStock    = $state<any>(null);
  let sellQty          = $state(0);
  let sellRate         = $state(0);
  let sellDate         = $state(new Date().toISOString().split('T')[0]);
  let newRate          = $state(0);
  let viewingUid       = $state('');
  let fetchResult      = $state<{ updated: number; failed: string[] } | null>(null);
  let isBuyMore        = $state(false);

  let filterShare    = $state('');
  let filterPLPreset = $state('all');

  let form = $state({
    no: 0, shareName: '', shortName: '',
    buyQty: 0, buyAmt: 0, buyDate: '', todaysRate: 0
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
    setTimeout(() => fetchResult = null, 6000);
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

  const filteredStocks = $derived($stocks.filter(s => {
    const nameMatch = filterShare === '' ||
      s.shareName.toLowerCase().includes(filterShare.toLowerCase()) ||
      s.shortName.toLowerCase().includes(filterShare.toLowerCase());
    let plMatch = true;
    if (filterPLPreset === 'targets')  plMatch = s.plPercent >= 10;
    if (filterPLPreset === 'loss')     plMatch = s.plPercent < 0;
    if (filterPLPreset === 'stoploss') plMatch = s.status === 'Stop loss';
    return nameMatch && plMatch;
  }));

  const targetStocks  = $derived($stocks.filter(s => s.plPercent >= 10));
  const totalInvested = $derived(filteredStocks.reduce((s, x) => s + (x.investedVal || 0), 0));
  const totalCurrent  = $derived(filteredStocks.reduce((s, x) => s + (x.currentVal || 0), 0));
  const totalPL       = $derived(totalCurrent - totalInvested);
  const totalPLPc     = $derived(totalInvested > 0 ? (totalPL / totalInvested) * 100 : 0);
  const isOwnStocks   = $derived(viewingUid === $user?.uid);
</script>

<div class="space-y-4">

  <!-- Header -->
  <div class="flex items-center justify-between flex-wrap gap-3">
    <div>
      <h1 class="text-2xl font-bold text-gray-900">Stock Portfolio</h1>
      <p class="text-gray-400 text-sm mt-1">
        {isOwnStocks ? 'NSE/BSE holdings tracker' : 'Viewing: ' + ($family?.members.find(m => m.uid === viewingUid)?.displayName || '')}
      </p>
    </div>
    <div class="flex items-center gap-2 flex-wrap">
      {#if targetStocks.length > 0}
        <button
          onclick={() => showTargetsPanel = true}
          class="flex items-center gap-2 bg-yellow-50 border border-yellow-200 hover:bg-yellow-100 text-yellow-700 font-semibold px-4 py-2 rounded-2xl transition text-sm"
        >
          🏆 {targetStocks.length} Target{targetStocks.length !== 1 ? 's' : ''} Hit ≥10%
        </button>
      {/if}
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
      {#if isOwnStocks}
        <button
          onclick={() => { isBuyMore = false; showAddModal = true; }}
          class="bg-emerald-500 hover:bg-emerald-600 text-white font-semibold px-5 py-2 rounded-2xl transition"
        >
          + Add Stock
        </button>
      {/if}
    </div>
  </div>

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

  <!-- Member tabs -->
  {#if $family && $family.members.length > 1}
    <div class="flex gap-2 overflow-x-auto pb-1">
      {#each $family.members as member}
        <button
          onclick={() => switchToMember(member.uid)}
          class="px-4 py-2 rounded-2xl text-sm font-medium transition whitespace-nowrap
            {viewingUid === member.uid
              ? 'bg-emerald-500 text-white shadow-sm'
              : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}"
        >
          {member.displayName}{member.uid === $user?.uid ? ' (You)' : ''}
        </button>
      {/each}
    </div>
  {/if}

  <!-- Filter bar -->
  <div class="flex flex-wrap gap-3 items-center">
    <div class="relative flex-1 min-w-[200px] max-w-xs">
      <input
        type="text"
        bind:value={filterShare}
        placeholder="🔍 Search share or symbol..."
        class="w-full bg-white border border-gray-200 rounded-2xl px-4 py-2 text-gray-900 text-sm focus:border-emerald-500 outline-none shadow-sm"
      />
      {#if filterShare}
        <button onclick={() => filterShare = ''}
          class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-600 text-lg leading-none">✕</button>
      {/if}
    </div>

    <div class="relative">
      <button
        onclick={() => showFilterMenu = !showFilterMenu}
        class="flex items-center gap-2 bg-white border border-gray-200 hover:border-emerald-300 rounded-2xl px-4 py-2 text-sm transition min-w-[150px] justify-between shadow-sm"
      >
        <span>
          {#if filterPLPreset === 'targets'}
            <span class="text-emerald-600">📈 P&L ≥ 10%</span>
          {:else if filterPLPreset === 'loss'}
            <span class="text-red-500">📉 In Loss</span>
          {:else if filterPLPreset === 'stoploss'}
            <span class="text-red-600">🛑 Stop Loss</span>
          {:else}
            <span class="text-gray-600">📊 All Stocks</span>
          {/if}
        </span>
        <svg class="w-4 h-4 text-gray-400 {showFilterMenu ? 'rotate-180' : ''} transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
        </svg>
      </button>

      {#if showFilterMenu}
        <div class="absolute top-full mt-1 left-0 bg-white border border-gray-200 rounded-2xl shadow-lg z-20 min-w-[180px] overflow-hidden">
          {#each [
            { val: 'all',      label: '📊 All Stocks',  cls: 'text-gray-600' },
            { val: 'targets',  label: '📈 P&L ≥ 10%',   cls: 'text-emerald-600' },
            { val: 'loss',     label: '📉 In Loss',      cls: 'text-red-500' },
            { val: 'stoploss', label: '🛑 Stop Loss',    cls: 'text-red-600' }
          ] as opt}
            <button
              onclick={() => { filterPLPreset = opt.val; showFilterMenu = false; }}
              class="w-full text-left px-4 py-3 text-sm hover:bg-gray-50 transition {opt.cls}
                {filterPLPreset === opt.val ? 'bg-emerald-50 font-semibold' : ''}"
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
          onclick={() => { filterShare = ''; filterPLPreset = 'all'; }}
          class="text-xs text-gray-500 hover:text-gray-800 bg-gray-100 hover:bg-gray-200 px-3 py-2 rounded-xl transition"
        >
          Clear filters
        </button>
      {/if}
      <span class="text-gray-400 text-xs">
        {filteredStocks.length} of {$stocks.length} stocks
      </span>
    </div>
  </div>

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
    {:else if filteredStocks.length === 0}
      <div class="text-center py-20 px-6">
        <div class="w-16 h-16 bg-emerald-50 rounded-3xl flex items-center justify-center mx-auto mb-4">
          <svg class="w-8 h-8 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z"/>
          </svg>
        </div>
        <p class="text-gray-900 font-semibold mb-1">
          {$stocks.length === 0 ? 'No stocks yet' : 'No stocks match the filter'}
        </p>
        {#if filterPLPreset !== 'all' || filterShare}
          <button onclick={() => { filterShare = ''; filterPLPreset = 'all'; }}
            class="text-emerald-600 text-sm hover:underline">Clear filters</button>
        {:else if isOwnStocks}
          <p class="text-gray-400 text-sm mb-4">Add your first NSE/BSE stock to start tracking</p>
          <button onclick={() => showAddModal = true}
            class="bg-emerald-500 hover:bg-emerald-600 text-white font-semibold px-6 py-2.5 rounded-2xl transition">
            + Add First Stock
          </button>
        {/if}
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
              {#if isOwnStocks}<th class="px-3 py-3 font-semibold text-center">Actions</th>{/if}
            </tr>
          </thead>
          <tbody>
            {#each filteredStocks as stock}
              <tr class="border-b border-gray-50 hover:bg-gray-50/50 transition
                {stock.plPercent >= 10 ? 'border-l-2 border-l-emerald-400' : ''}
                {stock.status === 'Stop loss' ? 'border-l-2 border-l-red-400' : ''}">
                <td class="px-3 py-3 text-gray-400">{stock.no}</td>
                <td class="px-3 py-3">
                  <div class="font-semibold text-gray-900 whitespace-nowrap flex items-center gap-1">
                    {stock.shareName}
                    {#if stock.plPercent >= 10}<span class="text-yellow-500">🏆</span>{/if}
                    {#if stock.status === 'Stop loss'}<span class="text-red-500">🛑</span>{/if}
                  </div>
                  <div class="text-gray-400">{stock.shortName}</div>
                  <div class="text-gray-300">{stock.buyDate}</div>
                </td>
                <td class="px-3 py-3 text-right text-gray-600">{stock.buyQty}</td>
                <td class="px-3 py-3 text-right text-gray-600">{formatINR(stock.buyAmt)}</td>
                <td class="px-3 py-3 text-right text-gray-900 font-medium">{formatINR(stock.investedVal)}</td>
                <td class="px-3 py-3 text-right text-gray-600">{stock.soldFrequency || 0}x</td>
                <td class="px-3 py-3 text-right text-gray-600">{stock.qtyHeld}</td>
                <td class="px-3 py-3 text-right">
                  {#if isOwnStocks}
                    <button
                      onclick={() => { selectedStock = stock; newRate = stock.todaysRate; showRateModal = true; }}
                      class="text-blue-500 hover:text-blue-600 font-medium transition"
                    >{formatINR(stock.todaysRate)}</button>
                  {:else}
                    <span class="text-blue-500 font-medium">{formatINR(stock.todaysRate)}</span>
                  {/if}
                </td>
                <td class="px-3 py-3 text-right text-gray-900 font-medium">{formatINR(stock.currentVal)}</td>
                <td class="px-3 py-3 text-right font-semibold {plClass(stock.plPercent)}">{stock.plPercent?.toFixed(2)}%</td>
                <td class="px-3 py-3 text-right text-red-500">{formatINR(stock.stopLoss)}</td>
                <td class="px-3 py-3 text-right text-blue-500">{formatINR(stock.target)}</td>
                <td class="px-3 py-3 text-center">
                  <span class="px-2 py-1 rounded-full text-xs {statusClass(stock.status)}">{stock.status}</span>
                </td>
                <td class="px-3 py-3 text-right {plClass(stock.diffPL)}">{formatINR(stock.diffPL)}</td>
                <td class="px-3 py-3 text-right text-gray-600">{Math.floor(stock.qtyNeedToSell ?? 0)}</td>
                <td class="px-3 py-3 text-right text-gray-600">{stock.soldQty || 0}</td>
                <td class="px-3 py-3 text-right text-gray-400">{stock.soldDate || '-'}</td>
                <td class="px-3 py-3 text-center">
                  <button
                    onclick={() => isOwnStocks && updateStock(stock.id, { releaseStatus: !stock.releaseStatus }, viewingUid || undefined)}
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
                {#if isOwnStocks}
                  <td class="px-3 py-3">
                    <div class="flex flex-col gap-1 items-stretch min-w-[64px]">
                      <button
                        onclick={() => openBuyMore(stock)}
                        class="text-xs bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-100 px-2 py-1 rounded-lg transition text-center"
                      >+ Buy</button>
                      <button
                        onclick={() => { selectedStock = stock; sellRate = stock.todaysRate; showSellModal = true; }}
                        class="text-xs bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-100 px-2 py-1 rounded-lg transition text-center"
                      >Sell</button>
                      <button
                        onclick={() => deleteStock(stock.id, viewingUid || undefined)}
                        class="text-xs bg-red-50 hover:bg-red-100 text-red-600 border border-red-100 px-2 py-1 rounded-lg transition text-center"
                      >Del</button>
                    </div>
                  </td>
                {/if}
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    {/if}
  </div>
</div>

<!-- ── Targets Hit Panel ── -->
{#if showTargetsPanel}
  <div class="fixed inset-0 bg-gray-900/50 backdrop-blur-sm flex items-start justify-center z-50 p-4 pt-10 overflow-y-auto">
    <div class="bg-white border border-yellow-100 rounded-3xl w-full max-w-5xl shadow-xl">
      <div class="flex items-center justify-between px-6 py-4 border-b border-gray-100">
        <div>
          <h2 class="text-gray-900 font-bold text-xl">🏆 Stocks with P&L ≥ 10%</h2>
          <p class="text-gray-400 text-sm">{targetStocks.length} stock{targetStocks.length !== 1 ? 's' : ''} at or above target</p>
        </div>
        <button onclick={() => showTargetsPanel = false} class="text-gray-400 hover:text-gray-700 text-2xl px-2">✕</button>
      </div>
      <div class="overflow-x-auto p-4">
        <table class="w-full text-xs">
          <thead>
            <tr class="text-gray-400 border-b border-gray-100">
              <th class="text-left px-3 py-2">Share</th>
              <th class="text-right px-3 py-2">Invested</th>
              <th class="text-right px-3 py-2">Current Val</th>
              <th class="text-right px-3 py-2">P&L%</th>
              <th class="text-right px-3 py-2">Gain</th>
              <th class="text-right px-3 py-2">Today Rate</th>
              <th class="text-right px-3 py-2">Target</th>
              <th class="text-center px-3 py-2">Status</th>
              <th class="text-right px-3 py-2">Qty Held</th>
              {#if isOwnStocks}<th class="text-center px-3 py-2">Action</th>{/if}
            </tr>
          </thead>
          <tbody>
            {#each [...targetStocks].sort((a, b) => b.plPercent - a.plPercent) as stock}
              <tr class="border-b border-gray-50 hover:bg-yellow-50/40 transition">
                <td class="px-3 py-3">
                  <div class="font-semibold text-gray-900">{stock.shareName}</div>
                  <div class="text-gray-400">{stock.shortName}</div>
                </td>
                <td class="px-3 py-3 text-right text-gray-600">{formatINR(stock.investedVal)}</td>
                <td class="px-3 py-3 text-right text-gray-900 font-medium">{formatINR(stock.currentVal)}</td>
                <td class="px-3 py-3 text-right font-bold text-emerald-600">{stock.plPercent?.toFixed(2)}%</td>
                <td class="px-3 py-3 text-right text-emerald-600">{formatINR(stock.diffPL)}</td>
                <td class="px-3 py-3 text-right text-blue-500">{formatINR(stock.todaysRate)}</td>
                <td class="px-3 py-3 text-right text-blue-400">{formatINR(stock.target)}</td>
                <td class="px-3 py-3 text-center">
                  <span class="px-2 py-1 rounded-full text-xs {statusClass(stock.status)}">{stock.status}</span>
                </td>
                <td class="px-3 py-3 text-right text-gray-600">{stock.qtyHeld}</td>
                {#if isOwnStocks}
                  <td class="px-3 py-3 text-center">
                    <button
                      onclick={() => { selectedStock = stock; sellRate = stock.todaysRate; showSellModal = true; showTargetsPanel = false; }}
                      class="text-xs bg-emerald-500 hover:bg-emerald-600 text-white px-3 py-1.5 rounded-xl transition font-semibold"
                    >Sell Now</button>
                  </td>
                {/if}
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
      <div class="px-6 py-4 border-t border-gray-100 bg-gray-50/50 rounded-b-3xl flex gap-8 flex-wrap">
        <div>
          <p class="text-gray-400 text-xs">Total Invested</p>
          <p class="text-gray-900 font-bold">{formatINR(targetStocks.reduce((s,x) => s + x.investedVal, 0))}</p>
        </div>
        <div>
          <p class="text-gray-400 text-xs">Total Current</p>
          <p class="text-gray-900 font-bold">{formatINR(targetStocks.reduce((s,x) => s + x.currentVal, 0))}</p>
        </div>
        <div>
          <p class="text-gray-400 text-xs">Total Gain</p>
          <p class="text-emerald-600 font-bold">{formatINR(targetStocks.reduce((s,x) => s + x.diffPL, 0))}</p>
        </div>
        <div>
          <p class="text-gray-400 text-xs">Avg P&L%</p>
          <p class="text-emerald-600 font-bold">
            {(targetStocks.reduce((s,x) => s + x.plPercent, 0) / targetStocks.length).toFixed(2)}%
          </p>
        </div>
      </div>
    </div>
  </div>
{/if}

<!-- ── Add / Buy More Modal ── -->
{#if showAddModal}
  <div class="fixed inset-0 bg-gray-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
    <div class="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl">
      <h2 class="text-gray-900 font-bold text-lg mb-5">
        {isBuyMore ? `+ Buy More — ${form.shareName}` : 'Add New Stock'}
      </h2>
      <div class="space-y-3">
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="text-gray-600 text-xs block mb-1">Serial No</label>
            <input type="number" bind:value={form.no}
              class="w-full bg-gray-50 border border-gray-200 rounded-2xl px-3 py-2.5 text-gray-900 text-sm focus:border-emerald-500 outline-none"/>
          </div>
          <div>
            <label class="text-gray-600 text-xs block mb-1">Buy Date</label>
            <input type="date" bind:value={form.buyDate}
              class="w-full bg-gray-50 border border-gray-200 rounded-2xl px-3 py-2.5 text-gray-900 text-sm focus:border-emerald-500 outline-none"/>
          </div>
        </div>
        <div>
          <label class="text-gray-600 text-xs block mb-1">Share Name</label>
          <input type="text" bind:value={form.shareName} placeholder="Tata Consultancy Services" disabled={isBuyMore}
            class="w-full bg-gray-50 border border-gray-200 rounded-2xl px-3 py-2.5 text-gray-900 text-sm focus:border-emerald-500 outline-none disabled:opacity-50"/>
        </div>
        <div>
          <label class="text-gray-600 text-xs block mb-1">NSE Symbol</label>
          <input type="text" bind:value={form.shortName} placeholder="TCS" disabled={isBuyMore}
            class="w-full bg-gray-50 border border-gray-200 rounded-2xl px-3 py-2.5 text-gray-900 text-sm focus:border-emerald-500 outline-none disabled:opacity-50"/>
          <p class="text-gray-400 text-xs mt-1">Used to auto-fetch live NSE prices</p>
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="text-gray-600 text-xs block mb-1">Buy Qty</label>
            <input type="number" bind:value={form.buyQty}
              class="w-full bg-gray-50 border border-gray-200 rounded-2xl px-3 py-2.5 text-gray-900 text-sm focus:border-emerald-500 outline-none"/>
          </div>
          <div>
            <label class="text-gray-600 text-xs block mb-1">Buy Price (₹)</label>
            <input type="number" bind:value={form.buyAmt}
              class="w-full bg-gray-50 border border-gray-200 rounded-2xl px-3 py-2.5 text-gray-900 text-sm focus:border-emerald-500 outline-none"/>
          </div>
        </div>
        <div>
          <label class="text-gray-600 text-xs block mb-1">Today's Rate (optional — will auto-fetch)</label>
          <input type="number" bind:value={form.todaysRate}
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
        <button onclick={() => { showAddModal = false; isBuyMore = false; }}
          class="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-2.5 rounded-2xl transition font-medium">Cancel</button>
        <button onclick={handleAddStock}
          class="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold py-2.5 rounded-2xl transition">
          {isBuyMore ? 'Buy More' : 'Add Stock'}
        </button>
      </div>
    </div>
  </div>
{/if}

<!-- ── Sell Modal (Buy-style layout) ── -->
{#if showSellModal && selectedStock}
  <div class="fixed inset-0 bg-gray-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
    <div class="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl">
      <h2 class="text-gray-900 font-bold text-lg mb-5">Sell Stock</h2>
      <div class="space-y-3">
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="text-gray-600 text-xs block mb-1">Share Name</label>
            <div class="w-full bg-gray-50 border border-gray-200 rounded-2xl px-3 py-2.5 text-gray-700 text-sm">{selectedStock.shareName}</div>
          </div>
          <div>
            <label class="text-gray-600 text-xs block mb-1">NSE Symbol</label>
            <div class="w-full bg-gray-50 border border-gray-200 rounded-2xl px-3 py-2.5 text-gray-700 text-sm">{selectedStock.shortName}</div>
          </div>
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="text-gray-600 text-xs block mb-1">Qty Held</label>
            <div class="w-full bg-gray-50 border border-gray-200 rounded-2xl px-3 py-2.5 text-gray-700 text-sm">{selectedStock.qtyHeld}</div>
          </div>
          <div>
            <label class="text-gray-600 text-xs block mb-1">Sell Frequency</label>
            <div class="w-full bg-gray-50 border border-gray-200 rounded-2xl px-3 py-2.5 text-gray-700 text-sm">{selectedStock.soldFrequency}x</div>
          </div>
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="text-gray-600 text-xs block mb-1">Sell Rate (₹) <span class="text-emerald-600">editable</span></label>
            <input type="number" bind:value={sellRate}
              class="w-full bg-gray-50 border border-gray-200 rounded-2xl px-3 py-2.5 text-blue-600 text-sm focus:border-emerald-500 outline-none"/>
          </div>
          <div>
            <label class="text-gray-600 text-xs block mb-1">Sell Date</label>
            <input type="date" bind:value={sellDate}
              class="w-full bg-gray-50 border border-gray-200 rounded-2xl px-3 py-2.5 text-gray-900 text-sm focus:border-emerald-500 outline-none"/>
          </div>
        </div>
        <div>
          <label class="text-gray-600 text-xs block mb-1">Qty to Sell (max {selectedStock.qtyHeld})</label>
          <input type="number" bind:value={sellQty} max={selectedStock.qtyHeld} min="1"
            class="w-full bg-gray-50 border border-gray-200 rounded-2xl px-3 py-2.5 text-gray-900 text-sm focus:border-emerald-500 outline-none"/>
          <button onclick={() => sellQty = selectedStock.qtyHeld}
            class="text-xs text-emerald-600 hover:text-emerald-700 mt-1 font-medium">Sell all {selectedStock.qtyHeld} held</button>
        </div>
        {#if sellQty > 0}
          <div class="bg-gray-50 rounded-2xl p-3 text-xs space-y-1.5">
            <div class="flex justify-between">
              <span class="text-gray-400">Selling Value</span>
              <span class="text-gray-900 font-medium">{formatINR(sellQty * sellRate)}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-gray-400">Current P&L%</span>
              <span class="{plClass(selectedStock.plPercent)} font-medium">{selectedStock.plPercent?.toFixed(2)}%</span>
            </div>
            <div class="flex justify-between">
              <span class="text-gray-400">Target</span>
              <span class="text-blue-500 font-medium">{formatINR(selectedStock.target)}</span>
            </div>
            <div class="flex justify-between border-t border-gray-200 pt-1.5 mt-1.5">
              <span class="text-gray-400">Remaining after sell</span>
              <span class="{(selectedStock.qtyHeld - sellQty) < 0 ? 'text-red-500' : 'text-gray-900'} font-medium">
                {selectedStock.qtyHeld - sellQty}
              </span>
            </div>
          </div>
        {/if}
      </div>
      <div class="flex gap-3 mt-5">
        <button onclick={() => { showSellModal = false; sellQty = 0; }}
          class="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-2.5 rounded-2xl transition font-medium">Cancel</button>
        <button onclick={handleSell} disabled={sellQty <= 0 || sellQty > selectedStock.qtyHeld}
          class="flex-1 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold py-2.5 rounded-2xl transition">
          Confirm Sell
        </button>
      </div>
    </div>
  </div>
{/if}

<!-- ── Rate Update Modal ── -->
{#if showRateModal && selectedStock}
  <div class="fixed inset-0 bg-gray-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
    <div class="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl">
      <h2 class="text-gray-900 font-bold text-lg mb-1">Update Rate</h2>
      <p class="text-gray-400 text-sm mb-4">{selectedStock.shareName}</p>
      <label class="text-gray-600 text-xs block mb-1">Today's Rate (₹)</label>
      <input type="number" bind:value={newRate}
        class="w-full bg-gray-50 border border-gray-200 rounded-2xl px-3 py-2.5 text-gray-900 text-sm focus:border-emerald-500 outline-none mb-4"/>
      <div class="flex gap-3">
        <button onclick={() => { showRateModal = false; newRate = 0; }}
          class="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-2.5 rounded-2xl transition font-medium">Cancel</button>
        <button onclick={handleRateUpdate}
          class="flex-1 bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2.5 rounded-2xl transition">Update Rate</button>
      </div>
    </div>
  </div>
{/if}