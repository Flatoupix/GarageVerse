// Fonction register (docs/supabase.md § 7). Point d'entrée mince : la logique vit dans _shared/versus.ts.
import { handle } from '../_shared/http.ts'
import { register } from '../_shared/versus.ts'

Deno.serve(handle(register))
