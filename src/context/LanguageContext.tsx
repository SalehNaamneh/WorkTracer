import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import translations, { Lang, Translations } from '../i18n/translations'

interface LanguageContextType {
  lang: Lang
  s: Translations
  isRTL: boolean
  toggleLang: () => void
}

const LanguageContext = createContext<LanguageContextType | null>(null)

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>(() => {
    return (localStorage.getItem('lang') as Lang) || 'en'
  })

  const isRTL = lang === 'he'
  const s = translations[lang]

  useEffect(() => {
    document.documentElement.dir = isRTL ? 'rtl' : 'ltr'
    document.documentElement.lang = lang
    localStorage.setItem('lang', lang)
  }, [lang, isRTL])

  const toggleLang = () => setLang(l => (l === 'en' ? 'he' : 'en'))

  return (
    <LanguageContext.Provider value={{ lang, s, isRTL, toggleLang }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  const ctx = useContext(LanguageContext)
  if (!ctx) throw new Error('useLanguage must be used inside LanguageProvider')
  return ctx
}
