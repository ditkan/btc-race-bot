// Dip-buyer for cbBTC 1-minute bars (agent-fun/bars-replay/v1).
//
// Strategy (long only, at most one position):
//   - Track an EMA of the last 240 closes of CBBTC.
//   - When the latest close sits more than 0.6% below that EMA after a full
//     warm-up, buy with 80% of the cash on hand: on this market a dip that
//     deep has historically been a liquidity wobble, not a trend change, and
//     a round trip costs roughly 0.2%, so the expected bounce covers it
//     several times over.
//   - Sell the whole position when the close recovers to 0.2% above the EMA,
//     when it falls 1.2% under the average fill price (the dip was a trend
//     change after all), or after 360 bars in the position.
//   - Wait 10 bars after an exit before buying again.
//
// Deterministic: only +, *, / on the closes in arrival order; no clock, no
// randomness, no files, no network.

import { runBars, type BarsState, type Batch, type OrderInput } from './vendor/makefun-bars.ts';

const SYMBOL = 'CBBTC';
const EMA_SPAN = 240;
const WARMUP_BARS = 120;
const DIP = 0.006;
const RECOVER = 0.002;
const STOP = 0.012;
const MAX_HOLD_BARS = 360;
const COOLDOWN_BARS = 10;
const MAX_SLIPPAGE_BPS = 100;
const MIN_NOTIONAL = 1_000_000n;

let ema: number | null = null;
let barsSeen = 0;
let lastBarT = -1;
let cooldown = 0;
let barsHeld = 0;

function avgFillPriceRaw(state: BarsState, qty: bigint, cost: bigint): number {
  const s = state.symbols.get(SYMBOL);
  if (s === undefined) return 0;
  const exp = s.qty_scale + s.price_scale - state.hello.capital.quote_scale;
  return (Number(cost) * 10 ** exp) / Number(qty);
}

await runBars({
  onBatch(state: BarsState, batch: Batch): OrderInput[] | null {
    let bar = null;
    for (const b of batch.bars) {
      if (b.symbol === SYMBOL) bar = b;
    }
    if (bar !== null && bar.t !== lastBarT) {
      lastBarT = bar.t;
      const close = Number(BigInt(bar.c));
      if (ema === null) {
        ema = close;
      } else {
        const k = 2 / (EMA_SPAN + 1);
        ema = ema + k * (close - ema);
      }
      barsSeen += 1;
      if (cooldown > 0) cooldown -= 1;
    }

    if (state.warmingUp || bar === null || ema === null) return null;
    if (barsSeen < WARMUP_BARS) return null;

    const close = Number(BigInt(bar.c));
    const dev = close / ema - 1;
    const holding = state.positions.get(SYMBOL);

    if (holding !== undefined && holding.qty > 0n) {
      barsHeld += 1;
      const avgPx = avgFillPriceRaw(state, holding.qty, holding.cost);
      if (dev > RECOVER || close < avgPx * (1 - STOP) || barsHeld > MAX_HOLD_BARS) {
        barsHeld = 0;
        cooldown = COOLDOWN_BARS;
        return [{ side: 'sell', symbol: SYMBOL, qty: holding.qty, max_slippage_bps: MAX_SLIPPAGE_BPS }];
      }
      return null;
    }

    barsHeld = 0;
    if (cooldown === 0 && dev < -DIP) {
      let notional = (state.cash * 4n) / 5n;
      const room = state.weightRoom(SYMBOL);
      if (room < notional) notional = room;
      if (notional >= MIN_NOTIONAL) {
        return [{ side: 'buy', symbol: SYMBOL, notional_quote_units: notional, max_slippage_bps: MAX_SLIPPAGE_BPS }];
      }
    }
    return null;
  },
});
