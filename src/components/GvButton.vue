<script setup lang="ts">
withDefaults(defineProps<{
  variant?: 'primary' | 'secondary' | 'tab' | 'filter' | 'icon'
  tone?: string
  active?: boolean
  disabled?: boolean
}>(), { variant: 'secondary', active: false, disabled: false })
</script>

<template>
  <button type="button" class="gv-button" :class="[`gv-button--${variant}`, { 'is-active': active }]"
    :style="tone ? { '--gv-tone': tone } : undefined" :disabled="disabled">
    <span class="gv-button-content"><slot /></span>
  </button>
</template>
