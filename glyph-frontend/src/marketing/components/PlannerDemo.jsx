import { useEffect, useMemo, useRef, useState } from "react"
import { useLanguage } from "../../contexts/LanguageContext"

const CYCLE_MS = 14000
const HOLD_MS = 2000

const DAY_TODAY = { key: "today", num: 5, label: "Today", sub: "Tue · May 5" }
const DAY_WED = { key: "wed", num: 7, label: "Thu", sub: "Thu · May 7" }

const TODAY_TASK_TIMINGS = [
    { typeFromMs: 300, typeMs: 800 },
    { typeFromMs: 1200, typeMs: 850 },
    { typeFromMs: 2150, typeMs: 850 },
]
const TODAY_NOTE_TIMING = { typeFromMs: 3100, typeMs: 900 }

const SWITCH_TO_WED_MS = 4150

const WED_TASK_TIMINGS = [
    { typeFromMs: 4400, typeMs: 1000 },
    { typeFromMs: 5500, typeMs: 950 },
]

// May 2026 grid (May 1 is a Friday)
const MAY_2026 = [
    [null, null, null, null, 1, 2, 3],
    [4, 5, 6, 7, 8, 9, 10],
    [11, 12, 13, 14, 15, 16, 17],
    [18, 19, 20, 21, 22, 23, 24],
    [25, 26, 27, 28, 29, 30, 31],
]

function PlannerDemo() {
    const sectionRef = useRef(null)
    const [inView, setInView] = useState(false)
    const [elapsed, setElapsed] = useState(0)
    const { t } = useLanguage()
    const pd = t.plannerDemo
    const demoPd = t.demo.plannerDemo

    const TODAY_TASKS = useMemo(() => demoPd.todayTasks.map((text, i) => ({ text, ...TODAY_TASK_TIMINGS[i] })), [demoPd.todayTasks])
    const TODAY_NOTE = useMemo(() => ({ text: demoPd.todayNote, ...TODAY_NOTE_TIMING }), [demoPd.todayNote])
    const WED_TASKS = useMemo(() => demoPd.wedTasks.map((text, i) => ({ text, ...WED_TASK_TIMINGS[i] })), [demoPd.wedTasks])

    useEffect(() => {
        const el = sectionRef.current
        if (!el) return
        const obs = new IntersectionObserver(
            entries => setInView(entries[0]?.isIntersecting ?? false),
            { threshold: 0.15 }
        )
        obs.observe(el)
        return () => obs.disconnect()
    }, [])

    useEffect(() => {
        if (!inView) return
        let raf
        let last = performance.now()
        const tick = (now) => {
            setElapsed(prev => (prev + (now - last)) % (CYCLE_MS + HOLD_MS))
            last = now
            raf = requestAnimationFrame(tick)
        }
        raf = requestAnimationFrame(tick)
        return () => cancelAnimationFrame(raf)
    }, [inView])

    const selectedDay = elapsed < SWITCH_TO_WED_MS ? DAY_TODAY : DAY_WED

    return (
        <section ref={sectionRef} className="mt-28">
            <style>{`
@keyframes pdFadeIn { from { opacity:0; transform: translateY(4px) } to { opacity:1; transform: translateY(0) } }
.pd-fade-in { animation: pdFadeIn .35s ease-out both }
@keyframes pdCaret { 0%,49% { opacity:1 } 50%,100% { opacity:0 } }
.pd-caret { animation: pdCaret .85s steps(1) infinite }
@keyframes pdClickPulse {
  0%   { transform: scale(0.6); opacity: 0.8; }
  100% { transform: scale(2.2); opacity: 0; }
}
.pd-click { animation: pdClickPulse .6s ease-out both; }
            `}</style>

            <div className="text-center">
                <h2 className="font-[var(--font-display)] text-3xl font-semibold tracking-tight md:text-4xl">
                    {pd.headline1}{' '}
                    <span className="bg-gradient-to-r from-emerald-300 via-amber-300 to-violet-300 bg-clip-text text-transparent">
                        {pd.headline2}
                    </span>
                </h2>
                <p className="mx-auto mt-3 max-w-xl text-sm text-[var(--color-fg-muted)] md:text-base">
                    {pd.subtitle}
                </p>
            </div>

            <div className="relative mt-12 md:mt-14">
                <div className="absolute -inset-x-8 -inset-y-4 -z-10 rounded-[32px] bg-gradient-to-br from-emerald-500/10 via-amber-500/10 to-violet-500/10 blur-2xl" />
                <div className="overflow-hidden rounded-2xl border border-[var(--color-line)] bg-[var(--color-surface-1)] shadow-2xl">
                    {/* Window chrome */}
                    <div className="flex items-center justify-between border-b border-[var(--color-line-soft)] bg-[var(--color-surface-2)] px-4 py-3">
                        <div className="flex items-center gap-1.5">
                            <span className="h-2.5 w-2.5 rounded-full bg-rose-400/70" />
                            <span className="h-2.5 w-2.5 rounded-full bg-amber-400/70" />
                            <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/70" />
                        </div>
                        <div className="flex items-center gap-2 text-xs text-[var(--color-fg-subtle)]">
                            <span className="font-medium text-[var(--color-fg-muted)]">this-week-notes</span>
                            <span>· planner</span>
                        </div>
                        <div className="w-12" />
                    </div>

                    {/* Two columns: Calendar | Daily note */}
                    <div className="grid min-h-[420px] grid-cols-1 md:grid-cols-[30%_minmax(0,1fr)]">
                        <CalendarPane selectedDay={selectedDay} elapsed={elapsed} pd={pd} />
                        <DailyNotePane selectedDay={selectedDay} elapsed={elapsed} todayTasks={TODAY_TASKS} wedTasks={WED_TASKS} todayNote={TODAY_NOTE} pd={pd} />
                    </div>
                </div>
            </div>
        </section>
    )
}

/* ----- Calendar pane (mini month grid) ------------------------------------ */

function CalendarPane({ selectedDay, elapsed, pd }) {
    const todayNum = DAY_TODAY.num
    const wedNum = DAY_WED.num
    const showClick = elapsed >= SWITCH_TO_WED_MS - 250 && elapsed < SWITCH_TO_WED_MS + 350

    return (
        <div className="flex flex-col gap-3 border-b border-[var(--color-line-soft)] p-4 md:border-b-0 md:border-r">
            <div className="flex items-center justify-between">
                <span className="text-[10px] font-semibold uppercase tracking-widest text-[var(--color-fg-subtle)]">
                    {pd.calendar}
                </span>
                <span className="text-[10px] text-[var(--color-fg-subtle)]">May 2026</span>
            </div>

            <div className="grid grid-cols-7 gap-1 text-center">
                {pd.weekdays.map((d, i) => (
                    <div key={i} className="text-[9px] font-medium uppercase tracking-wider text-[var(--color-fg-subtle)]">
                        {d}
                    </div>
                ))}
                {MAY_2026.flat().map((d, i) => {
                    if (d === null) return <div key={`empty-${i}`} />
                    const isToday = d === todayNum
                    const isWed = d === wedNum
                    const isSelected =
                        (selectedDay.key === "today" && isToday) ||
                        (selectedDay.key === "wed" && isWed)
                    const hasNote = isToday || isWed

                    return (
                        <div
                            key={`d-${d}`}
                            className={[
                                "relative flex aspect-square items-center justify-center rounded-md text-[10px] transition-colors",
                                isSelected
                                    ? "bg-[var(--color-fg)] font-semibold text-[var(--color-canvas)]"
                                    : isToday
                                        ? "border border-emerald-500/50 text-[var(--color-fg)]"
                                        : "text-[var(--color-fg-muted)]",
                            ].join(" ")}
                        >
                            {d}
                            {hasNote && !isSelected && (
                                <span className="absolute bottom-0.5 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-emerald-400" />
                            )}
                            {showClick && isWed && (
                                <span className="pointer-events-none absolute inset-0 flex items-center justify-center">
                                    <span className="pd-click h-full w-full rounded-md bg-violet-400/40" />
                                </span>
                            )}
                        </div>
                    )
                })}
            </div>

            <div className="mt-auto space-y-1.5 text-[10px] text-[var(--color-fg-subtle)]">
                <div className="flex items-center gap-1.5">
                    <span className="h-1 w-1 rounded-full bg-emerald-400" />
                    <span>{pd.dayWithNote}</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-sm border border-emerald-500/50" />
                    <span>{pd.today}</span>
                </div>
            </div>
        </div>
    )
}

/* ----- Daily note pane ---------------------------------------------------- */

function DailyNotePane({ selectedDay, elapsed, todayTasks, wedTasks, todayNote, pd }) {
    const isToday = selectedDay.key === "today"
    const tasks = isToday ? todayTasks : wedTasks
    const note = isToday ? todayNote : null

    return (
        <div className="flex min-h-0 flex-col bg-[var(--color-canvas)]">
            <div className="flex items-center justify-between border-b border-[var(--color-line-soft)] bg-[var(--color-surface-1)] px-4 py-2">
                <div className="flex items-center gap-2">
                    <span className="text-[10px] font-semibold uppercase tracking-widest text-[var(--color-fg-subtle)]">
                        {pd.dailyNote}
                    </span>
                    <span className="text-[11px] text-[var(--color-fg-subtle)]">·</span>
                    <span className="text-[11px] text-[var(--color-fg-muted)]">{selectedDay.sub}</span>
                </div>
                <span className="text-[10px] text-[var(--color-fg-subtle)]">
                    {tasks.length} {tasks.length === 1 ? pd.task : pd.tasks}
                </span>
            </div>

            <div key={selectedDay.key} className="pd-fade-in flex-1 space-y-3 px-5 py-4 font-mono text-[12px] leading-relaxed">
                <div className="text-[var(--color-fg-subtle)]"># {selectedDay.label} · {selectedDay.sub.split(' · ')[1]}</div>
                <div className="text-[var(--color-fg-subtle)]">## Tasks</div>
                <ul className="space-y-1">
                    {tasks.map((t, i) => (
                        <NoteTaskLine key={`${selectedDay.key}-${i}`} task={t} elapsed={elapsed} />
                    ))}
                </ul>
                {note && (
                    <>
                        <div className="text-[var(--color-fg-subtle)]">## Note</div>
                        <NoteText note={note} elapsed={elapsed} />
                    </>
                )}
            </div>
        </div>
    )
}

function NoteTaskLine({ task, elapsed }) {
    const local = elapsed - task.typeFromMs
    const visible = local >= 0
    const fraction = Math.min(Math.max(local / task.typeMs, 0), 1)
    const charsToShow = Math.floor(task.text.length * fraction)
    const text = task.text.slice(0, charsToShow)
    const isTyping = fraction > 0 && fraction < 1

    return (
        <li className={`flex items-start gap-2 transition-opacity duration-200 ${visible ? "opacity-100" : "opacity-0"}`}>
            <span className="text-[var(--color-fg-subtle)]">- [ ]</span>
            <span className="text-[var(--color-fg)]">
                {text}
                {isTyping && (
                    <span className="pd-caret ml-0.5 inline-block h-[0.9em] w-[1.5px] translate-y-[1px] bg-[var(--color-fg-subtle)] align-middle" />
                )}
            </span>
        </li>
    )
}

function NoteText({ note, elapsed }) {
    const local = elapsed - note.typeFromMs
    const visible = local >= 0
    const fraction = Math.min(Math.max(local / note.typeMs, 0), 1)
    const charsToShow = Math.floor(note.text.length * fraction)
    const text = note.text.slice(0, charsToShow)
    const isTyping = fraction > 0 && fraction < 1

    return (
        <p className={`transition-opacity duration-200 ${visible ? "opacity-100" : "opacity-0"} text-[var(--color-fg)]`}>
            {text}
            {isTyping && (
                <span className="pd-caret ml-0.5 inline-block h-[0.9em] w-[1.5px] translate-y-[1px] bg-[var(--color-fg-subtle)] align-middle" />
            )}
        </p>
    )
}

export default PlannerDemo
