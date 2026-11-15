import { readFileSync } from 'node:fs'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// La version du jeu vient de package.json : une seule source, affichée dans les Réglages.
const { version } = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as { version: string }

// Base relative : le même build sert en local et sous /GarageVerse/ sur GitHub Pages.
export default defineConfig({ base: './', plugins: [vue()], define: { __APP_VERSION__: JSON.stringify(version) } })
