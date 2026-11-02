import { toast } from "sonner"

/** Registers the service worker in production and offers an update when a new version is ready. */
export function registerServiceWorker() {
  if (import.meta.env.DEV || !("serviceWorker" in navigator)) return
  void import("virtual:pwa-register").then(({ registerSW }) => {
    const update = registerSW({
      onNeedRefresh() {
        toast("A new version is ready", { action: { label: "Update", onClick: () => update(true) }, duration: Infinity })
      },
    })
  })
}
