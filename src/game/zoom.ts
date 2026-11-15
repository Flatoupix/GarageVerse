// Géométrie indépendante du DOM : la carte agrandie couvre toujours son cadre.
export function boundZoom(scale: number, x: number, y: number, width: number, height: number) {
  const zoom = Math.max(1, Math.min(3, scale))
  const limitX = Math.max(0, width) * (zoom - 1) / 2
  const limitY = Math.max(0, height) * (zoom - 1) / 2
  return { scale: zoom, x: limitX ? Math.max(-limitX, Math.min(limitX, x)) : 0, y: limitY ? Math.max(-limitY, Math.min(limitY, y)) : 0 }
}

export const toggleZoom = (scale: number) => scale > 1 ? 1 : 2.5
