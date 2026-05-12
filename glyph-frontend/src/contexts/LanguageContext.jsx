import { createContext, useContext, useState, useEffect } from 'react'
import { en } from '../i18n/en'
import { ar } from '../i18n/ar'

const translations = { en, ar }

const LanguageContext = createContext(null)

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState(
    () => localStorage.getItem('glyph-lang') || 'en'
  )

  function setLang(next) {
    setLangState(next)
    localStorage.setItem('glyph-lang', next)
  }

  useEffect(() => {
    const isAr = lang === 'ar'
    document.documentElement.setAttribute('dir', isAr ? 'rtl' : 'ltr')
    document.documentElement.setAttribute('lang', lang)
    document.documentElement.classList.toggle('lang-ar', isAr)
  }, [lang])

  return (
    <LanguageContext.Provider value={{ lang, setLang, t: translations[lang] }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  return useContext(LanguageContext)
}
