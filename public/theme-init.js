// No-flash theme: runs before paint (kept outside index.html so the CSP needs no 'unsafe-inline').
try {
  var t = localStorage.getItem("befo-theme") || "light";
  if (t === "dark" || (t === "system" && matchMedia("(prefers-color-scheme: dark)").matches)) document.documentElement.classList.add("dark");
} catch (e) {}
