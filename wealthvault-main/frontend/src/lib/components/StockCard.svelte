<script lang="ts">
  const {
    stock,
    isOwnStocks = true,
    expandedRow = null,
    formatINR = (v: number) => '₹' + v,
    plClass = (v: number) => v >= 0 ? 'pos' : 'neg',
    statusClass = () => '',
    viewingUid = '',
    onToggle = (_id: string) => {},
    onBuyMore = (_s: any) => {},
    onSell = (_s: any) => {},
    onDelete = (_s: any) => {},
    onRateClick = (_s: any) => {},
    onReleaseToggle = (_s: any) => {}
  } = $props();

  const expanded = $derived(expandedRow === stock.id);
  const pnl = $derived((stock.currentVal || 0) - (stock.investedVal || 0));
  const isPos = $derived(pnl >= 0);
</script>

<div class="stock-row" class:expanded>
  <button class="compact" onclick={() => onToggle(stock.id)}>
    <div class="left">
      <div class="ticker">
        {stock.shortName || stock.shareName?.split(' ')[0] || ''}
        {#if stock.plPercent >= 10}<span class="trophy">🏆</span>{/if}
        {#if stock.status === 'Stop loss'}<span class="trophy">🛑</span>{/if}
      </div>
      <div class="name">{stock.shareName || ''}</div>
      <div class="shares">{stock.qtyHeld ?? stock.buyQty ?? 0} shares · {stock.buyDate || ''}</div>
    </div>
    <div class="right">
      <div class="price">{formatINR(stock.currentVal || 0)}</div>
      <div class={isPos ? 'change-pos' : 'change-neg'}>
        {isPos ? '+' : ''}{formatINR(pnl)} ({stock.plPercent?.toFixed(2) ?? '0.00'}%)
      </div>
    </div>
    <span class="chevron" class:open={expanded}>&#8964;</span>
  </button>

  {#if expanded}
  <div class="details">
    <div class="detail-grid">
      <div class="detail-item">
        <div class="dl">Invested</div>
        <div class="dv">{formatINR(stock.investedVal || 0)}</div>
      </div>
      <div class="detail-item">
        <div class="dl">Buy Qty</div>
        <div class="dv">{stock.buyQty ?? 0}</div>
      </div>
      <div class="detail-item">
        <div class="dl">Buy Price</div>
        <div class="dv">{formatINR(stock.buyAmt || 0)}</div>
      </div>
      <div class="detail-item">
        <div class="dl">Qty Held</div>
        <div class="dv">{stock.qtyHeld ?? 0}</div>
      </div>
      <div class="detail-item">
        <div class="dl">Today Rate</div>
        {#if isOwnStocks}
          <button class="dv blue rate-btn" onclick={(e) => { e.stopPropagation(); onRateClick(stock); }}>
            {formatINR(stock.todaysRate || 0)}
          </button>
        {:else}
          <div class="dv blue">{formatINR(stock.todaysRate || 0)}</div>
        {/if}
      </div>
      <div class="detail-item">
        <div class="dl">Diff P&L</div>
        <div class="dv {isPos ? 'pos' : 'neg'}">{isPos ? '+' : ''}{formatINR(pnl)}</div>
      </div>
      <div class="detail-item">
        <div class="dl">Stop Loss</div>
        <div class="dv neg">{formatINR(stock.stopLoss || 0)}</div>
      </div>
      <div class="detail-item">
        <div class="dl">Target</div>
        <div class="dv pos">{formatINR(stock.target || 0)}</div>
      </div>
      <div class="detail-item">
        <div class="dl">Qty/Sell</div>
        <div class="dv">{Math.floor(stock.qtyNeedToSell ?? 0)}</div>
      </div>
      <div class="detail-item">
        <div class="dl">Sold Freq</div>
        <div class="dv">{stock.soldFrequency ?? 0}x</div>
      </div>
      <div class="detail-item">
        <div class="dl">Sold Qty</div>
        <div class="dv">{stock.soldQty ?? 0}</div>
      </div>
      <div class="detail-item">
        <div class="dl">Sold Date</div>
        <div class="dv">{stock.soldDate || '—'}</div>
      </div>
    </div>

    <div class="status-row">
      <span class="dl">Status</span>
      <span class="status-badge">{stock.status || 'Hold'}</span>
    </div>
    <div class="released-row">
      <span class="dl">Released</span>
      <button
        class="checkbox-btn"
        class:checked={stock.releaseStatus}
        onclick={(e) => { e.stopPropagation(); onReleaseToggle(stock); }}
        disabled={!isOwnStocks}
      >{#if stock.releaseStatus}✓{/if}</button>
    </div>

    {#if isOwnStocks}
    <div class="action-btns">
      <button class="btn btn-buy" onclick={(e) => { e.stopPropagation(); onBuyMore(stock); }}>+ Buy</button>
      <button class="btn btn-sell" onclick={(e) => { e.stopPropagation(); onSell(stock); }}>Sell</button>
      <button class="btn btn-del" onclick={(e) => { e.stopPropagation(); onDelete(stock); }}>Delete</button>
    </div>
    {/if}
  </div>
  {/if}
</div>

<style>
.stock-row { background: #111; overflow: hidden; transition: background 0.15s; }
.stock-row.expanded { background: #0d0d0d; }
.compact { display: flex; align-items: flex-start; width: 100%; padding: 13px 16px; gap: 10px; cursor: pointer; background: transparent; border: none; text-align: left; }
.left { flex: 1; min-width: 0; }
.ticker { font-size: 14px; font-weight: 600; color: #fff; }
.trophy { font-size: 11px; margin-left: 4px; }
.name { font-size: 12px; color: #666; margin-top: 1px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.shares { font-size: 11px; color: #444; margin-top: 2px; }
.right { text-align: right; flex-shrink: 0; }
.price { font-size: 14px; font-weight: 600; color: #fff; }
.change-pos { font-size: 11px; color: #22c55e; margin-top: 2px; }
.change-neg { font-size: 11px; color: #ef4444; margin-top: 2px; }
.chevron { font-size: 14px; color: #444; align-self: center; margin-left: 6px; transition: transform 0.2s; display: inline-block; flex-shrink: 0; }
.chevron.open { transform: rotate(180deg); color: #888; }
.details { padding: 0 16px 14px; background: #161616; border-top: 0.5px solid #222; }
.detail-grid { display: grid; grid-template-columns: 1fr 1fr; }
.detail-item { padding: 8px 0; border-bottom: 0.5px solid #222; }
.detail-item:nth-last-child(-n+2) { border-bottom: none; }
.dl { font-size: 10px; color: #555; margin-bottom: 3px; text-transform: uppercase; letter-spacing: 0.4px; }
.dv { font-size: 13px; color: #bbb; font-weight: 500; }
.dv.pos { color: #22c55e; }
.dv.neg { color: #ef4444; }
.dv.blue { color: #60a5fa; }
.rate-btn { background: transparent; border: none; padding: 0; cursor: pointer; text-decoration: underline; text-decoration-style: dotted; }
.status-row { display: flex; align-items: center; justify-content: space-between; padding: 10px 0 6px; border-top: 0.5px solid #222; margin-top: 6px; }
.status-badge { font-size: 11px; padding: 3px 10px; border-radius: 20px; background: #1a3a1a; color: #4ade80; font-weight: 500; }
.released-row { display: flex; align-items: center; justify-content: space-between; padding: 6px 0 10px; }
.checkbox-btn { width: 18px; height: 18px; border-radius: 4px; border: 1.5px solid #333; background: transparent; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 11px; color: #fff; }
.checkbox-btn.checked { background: #16a34a; border-color: #16a34a; }
.action-btns { display: flex; gap: 8px; margin-top: 4px; }
.btn { flex: 1; padding: 10px 0; border-radius: 8px; font-size: 13px; font-weight: 500; cursor: pointer; border: none; transition: opacity 0.15s, transform 0.1s; }
.btn:active { opacity: 0.8; transform: scale(0.98); }
.btn-buy { background: #1d4ed8; color: #fff; }
.btn-sell { background: #16a34a; color: #fff; }
.btn-del { background: #1f1f1f; color: #888; border: 0.5px solid #333; }
</style>
