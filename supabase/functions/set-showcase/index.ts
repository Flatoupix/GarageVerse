import { handleTrade } from '../_shared/http.ts'
import { setShowcase } from '../_shared/trades.ts'

Deno.serve(handleTrade(setShowcase))
