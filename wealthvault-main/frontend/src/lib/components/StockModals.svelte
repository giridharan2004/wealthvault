<script lang="ts">
	let {
		showAddModal = $bindable(false),
		showSellModal = $bindable(false),
		showRateModal = $bindable(false),
		showTargetsPanel = $bindable(false),
		isBuyMore = $bindable(false),
		selectedStock = $bindable<any>(null),
		sellQty = $bindable(0),
		sellRate = $bindable(0),
		sellDate = $bindable(''),
		newRate = $bindable(0),
		form = $bindable<any>({}),
		targetStocks,
		isOwnStocks,
		onAddStock,
		onSell,
		onRateUpdate,
		onSellFromTargets,
		formatINR,
		plClass,
		statusClass
	}: {
		showAddModal: boolean;
		showSellModal: boolean;
		showRateModal: boolean;
		showTargetsPanel: boolean;
		isBuyMore: boolean;
		selectedStock: any;
		sellQty: number;
		sellRate: number;
		sellDate: string;
		newRate: number;
		form: any;
		targetStocks: any[];
		isOwnStocks: boolean;
		onAddStock: () => void;
		onSell: () => void;
		onRateUpdate: () => void;
		onSellFromTargets: (stock: any) => void;
		formatINR: (v: number) => string;
		plClass: (v: number) => string;
		statusClass: (s: string) => string;
	} = $props();
</script>

<!-- Add / Buy More Modal -->
{#if showAddModal}
	<div class="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
		<div class="bg-[#1a1a1a] border border-white/10 rounded-2xl p-5 w-full max-w-md shadow-2xl">
			<h2 class="text-white font-bold text-base mb-4">
				{isBuyMore ? `+ Buy More â€” ${form.shareName}` : 'Add New Stock'}
			</h2>
			<div class="space-y-3">
				<div class="grid grid-cols-2 gap-3">
					<div>
						<p class="text-white/40 text-xs block mb-1">Serial No</p>
						<input
							type="number"
							bind:value={form.no}
							class="w-full bg-[#111] border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:border-emerald-500 outline-none"
						/>
					</div>
					<div>
						<p class="text-white/40 text-xs block mb-1">Buy Date</p>
						<input
							type="date"
							bind:value={form.buyDate}
							class="w-full bg-[#111] border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:border-emerald-500 outline-none"
						/>
					</div>
				</div>
				<div>
					<p class="text-white/40 text-xs block mb-1">Share Name</p>
					<input
						type="text"
						bind:value={form.shareName}
						placeholder="Tata Consultancy Services"
						disabled={isBuyMore}
						class="w-full bg-[#111] border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:border-emerald-500 outline-none disabled:opacity-40"
					/>
				</div>
				<div>
					<p class="text-white/40 text-xs block mb-1">NSE Symbol</p>
					<input
						type="text"
						bind:value={form.shortName}
						placeholder="TCS"
						disabled={isBuyMore}
						class="w-full bg-[#111] border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:border-emerald-500 outline-none disabled:opacity-40"
					/>
					<p class="text-white/25 text-xs mt-1">Used to auto-fetch live NSE prices</p>
				</div>
				<div class="grid grid-cols-2 gap-3">
					<div>
						<p class="text-white/40 text-xs block mb-1">Buy Qty</p>
						<input
							type="number"
							bind:value={form.buyQty}
							class="w-full bg-[#111] border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:border-emerald-500 outline-none"
						/>
					</div>
					<div>
						<p class="text-white/40 text-xs block mb-1">Buy Price (â‚¹)</p>
						<input
							type="number"
							bind:value={form.buyAmt}
							class="w-full bg-[#111] border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:border-emerald-500 outline-none"
						/>
					</div>
				</div>
				<div>
					<p class="text-white/40 text-xs block mb-1">Today's Rate (optional â€” will auto-fetch)</p>
					>
					<input
						type="number"
						bind:value={form.todaysRate}
						class="w-full bg-[#111] border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:border-emerald-500 outline-none"
					/>
				</div>
				{#if form.buyQty && form.buyAmt}
					<div class="bg-white/5 border border-white/8 rounded-xl p-3 text-xs space-y-1.5">
						<div class="flex justify-between">
							<span class="text-white/40">Invested Val</span>
							<span class="text-white font-medium">{formatINR(form.buyQty * form.buyAmt)}</span>
						</div>
						<div class="flex justify-between">
							<span class="text-white/40">Stop Loss (90%)</span>
							<span class="text-red-400">{formatINR(form.buyQty * form.buyAmt * 0.9)}</span>
						</div>
						<div class="flex justify-between">
							<span class="text-white/40">Target +10%</span>
							<span class="text-blue-400">{formatINR(form.buyQty * form.buyAmt * 1.1)}</span>
						</div>
					</div>
				{/if}
			</div>
			<div class="flex gap-3 mt-4">
				<button
					onclick={() => {
						showAddModal = false;
						isBuyMore = false;
					}}
					class="flex-1 bg-white/8 hover:bg-white/12 text-white/70 py-2 rounded-xl transition text-sm font-medium"
				>
					Cancel
				</button>
				<button
					onclick={onAddStock}
					class="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold py-2 rounded-xl transition text-sm"
				>
					{isBuyMore ? 'Buy More' : 'Add Stock'}
				</button>
			</div>
		</div>
	</div>
{/if}

<!-- Sell Modal -->
{#if showSellModal && selectedStock}
	<div class="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
		<div class="bg-[#1a1a1a] border border-white/10 rounded-2xl p-5 w-full max-w-md shadow-2xl">
			<h2 class="text-white font-bold text-base mb-4">Sell Stock</h2>
			<div class="space-y-3">
				<div class="grid grid-cols-2 gap-3">
					<div>
						<p class="text-white/40 text-xs block mb-1">Share Name</p>
						<div
							class="w-full bg-[#111] border border-white/10 rounded-xl px-3 py-2 text-white/70 text-sm"
						>
							{selectedStock.shareName}
						</div>
					</div>
					<div>
						<p class="text-white/40 text-xs block mb-1">NSE Symbol</p>
						<div
							class="w-full bg-[#111] border border-white/10 rounded-xl px-3 py-2 text-white/70 text-sm"
						>
							{selectedStock.shortName}
						</div>
					</div>
				</div>
				<div class="grid grid-cols-2 gap-3">
					<div>
						<p class="text-white/40 text-xs block mb-1">Qty Held</p>
						<div
							class="w-full bg-[#111] border border-white/10 rounded-xl px-3 py-2 text-white/70 text-sm"
						>
							{selectedStock.qtyHeld}
						</div>
					</div>
					<div>
						<p class="text-white/40 text-xs block mb-1">Sell Frequency</p>
						<div
							class="w-full bg-[#111] border border-white/10 rounded-xl px-3 py-2 text-white/70 text-sm"
						>
							{selectedStock.soldFrequency}x
						</div>
					</div>
				</div>
				<div class="grid grid-cols-2 gap-3">
					<div>
						<p class="text-white/40 text-xs block mb-1">Sell Rate (â‚¹) <span class="text-emerald-400">editable</span></p>
						>
						<input
							type="number"
							bind:value={sellRate}
							class="w-full bg-[#111] border border-white/10 rounded-xl px-3 py-2 text-blue-400 text-sm focus:border-emerald-500 outline-none"
						/>
					</div>
					<div>
						<p class="text-white/40 text-xs block mb-1">Sell Date</p>
						<input
							type="date"
							bind:value={sellDate}
							class="w-full bg-[#111] border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:border-emerald-500 outline-none"
						/>
					</div>
				</div>
				<div>
					<p class="text-white/40 text-xs block mb-1">Qty to Sell (max {selectedStock.qtyHeld})</p>
					>
					<input
						type="number"
						bind:value={sellQty}
						max={selectedStock.qtyHeld}
						min="1"
						class="w-full bg-[#111] border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:border-emerald-500 outline-none"
					/>
					<button
						onclick={() => (sellQty = selectedStock.qtyHeld)}
						class="text-xs text-emerald-400 hover:text-emerald-300 mt-1 font-medium"
					>
						Sell all {selectedStock.qtyHeld} held
					</button>
				</div>
				{#if sellQty > 0}
					<div class="bg-white/5 border border-white/8 rounded-xl p-3 text-xs space-y-1.5">
						<div class="flex justify-between">
							<span class="text-white/40">Selling Value</span>
							<span class="text-white font-medium">{formatINR(sellQty * sellRate)}</span>
						</div>
						<div class="flex justify-between">
							<span class="text-white/40">Current P&L%</span>
							<span class="{plClass(selectedStock.plPercent)} font-medium"
								>{selectedStock.plPercent?.toFixed(2)}%</span
							>
						</div>
						<div class="flex justify-between">
							<span class="text-white/40">Target</span>
							<span class="text-blue-400 font-medium">{formatINR(selectedStock.target)}</span>
						</div>
						<div class="flex justify-between border-t border-white/8 pt-1.5 mt-1.5">
							<span class="text-white/40">Remaining after sell</span>
							<span
								class="{selectedStock.qtyHeld - sellQty < 0
									? 'text-red-400'
									: 'text-white'} font-medium"
							>
								{selectedStock.qtyHeld - sellQty}
							</span>
						</div>
					</div>
				{/if}
			</div>
			<div class="flex gap-3 mt-4">
				<button
					onclick={() => {
						showSellModal = false;
						sellQty = 0;
					}}
					class="flex-1 bg-white/8 hover:bg-white/12 text-white/70 py-2 rounded-xl transition text-sm font-medium"
				>
					Cancel
				</button>
				<button
					onclick={onSell}
					disabled={sellQty <= 0 || sellQty > selectedStock.qtyHeld}
					class="flex-1 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold py-2 rounded-xl transition text-sm"
				>
					Confirm Sell
				</button>
			</div>
		</div>
	</div>
{/if}

<!-- Rate Update Modal -->
{#if showRateModal && selectedStock}
	<div class="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
		<div class="bg-[#1a1a1a] border border-white/10 rounded-2xl p-5 w-full max-w-sm shadow-2xl">
			<h2 class="text-white font-bold text-base mb-1">Update Rate</h2>
			<p class="text-white/40 text-sm mb-4">{selectedStock.shareName}</p>
			<p class="text-white/40 text-xs block mb-1">Today's Rate (â‚¹)</p>
			<input
				type="number"
				bind:value={newRate}
				class="w-full bg-[#111] border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:border-emerald-500 outline-none mb-4"
			/>
			<div class="flex gap-3">
				<button
					onclick={() => {
						showRateModal = false;
						newRate = 0;
					}}
					class="flex-1 bg-white/8 hover:bg-white/12 text-white/70 py-2 rounded-xl transition text-sm font-medium"
				>
					Cancel
				</button>
				<button
					onclick={onRateUpdate}
					class="flex-1 bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 rounded-xl transition text-sm"
				>
					Update Rate
				</button>
			</div>
		</div>
	</div>
{/if}

<!-- Targets Hit Panel -->
{#if showTargetsPanel}
	<div
		class="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-start justify-center z-50 p-4 pt-10 overflow-y-auto"
	>
		<div class="bg-[#1a1a1a] border border-white/10 rounded-2xl w-full max-w-5xl shadow-xl">
			<div class="flex items-center justify-between px-5 py-4 border-b border-white/8">
				<div>
					<h2 class="text-white font-bold text-base">ðŸ† Stocks with P&L â‰¥ 10%</h2>
					<p class="text-white/40 text-xs">
						{targetStocks.length} stock{targetStocks.length !== 1 ? 's' : ''} at or above target
					</p>
				</div>
				<button
					onclick={() => (showTargetsPanel = false)}
					class="text-white/30 hover:text-white text-xl px-2">âœ•</button
				>
			</div>
			<div class="overflow-x-auto p-4">
				<table class="w-full text-xs">
					<thead>
						<tr class="text-white/40 border-b border-white/8">
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
							<tr class="border-b border-white/5 hover:bg-white/3 transition">
								<td class="px-3 py-3">
									<div class="font-semibold text-white">{stock.shareName}</div>
									<div class="text-white/40">{stock.shortName}</div>
								</td>
								<td class="px-3 py-3 text-right text-white/60">{formatINR(stock.investedVal)}</td>
								<td class="px-3 py-3 text-right text-white font-medium"
									>{formatINR(stock.currentVal)}</td
								>
								<td class="px-3 py-3 text-right font-bold text-emerald-400"
									>{stock.plPercent?.toFixed(2)}%</td
								>
								<td class="px-3 py-3 text-right text-emerald-400">{formatINR(stock.diffPL)}</td>
								<td class="px-3 py-3 text-right text-blue-400">{formatINR(stock.todaysRate)}</td>
								<td class="px-3 py-3 text-right text-blue-400">{formatINR(stock.target)}</td>
								<td class="px-3 py-3 text-center">
									<span class="px-2 py-1 rounded-full text-xs {statusClass(stock.status)}"
										>{stock.status}</span
									>
								</td>
								<td class="px-3 py-3 text-right text-white/60">{stock.qtyHeld}</td>
								{#if isOwnStocks}
									<td class="px-3 py-3 text-center">
										<button
											onclick={() => onSellFromTargets(stock)}
											class="text-xs bg-emerald-500 hover:bg-emerald-600 text-white px-3 py-1 rounded-lg transition font-semibold"
										>
											Sell Now
										</button>
									</td>
								{/if}
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
			<div class="px-5 py-4 border-t border-white/8 rounded-b-2xl flex gap-8 flex-wrap">
				<div>
					<p class="text-white/40 text-xs">Total Invested</p>
					<p class="text-white font-bold">
						{formatINR(targetStocks.reduce((s, x) => s + x.investedVal, 0))}
					</p>
				</div>
				<div>
					<p class="text-white/40 text-xs">Total Current</p>
					<p class="text-white font-bold">
						{formatINR(targetStocks.reduce((s, x) => s + x.currentVal, 0))}
					</p>
				</div>
				<div>
					<p class="text-white/40 text-xs">Total Gain</p>
					<p class="text-emerald-400 font-bold">
						{formatINR(targetStocks.reduce((s, x) => s + x.diffPL, 0))}
					</p>
				</div>
				<div>
					<p class="text-white/40 text-xs">Avg P&L%</p>
					<p class="text-emerald-400 font-bold">
						{(targetStocks.reduce((s, x) => s + x.plPercent, 0) / targetStocks.length).toFixed(2)}%
					</p>
				</div>
			</div>
		</div>
	</div>
{/if}



