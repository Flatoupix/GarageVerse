import { readFileSync } from 'node:fs'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// La version du jeu vient de package.json : une seule source, affichée dans les Réglages.
const { version } = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as { version: string }

// Chaque version publiée a ses notes, montrées aux joueurs à l'ouverture du jeu : pas de build sans elles.
for (const file of ['CHANGELOG.md', 'CHANGELOG.en.md']) {
  const changelog = readFileSync(new URL(`./${file}`, import.meta.url), 'utf8')
  if (!changelog.split(/\r?\n/).some(line => line.startsWith(`## [${version}] — `))) {
    throw new Error(`${file} n’a pas d’entrée « ## [${version}] — AAAA-MM-JJ » pour la version de package.json (les notes existent en français et en anglais).`)
  }
}

// Base relative : le même build sert en local et sous /GarageVerse/ sur GitHub Pages.
export default defineConfig({
  // Both GitHub Pages (/GarageVerse/) and itch.io's extracted ZIP need relative assets.
  base: './',
  plugins: [vue()],
  define: { __APP_VERSION__: JSON.stringify(version) },
})
