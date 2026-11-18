import { handle } from '../_shared/http.ts'
import { answerFriend } from '../_shared/friends.ts'

Deno.serve(handle(answerFriend))
