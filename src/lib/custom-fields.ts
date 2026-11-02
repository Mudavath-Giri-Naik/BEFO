import { normalizePhone } from "./phone"
import { parseIndianDate } from "./dates"

export type FieldType = "text" | "number" | "select" | "date" | "phone" | "yesno" | "textarea"
export interface FieldDef {
  key: string
  label: string
  type: FieldType
  options?: string[]
  required?: boolean
}

const SENSITIVE = /(aadha?ar|\bpan\b|pan card|passport|voter|epic|licen[cs]e|driving|medical|health|disease|blood group|illness|ఆధార్)/i

/** True when a custom field label looks like a government ID or health data (we warn, §3). */
export function looksSensitive(label: string) {
  return SENSITIVE.test(label)
}

export function validateCustom(defs: FieldDef[], values: Record<string, unknown>) {
  const errors: Record<string, string> = {}
  const clean: Record<string, unknown> = {}
  for (const d of defs) {
    const v = values[d.key]
    const empty = v === undefined || v === null || (typeof v === "string" && v.trim() === "")
    if (empty) {
      if (d.required) errors[d.key] = `${d.label} is required.`
      continue
    }
    switch (d.type) {
      case "number": {
        const n = typeof v === "number" ? v : Number(String(v).replace(/,/g, ""))
        if (!Number.isFinite(n)) errors[d.key] = `${d.label} must be a number.`
        else clean[d.key] = n
        break
      }
      case "select":
        if (!d.options?.includes(String(v))) errors[d.key] = `Pick one of the options for ${d.label}.`
        else clean[d.key] = String(v)
        break
      case "date": {
        const iso = parseIndianDate(v as string)
        if (!iso) errors[d.key] = `${d.label}: use DD/MM/YYYY.`
        else clean[d.key] = iso
        break
      }
      case "phone": {
        const p = normalizePhone(v as string)
        if (!p) errors[d.key] = `${d.label}: enter a 10-digit mobile number.`
        else clean[d.key] = p
        break
      }
      case "yesno":
        if (typeof v === "boolean") clean[d.key] = v
        else if (/^(yes|y|true|1|అవును)$/i.test(String(v))) clean[d.key] = true
        else if (/^(no|n|false|0|కాదు)$/i.test(String(v))) clean[d.key] = false
        else errors[d.key] = `${d.label}: answer yes or no.`
        break
      default: {
        const s = String(v).trim()
        if (s.length > (d.type === "textarea" ? 2000 : 200)) errors[d.key] = `${d.label} is too long.`
        else clean[d.key] = s
      }
    }
  }
  return { ok: Object.keys(errors).length === 0, errors, values: clean }
}
