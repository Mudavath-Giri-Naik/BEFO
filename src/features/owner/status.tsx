import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import type { SubStatus } from "./api"

const LABEL: Record<SubStatus, string> = {
  active: "Active", expiring_soon: "Due soon", expired: "Overdue", no_payment: "Not paid yet", paused: "Paused", former: "Left", removed: "Removed",
}
export function StatusBadge({ status, daysLeft }: { status: SubStatus; daysLeft?: number | null }) {
  const text = status === "expiring_soon" && daysLeft != null ? (daysLeft === 0 ? "Due today" : `Due in ${daysLeft}d`)
    : status === "expired" && daysLeft != null ? `Overdue ${-daysLeft}d` : LABEL[status]
  return (
    <Badge className={cn("border-transparent",
      status === "active" && "bg-leaf-soft text-leaf",
      status === "expiring_soon" && "bg-turmeric-soft text-accent-foreground",
      (status === "expired" || status === "no_payment") && "bg-destructive/12 text-destructive",
      (status === "paused" || status === "former" || status === "removed") && "bg-muted text-muted-foreground")}>{text}</Badge>
  )
}
