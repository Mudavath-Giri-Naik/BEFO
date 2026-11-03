/**
 * Registers the service worker in production. New versions install and take over on their own (no "Update" button):
 * the page reloads into the new version as soon as it is safe, i.e. not while someone is typing or has a dialog open.
 */
export function registerServiceWorker() {
  if (import.meta.env.DEV || !("serviceWorker" in navigator)) return

  // A lazy chunk from the previous deploy is gone after a release; load the new version instead of showing an error.
  window.addEventListener("vite:preloadError", (e) => {
    e.preventDefault()
    reloadWhenSafe()
  })

  void import("virtual:pwa-register").then(({ registerSW }) => {
    registerSW({
      immediate: true,
      onNeedReload: reloadWhenSafe,
      onRegisteredSW(_url, reg) {
        if (!reg) return
        // People keep the app open for days: look for a new version when they come back to it and every 30 minutes.
        const check = () => { if (navigator.onLine) void reg.update().catch(() => {}) }
        document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") check() })
        setInterval(check, 30 * 60 * 1000)
      },
    })
  })
}

let reloading = false

function busy() {
  const el = document.activeElement as HTMLElement | null
  const typing = !!el && (el.isContentEditable || (/^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName) && (el as HTMLInputElement).value !== ""))
  return typing || !!document.querySelector('[role="dialog"], [role="alertdialog"]')
}

function reloadWhenSafe() {
  if (reloading) return
  reloading = true
  const go = () => {
    if (document.visibilityState === "hidden" || !busy()) window.location.reload()
    else setTimeout(go, 2000)
  }
  go()
}
