// Fonction submit-move (docs/supabase.md § 7). Point d'entrée mince : la logique vit dans _shared/versus.ts.
import { handle } from '../_shared/http.ts'
import { submitMove } from '../_shared/versus.ts'

Deno.serve(handle(submitMove))
