/**
 * Ledger definitions (docs/FINANCE_RULES.md §Profit). The LLM never computes these numbers.
 *  income             = confirmed member payments + other income (deposits are liabilities, not income)
 *  operating expenses = expenses + salaries (+ advances are NOT expenses; they are receivables until recovered)
 *  operating profit   = income − operating expenses
 *  cash profit        = operating profit − investments
 */
export type TxKind =
  | "member_payment" | "expense" | "salary" | "advance" | "investment" | "deposit_in"
  | "deposit_out" | "transfer" | "adjustment" | "owner_draw" | "other_income"

export interface LedgerTx {
  direction: "in" | "out"
  kind: TxKind
  amount_paise: bigint
  status: "draft" | "confirmed" | "void"
  category_key?: string | null
}

export interface PnL {
  income_paise: bigint
  operating_expense_paise: bigint
  investment_paise: bigint
  operating_profit_paise: bigint
  cash_profit_paise: bigint
  deposits_held_change_paise: bigint
  margin_pct: number | null
  by_category: Record<string, bigint>
}

export function computePnL(txs: LedgerTx[]): PnL {
  let income = 0n, opex = 0n, inv = 0n, dep = 0n
  const byCat: Record<string, bigint> = {}
  for (const t of txs) {
    if (t.status !== "confirmed") continue
    const a = t.amount_paise
    switch (t.kind) {
      case "member_payment":
      case "other_income":
        income += t.direction === "in" ? a : -a // refunds of income reduce income
        break
      case "expense":
      case "salary":
        opex += t.direction === "out" ? a : -a // refunds / credit notes reduce expense
        break
      case "investment":
        inv += t.direction === "out" ? a : -a
        break
      case "deposit_in":
        dep += a
        break
      case "deposit_out":
        dep -= a
        break
      default:
        break // transfers, advances, owner draws and adjustments are not P&L
    }
    if ((t.kind === "expense" || t.kind === "salary" || t.kind === "investment") && t.category_key) {
      const sign = t.direction === "out" ? 1n : -1n
      byCat[t.category_key] = (byCat[t.category_key] ?? 0n) + sign * a
    }
  }
  const op = income - opex
  return {
    income_paise: income,
    operating_expense_paise: opex,
    investment_paise: inv,
    operating_profit_paise: op,
    cash_profit_paise: op - inv,
    deposits_held_change_paise: dep,
    margin_pct: income > 0n ? Math.round((Number(op) / Number(income)) * 1000) / 10 : null,
    by_category: byCat,
  }
}

/** Expected cash = opening + cash in − cash out; difference is recorded, never auto-fixed. */
export function cashDifference(opening: bigint, cashIn: bigint, cashOut: bigint, counted: bigint) {
  const expected = opening + cashIn - cashOut
  return { expected_paise: expected, diff_paise: counted - expected }
}

/** Dedupe key order for bills/payments: UTR → file hash → vendor+amount+date window. */
export function isProbableDuplicate(
  a: { utr?: string | null; sha256?: string | null; party?: string | null; amount_paise: bigint; date: string },
  b: { utr?: string | null; sha256?: string | null; party?: string | null; amount_paise: bigint; date: string },
  windowDays = 3,
): "utr" | "hash" | "heuristic" | null {
  if (a.utr && b.utr && a.utr === b.utr) return "utr"
  if (a.sha256 && b.sha256 && a.sha256 === b.sha256) return "hash"
  if (a.party && b.party && a.party === b.party && a.amount_paise === b.amount_paise) {
    const d = Math.abs((Date.parse(a.date) - Date.parse(b.date)) / 86_400_000)
    if (d <= windowDays) return "heuristic"
  }
  return null
}

/** Category resolution order (§17.4): owner chip > vendor default > recurring rule > AI > uncategorised. */
export function resolveCategory(o: { chip?: string | null; vendorDefault?: string | null; recurring?: string | null; ai?: string | null }) {
  if (o.chip) return { key: o.chip, source: "owner" as const }
  if (o.vendorDefault) return { key: o.vendorDefault, source: "vendor" as const }
  if (o.recurring) return { key: o.recurring, source: "recurring" as const }
  if (o.ai) return { key: o.ai, source: "ai" as const }
  return { key: "uncategorised", source: "none" as const }
}
