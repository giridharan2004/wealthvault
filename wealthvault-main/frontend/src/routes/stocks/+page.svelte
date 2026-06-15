<script lang="ts">
	import { onMount } from 'svelte';
	import { user } from '$lib/stores/auth';
	import {
		stocks,
		stocksLoading,
		loadStocks,
		addStock,
		updateStock,
		sellStock,
		deleteStock,
		calculateStock
	} from '$lib/stores/stocks';
	import { family, familyMembers, loadFamily } from '$lib/stores/family';

	let showAddModal = false;
	let showSellModal = false;
	let showRateModal = false;
	let selectedStock: any = null;
	let selectedMemberUid = '';
	let sellQty = 0;
	let newRate = 0;
	let activeTab = 'my'; // 'my' | member uid

	// Add form
	let form = {
		no: 0,
		shareName: '',
		shortName: '',
		buyQty: 0,
		buyAmt: 0,
		buyDate: '',
		todaysRate: 0
	};

	onMount(async () => {
		await loadFamily();
		await loadStocks();
	});

	async function handleAddStock() {
		if (!form.shareName || !form.buyQty || !form.buyAmt) return;
		await addStock({ ...form });
		showAddModal = false;
		form = {
			no: 0,
			shareName: '',
			shortName: '',
			buyQty: 0,
			buyAmt: 0,
			buyDate: '',
			todaysRate: 0
		};
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

	async function handleMemberSwitch(uid: string) {
		activeTab = uid;
		await loadStocks(uid === 'my' ? undefined : uid);
	}

	function formatINR(val: number): string {
		if (!val) return '₹0';
		return new Intl.NumberFormat('en-IN', {
			style: 'currency',
			currency: 'INR',
			maximumFractionDigits: 0
		}).format(val);
	}

	function statusColor(status: string): string {
		if (status === 'Sell now') return 'text-green-400 font-bold';
		if (status === 'Stop loss') return 'text-red-400 font-bold';
		return 'text-yellow-400';
	}

	function plColor(val: number): string {
		return val >= 0 ? 'text-green-400' : 'text-red-400';
	}

	// Summary totals
	$: totalInvested = $stocks.reduce((s, x) => s + (x.investedVal || 0), 0);
	$: totalCurrent = $stocks.reduce((s, x) => s + (x.currentVal || 0), 0);
	$: totalPL = totalCurrent - totalInvested;
	$: totalPLPc = totalInvested > 0 ? (totalPL / totalInvested) * 100 : 0;
</script>

<div class="space-y-6">
	<!-- Header -->
	<div class="flex items-center justify-between">
		<div>
			<h1 class="text-2xl font-bold text-white">Stock Portfolio</h1>
			<p class="text-gray-400 text-sm mt-1">Family tracker — NSE/BSE</p>
		</div>
		<button
			on:click={() => (showAddModal = true)}
			class="bg-emerald-500 hover:bg-emerald-400 text-black font-semibold px-5 py-2 rounded-xl transition"
		>
			+ Add Stock
		</button>
	</div>

	<!-- Family Member Tabs -->
	{#if $familyMembers.length > 1}
		<div class="flex gap-2 overflow-x-auto pb-1">
			<button
				on:click={() => handleMemberSwitch('my')}
				class="px-4 py-2 rounded-lg text-sm font-medium transition whitespace-nowrap
          {activeTab === 'my'
					? 'bg-emerald-500 text-black'
					: 'bg-gray-800 text-gray-300 hover:bg-gray-700'}"
			>
				My Stocks
			</button>
			{#each $familyMembers as member}
				{#if member.uid !== $user?.uid}
					<button
						on:click={() => handleMemberSwitch(member.uid)}
						class="px-4 py-2 rounded-lg text-sm font-medium transition whitespace-nowrap
              {activeTab === member.uid
							? 'bg-emerald-500 text-black'
							: 'bg-gray-800 text-gray-300 hover:bg-gray-700'}"
					>
						{member.name}
					</button>
				{/if}
			{/each}
		</div>
	{/if}

	<!-- Summary Cards -->
	<div class="grid grid-cols-2 md:grid-cols-4 gap-4">
		<div class="bg-gray-900 border border-gray-800 rounded-xl p-4">
			<p class="text-gray-400 text-xs">Total Invested</p>
			<p class="text-white font-bold text-lg mt-1">{formatINR(totalInvested)}</p>
		</div>
		<div class="bg-gray-900 border border-gray-800 rounded-xl p-4">
			<p class="text-gray-400 text-xs">Current Value</p>
			<p class="text-white font-bold text-lg mt-1">{formatINR(totalCurrent)}</p>
		</div>
		<div class="bg-gray-900 border border-gray-800 rounded-xl p-4">
			<p class="text-gray-400 text-xs">Total P&L</p>
			<p class="font-bold text-lg mt-1 {plColor(totalPL)}">{formatINR(totalPL)}</p>
		</div>
		<div class="bg-gray-900 border border-gray-800 rounded-xl p-4">
			<p class="text-gray-400 text-xs">Returns</p>
			<p class="font-bold text-lg mt-1 {plColor(totalPLPc)}">{totalPLPc.toFixed(2)}%</p>
		</div>
	</div>

	<!-- Stocks Table -->
	<div class="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
		{#if $stocksLoading}
			<div class="flex items-center justify-center py-20">
				<div
					class="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"
				></div>
			</div>
		{:else if $stocks.length === 0}
			<div class="text-center py-20">
				<p class="text-gray-400">No stocks added yet</p>
				<button
					on:click={() => (showAddModal = true)}
					class="mt-4 bg-emerald-500 hover:bg-emerald-400 text-black font-semibold px-6 py-2 rounded-xl transition"
				>
					+ Add First Stock
				</button>
			</div>
		{:else}
			<div class="overflow-x-auto">
				<table class="w-full text-xs">
					<thead>
						<tr class="text-gray-400 border-b border-gray-800 bg-gray-800/50">
							<th class="text-left px-3 py-3">No</th>
							<th class="text-left px-3 py-3">Share</th>
							<th class="text-right px-3 py-3">Buy Qty</th>
							<th class="text-right px-3 py-3">Buy Amt</th>
							<th class="text-right px-3 py-3">Invested</th>
							<th class="text-right px-3 py-3">Qty Held</th>
							<th class="text-right px-3 py-3">Today Rate</th>
							<th class="text-right px-3 py-3">Current Val</th>
							<th class="text-right px-3 py-3">P&L%</th>
							<th class="text-right px-3 py-3">Stop Loss</th>
							<th class="text-right px-3 py-3">Target</th>
							<th class="text-center px-3 py-3">Status</th>
							<th class="text-right px-3 py-3">Diff P&L</th>
							<th class="text-right px-3 py-3">Qty/Sell</th>
							<th class="text-right px-3 py-3">Sold Qty</th>
							<th class="text-right px-3 py-3">Sold Freq</th>
							<th class="text-center px-3 py-3">Released</th>
							<th class="text-center px-3 py-3">Actions</th>
						</tr>
					</thead>
					<tbody>
						{#each $stocks as stock}
							<tr class="border-b border-gray-800 hover:bg-gray-800/50 transition">
								<td class="px-3 py-3 text-gray-400">{stock.no}</td>
								<td class="px-3 py-3">
									<div class="font-medium text-white">{stock.shareName}</div>
									<div class="text-gray-500 text-xs">{stock.shortName}</div>
									<div class="text-gray-600 text-xs">{stock.buyDate}</div>
								</td>
								<td class="px-3 py-3 text-right text-gray-300">{stock.buyQty}</td>
								<td class="px-3 py-3 text-right text-gray-300">{formatINR(stock.buyAmt)}</td>
								<td class="px-3 py-3 text-right text-white">{formatINR(stock.investedVal)}</td>
								<td class="px-3 py-3 text-right text-gray-300">{stock.qtyHeld}</td>
								<td class="px-3 py-3 text-right">
									<button
										on:click={() => {
											selectedStock = stock;
											newRate = stock.todaysRate;
											showRateModal = true;
										}}
										class="text-blue-400 hover:text-blue-300 transition"
									>
										{formatINR(stock.todaysRate)}
									</button>
								</td>
								<td class="px-3 py-3 text-right text-white">{formatINR(stock.currentVal)}</td>
								<td class="px-3 py-3 text-right {plColor(stock.plPercent)}"
									>{stock.plPercent?.toFixed(2)}%</td
								>
								<td class="px-3 py-3 text-right text-red-400">{formatINR(stock.stopLoss)}</td>
								<td class="px-3 py-3 text-right text-blue-400">{formatINR(stock.target)}</td>
								<td class="px-3 py-3 text-center">
									<span class="px-2 py-1 rounded-full text-xs {statusColor(stock.status)}">
										{stock.status}
									</span>
								</td>
								<td class="px-3 py-3 text-right {plColor(stock.diffPL)}"
									>{formatINR(stock.diffPL)}</td
								>
								<td class="px-3 py-3 text-right text-gray-300">{stock.qtyNeedToSell?.toFixed(0)}</td
								>
								<td class="px-3 py-3 text-right text-gray-300">{stock.soldQty || 0}</td>
								<td class="px-3 py-3 text-right text-gray-300">{stock.soldFrequency || 0}x</td>
								<td class="px-3 py-3 text-center">
									<button
										on:click={() => updateStock(stock.id, { releaseStatus: !stock.releaseStatus })}
										class="w-5 h-5 rounded border-2 transition flex items-center justify-center mx-auto
                      {stock.releaseStatus
											? 'bg-emerald-500 border-emerald-500'
											: 'border-gray-600 hover:border-emerald-500'}"
									>
										{#if stock.releaseStatus}
											<svg
												class="w-3 h-3 text-black"
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
								<td class="px-3 py-3 text-center">
									<div class="flex items-center gap-2 justify-center">
										<button
											on:click={() => {
												selectedStock = stock;
												showSellModal = true;
											}}
											class="text-xs bg-green-800 hover:bg-green-700 text-green-200 px-2 py-1 rounded transition"
										>
											Sell
										</button>
										<button
											on:click={() => deleteStock(stock.id)}
											class="text-xs bg-red-900 hover:bg-red-800 text-red-200 px-2 py-1 rounded transition"
										>
											Del
										</button>
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

<!-- Add Stock Modal -->
{#if showAddModal}
	<div class="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
		<div class="bg-gray-900 border border-gray-700 rounded-2xl p-6 w-full max-w-md">
			<h2 class="text-white font-bold text-lg mb-5">Add New Stock</h2>

			<div class="space-y-3">
				<div class="grid grid-cols-2 gap-3">
					<div>
						<label class="text-gray-400 text-xs block mb-1">Serial No</label>
						<input
							type="number"
							bind:value={form.no}
							class="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:border-emerald-500 outline-none"
						/>
					</div>
					<div>
						<label class="text-gray-400 text-xs block mb-1">Buy Date</label>
						<input
							type="date"
							bind:value={form.buyDate}
							class="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:border-emerald-500 outline-none"
						/>
					</div>
				</div>

				<div>
					<label class="text-gray-400 text-xs block mb-1">Share Name</label>
					<input
						type="text"
						bind:value={form.shareName}
						placeholder="Reliance Industries"
						class="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:border-emerald-500 outline-none"
					/>
				</div>

				<div>
					<label class="text-gray-400 text-xs block mb-1">Short Name (NSE Symbol)</label>
					<input
						type="text"
						bind:value={form.shortName}
						placeholder="RELIANCE"
						class="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:border-emerald-500 outline-none"
					/>
				</div>

				<div class="grid grid-cols-2 gap-3">
					<div>
						<label class="text-gray-400 text-xs block mb-1">Buy Qty</label>
						<input
							type="number"
							bind:value={form.buyQty}
							class="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:border-emerald-500 outline-none"
						/>
					</div>
					<div>
						<label class="text-gray-400 text-xs block mb-1">Buy Price (₹)</label>
						<input
							type="number"
							bind:value={form.buyAmt}
							class="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:border-emerald-500 outline-none"
						/>
					</div>
				</div>

				<div>
					<label class="text-gray-400 text-xs block mb-1">Today's Rate (₹)</label>
					<input
						type="number"
						bind:value={form.todaysRate}
						class="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:border-emerald-500 outline-none"
					/>
				</div>

				<!-- Preview calculations -->
				{#if form.buyQty && form.buyAmt}
					<div class="bg-gray-800 rounded-lg p-3 text-xs space-y-1">
						<div class="flex justify-between">
							<span class="text-gray-400">Invested Value</span>
							<span class="text-white">{formatINR(form.buyQty * form.buyAmt)}</span>
						</div>
						<div class="flex justify-between">
							<span class="text-gray-400">Stop Loss (90%)</span>
							<span class="text-red-400">{formatINR(form.buyQty * form.buyAmt * 0.9)}</span>
						</div>
						<div class="flex justify-between">
							<span class="text-gray-400">Target (110%)</span>
							<span class="text-blue-400">{formatINR(form.buyQty * form.buyAmt * 1.1)}</span>
						</div>
					</div>
				{/if}
			</div>

			<div class="flex gap-3 mt-5">
				<button
					on:click={() => (showAddModal = false)}
					class="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-2 rounded-xl transition"
				>
					Cancel
				</button>
				<button
					on:click={handleAddStock}
					class="flex-1 bg-emerald-500 hover:bg-emerald-400 text-black font-semibold py-2 rounded-xl transition"
				>
					Add Stock
				</button>
			</div>
		</div>
	</div>
{/if}

<!-- Sell Modal -->
{#if showSellModal && selectedStock}
	<div class="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
		<div class="bg-gray-900 border border-gray-700 rounded-2xl p-6 w-full max-w-sm">
			<h2 class="text-white font-bold text-lg mb-1">Sell Stock</h2>
			<p class="text-gray-400 text-sm mb-5">{selectedStock.shareName}</p>

			<div class="bg-gray-800 rounded-lg p-3 text-xs space-y-1 mb-4">
				<div class="flex justify-between">
					<span class="text-gray-400">Qty Held</span>
					<span class="text-white">{selectedStock.qtyHeld}</span>
				</div>
				<div class="flex justify-between">
					<span class="text-gray-400">Sell Frequency</span>
					<span class="text-white">{selectedStock.soldFrequency}x</span>
				</div>
				<div class="flex justify-between">
					<span class="text-gray-400">Next Target</span>
					<span class="text-blue-400">{formatINR(selectedStock.target)}</span>
				</div>
			</div>

			<label class="text-gray-400 text-xs block mb-1">Qty to Sell</label>
			<input
				type="number"
				bind:value={sellQty}
				max={selectedStock.qtyHeld}
				class="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:border-emerald-500 outline-none mb-5"
			/>

			<div class="flex gap-3">
				<button
					on:click={() => (showSellModal = false)}
					class="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-2 rounded-xl transition"
				>
					Cancel
				</button>
				<button
					on:click={handleSell}
					class="flex-1 bg-green-600 hover:bg-green-500 text-white font-semibold py-2 rounded-xl transition"
				>
					Confirm Sell
				</button>
			</div>
		</div>
	</div>
{/if}

<!-- Update Rate Modal -->
{#if showRateModal && selectedStock}
	<div class="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
		<div class="bg-gray-900 border border-gray-700 rounded-2xl p-6 w-full max-w-sm">
			<h2 class="text-white font-bold text-lg mb-1">Update Rate</h2>
			<p class="text-gray-400 text-sm mb-5">{selectedStock.shareName}</p>

			<label class="text-gray-400 text-xs block mb-1">Today's Rate (₹)</label>
			<input
				type="number"
				bind:value={newRate}
				class="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:border-emerald-500 outline-none mb-5"
			/>

			<div class="flex gap-3">
				<button
					on:click={() => (showRateModal = false)}
					class="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-2 rounded-xl transition"
				>
					Cancel
				</button>
				<button
					on:click={handleRateUpdate}
					class="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-semibold py-2 rounded-xl transition"
				>
					Update
				</button>
			</div>
		</div>
	</div>
{/if}
