import { handleTrade } from '../_shared/http.ts'
import { proposeTrade } from '../_shared/trades.ts'

Deno.serve(handleTrade(proposeTrade))
