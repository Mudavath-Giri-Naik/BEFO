import "leaflet/dist/leaflet.css"
import L from "leaflet"
import { useEffect, useRef } from "react"
import { env } from "@/app/env"

export interface MapPoint { slug?: string; name: string; lat: number; lng: number; approximate?: boolean; label?: string }

/**
 * OpenStreetMap raster tiles via Leaflet (no Google Maps API, §3.1). Low-volume use only; see
 * docs/DECISIONS.md for the OSM tile usage policy. Approximate places are drawn as a ~300 m circle.
 */
export default function PlaceMap({ points, zoom = 14, className, onSelect }: { points: MapPoint[]; zoom?: number; className?: string; onSelect?: (slug: string) => void }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!ref.current || points.length === 0) return
    const map = L.map(ref.current, { scrollWheelZoom: false, attributionControl: true })
    L.tileLayer(env.VITE_MAP_TILE_URL, {
      maxZoom: 18,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map)
    const css = getComputedStyle(document.documentElement)
    const ink = css.getPropertyValue("--primary").trim() || "#26307a"
    const leaf = css.getPropertyValue("--leaf").trim() || "#1d7442"
    const layers = points.map((p) => {
      const layer = p.approximate
        ? L.circle([p.lat, p.lng], { radius: 300, color: ink, weight: 2, fillColor: ink, fillOpacity: 0.12 })
        : L.circleMarker([p.lat, p.lng], { radius: 9, color: "#fff", weight: 3, fillColor: p.label ? leaf : ink, fillOpacity: 1 })
      layer.bindTooltip(p.label ? `${p.name} · ${p.label}` : p.name)
      if (p.slug && onSelect) layer.on("click", () => onSelect(p.slug!))
      return layer.addTo(map)
    })
    const group = L.featureGroup(layers)
    if (points.length === 1) map.setView([points[0].lat, points[0].lng], zoom)
    else map.fitBounds(group.getBounds().pad(0.2))
    return () => { map.remove() }
  }, [points, zoom, onSelect])
  return <div ref={ref} className={className} role="region" aria-label="Map" />
}
