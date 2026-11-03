/**
 * Drawn stand-ins for marketing photos, used only in the self-contained preview build
 * (VITE_ARTIFACT=1), where the page can't load images from other sites. Returns SVG data URIs.
 */
export type SceneKind = "bunks" | "room" | "desk" | "lounge" | "thali"

const SCENES: Record<SceneKind, (s: number) => string> = {
  room: (s) => roomScene(s, false),
  bunks: (s) => roomScene(s, true),
  desk: (s) => deskScene(s),
  lounge: (s) => loungeScene(s),
  thali: (s) => thaliScene(s),
}

export function sceneUrl(kind: SceneKind, seed = 0) {
  return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(SCENES[kind](seed))
}

const WALLS = [["#ebe4d8", "#d9cfbf"], ["#e3e6e2", "#cfd5cf"], ["#efe6dc", "#ddcdbb"], ["#e6e2ea", "#d3cdd9"]]
const svg = (body: string, defs = "") =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 900" preserveAspectRatio="xMidYMid slice"><defs>${defs}</defs>${body}</svg>`

function base(seed: number) {
  const [a, b] = WALLS[seed % WALLS.length]
  return {
    defs: `<linearGradient id="w" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient>
      <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#cfe2ee"/><stop offset="1" stop-color="#f7f1e6"/></linearGradient>
      <linearGradient id="beam" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".55"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
      <linearGradient id="floor" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#b59c7e"/><stop offset="1" stop-color="#8f765b"/></linearGradient>`,
    body: `<rect width="1200" height="900" fill="url(#w)"/><rect y="690" width="1200" height="210" fill="url(#floor)"/><rect y="684" width="1200" height="10" fill="#fff" opacity=".35"/>`,
  }
}

function windowAt(x: number, y: number, w: number, h: number) {
  return `<rect x="${x - 14}" y="${y - 14}" width="${w + 28}" height="${h + 28}" rx="6" fill="#f8f5ef"/>
    <rect x="${x}" y="${y}" width="${w}" height="${h}" fill="url(#sky)"/>
    <rect x="${x + w / 2 - 5}" y="${y}" width="10" height="${h}" fill="#f8f5ef"/><rect x="${x}" y="${y + h / 2 - 5}" width="${w}" height="10" fill="#f8f5ef"/>
    <ellipse cx="${x + w * 0.3}" cy="${y + h * 0.82}" rx="${w * 0.35}" ry="${h * 0.16}" fill="#9fbf8f" opacity=".7"/>
    <polygon points="${x},${y + h} ${x + w},${y + h} ${x + w + 380},900 ${x - 120},900" fill="url(#beam)" opacity=".55"/>`
}

function plant(x: number, y: number) {
  return `<path d="M${x - 34} ${y} h68 l-10 80 h-48 z" fill="#c4b29a"/>
    ${[[-50, -110, -30], [0, -150, 0], [46, -105, 28], [-24, -70, -50], [28, -66, 48]].map(([dx, dy, r]) =>
      `<ellipse cx="${x + dx}" cy="${y + dy}" rx="26" ry="70" transform="rotate(${r} ${x + dx} ${y + dy})" fill="#5f8a55"/>`).join("")}`
}

function bed(x: number, y: number, w: number, top = false) {
  const frame = "#2f2f33"
  return `<rect x="${x}" y="${y}" width="${w}" height="16" rx="4" fill="${frame}"/>
    <rect x="${x + 8}" y="${y - 46}" width="${w - 16}" height="48" rx="14" fill="#f4f2ee"/>
    <rect x="${x + 8}" y="${y - 46}" width="${w - 16}" height="20" rx="10" fill="#d9dee6"/>
    <rect x="${x + 20}" y="${y - 74}" width="130" height="38" rx="16" fill="#fbfaf8"/>
    ${top ? "" : `<rect x="${x}" y="${y + 16}" width="14" height="${690 - y - 16}" fill="${frame}"/><rect x="${x + w - 14}" y="${y + 16}" width="14" height="${690 - y - 16}" fill="${frame}"/>`}`
}

function roomScene(seed: number, bunks: boolean) {
  const b = base(seed)
  const winX = seed % 2 ? 140 : 700
  let furniture: string
  if (bunks) {
    const x = seed % 2 ? 560 : 120
    furniture = `<rect x="${x}" y="250" width="14" height="440" fill="#2f2f33"/><rect x="${x + 506}" y="250" width="14" height="440" fill="#2f2f33"/>
      ${bed(x, 380, 520, true)}${bed(x, 600, 520)}
      ${[0, 1, 2, 3, 4].map((i) => `<rect x="${x + 470}" y="${400 + i * 40}" width="36" height="6" fill="#2f2f33"/>`).join("")}`
  } else {
    furniture = `<rect x="${seed % 2 ? 520 : 140}" y="440" width="22" height="160" rx="6" fill="#8a6a4c"/>${bed(seed % 2 ? 520 : 140, 600, 560)}
      <rect x="${seed % 2 ? 1010 : 60}" y="520" width="110" height="170" rx="8" fill="#a5835f"/><circle cx="${seed % 2 ? 1065 : 115}" cy="500" r="26" fill="#f2d7a0"/>`
  }
  return svg(b.body + windowAt(winX, 150, 340, 300) + furniture + plant(seed % 2 ? 80 : 1100, 620), b.defs)
}

function deskScene(seed: number) {
  const b = base(seed + 1)
  return svg(b.body + windowAt(160, 140, 320, 300) +
    `<rect x="560" y="470" width="520" height="22" rx="6" fill="#8a6a4c"/><rect x="580" y="492" width="16" height="198" fill="#6e5440"/><rect x="1044" y="492" width="16" height="198" fill="#6e5440"/>
     <rect x="700" y="350" width="200" height="124" rx="10" fill="#2f2f33"/><rect x="712" y="362" width="176" height="100" rx="4" fill="#9ab3c6"/>
     <rect x="760" y="474" width="80" height="8" fill="#2f2f33"/><circle cx="1000" cy="420" r="30" fill="#f2d7a0"/><rect x="996" y="446" width="8" height="28" fill="#2f2f33"/>
     <rect x="560" y="560" width="160" height="22" rx="10" fill="#d9dee6"/>` + bed(60, 640, 420) + plant(1130, 620), b.defs)
}

function loungeScene(seed: number) {
  const b = base(seed + 2)
  return svg(b.body + windowAt(760, 140, 300, 300) +
    `<rect x="140" y="250" width="240" height="170" rx="8" fill="#f8f5ef"/><rect x="156" y="266" width="208" height="138" fill="#c9b79f"/><circle cx="230" cy="320" r="30" fill="#e7cfa4"/>
     <rect x="100" y="500" width="620" height="140" rx="40" fill="#6f7a8c"/><rect x="100" y="440" width="620" height="110" rx="40" fill="#7e899b"/>
     <rect x="130" y="470" width="150" height="70" rx="28" fill="#d6c7ad"/><rect x="540" y="470" width="150" height="70" rx="28" fill="#c9b9d3"/>
     <rect x="120" y="636" width="16" height="54" fill="#3b3b3b"/><rect x="684" y="636" width="16" height="54" fill="#3b3b3b"/>
     <ellipse cx="900" cy="640" rx="150" ry="24" fill="#8a6a4c"/><rect x="894" y="640" width="12" height="50" fill="#6e5440"/>` + plant(1120, 620), b.defs)
}

function thaliScene(seed: number) {
  const katoris = [["#e2a93b", "#c98d24"], ["#b4442b", "#932f1d"], ["#f3efe6", "#ddd6c8"], ["#5d8a3a", "#476e2b"], ["#d8853a", "#b96a25"]]
  const n = 4 + (seed % 2)
  const ring = Array.from({ length: n }, (_, i) => {
    const a = -Math.PI * 0.9 + (i / (n - 1)) * Math.PI * 0.8
    const x = 600 + Math.cos(a) * 250, y = 450 + Math.sin(a) * 250
    const [c1, c2] = katoris[(i + seed) % katoris.length]
    return `<circle cx="${x}" cy="${y}" r="78" fill="#b9c0c6"/><circle cx="${x}" cy="${y}" r="70" fill="#dde2e6"/><circle cx="${x}" cy="${y}" r="56" fill="${c2}"/><circle cx="${x - 8}" cy="${y - 8}" r="44" fill="${c1}"/>`
  }).join("")
  return svg(`<rect width="1200" height="900" fill="url(#wood)"/>
    ${Array.from({ length: 12 }, (_, i) => `<rect y="${i * 80}" width="1200" height="3" fill="#000" opacity=".12"/>`).join("")}
    <circle cx="600" cy="470" r="400" fill="#000" opacity=".25"/><circle cx="600" cy="450" r="400" fill="url(#steel)"/><circle cx="600" cy="450" r="372" fill="none" stroke="#fff" stroke-opacity=".35" stroke-width="6"/>
    <ellipse cx="600" cy="560" rx="150" ry="110" fill="#fbf8f1"/><ellipse cx="580" cy="545" rx="110" ry="70" fill="#fff"/>
    ${ring}<circle cx="820" cy="610" r="70" fill="#e8c27a"/><circle cx="820" cy="610" r="70" fill="none" stroke="#c9a058" stroke-width="4" stroke-dasharray="6 10"/>
    <path d="M330 620 q30 -40 90 -20 q-10 50 -90 20z" fill="#7aa34f"/>`,
    `<linearGradient id="wood" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#5b3f2c"/><stop offset="1" stop-color="#3e2a1d"/></linearGradient>
     <radialGradient id="steel" cx=".4" cy=".35" r=".8"><stop offset="0" stop-color="#f2f4f5"/><stop offset=".7" stop-color="#c3c9ce"/><stop offset="1" stop-color="#9aa2a9"/></radialGradient>`)
}
