import i18n from "i18next"
import LanguageDetector from "i18next-browser-languagedetector"
import { initReactI18next } from "react-i18next"
import en from "@/locales/en.json"
import te from "@/locales/te.json"

void i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: { en: { translation: en }, te: { translation: te } },
    fallbackLng: "en",
    supportedLngs: ["en", "te"],
    interpolation: { escapeValue: false },
    detection: { order: ["localStorage", "navigator"], lookupLocalStorage: "befo-lang", caches: ["localStorage"] },
  })

i18n.on("languageChanged", (l) => {
  document.documentElement.lang = l
})
document.documentElement.lang = i18n.resolvedLanguage ?? "en"

export default i18n
