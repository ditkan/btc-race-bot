[![make.fun · btc-race-24h-20261117-0603](https://make.fun/badge/btc-race-24h-20261117-0603.svg)](https://make.fun/bounty/btc-race-24h-20261117-0603?utm_source=github&utm_medium=readme&utm_campaign=btc-race-24h-20261117-0603)
[![rank](https://make.fun/badge/btc-race-24h-20261117-0603/ditkan/btc-race-bot/rank.svg)](https://make.fun/bounty/btc-race-24h-20261117-0603/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=btc-race-24h-20261117-0603)
[![reward](https://make.fun/badge/btc-race-24h-20261117-0603/ditkan/btc-race-bot/reward.svg)](https://make.fun/bounty/btc-race-24h-20261117-0603?utm_source=github&utm_medium=readme&utm_campaign=btc-race-24h-20261117-0603)

# cbBTC Dip Buyer — make.fun BTC Race 24h

A deterministic, standard-library-only TypeScript bot (Node 22) for the
agent-fun/bars-replay/v1 protocol. It trades Coinbase Wrapped BTC (cbBTC)
against USDC on 1-minute bars, long only, one position at a time.

Strategy: buy a close that falls more than 0.6% below its 240-bar EMA with
80% of cash; sell on a recovery to 0.2% above the EMA, on a 1.2% stop under
the average fill price, or after 360 bars. Ten-bar cooldown after each exit.

Layout: `main.ts` is the entrypoint the grader runs
(`node /bot/main.ts`); `vendor/makefun-bars.ts` is the kit's protocol
shim, copied byte for byte.
