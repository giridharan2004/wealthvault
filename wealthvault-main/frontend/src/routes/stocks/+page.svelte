<script lang="ts">
	import { onMount } from 'svelte';
	import {
		portfolio,
		fetchPortfolio,
		portfolioLoading,
		addAsset,
		deleteAsset
	} from '$lib/stores/portfolio';
	import { family, fetchMemberAssets } from '$lib/stores/family';
	import { auth } from '$lib/firebase';

	let showForm = $state(false);
	let submitting = $state(false);
	let error = $state('');
	let selectedUID = $state<string | null>(null);
	let familyStocks = $state<{ memberName: string; uid: string; stocks: any[] }[]>([]);
	let familyLoading = $state(false);
	let form = $state({ name: '', symbol: '', quantity: '', buyPrice: '', buyDate: '' });

	onMount(() => {
		const unsub = auth.onAuthStateChanged(async (user) => {
			if (user) {
				await fetchPortfolio();
				await loadFamilyStocks();
				unsub();
			}
		});
	});

	async function loadFamilyStocks() {
		const f = $family;
		if (!f) return;
		familyLoading = true;
		const results = [];
		for (const member of f.members) {
			try {
				const data = await fetchMemberAssets(member.uid);
				const stocks = (data.assets ?? []).filter((a: any) => a.type === 'STOCK');
				results.push({ memberName: member.displayName, uid: member.uid, stocks });
			} catch {
				results.push({ memberName: member.displayName, uid: member.uid, stocks: [] });
			}
		}
		familyStocks = results;
		familyLoading = false;
	}

	function formatINR(value: number) {
		return new Intl.NumberFormat('en-IN', {
			style: 'currency',
			currency: 'INR',
			maximumFractionDigits: 0
		}).format(value);
	}

	function validateSymbol() {
		const sym = form.symbol.trim().toUpperCase();
		if (!sym) return;
		form.symbol = sym;
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
			showForm = false;
			await loadFamilyStocks();
		} catch {
			error = 'Failed to add stock';
		} finally {
			submitting = false;
		}
	}

	async function handleDelete(id: string) {
		if (!confirm('Remove this stock?')) return;
		await deleteAsset(id);
		await loadFamilyStocks();
	}

	const myUID = $derived(auth.currentUser?.uid ?? '');
	const visibleMembers = $derived(
		selectedUID === null ? familyStocks : familyStocks.filter((m) => m.uid === selectedUID)
	);
	const allStocks = $derived(visibleMembers.flatMap((m) => m.stocks));
	const grandInvested = $derived(allStocks.reduce((s, a) => s + a.buyPrice * a.quantity, 0));
	const grandCurrent = $derived(allStocks.reduce((s, a) => s + a.currentValue, 0));
	const grandReturns = $derived(allStocks.reduce((s, a) => s + a.returns, 0));
</script>

<div class="space-y-6">
	<div class="flex items-center justify-between">
		<div>
			<h1 class="text-2xl font-bold text-white">Family Stocks</h1>
			<p class="text-gray-400 text-sm mt-1">All family members' NSE/BSE holdings</p>
		</div>
		<button
			onclick={() => {
				showForm = !showForm;
				error = '';
			}}
			class="bg-emerald-500 hover:bg-emerald-400 text-black font-semibold px-4 py-2 rounded-xl transition text-sm"
		>
			{showForm ? '✕ Cancel' : '+ Add My Stock'}
		</button>
	</div>

	{#if familyStocks.length > 0}
		<div class="flex gap-2 flex-wrap">
			<button
				onclick={() => (selectedUID = null)}
				class="px-4 py-2 rounded-xl text-sm font-medium transition border
			{selectedUID === null
					? 'bg-emerald-500 text-black border-emerald-500'
					: 'bg-gray-900 text-gray-400 border-gray-700 hover:border-gray-500 hover:text-white'}"
			>
				All Members
			</button>
			{#each familyStocks as member}
				<button
					onclick={() => (selectedUID = member.uid)}
					class="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition border
			{selectedUID === member.uid
						? 'bg-emerald-500 text-black border-emerald-500'
						: 'bg-gray-900 text-gray-400 border-gray-700 hover:border-gray-500 hover:text-white'}"
				>
					{member.memberName}
					<span class="opacity-60 text-xs">{member.stocks.length}</span>
				</button>
			{/each}
		</div>
	{/if}

	{#if showForm}
		<div class="bg-gray-900 border border-gray-800 rounded-xl p-6">
			<h2 class="text-white font-semibold mb-4">Add Stock to My Holdings</h2>
			<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
				<div>
					<label for="sym" class="text-gray-400 text-xs mb-1 block">Symbol (NSE)</label>
					<input
						id="sym"
						bind:value={form.symbol}
						placeholder="e.g. RELIANCE"
						onblur={validateSymbol}
						class="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-emerald-500"
					/>
				</div>
				<div>
					<label for="sname" class="text-gray-400 text-xs mb-1 block">Company Name</label>
					<input
						id="sname"
						bind:value={form.name}
						placeholder="e.g. Reliance Industries"
						class="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-emerald-500"
					/>
				</div>
				<div>
					<label for="sqty" class="text-gray-400 text-xs mb-1 block">Quantity</label>
					<input
						id="sqty"
						bind:value={form.quantity}
						type="number"
						min="1"
						placeholder="e.g. 10"
						class="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-emerald-500"
					/>
				</div>
				<div>
					<label for="sprice" class="text-gray-400 text-xs mb-1 block">Buy Price (₹)</label>
					<input
						id="sprice"
						bind:value={form.buyPrice}
						type="number"
						min="0"
						placeholder="e.g. 2450"
						class="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-emerald-500"
					/>
				</div>
				<div>
					<label for="sdate" class="text-gray-400 text-xs mb-1 block">Buy Date</label>
					<input
						id="sdate"
						bind:value={form.buyDate}
						type="date"
						class="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-emerald-500"
					/>
				</div>
			</div>
			{#if error}<p class="text-red-400 text-sm mt-3">{error}</p>{/if}
			<button
				onclick={handleAdd}
				disabled={submitting}
				class="mt-4 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-black font-semibold px-6 py-2 rounded-xl transition text-sm"
			>
				{submitting ? 'Adding...' : 'Add Stock'}
			</button>
		</div>
	{/if}

	{#if familyLoading}
		<div class="flex justify-center py-20">
			<div
				class="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"
			></div>
		</div>
	{:else if visibleMembers.length > 0}
		{#if allStocks.length > 0}
			<div class="grid grid-cols-3 gap-4">
				<div class="bg-gray-900 border border-gray-800 rounded-xl px-5 py-4">
					<p class="text-gray-400 text-xs mb-1">Total Invested</p>
					<p class="text-white font-bold text-lg">{formatINR(grandInvested)}</p>
				</div>
				<div class="bg-gray-900 border border-gray-800 rounded-xl px-5 py-4">
					<p class="text-gray-400 text-xs mb-1">Current Value</p>
					<p class="text-white font-bold text-lg">{formatINR(grandCurrent)}</p>
				</div>
				<div class="bg-gray-900 border border-gray-800 rounded-xl px-5 py-4">
					<p class="text-gray-400 text-xs mb-1">Total Returns</p>
					<p class="font-bold text-lg {grandReturns >= 0 ? 'text-emerald-400' : 'text-red-400'}">
						{grandReturns >= 0 ? '+' : ''}{formatINR(grandReturns)}
					</p>
				</div>
			</div>
		{/if}

		{#each visibleMembers as member}
			<div class="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
				<div class="px-6 py-4 border-b border-gray-800 flex items-center justify-between">
					<div class="flex items-center gap-3">
						<div
							class="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center text-black text-xs font-bold"
						>
							{member.memberName[0].toUpperCase()}
						</div>
						<h2 class="font-semibold text-white">{member.memberName}</h2>
						<span class="text-gray-500 text-xs"
							>{member.stocks.length} holding{member.stocks.length !== 1 ? 's' : ''}</span
						>
					</div>
				</div>
				{#if member.stocks.length === 0}
					<div class="px-6 py-8 text-center text-gray-500 text-sm">No stocks added yet</div>
				{:else}
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
									{#if member.uid === myUID}<th class="px-6 py-3"></th>{/if}
								</tr>
							</thead>
							<tbody>
								{#each member.stocks as stock}
									<tr class="border-b border-gray-800 hover:bg-gray-800/50 transition">
										<td class="px-6 py-4">
											<div class="font-medium text-white">{stock.name}</div>
											<div class="text-gray-500 text-xs">{stock.symbol}</div>
										</td>
										<td class="px-6 py-4 text-right text-gray-300">{stock.quantity}</td>
										<td class="px-6 py-4 text-right text-gray-300">{formatINR(stock.buyPrice)}</td>
										<td class="px-6 py-4 text-right text-gray-300"
											>{formatINR(stock.buyPrice * stock.quantity)}</td
										>
										<td class="px-6 py-4 text-right text-white font-medium"
											>{formatINR(stock.currentValue)}</td
										>
										<td
											class="px-6 py-4 text-right font-medium {stock.returnsPc >= 0
												? 'text-emerald-400'
												: 'text-red-400'}"
										>
											{stock.returnsPc >= 0 ? '+' : ''}{stock.returnsPc.toFixed(2)}%
										</td>
										{#if member.uid === myUID}
											<td class="px-6 py-4 text-right">
												<button
													onclick={() => handleDelete(stock.id)}
													class="text-gray-600 hover:text-red-400 transition text-xs">✕</button
												>
											</td>
										{/if}
									</tr>
								{/each}
							</tbody>
						</table>
					</div>
				{/if}
			</div>
		{/each}
	{:else}
		<div class="text-center py-20 bg-gray-900 border border-gray-800 rounded-xl">
			<p class="text-white font-medium">No stocks added yet</p>
			<p class="text-gray-500 text-sm mt-1">Add your NSE/BSE holdings to track performance</p>
			<button
				onclick={() => (showForm = true)}
				class="mt-4 bg-emerald-500 hover:bg-emerald-400 text-black font-semibold px-6 py-3 rounded-xl transition text-sm"
			>
				+ Add your first stock
			</button>
		</div>
	{/if}
</div>
