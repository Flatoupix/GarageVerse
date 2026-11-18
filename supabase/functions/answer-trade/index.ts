import { handleTrade } from '../_shared/http.ts'
import { answerTrade } from '../_shared/trades.ts'

Deno.serve(handleTrade(answerTrade))
