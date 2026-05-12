import { useEffect, useMemo, useRef, useState } from "react"
import { useLanguage } from "../../contexts/LanguageContext"

// Cycle: user types Today's tasks → switches to a future day → types those →
// hits Run → agent reasons, then walks the plan in dependency order.
const CYCLE_MS = 17800
const HOLD_MS = 2400

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

const RUN_CLICK_MS = 6900
const AGENT_THINKING_FROM_MS = 7100
const AGENT_PLAN_FROM_MS = 8500
const PLAN_WORKING_FROM_MS = 8900
const STEP_DURATION_MS = 1100
const STEP_GAP_MS = 250

// Day assignments for each agent plan item (index-matched to demo.plannerDemo.agentPlan)
const AGENT_PLAN_DAYS = [DAY_TODAY, DAY_TODAY, DAY_WED, DAY_TODAY, DAY_WED]

function planTimingFor(i) {
    const workingFromMs = PLAN_WORKING_FROM_MS + i * (STEP_DURATION_MS + STEP_GAP_MS)
    return { workingFromMs, doneAtMs: workingFromMs + STEP_DURATION_MS }
}

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
    const AGENT_PLAN = useMemo(() => demoPd.agentPlan.map((item, i) => ({ day: AGENT_PLAN_DAYS[i], text: item.text, depends_on: item.depends_on })), [demoPd.agentPlan])

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
    const PLAN_END_MS = planTimingFor(AGENT_PLAN.length - 1).doneAtMs

    const agentPhase = (() => {
        if (elapsed < RUN_CLICK_MS) return "idle"
        if (elapsed < AGENT_THINKING_FROM_MS) return "click"
        if (elapsed < AGENT_PLAN_FROM_MS) return "thinking"
        if (elapsed < PLAN_END_MS + 250) return "running"
        return "done"
    })()
    const doneCount = AGENT_PLAN.reduce((n, _, i) => n + (elapsed >= planTimingFor(i).doneAtMs ? 1 : 0), 0)

    return (
        <section ref={sectionRef} className="mt-28">
            <style>{`
@keyframes pdFadeIn { from { opacity:0; transform: translateY(4px) } to { opacity:1; transform: translateY(0) } }
.pd-fade-in { animation: pdFadeIn .35s ease-out both }
@keyframes pdCaret { 0%,49% { opacity:1 } 50%,100% { opacity:0 } }
.pd-caret { animation: pdCaret .85s steps(1) infinite }
@keyframes pdRing {
  0%,100% { box-shadow: 0 0 0 0 rgba(255,255,255,0); }
  50%     { box-shadow: 0 0 0 4px rgba(255,255,255,0.10); }
}
.pd-ring { animation: pdRing 1.4s ease-in-out infinite }
@keyframes pdAgentSweep {
  0%   { transform: translateX(-100%); opacity: 0; }
  20%  { opacity: 1; }
  80%  { opacity: 1; }
  100% { transform: translateX(400%); opacity: 0; }
}
.pd-sweep { animation: pdAgentSweep 3.6s linear infinite; }
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
                            <span className="font-medium text-[var(--color-fg-muted)]">this-week-plan</span>
                            <span>· planner</span>
                        </div>
                        <div className="w-12" />
                    </div>

                    {/* Status banner */}
                    <AgentBanner phase={agentPhase} doneCount={doneCount} agentPlan={AGENT_PLAN} pd={pd} />

                    {/* Three columns: Calendar | Daily note | Agent */}
                    <div className="grid min-h-[460px] grid-cols-1 md:grid-cols-[24%_minmax(0,1fr)_36%]">
                        <CalendarPane selectedDay={selectedDay} elapsed={elapsed} pd={pd} />
                        <DailyNotePane selectedDay={selectedDay} elapsed={elapsed} todayTasks={TODAY_TASKS} wedTasks={WED_TASKS} todayNote={TODAY_NOTE} pd={pd} />
                        <AgentPane phase={agentPhase} elapsed={elapsed} doneCount={doneCount} agentPlan={AGENT_PLAN} pd={pd} />
                    </div>
                </div>
            </div>
        </section>
    )
}

function AgentBanner({ phase, doneCount, agentPlan, pd }) {
    const messages = {
        idle: pd.agentBanner.idle,
        click: pd.agentBanner.click,
        thinking: pd.agentBanner.thinking,
        running: pd.agentBanner.running(doneCount, agentPlan.length),
        done: pd.agentBanner.done(agentPlan.length),
    }
    const showSweep = phase === "thinking" || phase === "running"
    const rightLabel = phase === "idle" ? pd.agentRight.idle
        : phase === "done" ? pd.agentRight.done
        : pd.agentRight.live

    return (
        <div className="relative flex items-center justify-between border-b border-[var(--color-line-soft)] bg-gradient-to-r from-emerald-500/[0.04] via-amber-500/[0.04] to-violet-500/[0.04] px-4 py-2">
            <div className="flex min-w-0 items-center gap-2">
                <SparkIcon active={phase !== "idle" && phase !== "done"} />
                <span className="truncate text-[11px] text-[var(--color-fg-muted)]">{messages[phase]}</span>
            </div>
            <span className="shrink-0 text-[10px] tabular-nums text-[var(--color-fg-subtle)]">{rightLabel}</span>
            {showSweep && (
                <div className="pointer-events-none absolute inset-x-0 -bottom-px h-px overflow-hidden">
                    <div className="pd-sweep h-full w-1/3 bg-gradient-to-r from-transparent via-emerald-300/70 to-transparent" />
                </div>
            )}
        </div>
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
        <div className="flex min-h-0 flex-col border-b border-[var(--color-line-soft)] bg-[var(--color-canvas)] md:border-b-0 md:border-r">
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

/* ----- Agent pane --------------------------------------------------------- */

function AgentPane({ phase, elapsed, doneCount, agentPlan, pd }) {
    return (
        <div className="flex min-h-0 flex-col bg-[var(--color-surface-1)]">
            <div className="flex items-center justify-between border-b border-[var(--color-line-soft)] px-4 py-2">
                <div className="flex items-center gap-2">
                    <span className="text-[10px] font-semibold uppercase tracking-widest text-[var(--color-fg-subtle)]">
                        {pd.agent}
                    </span>
                    <span className="text-[11px] text-[var(--color-fg-subtle)]">·</span>
                    <span className="text-[11px] text-[var(--color-fg-muted)]">
                        {phase === "idle" ? pd.agentHeader.idle :
                         phase === "click" || phase === "thinking" ? pd.agentHeader.reasoning :
                         phase === "running" ? pd.agentHeader.working(doneCount, agentPlan.length) :
                         pd.agentHeader.done(agentPlan.length)}
                    </span>
                </div>
                <RunOrStatusBtn phase={phase} elapsed={elapsed} pd={pd} />
            </div>

            <div className="flex-1 overflow-hidden px-4 py-3.5">
                {phase === "idle" && <IdleBody pd={pd} />}
                {(phase === "click" || phase === "thinking") && <ThinkingBody pd={pd} />}
                {(phase === "running" || phase === "done") && <PlanBody elapsed={elapsed} agentPlan={agentPlan} pd={pd} />}
            </div>
        </div>
    )
}

function RunOrStatusBtn({ phase, elapsed, pd }) {
    const showClick = elapsed >= RUN_CLICK_MS - 200 && elapsed < RUN_CLICK_MS + 300
    if (phase === "idle" || phase === "click") {
        return (
            <div className="relative">
                <button
                    className={`inline-flex items-center gap-1 rounded-md bg-white px-2 py-0.5 text-[11px] font-medium text-black transition-transform ${showClick ? "scale-95" : ""}`}
                >
                    <SparkIcon size={11} /> {pd.run}
                </button>
                {showClick && (
                    <span className="pointer-events-none absolute inset-0 flex items-center justify-center">
                        <span className="pd-click h-full w-full rounded-md bg-emerald-400/40" />
                    </span>
                )}
            </div>
        )
    }
    return (
        <span className="inline-flex items-center gap-1.5 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] text-emerald-300">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            {phase === "done" ? pd.complete : pd.running}
        </span>
    )
}

function IdleBody({ pd }) {
    return (
        <div className="space-y-2.5">
            <div className="rounded-lg border border-[var(--color-line-soft)] bg-[var(--color-surface-2)] p-2.5">
                <div className="text-[9px] font-semibold uppercase tracking-widest text-[var(--color-fg-subtle)]">
                    {pd.willRead}
                </div>
                <ul className="mt-1.5 space-y-0.5 text-[11px]">
                    <li className="flex items-center justify-between">
                        <span className="text-[var(--color-fg)]">Tue · May 5</span>
                        <span className="text-[var(--color-fg-subtle)]">3 {pd.open}</span>
                    </li>
                    <li className="flex items-center justify-between">
                        <span className="text-[var(--color-fg)]">Thu · May 7</span>
                        <span className="text-[var(--color-fg-subtle)]">2 {pd.open}</span>
                    </li>
                </ul>
            </div>
            <p className="text-[10px] leading-relaxed text-[var(--color-fg-subtle)]">
                {pd.subtitle}
            </p>
        </div>
    )
}

function ThinkingBody({ pd }) {
    return (
        <div className="space-y-2.5">
            <div className="flex items-center gap-1.5 text-[11px] text-[var(--color-fg-muted)]">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 lp-dot" />
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 lp-dot" style={{ animationDelay: "0.16s" }} />
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 lp-dot" style={{ animationDelay: "0.32s" }} />
                <span className="ms-1">{pd.readingTasks}</span>
            </div>
            {[0, 1, 2].map(i => (
                <div key={i} className="rounded-md border border-[var(--color-line-soft)] bg-[var(--color-surface-2)] p-2">
                    <div className="h-2 w-2/3 rounded bg-[var(--color-surface-3)]" />
                    <div className="mt-1.5 h-1.5 w-1/2 rounded bg-[var(--color-surface-3)]/60" />
                </div>
            ))}
        </div>
    )
}

function PlanBody({ elapsed, agentPlan, pd }) {
    return (
        <div className="space-y-2 overflow-hidden">
            <div className="rounded-md border border-[var(--color-line-soft)] bg-[var(--color-surface-2)] px-2.5 py-1.5 text-[10px] leading-relaxed text-[var(--color-fg-muted)]">
                {pd.planNote}
            </div>
            <ol className="space-y-1.5">
                {agentPlan.map((entry, i) => (
                    <PlanItem key={i} index={i} entry={entry} elapsed={elapsed} needsLabel={pd.needs} />
                ))}
            </ol>
        </div>
    )
}

function PlanItem({ index, entry, elapsed, needsLabel }) {
    const { workingFromMs, doneAtMs } = planTimingFor(index)
    const status =
        elapsed >= doneAtMs ? "done" :
        elapsed >= workingFromMs ? "working" :
        "queued"

    const isDone = status === "done"
    const isWorking = status === "working"

    return (
        <li
            className={[
                "rounded-md border px-2.5 py-1.5 transition-colors",
                isWorking
                    ? "border-emerald-500/40 bg-emerald-500/[0.07] pd-ring"
                    : isDone
                        ? "border-[var(--color-line-soft)] bg-[var(--color-surface-2)]"
                        : "border-[var(--color-line-soft)] bg-[var(--color-surface-1)]",
            ].join(" ")}
        >
            <div className="flex items-start gap-2">
                <StatusDot status={status} index={index} />
                <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline gap-x-1.5">
                        <span className={`text-[12px] leading-snug ${isDone ? "line-through text-[var(--color-fg-muted)]" : "text-[var(--color-fg)]"}`}>
                            {entry.text}
                        </span>
                        <span className={`text-[9px] uppercase tracking-wider ${entry.day.key === "today" ? "text-emerald-300/80" : "text-violet-300/80"}`}>
                            {entry.day.label}
                        </span>
                    </div>
                    {entry.depends_on.length > 0 && status !== "done" && (
                        <div className="mt-0.5 text-[9px] text-[var(--color-fg-subtle)]">
                            {needsLabel} {entry.depends_on.join(", ")}
                        </div>
                    )}
                </div>
            </div>
        </li>
    )
}

function StatusDot({ status, index }) {
    if (status === "done") {
        return (
            <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-emerald-500/40 bg-emerald-500/15 text-emerald-300">
                <CheckIcon />
            </span>
        )
    }
    if (status === "working") {
        return (
            <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-emerald-500/40 bg-emerald-500/[0.08]">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
            </span>
        )
    }
    return (
        <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-[var(--color-line)] bg-[var(--color-surface-2)] text-[9px] text-[var(--color-fg-subtle)]">
            {index + 1}
        </span>
    )
}

function SparkIcon({ active = true, size = 12 }) {
    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={active ? "text-emerald-300" : "text-[var(--color-fg-subtle)]"}
        >
            <path d="M12 2v4" />
            <path d="M12 18v4" />
            <path d="M2 12h4" />
            <path d="M18 12h4" />
            <path d="M5 5l2.8 2.8" />
            <path d="M16.2 16.2L19 19" />
            <path d="M5 19l2.8-2.8" />
            <path d="M16.2 7.8L19 5" />
        </svg>
    )
}

function CheckIcon() {
    return (
        <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
        </svg>
    )
}

export default PlannerDemo
