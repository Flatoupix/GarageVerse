<script setup lang="ts">
// Logo du jeu : « GARAGE » en tube néon rose, « VERSE » en tube cyan espacé.
// Taille : hero (accueil), pack (couverture de sachet), bar (en-tête). L'allumage grésille une fois, sauf en mouvement réduit.
withDefaults(defineProps<{ size?: 'hero' | 'pack' | 'bar'; flicker?: boolean }>(), { size: 'hero', flicker: true })
</script>

<template>
  <span class="game-logo" :class="[`logo-${size}`, { 'logo-flicker': flicker }]" aria-label="GarageVerse" role="img">
    <span class="logo-garage" aria-hidden="true">GARAGE</span>
    <span class="logo-verse" aria-hidden="true">VERSE</span>
  </span>
</template>
