<script lang="ts">
  import { onMount } from 'svelte';
  import { portfolio, fetchPortfolio, portfolioLoading } from '$lib/stores/portfolio';
  import { user, idToken } from '$lib/stores/auth';

  onMount(() => {
    const unsub = idToken.subscribe((token) => {
      if (token) {
        fetchPortfolio();
        unsub();
      }
    });
  });

  function formatINR(value: number): string {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency', currency: 'INR', maximumFractionDigits: 0
    }).format(value);
  }

  function assetColor(type: string): string {
    const colors: Record<string, string> = {
      STOCK: 'bg-blue-50 text-blue-700 border border-blue-100',
      MUTUAL_FUND: 'bg-purple-50 text-purple-700 border border-purple-100',
      GOLD: 'bg-yellow-50 text-yellow-700 border border-yellow-100',
      PROPERTY: 'bg-orange-50 text-orange-700 border border-orange-100',
      FD: 'bg-emerald-50 text-emerald-700 border border-emerald-100',
      NPS: 'bg-pink-50 text-pink-700 border border-pink-100'
    };
    return colors[type] || 'bg-gray-50 text-gray-600 border border-gray-100';
  }
</script>

<div class="space-y-6">
  <div>
    <h1 class="text-2xl font-bold text-gray-900">
      Welcome back, {$user?.displayName?.split(' ')[0]} 👋
    </h1>
    <p class="text-gray-400 mt-1">Here's your portfolio overview</p>
  </div>

  {#if $portfolioLoading}
    <div class="flex items-center justify-center py-20">
      <div class="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
    </div>

  {:else if $portfolio}
    <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
      <div class="bg-white border border-gray-100 rounded-2xl shadow-sm p-4 md:p-5">
        <p class="text-gray-400 text-xs md:text-sm font-medium">Total Value</p>
        <p class="text-lg md:text-2xl font-bold text-gray-900 mt-1">{formatINR($portfolio.totalValue)}</p>
      </div>
      <div class="bg-white border border-gray-100 rounded-2xl shadow-sm p-4 md:p-5">
        <p class="text-gray-400 text-xs md:text-sm font-medium">Total Invested</p>
        <p class="text-lg md:text-2xl font-bold text-gray-900 mt-1">{formatINR($portfolio.totalInvested)}</p>
      </div>
      <div class="bg-white border border-gray-100 rounded-2xl shadow-sm p-4 md:p-5">
        <p class="text-gray-400 text-xs md:text-sm font-medium">Total Returns</p>
        <p class="text-lg md:text-2xl font-bold mt-1 {$portfolio.totalReturns >= 0 ? 'text-emerald-600' : 'text-red-500'}">
          {formatINR($portfolio.totalReturns)}
        </p>
      </div>
      <div class="bg-white border border-gray-100 rounded-2xl shadow-sm p-4 md:p-5">
        <p class="text-gray-400 text-xs md:text-sm font-medium">Returns %</p>
        <p class="text-lg md:text-2xl font-bold mt-1 {$portfolio.returnsPc >= 0 ? 'text-emerald-600' : 'text-red-500'}">
          {$portfolio.returnsPc.toFixed(2)}%
        </p>
      </div>
    </div>

    <div class="bg-white border border-gray-100 rounded-3xl shadow-sm overflow-hidden">
      <div class="px-5 md:px-6 py-4 border-b border-gray-100 flex items-center justify-between">
        <h2 class="font-bold text-gray-900">Your Assets</h2>
        <a href="/stocks" class="text-sm text-emerald-600 hover:text-emerald-700 font-medium">+ Add Asset</a>
      </div>
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="text-gray-400 border-b border-gray-100 bg-gray-50/50 text-left">
              <th class="px-5 md:px-6 py-3 font-semibold">Asset</th>
              <th class="px-5 md:px-6 py-3 font-semibold">Type</th>
              <th class="px-5 md:px-6 py-3 font-semibold text-right">Invested</th>
              <th class="px-5 md:px-6 py-3 font-semibold text-right">Current</th>
              <th class="px-5 md:px-6 py-3 font-semibold text-right">Returns</th>
            </tr>
          </thead>
          <tbody>
            {#each $portfolio.assets as asset}
              <tr class="border-b border-gray-50 hover:bg-gray-50/50 transition">
                <td class="px-5 md:px-6 py-4">
                  <div class="font-semibold text-gray-900">{asset.name}</div>
                  <div class="text-gray-400 text-xs">{asset.symbol}</div>
                </td>
                <td class="px-5 md:px-6 py-4">
                  <span class="px-2 py-1 rounded-full text-xs font-medium {assetColor(asset.type)}">
                    {asset.type}
                  </span>
                </td>
                <td class="px-5 md:px-6 py-4 text-right text-gray-600">
                  {formatINR(asset.buyPrice * asset.quantity)}
                </td>
                <td class="px-5 md:px-6 py-4 text-right text-gray-900 font-medium">
                  {formatINR(asset.currentValue)}
                </td>
                <td class="px-5 md:px-6 py-4 text-right font-semibold {asset.returnsPc >= 0 ? 'text-emerald-600' : 'text-red-500'}">
                  {asset.returnsPc.toFixed(2)}%
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    </div>

  {:else}
    <div class="text-center py-20 px-6">
      <div class="w-16 h-16 bg-emerald-50 rounded-3xl flex items-center justify-center mx-auto mb-4">
        <svg class="w-8 h-8 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
          <path stroke-linecap="round" stroke-linejoin="round" d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2"/>
        </svg>
      </div>
      <p class="text-gray-900 font-semibold mb-1">No assets yet</p>
      <p class="text-gray-400 text-sm mb-4">Start by adding your first asset</p>
      <a href="/stocks"
        class="inline-block bg-emerald-500 hover:bg-emerald-600 text-white font-semibold px-6 py-2.5 rounded-2xl transition">
        + Add Asset
      </a>
    </div>
  {/if}
</div>