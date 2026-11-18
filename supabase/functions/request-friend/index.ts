import { handleFriend } from '../_shared/http.ts'
import { requestFriend } from '../_shared/friends.ts'

Deno.serve(handleFriend(requestFriend))
