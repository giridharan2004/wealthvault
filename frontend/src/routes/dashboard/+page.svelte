<script lang="ts">
	import { onMount } from 'svelte';
	import { portfolio, fetchPortfolio, portfolioLoading } from '$lib/stores/portfolio';
	import { user } from '$lib/stores/auth';

	onMount(() => {
		fetchPortfolio();
	});

	function formatINR(value: number): string {
		return new Intl.NumberFormat('en-IN', {
			style: 'currency',
			currency: 'INR',
			maximumFractionDigits: 0
		}).format(value);
	}

	function assetColor(type: string): string {
		const colors: Record<string, string> = {
			STOCK: 'bg-blue-500',
			MUTUAL_FUND: 'bg-purple-500',
			GOLD: 'bg-yellow-500',
			PROPERTY: 'bg-orange-500',
			FD: 'bg-green-500',
			NPS: 'bg-pink-500'
		};
		return colors[type] || 'bg-gray-500';
	}
</script>

<div class="space-y-8">
	<!-- Header -->
	<div>
		<h1 class="text-2xl font-bold text-white">
			Welcome back, {$user?.displayName?.split(' ')[0]} 👋
		</h1>
		<p class="text-gray-400 mt-1">Here's your portfolio overview</p>
	</div>

	{#if $portfolioLoading}
		<div class="flex items-center justify-center py-20">
			<div
				class="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"
			></div>
		</div>
	{:else if $portfolio}
		<!-- Summary Cards -->
		<div class="grid grid-cols-1 md:grid-cols-4 gap-4">
			<div class="bg-gray-900 border border-gray-800 rounded-xl p-5">
				<p class="text-gray-400 text-sm">Total Value</p>
				<p class="text-2xl font-bold text-white mt-1">{formatINR($portfolio.totalValue)}</p>
			</div>
			<div class="bg-gray-900 border border-gray-800 rounded-xl p-5">
				<p class="text-gray-400 text-sm">Total Invested</p>
				<p class="text-2xl font-bold text-white mt-1">{formatINR($portfolio.totalInvested)}</p>
			</div>
			<div class="bg-gray-900 border border-gray-800 rounded-xl p-5">
				<p class="text-gray-400 text-sm">Total Returns</p>
				<p
					class="text-2xl font-bold mt-1 {$portfolio.totalReturns >= 0
						? 'text-emerald-400'
						: 'text-red-400'}"
				>
					{formatINR($portfolio.totalReturns)}
				</p>
			</div>
			<div class="bg-gray-900 border border-gray-800 rounded-xl p-5">
				<p class="text-gray-400 text-sm">Returns %</p>
				<p
					class="text-2xl font-bold mt-1 {$portfolio.returnsPc >= 0
						? 'text-emerald-400'
						: 'text-red-400'}"
				>
					{$portfolio.returnsPc.toFixed(2)}%
				</p>
			</div>
		</div>

		<!-- Assets Table -->
		<div class="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
			<div class="px-6 py-4 border-b border-gray-800 flex items-center justify-between">
				<h2 class="font-semibold text-white">Your Assets</h2>
				<a href="/stocks" class="text-sm text-emerald-400 hover:text-emerald-300">+ Add Asset</a>
			</div>
			<div class="overflow-x-auto">
				<table class="w-full text-sm">
					<thead>
						<tr class="text-gray-400 border-b border-gray-800">
							<th class="text-left px-6 py-3">Asset</th>
							<th class="text-left px-6 py-3">Type</th>
							<th class="text-right px-6 py-3">Invested</th>
							<th class="text-right px-6 py-3">Current</th>
							<th class="text-right px-6 py-3">Returns</th>
						</tr>
					</thead>
					<tbody>
						{#each $portfolio.assets as asset}
							<tr class="border-b border-gray-800 hover:bg-gray-800 transition">
								<td class="px-6 py-4">
									<div class="font-medium text-white">{asset.name}</div>
									<div class="text-gray-500 text-xs">{asset.symbol}</div>
								</td>
								<td class="px-6 py-4">
									<span class="px-2 py-1 rounded-full text-xs text-white {assetColor(asset.type)}">
										{asset.type}
									</span>
								</td>
								<td class="px-6 py-4 text-right text-gray-300">
									{formatINR(asset.buyPrice * asset.quantity)}
								</td>
								<td class="px-6 py-4 text-right text-white">
									{formatINR(asset.currentValue)}
								</td>
								<td
									class="px-6 py-4 text-right font-medium {asset.returnsPc >= 0
										? 'text-emerald-400'
										: 'text-red-400'}"
								>
									{asset.returnsPc.toFixed(2)}%
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		</div>
	{:else}
		<!-- Empty state -->
		<div class="text-center py-20">
			<p class="text-gray-400 text-lg">No assets yet</p>
			<p class="text-gray-600 text-sm mt-2">Start by adding your first asset</p>
			<a
				href="/stocks"
				class="inline-block mt-4 bg-emerald-500 hover:bg-emerald-400 text-black font-semibold px-6 py-3 rounded-xl transition"
			>
				+ Add Asset
			</a>
		</div>
	{/if}
</div>
