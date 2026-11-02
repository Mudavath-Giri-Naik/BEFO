/** A laurel branch (mirrored for the right side). Pure SVG, inherits currentColor. */
export function Laurel({ flip, className }: { flip?: boolean; className?: string }) {
  const leaves = [0, 1, 2, 3, 4]
  return (
    <svg viewBox="0 0 24 48" className={className} style={flip ? { transform: "scaleX(-1)" } : undefined} aria-hidden>
      <path d="M17 46 C 7 38, 5 22, 12 4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      {leaves.map((i) => {
        const y = 40 - i * 8.2
        const x = 11.5 - Math.sin((i / 4) * 1.4) * 4 + (i === 4 ? 1.5 : 0)
        return (
          <g key={i}>
            <ellipse cx={x - 4} cy={y - 1} rx="4.4" ry="2" transform={`rotate(-38 ${x - 4} ${y - 1})`} fill="currentColor" />
            <ellipse cx={x + 3.6} cy={y - 3.6} rx="4" ry="1.8" transform={`rotate(-70 ${x + 3.6} ${y - 3.6})`} fill="currentColor" />
          </g>
        )
      })}
    </svg>
  )
}
