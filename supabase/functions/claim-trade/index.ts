import { handleTrade } from '../_shared/http.ts'
import { claimTrade } from '../_shared/trades.ts'

Deno.serve(handleTrade(claimTrade))
