<script lang="ts">
  import * as XLSX from 'xlsx';
  import { addStock } from '$lib/stores/stocks';

  let importing = $state(false);
  let importError = $state('');
  let importSuccess = $state('');
  let showPreview = $state(false);
  let previewData = $state<any[]>([]);

  function toNumber(value: unknown): number {
    const parsed = Number(String(value ?? '').replace(/,/g, '').trim());
    return Number.isFinite(parsed) ? parsed : 0;
  }

  function toText(value: unknown): string {
    return String(value ?? '').trim();
  }

  function toDate(value: unknown): string {
    if (value instanceof Date) return value.toISOString().split('T')[0];
    return toText(value).substring(0, 10);
  }

  function isReleased(value: unknown): boolean {
    const text = toText(value).toLowerCase();
    return ['yes', 'y', 'true', '1', 'released', 'done', 'paid'].includes(text);
  }

  function formatINR(val: number): string {
    if (!val) return '₹0';
    return new Intl.NumberFormat('en-IN', {
      style: 'currency', currency: 'INR', maximumFractionDigits: 0
    }).format(val);
  }

  function handleFile(e: Event) {
    importError = '';
    importSuccess = '';
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = new Uint8Array(ev.target?.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: 'array', cellDates: true });
        const buySheet = wb.Sheets['BUY'] || wb.Sheets[wb.SheetNames[0]];
        const sellSheet = wb.Sheets['SELL'];
        const buyRows: any[] = XLSX.utils.sheet_to_json(buySheet, { raw: false, dateNF: 'yyyy-mm-dd' });
        const sellRows: any[] = sellSheet
          ? XLSX.utils.sheet_to_json(sellSheet, { raw: false, dateNF: 'yyyy-mm-dd' })
          : [];

        // Group by stock No and merge buy/sell entries from the workbook.
        const grouped: Record<string, any> = {};
        for (const row of buyRows) {
          const no = toText(row['No']);
          if (!no || Number.isNaN(Number(no))) continue;

          const qty = toNumber(row['Buy qty'] ?? row['Buy Qty']);
          const rate = toNumber(row['Buy Rate'] ?? row['Buy Amt']);
          const date = toDate(row['Buy Date']);

          if (!grouped[no]) {
            grouped[no] = {
              no: Number(no),
              shareName: toText(row['Share Name']),
              shortName: toText(row['Short Name']),
              totalQty: 0,
              totalCost: 0,
              buyDate: date,
              soldQty: 0,
              soldFrequency: 0,
              soldDate: '',
              releaseStatus: false,
            };
          }
          grouped[no].totalQty += qty;
          grouped[no].totalCost += qty * rate;
          if (date && (!grouped[no].buyDate || date < grouped[no].buyDate)) grouped[no].buyDate = date;
        }

        for (const row of sellRows) {
          const no = toText(row['No']);
          if (!no || Number.isNaN(Number(no))) continue;

          if (!grouped[no]) {
            grouped[no] = {
              no: Number(no),
              shareName: toText(row['Share Name']),
              shortName: toText(row['Short Name']),
              totalQty: 0,
              totalCost: 0,
              buyDate: '',
              soldQty: 0,
              soldFrequency: 0,
              soldDate: '',
              releaseStatus: false,
            };
          }

          const sellQty = toNumber(row['Sell Qty'] ?? row['Sell qty']);
          const sellDate = toDate(row['Sell Date']);
          grouped[no].soldQty += sellQty;
          if (sellQty > 0) grouped[no].soldFrequency += 1;
          if (sellDate && sellDate > grouped[no].soldDate) grouped[no].soldDate = sellDate;
          grouped[no].releaseStatus =
            grouped[no].releaseStatus || isReleased(row['Relase Status'] ?? row['Release Status']);
        }

        previewData = Object.values(grouped)
          .filter((g: any) => g.totalQty > 0)
          .map((g: any) => ({
            no: g.no,
            shareName: g.shareName,
            shortName: g.shortName,
            buyQty: Math.round(g.totalQty),
            buyAmt: parseFloat((g.totalCost / g.totalQty).toFixed(2)),
            buyDate: g.buyDate,
            todaysRate: 0,
            investedVal: parseFloat(g.totalCost.toFixed(2)),
            soldQty: Math.round(g.soldQty),
            soldFrequency: g.soldFrequency,
            soldDate: g.soldDate,
            releaseStatus: g.releaseStatus,
          }))
          .sort((a, b) => a.no - b.no);

        showPreview = true;
      } catch (err: any) {
        importError = 'Could not read file: ' + err.message;
      }
    };
    reader.readAsArrayBuffer(file);
    input.value = '';
  }

  async function confirmImport() {
    importing = true;
    importError = '';
    try {
      for (const stock of previewData) {
        await addStock(stock);
      }
      importSuccess = `${previewData.length} stocks imported successfully!`;
      showPreview = false;
      previewData = [];
    } catch (err: any) {
      importError = 'Import failed: ' + err.message;
    } finally {
      importing = false;
    }
  }

  function cancelImport() {
    showPreview = false;
    previewData = [];
    importError = '';
  }
</script>

<!-- Import Button -->
<label class="bg-blue-600 hover:bg-blue-500 text-white font-semibold px-4 py-2 rounded-xl transition cursor-pointer text-sm">
  📥 Import Excel
  <input type="file" accept=".xlsx,.xls" onchange={handleFile} class="hidden"/>
</label>

<!-- Success Message -->
{#if importSuccess}
  <div class="fixed top-4 right-4 z-50 bg-emerald-800 border border-emerald-600 text-emerald-200 px-5 py-3 rounded-xl text-sm shadow-lg">
    ✓ {importSuccess}
    <button onclick={() => importSuccess = ''} class="ml-3 text-emerald-400 hover:text-white">✕</button>
  </div>
{/if}

<!-- Error Message -->
{#if importError}
  <div class="fixed top-4 right-4 z-50 bg-red-900 border border-red-700 text-red-200 px-5 py-3 rounded-xl text-sm shadow-lg">
    ✕ {importError}
    <button onclick={() => importError = ''} class="ml-3 hover:text-white">✕</button>
  </div>
{/if}

<!-- Preview Modal -->
{#if showPreview}
  <div class="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
    <div class="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-6xl max-h-[85vh] flex flex-col">

      <!-- Modal Header -->
      <div class="px-6 py-4 border-b border-gray-800 flex items-center justify-between">
        <div>
          <h2 class="text-white font-bold text-lg">Preview Import</h2>
          <p class="text-gray-400 text-xs mt-0.5">{previewData.length} stocks found - buys and sells merged from the workbook</p>
        </div>
        <button onclick={cancelImport} class="text-gray-500 hover:text-white text-xl">✕</button>
      </div>

      <!-- Preview Table -->
      <div class="overflow-auto flex-1 px-2">
        <table class="w-full text-xs mt-2">
          <thead class="sticky top-0 bg-gray-900">
            <tr class="text-gray-400 border-b border-gray-800">
              <th class="text-left px-3 py-2">No</th>
              <th class="text-left px-3 py-2">Share Name</th>
              <th class="text-left px-3 py-2">Symbol</th>
              <th class="text-right px-3 py-2">Bought</th>
              <th class="text-right px-3 py-2">Sold</th>
              <th class="text-right px-3 py-2">Held</th>
              <th class="text-right px-3 py-2">Avg Rate</th>
              <th class="text-right px-3 py-2">Invested</th>
              <th class="text-left px-3 py-2">First Buy</th>
              <th class="text-left px-3 py-2">Last Sell</th>
              <th class="text-center px-3 py-2">Released</th>
            </tr>
          </thead>
          <tbody>
            {#each previewData as stock}
              <tr class="border-b border-gray-800 hover:bg-gray-800/50">
                <td class="px-3 py-2 text-gray-400">{stock.no}</td>
                <td class="px-3 py-2 text-white">{stock.shareName}</td>
                <td class="px-3 py-2 text-emerald-400 font-mono">{stock.shortName}</td>
                <td class="px-3 py-2 text-right text-gray-300">{stock.buyQty}</td>
                <td class="px-3 py-2 text-right text-gray-300">{stock.soldQty}</td>
                <td class="px-3 py-2 text-right text-white">{stock.buyQty - stock.soldQty}</td>
                <td class="px-3 py-2 text-right text-gray-300">{formatINR(stock.buyAmt)}</td>
                <td class="px-3 py-2 text-right text-white font-medium">{formatINR(stock.investedVal)}</td>
                <td class="px-3 py-2 text-gray-400">{stock.buyDate}</td>
                <td class="px-3 py-2 text-gray-400">{stock.soldDate || '-'}</td>
                <td class="px-3 py-2 text-center text-gray-300">{stock.releaseStatus ? 'Yes' : 'No'}</td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>

      <!-- Modal Footer -->
      <div class="px-6 py-4 border-t border-gray-800 flex items-center justify-between">
        <p class="text-gray-500 text-xs">Today's rate will be set to ₹0 - update after import by clicking on each rate</p>
        <div class="flex gap-3">
          <button onclick={cancelImport}
            class="bg-gray-700 hover:bg-gray-600 text-white px-5 py-2 rounded-xl transition text-sm">
            Cancel
          </button>
          <button onclick={confirmImport} disabled={importing}
            class="bg-emerald-500 hover:bg-emerald-400 text-black font-semibold px-6 py-2 rounded-xl transition text-sm disabled:opacity-50">
            {importing ? 'Importing...' : 'Confirm Import'}
          </button>
        </div>
      </div>

    </div>
  </div>
{/if}
