import { handleFriend } from '../_shared/http.ts'
import { answerFriend } from '../_shared/friends.ts'

Deno.serve(handleFriend(answerFriend))
