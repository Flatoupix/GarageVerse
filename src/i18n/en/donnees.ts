import type { Dict } from './index'
import { capacites } from './donnees-capacites'
import { divers } from './donnees-divers'
import { garage } from './donnees-garage'
import { histoires } from './donnees-histoires'
import { libelles } from './donnees-libelles'
import { specs } from './donnees-specs'

// Textes d'affichage de roster.json, garage.json et game/data.ts ; la clé est le français du JSON (les valeurs de logique restent françaises).
export const donnees: Dict = { ...histoires, ...specs, ...capacites, ...divers, ...garage, ...libelles }
