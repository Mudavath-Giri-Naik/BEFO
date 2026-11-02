// Minimal Cloudflare runtime types used by Pages Functions (full types: @cloudflare/workers-types).
declare class HTMLRewriter {
  on(selector: string, handlers: { element?: (e: { setInnerContent(c: string): void; setAttribute(n: string, v: string): void; append(c: string, o?: { html: boolean }): void }) => void }): HTMLRewriter
  transform(r: Response): Response
}
