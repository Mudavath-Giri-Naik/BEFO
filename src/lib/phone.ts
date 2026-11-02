/**
 * Indian mobile numbers. Canonical form: "+91XXXXXXXXXX" (E.164). Mirrors SQL normalize_phone().
 * Excel often damages phones into "9.88E+09"; those are REJECTED, never guessed.
 */
export function normalizePhone(input: string | number | null | undefined): string | null {
  if (input === null || input === undefined) return null
  if (typeof input === "number") {
    if (!Number.isInteger(input)) return null
    input = String(input)
  }
  const raw = input.trim()
  if (!raw) return null
  if (/e[+-]?\d/i.test(raw)) return null // scientific notation = damaged by Excel
  if (/[^\d\s()+.-]/.test(raw)) return null
  let digits = raw.replace(/\D/g, "")
  if (digits.length === 13 && digits.startsWith("091")) digits = digits.slice(1)
  if (digits.length === 12 && digits.startsWith("91")) digits = digits.slice(2)
  else if (digits.length === 11 && digits.startsWith("0")) digits = digits.slice(1)
  if (digits.length !== 10) return null
  if (!/^[6-9]/.test(digits)) return null
  return "+91" + digits
}

export function isValidPhone(input: string | number | null | undefined) {
  return normalizePhone(input) !== null
}

/** "+919876543210" → "+91 98•••••210" (logs, admin views). */
export function maskPhone(e164: string): string {
  const d = e164.replace(/\D/g, "").slice(-10)
  if (d.length !== 10) return "•••"
  return `+91 ${d.slice(0, 2)}•••••${d.slice(7)}`
}

/** "+919876543210" → "98765 43210" */
export function formatPhone(e164: string): string {
  const d = e164.replace(/\D/g, "").slice(-10)
  return d.length === 10 ? `${d.slice(0, 5)} ${d.slice(5)}` : e164
}

export function waLink(e164: string, text?: string) {
  const d = e164.replace(/\D/g, "")
  return `https://wa.me/${d}${text ? `?text=${encodeURIComponent(text)}` : ""}`
}
