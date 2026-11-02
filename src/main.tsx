import "@fontsource-variable/bricolage-grotesque"
import "@fontsource/atkinson-hyperlegible-next/400.css"
import "@fontsource/atkinson-hyperlegible-next/700.css"
import "@fontsource/noto-sans-telugu/400.css"
import "@fontsource/noto-sans-telugu/700.css"
import "./index.css"
import "./app/i18n"
import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { RouterProvider } from "react-router"
import { envErrors } from "./app/env"
import { Providers } from "./app/providers"
import { router } from "./app/router"
import { AuthProvider } from "./features/auth/session"
import { registerServiceWorker } from "./app/pwa"

const root = createRoot(document.getElementById("root")!)

if (envErrors.length) {
  // Fail fast with a clear message (§7). Fix .env, then restart `pnpm dev`.
  root.render(
    <div style={{ fontFamily: "system-ui", maxWidth: 640, margin: "10vh auto", padding: 24 }}>
      <h1 style={{ fontSize: 24, fontWeight: 700 }}>Setup needed</h1>
      <p>Some settings in <code>.env</code> are missing or wrong. Run <code>pnpm env:check</code> for step-by-step help.</p>
      <ul>{envErrors.map((e) => <li key={e} style={{ margin: "8px 0" }}>{e}</li>)}</ul>
    </div>,
  )
} else {
  root.render(
    <StrictMode>
      <Providers>
        <AuthProvider>
          <RouterProvider router={router} />
        </AuthProvider>
      </Providers>
    </StrictMode>,
  )
  registerServiceWorker()
}
