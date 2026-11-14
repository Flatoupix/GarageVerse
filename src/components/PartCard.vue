<script setup lang="ts">
import { computed } from 'vue'
import { art } from '../game/art'
import { families, partById, rarityClass, rarityMark } from '../game/data'

const props = defineProps<{ id: string; compact?: boolean }>()
const part = computed(() => partById.get(props.id)!)
</script>

<template>
  <article class="gv-card part-card" :class="[`finish-${rarityClass[part.rarity]}`, { compact }]">
    <div class="card-art part-art">
      <img v-if="art.part(id)" :src="art.part(id)" alt="" draggable="false" />
      <div v-else class="art-missing" aria-hidden="true"><span>{{ families[part.family] }}</span></div>
    </div>
    <header class="card-top">
      <span class="cost" :title="`Coût de préparation ${part.cost}`"><small>PRÉPA</small>{{ part.cost }}</span>
      <span class="rarity"><span aria-hidden="true">{{ rarityMark[part.rarity] }}</span> {{ part.rarity }}</span>
      <span class="number">MÉCA</span>
    </header>
    <div class="card-body">
      <div class="card-title">
        <span class="family">{{ families[part.family] }}</span>
        <strong>{{ part.name }}</strong>
      </div>
      <p class="part-text">{{ part.text }}</p>
      <footer class="card-foot"><span>Carte Mécanique</span><span>Pixel 16 bits</span></footer>
    </div>
  </article>
</template>
