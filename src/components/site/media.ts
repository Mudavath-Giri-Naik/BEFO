import { sceneUrl, type SceneKind } from "./scenes"

/**
 * Marketing photos (Unsplash licence: free to use, no attribution required). Loaded by the visitor's
 * browser straight from images.unsplash.com (allowed in the CSP). Owners' own photos replace these on
 * place pages; these are only for the marketing sections.
 */
export const PHOTOS = {
  bunks: "1555854877-bab0e564b8d5", // black metal bunk beds
  woodBunks: "1520277739336-7bf67edfa768", // wooden bunk beds
  brightRoom: "1564273795917-fe399b763988", // well-lit room
  bedWood: "1582719478250-c89cae4dc85b", // white linen, wooden bed
  deskBed: "1463620910506-d0458143143e", // desk near bed
  bedsRow: "1531576788337-610fa9c67107", // wooden beds, white mattresses
  linen: "1584132905271-512c958d674a",
  blueBed: "1530334580314-1e7a340426a0",
  loveseat: "1502672260266-1c1ef2d93688", // sofa near wooden table
  livingRoom: "1583847268964-b28dc8f51f92",
  chaise: "1564078516393-cf04bd966897",
  thaliSteel: "1589778655375-3e622a9fc91c", // food on a steel tray
  thali: "1742281257687-092746ad6021", // Indian thali
  roundTray: "1546833999-b9f581a1996d",
} as const
export type PhotoKey = keyof typeof PHOTOS

/** Self-contained preview build: no outside images allowed, so photos become drawn scenes. */
export const IS_ARTIFACT = import.meta.env.VITE_ARTIFACT === "1"
const SCENE_FOR: Record<PhotoKey, [SceneKind, number]> = {
  bunks: ["bunks", 0], woodBunks: ["bunks", 1], brightRoom: ["room", 0], bedWood: ["room", 1], deskBed: ["desk", 0],
  bedsRow: ["bunks", 2], linen: ["room", 2], blueBed: ["room", 3], loveseat: ["lounge", 0], livingRoom: ["lounge", 1],
  chaise: ["lounge", 2], thaliSteel: ["thali", 0], thali: ["thali", 1], roundTray: ["thali", 2],
}

export function photo(key: PhotoKey, w = 1200, h?: number) {
  if (IS_ARTIFACT) return sceneUrl(...SCENE_FOR[key])
  return `https://images.unsplash.com/photo-${PHOTOS[key]}?auto=format&fit=crop&q=70&w=${w}${h ? `&h=${h}` : ""}`
}
export function photoSet(key: PhotoKey, widths = [480, 800, 1200, 1800]): string | undefined {
  if (IS_ARTIFACT) return undefined
  return widths.map((w) => `${photo(key, w)} ${w}w`).join(", ")
}
