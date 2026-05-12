import { useNavigate } from 'react-router-dom'
import { useLanguage } from '../../contexts/LanguageContext'

function Navigation({ mobileOpen, setMobileOpen }) {
  const navigate = useNavigate()
  const { t, lang, setLang } = useLanguage()

  function toggleLang() {
    setLang(lang === 'en' ? 'ar' : 'en')
  }

  return (
    <header className="sticky top-0 z-30 backdrop-blur-md bg-[var(--color-canvas)]/70 border-b border-[var(--color-line-soft)]">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        {/* Logo */}
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 text-[var(--color-fg)] hover:opacity-90"
        >
          <img src="/logo-white.png" width={26} height={26} alt="Glyph" />
          <span className="font-semibold tracking-tight">Glyph</span>
          <span className="ms-1 hidden rounded-full border border-[var(--color-line)] px-2 py-0.5 text-[10px] uppercase tracking-wider text-[var(--color-fg-muted)] md:inline">
            {t.nav.beta}
          </span>
        </button>

        {/* Center links */}
        <nav className="hidden items-center gap-8 text-sm text-[var(--color-fg-muted)] md:flex">
          <a className="hover:text-[var(--color-fg)] transition-colors" href="#features">{t.nav.features}</a>
          <a className="hover:text-[var(--color-fg)] transition-colors" href="#pricing">{t.nav.pricing}</a>
          <a className="hover:text-[var(--color-fg)] transition-colors" href="#docs">{t.nav.docs}</a>
        </nav>

        {/* Right CTAs */}
        <div className="hidden items-center gap-2 md:flex">
          {/* Language toggle */}
          <button
            onClick={toggleLang}
            className="rounded-full px-3 py-1.5 text-xs font-medium text-[var(--color-fg-muted)] border border-[var(--color-line)] hover:border-[var(--color-fg-subtle)] hover:text-[var(--color-fg)] transition-colors"
            title={lang === 'en' ? 'Switch to Arabic' : 'التحويل إلى الإنجليزية'}
          >
            {t.nav.langLabel}
          </button>
          <button
            onClick={() => navigate('/login')}
            className="rounded-full px-4 py-2 text-sm text-[var(--color-fg-muted)] hover:text-[var(--color-fg)] transition-colors"
          >
            {t.nav.login}
          </button>
          <button
            onClick={() => navigate('/getstarted')}
            className="group inline-flex items-center gap-1.5 rounded-full bg-white px-4 py-2 text-sm font-medium text-black transition-all hover:bg-[var(--color-brand)]"
          >
            {t.nav.getStarted}
            <span className="transition-transform group-hover:translate-x-0.5 rtl:rotate-180">{t.arrow}</span>
          </button>
        </div>

        {/* Mobile toggle */}
        <button
          aria-label="Menu"
          className="rounded-lg border border-[var(--color-line)] p-2 md:hidden"
          onClick={() => setMobileOpen(!mobileOpen)}
        >
          <div className="flex h-4 w-5 flex-col justify-between">
            <span className={`h-px w-full bg-current transition-transform ${mobileOpen ? 'translate-y-[7px] rotate-45' : ''}`} />
            <span className={`h-px w-full bg-current transition-opacity ${mobileOpen ? 'opacity-0' : ''}`} />
            <span className={`h-px w-full bg-current transition-transform ${mobileOpen ? '-translate-y-[7px] -rotate-45' : ''}`} />
          </div>
        </button>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="border-t border-[var(--color-line-soft)] md:hidden">
          <div className="mx-auto flex max-w-6xl flex-col gap-1 px-6 py-4 text-sm">
            <a className="rounded-lg px-3 py-3 text-[var(--color-fg-muted)] hover:bg-[var(--color-surface-2)]" href="#features">{t.nav.features}</a>
            <a className="rounded-lg px-3 py-3 text-[var(--color-fg-muted)] hover:bg-[var(--color-surface-2)]" href="#pricing">{t.nav.pricing}</a>
            <a className="rounded-lg px-3 py-3 text-[var(--color-fg-muted)] hover:bg-[var(--color-surface-2)]" href="#docs">{t.nav.docs}</a>
            <div className="my-2 border-t border-[var(--color-line-soft)]" />
            <button
              onClick={toggleLang}
              className="rounded-lg px-3 py-3 text-start text-[var(--color-fg-muted)] hover:bg-[var(--color-surface-2)]"
            >
              {lang === 'en' ? '🌐 العربية' : '🌐 English'}
            </button>
            <button
              onClick={() => { navigate('/login'); setMobileOpen(false) }}
              className="rounded-lg px-3 py-3 text-start text-[var(--color-fg)] hover:bg-[var(--color-surface-2)]"
            >
              {t.nav.login}
            </button>
            <button
              onClick={() => { navigate('/getstarted'); setMobileOpen(false) }}
              className="mt-1 rounded-lg bg-white px-3 py-3 text-start text-sm font-medium text-black hover:bg-[var(--color-brand)]"
            >
              {t.nav.getStarted} {t.arrow}
            </button>
          </div>
        </div>
      )}
    </header>
  )
}

export default Navigation
