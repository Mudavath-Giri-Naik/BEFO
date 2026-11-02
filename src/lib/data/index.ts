import { keepPreviousData, useQuery } from "@tanstack/react-query"
import { isDemoData } from "@/app/env"
import { demoApi } from "./demo"
import { supabaseApi } from "./supabase-api"
import type { PublicApi, SearchParams } from "./types"

export const publicApi: PublicApi = isDemoData ? demoApi : supabaseApi
export * from "./types"

export const usePlaces = (p: SearchParams) =>
  useQuery({ queryKey: ["places", p], queryFn: () => publicApi.search(p), placeholderData: keepPreviousData, staleTime: 60_000 })
export const usePlace = (slug: string) =>
  useQuery({ queryKey: ["place", slug], queryFn: () => publicApi.detail(slug), staleTime: 120_000 })
export const useStats = () => useQuery({ queryKey: ["stats"], queryFn: () => publicApi.stats(), staleTime: 300_000 })
export const useSuggest = (q: string) =>
  useQuery({ queryKey: ["suggest", q], queryFn: () => publicApi.suggest(q), enabled: q.trim().length >= 2, staleTime: 300_000 })
export const useMenusToday = (slugs: string[]) =>
  useQuery({ queryKey: ["menus-today", slugs], queryFn: () => publicApi.menusToday(slugs), enabled: isDemoData || slugs.length > 0, staleTime: 300_000 })
