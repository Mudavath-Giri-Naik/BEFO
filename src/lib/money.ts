/**
 * Money helpers. The database stores PAISE as bigint everywhere; the UI shows rupees.
 * Rules (docs/FINANCE_RULES.md):
 *  - rounding is half-up to whole paise
 *  - salaries round to whole rupees (half-up)
 *  - display hides ".00"
 */

/** Integer division rounding half up, for non-negative or negative values (half away from zero). */
export function roundDiv(num: bigint, den: bigint): bigint {
  if (den === 0n) throw new Error("Division by zero")
  if (den < 0n) { num = -num; den = -den }
  const neg = num < 0n
  const n = neg ? -num : num
  const q = (2n * n + den) / (2n * den)
  return neg ? -q : q
}

/** Round a paise amount to whole rupees, half up (salaries). */
export function roundToRupee(paise: bigint): bigint {
  return roundDiv(paise, 100n) * 100n
}

const groupFmt = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 })

/** 230000 → "₹2,300"; 230050 → "₹2,300.50"; Indian digit grouping (1,23,456). */
export function formatRupees(paise: number | bigint, opts: { symbol?: boolean } = {}): string {
  const p = BigInt(paise)
  const neg = p < 0n
  const abs = neg ? -p : p
  const rupees = abs / 100n
  const rem = abs % 100n
  let s = groupFmt.format(rupees)
  if (rem !== 0n) s += "." + rem.toString().padStart(2, "0")
  const sym = opts.symbol === false ? "" : "₹"
  return (neg ? "−" : "") + sym + s
}

/** Compact form for cards: ₹1.2L, ₹3.4Cr, else full. */
export function formatRupeesCompact(paise: number | bigint): string {
  const r = Number(BigInt(paise)) / 100
  if (Math.abs(r) >= 1e7) return `₹${trim(r / 1e7)}Cr`
  if (Math.abs(r) >= 1e5) return `₹${trim(r / 1e5)}L`
  return formatRupees(paise)
}
function trim(n: number) {
  return (Math.round(n * 10) / 10).toString()
}

/**
 * Parse an Indian amount as written by humans or OCR into paise.
 * Accepts: "₹2,300", "Rs. 2300.50", "INR 1,23,456", "2.5 lakh", "1 crore", "2300/-".
 * Returns null when the text is not a clean amount.
 */
export function parseIndianAmount(input: string | number): bigint | null {
  if (typeof input === "number") {
    if (!Number.isFinite(input) || input < 0) return null
    return BigInt(Math.round(input * 100))
  }
  let s = input.trim().toLowerCase()
  if (!s) return null
  s = s.replace(/₹|inr|rs\.?|rupees?/g, "").replace(/\/-$/, "").replace(/\s+/g, " ").trim()
  let mult = 1n
  const unit = s.match(/\s*(lakhs?|lacs?|l|crores?|cr)$/)
  if (unit) {
    mult = unit[1].startsWith("c") ? 10_000_000n : 100_000n
    s = s.slice(0, unit.index).trim()
  }
  s = s.replace(/,/g, "")
  if (!/^\d+(\.\d+)?$/.test(s)) return null
  const [whole, frac = ""] = s.split(".")
  // exact decimal arithmetic in paise
  const scale = 10n ** BigInt(frac.length)
  const asInt = BigInt(whole) * scale + (frac ? BigInt(frac) : 0n)
  return roundDiv(asInt * mult * 100n, scale)
}

export function rupeesToPaise(rupees: number): bigint {
  const p = parseIndianAmount(rupees)
  if (p === null) throw new Error(`Invalid amount: ${rupees}`)
  return p
}
