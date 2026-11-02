import { useQuery } from "@tanstack/react-query"
import { createContext, useContext, type ReactNode } from "react"
import { toast } from "sonner"
import type { OwnerApi, OwnerTenant } from "./api"
import { ReadOnlyError } from "./api"

interface Ctx { api: OwnerApi; tenant: OwnerTenant; base: string }
const OwnerCtx = createContext<Ctx | null>(null)

export function OwnerProvider({ api, tenant, base, children }: Ctx & { children: ReactNode }) {
  return <OwnerCtx.Provider value={{ api, tenant, base }}>{children}</OwnerCtx.Provider>
}
export function useOwner() {
  const c = useContext(OwnerCtx)
  if (!c) throw new Error("useOwner outside OwnerProvider")
  return c
}
export function useOwnerQuery<T>(key: string, fn: (api: OwnerApi, t: OwnerTenant) => Promise<T>) {
  const { api, tenant } = useOwner()
  return useQuery({ queryKey: ["owner", api.readOnly ? "demo" : "live", tenant.id, key], queryFn: () => fn(api, tenant), staleTime: 30_000 })
}
/** Shows a clear toast for errors; demo mode explains that nothing is saved. */
export function showActionError(e: unknown) {
  if (e instanceof ReadOnlyError) toast.info(e.message)
  else toast.error(e instanceof Error ? e.message : "Something went wrong. Try again.")
}
