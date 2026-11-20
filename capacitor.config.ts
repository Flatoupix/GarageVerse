import type { CapacitorConfig } from '@capacitor/cli'

// APK Android : le build `--mode android` (dist-android/) est embarqué tel quel dans l'application.
const config: CapacitorConfig = {
  appId: 'io.github.flatoupix.garageverse',
  appName: 'GarageVerse',
  webDir: 'dist-android',
}

export default config
