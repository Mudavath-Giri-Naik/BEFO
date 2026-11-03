// Used only by the self-contained preview build, where service workers are not available.
export function registerSW() {
  return () => Promise.resolve()
}
