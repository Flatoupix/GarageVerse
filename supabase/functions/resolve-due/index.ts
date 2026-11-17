// Fonction resolve-due (docs/supabase.md § 7). Point d'entrée mince : la logique vit dans _shared/versus.ts.
// Appelée par un joueur de la salle, ou par la tâche planifiée avec la clé service_role.
import { handle } from '../_shared/http.ts'
import { resolveDue } from '../_shared/versus.ts'

Deno.serve(handle(resolveDue, { scheduled: true }))
