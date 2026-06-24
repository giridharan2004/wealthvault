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
			style: 'currency',
			currency: 'INR',
			maximumFractionDigits: 0
		}).format(value);
	}

	function assetColor(type: string): string {
		const colors: Record<string, string> = {
			STOCK: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
			MUTUAL_FUND: 'bg-purple-500/10 text-purple-400 border border-purple-500/20',
			GOLD: 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20',
			PROPERTY: 'bg-orange-500/10 text-orange-400 border border-orange-500/20',
			FD: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
			NPS: 'bg-pink-500/10 text-pink-400 border border-pink-500/20'
		};
		return colors[type] || 'bg-white/5 text-white/60 border border-white/10';
	}
</script>

<div class="space-y-4">
	<div>
		<h1 class="text-lg font-bold text-white">
			Welcome back, {$user?.displayName?.split(' ')[0]} 👋
		</h1>
		<p class="text-white/40 text-xs mt-0.5">Here's your portfolio overview</p>
	</div>

	{#if $portfolioLoading}
		<div class="flex items-center justify-center py-20">
			<div
				class="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"
			></div>
		</div>
	{:else if $portfolio}
		<div class="grid grid-cols-2 md:grid-cols-4 gap-2">
			<div class="bg-[#161616] border border-white/8 rounded-xl p-3">
				<p class="text-white/40 text-xs font-medium">Total Value</p>
				<p class="text-white font-bold text-base mt-0.5">{formatINR($portfolio.totalValue)}</p>
			</div>
			<div class="bg-[#161616] border border-white/8 rounded-xl p-3">
				<p class="text-white/40 text-xs font-medium">Total Invested</p>
				<p class="text-white font-bold text-base mt-0.5">{formatINR($portfolio.totalInvested)}</p>
			</div>
			<div class="bg-[#161616] border border-white/8 rounded-xl p-3">
				<p class="text-white/40 text-xs font-medium">Total Returns</p>
				<p
					class="font-bold text-base mt-0.5 {$portfolio.totalReturns >= 0
						? 'text-emerald-400'
						: 'text-red-400'}"
				>
					{formatINR($portfolio.totalReturns)}
				</p>
			</div>
			<div class="bg-[#161616] border border-white/8 rounded-xl p-3">
				<p class="text-white/40 text-xs font-medium">Returns %</p>
				<p
					class="font-bold text-base mt-0.5 {$portfolio.returnsPc >= 0
						? 'text-emerald-400'
						: 'text-red-400'}"
				>
					{$portfolio.returnsPc.toFixed(2)}%
				</p>
			</div>
		</div>

		<div class="bg-[#111] border border-white/8 rounded-2xl overflow-hidden">
			<div class="px-4 py-3 border-b border-white/8 flex items-center justify-between">
				<h2 class="font-bold text-white text-sm">Your Assets</h2>
				<a href="/stocks" class="text-xs text-emerald-400 hover:text-emerald-300 font-medium"
					>+ Add Asset</a
				>
			</div>
			<div class="overflow-x-auto">
				<table class="w-full text-xs">
					<thead>
						<tr class="text-white/40 border-b border-white/8 bg-[#0d0d0d] text-left">
							<th class="px-4 py-2.5 font-semibold">Asset</th>
							<th class="px-4 py-2.5 font-semibold">Type</th>
							<th class="px-4 py-2.5 font-semibold text-right">Invested</th>
							<th class="px-4 py-2.5 font-semibold text-right">Current</th>
							<th class="px-4 py-2.5 font-semibold text-right">Returns</th>
						</tr>
					</thead>
					<tbody>
						{#each $portfolio.assets as asset}
							<tr class="border-b border-white/5 hover:bg-white/3 transition">
								<td class="px-4 py-3">
									<div class="font-semibold text-white">{asset.name}</div>
									<div class="text-white/30 text-xs">{asset.symbol}</div>
								</td>
								<td class="px-4 py-3">
									<span
										class="px-2 py-0.5 rounded-full text-xs font-medium {assetColor(asset.type)}"
										>{asset.type}</span
									>
								</td>
								<td class="px-4 py-3 text-right text-white/60"
									>{formatINR(asset.buyPrice * asset.quantity)}</td
								>
								<td class="px-4 py-3 text-right text-white font-medium"
									>{formatINR(asset.currentValue)}</td
								>
								<td
									class="px-4 py-3 text-right font-semibold {asset.returnsPc >= 0
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
						d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2"
					/>
				</svg>
			</div>
			<p class="text-white font-semibold text-sm mb-1">No assets yet</p>
			<p class="text-white/40 text-xs mb-3">Start by adding your first asset</p>
			<a
				href="/stocks"
				class="inline-block bg-emerald-500 hover:bg-emerald-600 text-white font-semibold px-5 py-2 rounded-xl transition text-sm"
			>
				+ Add Asset
			</a>
		</div>
	{/if}
</div>
