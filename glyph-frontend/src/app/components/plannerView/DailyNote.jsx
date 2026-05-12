import { useEffect, useMemo, useRef, useState } from "react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { useLanguage } from "../../../contexts/LanguageContext"

function formatHumanDate(dateKey, lang) {
    if (!dateKey) return ""
    const [y, m, d] = dateKey.split("-").map(n => parseInt(n, 10))
    const date = new Date(y, m - 1, d)
    return date.toLocaleDateString(lang === 'ar' ? 'ar-SA' : undefined, {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
    })
}

function DailyNote({ dateKey, value, onChange }) {
    const { t, lang } = useLanguage()
    const pd = t.plannerDemo
    const [mode, setMode] = useState("write")
    const [draft, setDraft] = useState(value ?? "")
    const debounceRef = useRef(null)
    const lastDateRef = useRef(dateKey)

    useEffect(() => {
        if (lastDateRef.current !== dateKey) {
            if (debounceRef.current) {
                clearTimeout(debounceRef.current)
                debounceRef.current = null
            }
            setDraft(value ?? "")
            lastDateRef.current = dateKey
        }
    }, [dateKey, value])

    useEffect(() => {
        if (lastDateRef.current === dateKey && (value ?? "") !== draft && debounceRef.current === null) {
            setDraft(value ?? "")
        }
    }, [value, dateKey, draft])

    function handleChange(e) {
        const next = e.target.value
        setDraft(next)
        if (debounceRef.current) clearTimeout(debounceRef.current)
        debounceRef.current = setTimeout(() => {
            onChange(dateKey, next)
            debounceRef.current = null
        }, 300)
    }

    function handleBlur() {
        if (debounceRef.current) {
            clearTimeout(debounceRef.current)
            debounceRef.current = null
        }
        onChange(dateKey, draft)
    }

    const taskCount = useMemo(() => {
        const matches = draft.match(/^\s*- \[[ xX]\]/gm)
        return matches ? matches.length : 0
    }, [draft])

    const doneCount = useMemo(() => {
        const matches = draft.match(/^\s*- \[[xX]\]/gm)
        return matches ? matches.length : 0
    }, [draft])

    const placeholder = pd.dailyPlaceholder(formatHumanDate(dateKey, lang))

    return (
        <section className="flex min-h-0 flex-1 flex-col border-[var(--color-line-soft)] bg-[var(--color-surface-1)] md:border-l">
            <div className="flex items-center justify-between border-b border-[var(--color-line-soft)] px-4 py-2">
                <div className="flex min-w-0 items-center gap-2">
                    <span className="text-[10px] font-semibold uppercase tracking-widest text-[var(--color-fg-subtle)]">
                        {pd.dailyNote}
                    </span>
                    <span className="text-[11px] text-[var(--color-fg-muted)]">·</span>
                    <span className="truncate text-[11px] text-[var(--color-fg-muted)]">
                        {formatHumanDate(dateKey, lang)}
                    </span>
                </div>
                <div className="flex items-center gap-2">
                    {taskCount > 0 && (
                        <span className="text-[10px] text-[var(--color-fg-subtle)]">
                            {pd.doneFrac(doneCount, taskCount)}
                        </span>
                    )}
                    <div className="flex items-center gap-0.5 rounded-md border border-[var(--color-line)] p-0.5">
                        <ModeBtn active={mode === "write"} onClick={() => setMode("write")}>{pd.write}</ModeBtn>
                        <ModeBtn active={mode === "preview"} onClick={() => setMode("preview")}>{pd.preview}</ModeBtn>
                    </div>
                </div>
            </div>

            {mode === "write" ? (
                <textarea
                    value={draft}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    placeholder={placeholder}
                    spellCheck="false"
                    className="lp-scroll min-h-0 flex-1 resize-none bg-transparent px-5 py-4 font-mono text-[13px] leading-relaxed text-[var(--color-fg)] placeholder:text-[var(--color-fg-subtle)] outline-none"
                />
            ) : (
                <div className="lp-scroll min-h-0 flex-1 overflow-y-auto px-5 py-4">
                    {draft.trim() === "" ? (
                        <p className="text-sm text-[var(--color-fg-subtle)]">{pd.nothingHereYet}</p>
                    ) : (
                        <div className="prose prose-invert max-w-none text-sm leading-relaxed">
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>{draft}</ReactMarkdown>
                        </div>
                    )}
                </div>
            )}
        </section>
    )
}

function ModeBtn({ children, active, onClick }) {
    return (
        <button
            onClick={onClick}
            className={`rounded px-2 py-0.5 text-[11px] transition-colors ${
                active
                    ? "bg-[var(--color-surface-3)] text-[var(--color-fg)]"
                    : "text-[var(--color-fg-subtle)] hover:text-[var(--color-fg-muted)]"
            }`}
        >
            {children}
        </button>
    )
}

export default DailyNote
