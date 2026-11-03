import type { Session, User } from "@supabase/supabase-js"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { createContext, useContext, useEffect, useState, type ReactNode } from "react"
import { supabase } from "@/lib/supabase"
import type { MyContext } from "./home"

export { homeFor, type MyContext } from "./home"

interface Auth {
  ready: boolean
  session: Session | null
  user: User | null
  /** Phone confirmed in Supabase Auth (§11.2). Nothing beyond browsing works without it. */
  phoneVerified: boolean
  context: MyContext | null
  /** my_context has finished loading (or failed), so routing by it is safe. */
  contextSettled: boolean
  signOut: () => Promise<void>
}
const Ctx = createContext<Auth>({ ready: true, session: null, user: null, phoneVerified: false, context: null, contextSettled: true, signOut: async () => {} })

export function AuthProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient()
  const [session, setSession] = useState<Session | null>(null)
  const [ready, setReady] = useState(!supabase)
  useEffect(() => {
    if (!supabase) return
    supabase.auth.getSession().then(({ data }) => { setSession(data.session); setReady(true) })
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => { setSession(s); qc.invalidateQueries({ queryKey: ["my-context"] }) })
    return () => sub.subscription.unsubscribe()
  }, [qc])
  const user = session?.user ?? null
  const phoneVerified = !!user?.phone && !!user.phone_confirmed_at
  const ctx = useQuery({
    queryKey: ["my-context", user?.id, phoneVerified],
    enabled: !!supabase && phoneVerified,
    queryFn: async () => {
      await supabase!.rpc("link_my_memberships")
      const { data, error } = await supabase!.rpc("my_context")
      if (error) throw error
      return data as MyContext
    },
  })
  const signOut = async () => { await supabase?.auth.signOut(); qc.clear() }
  return <Ctx.Provider value={{ ready, session, user, phoneVerified, context: ctx.data ?? null, contextSettled: !ctx.isPending || ctx.isError, signOut }}>{children}</Ctx.Provider>
}

export const useAuth = () => useContext(Ctx)
