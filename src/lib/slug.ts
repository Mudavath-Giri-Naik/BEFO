export const RESERVED_SLUGS = new Set([
  "admin", "app", "api", "me", "login", "logout", "signup", "explore", "hostels", "messes", "p", "c", "j",
  "compare", "demo", "help", "privacy", "terms", "about", "for-owners", "list-your-place", "settings",
  "static", "assets", "www", "mail", "support", "befo", "root", "null", "undefined", "new", "edit",
])

export function slugify(name: string): string {
  return name.toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "")
    .replace(/&/g, " and ").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 30).replace(/-+$/, "")
}

export function validateSlug(slug: string): string | null {
  if (slug.length < 3 || slug.length > 30) return "Use 3 to 30 characters."
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) return "Use small letters, numbers and single dashes."
  if (RESERVED_SLUGS.has(slug)) return "This name is reserved. Try another."
  return null
}
