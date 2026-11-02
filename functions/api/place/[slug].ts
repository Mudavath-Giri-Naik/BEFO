import { cached, json, rpc, type Ctx } from "../../_shared"

/** GET /api/place/:slug — public detail, edge cached 120 s. 404 when not public. */
export const onRequestGet = (ctx: Ctx) =>
  cached(ctx, 120, async () => {
    const d = await rpc<unknown>(ctx.env, "public_place_detail", { p_slug: String(ctx.params.slug) })
    return d ? json(d) : json({ error: "not_found" }, 404)
  })
