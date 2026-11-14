import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// Base relative : le même build sert en local et sous /GarageVerse/ sur GitHub Pages.
export default defineConfig({ base: './', plugins: [vue()] })
