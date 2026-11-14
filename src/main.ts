import { createApp } from 'vue'
import App from './App.vue'
import { save } from './game/store'
import { themeFx } from './game/fx'
import { applyTheme } from './game/theme'

// Le thème choisi s'applique avant le premier rendu, sans flash du style par défaut.
applyTheme(save.preferences.theme)
themeFx(save.preferences.theme)

createApp(App).mount('#app')
