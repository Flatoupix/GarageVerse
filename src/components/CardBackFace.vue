<script setup lang="ts">
import { computed, useId } from 'vue'
import { cardBackOf } from '../game/cardback'
import { save } from '../game/store'

// Dos d'une carte : l'illustration choisie dans les Réglages et, au centre, le nom du jeu sur deux lignes (GARAGE puis VERSE) en chrome,
// sur une petite plaque. Les couleurs de la lueur et des liserés viennent du dos choisi. Le nom est un dessin SVG avec la police du logo ;
// les identifiants de dégradé sont uniques pour que plusieurs dos cohabitent.
const uid = useId()
const back = computed(() => cardBackOf(save.preferences.cardBack))
const style = computed(() => ({ '--back-a1': back.value.accent[0], '--back-a2': back.value.accent[1] }))
</script>

<template>
  <span class="back-face" :style="style" aria-hidden="true">
    <span class="back-art" :style="{ backgroundImage: `url(${back.art})` }"></span>
    <span class="back-banner">
      <svg class="back-word" viewBox="0 0 270 112" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient :id="`chrome-${uid}`" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stop-color="#ffffff" /><stop offset=".4" stop-color="#d4dcee" /><stop offset=".52" stop-color="#6b7594" />
            <stop offset=".64" stop-color="#eef2fc" /><stop offset="1" stop-color="#96a1c0" />
          </linearGradient>
          <linearGradient :id="`accent-${uid}`" x1="0" y1="0" x2="1" y2="0"><stop offset="0" :stop-color="back.accent[0]" /><stop offset="1" :stop-color="back.accent[1]" /></linearGradient>
          <filter :id="`glow-${uid}`" x="-20%" y="-40%" width="140%" height="180%"><feGaussianBlur stdDeviation="4.5" /></filter>
        </defs>
        <g transform="translate(135 0) skewX(-10) translate(-135 0)" font-family="Orbitron, 'Arial Black', sans-serif" text-anchor="middle">
          <text x="135" y="56" font-size="49" font-weight="900" fill="none" :stroke="back.accent[0]" stroke-width="10" opacity=".8" :filter="`url(#glow-${uid})`">GARAGE</text>
          <text x="135" y="56" font-size="49" font-weight="900" fill="none" stroke="#12072a" stroke-width="11" stroke-linejoin="round">GARAGE</text>
          <text x="135" y="56" font-size="49" font-weight="900" :fill="`url(#chrome-${uid})`">GARAGE</text>
          <text x="136" y="94" font-size="27" font-weight="700" letter-spacing="14" fill="none" stroke="#12072a" stroke-width="7" stroke-linejoin="round">VERSE</text>
          <text x="136" y="94" font-size="27" font-weight="700" letter-spacing="14" :fill="`url(#accent-${uid})`">VERSE</text>
        </g>
        <g :stroke="`url(#accent-${uid})`" stroke-width="2.4" stroke-linecap="round"><path d="M 4 100 H 44" /><path d="M 226 100 H 266" /></g>
      </svg>
    </span>
  </span>
</template>
