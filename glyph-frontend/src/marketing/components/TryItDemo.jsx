import { useEffect, useRef, useState, Fragment } from "react"

const GROUP_KEYS = {
    chat: ['team', 'models', 'files'],
    planner: ['calendar', 'daily', 'agent'],
}
const GROUP_TITLES = { chat: 'launch-plan', planner: 'this-week-plan' }

function TryItDemo() {
    const sectionRef = useRef(null)
    const splitRef = useRef(null)
    const [inView, setInView] = useState(false)
    const [interacted, setInteracted] = useState(false)
    const [viewGroup, setViewGroup] = useState('chat')
    const [openPanels, setOpenPanels] = useState({
        team: true, models: true, files: true,
        calendar: true, daily: true, agent: true,
    })
    const [panelWidths, setPanelWidths] = useState({
        team: 33, models: 34, files: 33,
        calendar: 24, daily: 42, agent: 34,
    })
    const [isResizing, setIsResizing] = useState(false)
    const [activeResize, setActiveResize] = useState(null)

    useEffect(() => {
        const el = sectionRef.current
        if (!el) return
        const obs = new IntersectionObserver(
            entries => setInView(entries[0]?.isIntersecting ?? false),
            { threshold: 0.2 }
        )
        obs.observe(el)
        return () => obs.disconnect()
    }, [])

    useEffect(() => {
        if (!isResizing || !activeResize) return
        function onMove(e) {
            const container = splitRef.current
            if (!container) return
            const rect = container.getBoundingClientRect()
            const deltaPx = e.clientX - activeResize.startX
            const deltaPct = (deltaPx / rect.width) * 100
            const MIN = 18
            let newLeft = activeResize.startLeft + deltaPct
            let newRight = activeResize.startRight - deltaPct
            if (newLeft < MIN) { newRight -= (MIN - newLeft); newLeft = MIN }
            if (newRight < MIN) { newLeft -= (MIN - newRight); newRight = MIN }
            setPanelWidths(prev => ({ ...prev, [activeResize.leftKey]: newLeft, [activeResize.rightKey]: newRight }))
        }
        function onUp() {
            setIsResizing(false)
            setActiveResize(null)
        }
        window.addEventListener('mousemove', onMove)
        window.addEventListener('mouseup', onUp)
        document.body.style.cursor = 'col-resize'
        document.body.style.userSelect = 'none'
        return () => {
            window.removeEventListener('mousemove', onMove)
            window.removeEventListener('mouseup', onUp)
            document.body.style.cursor = ''
            document.body.style.userSelect = ''
        }
    }, [isResizing, activeResize])

    useEffect(() => {
        setPanelWidths(prev => {
            const visible = GROUP_KEYS[viewGroup].filter(k => openPanels[k])
            if (visible.length === 0) return prev
            const next = { ...prev }
            const zeros = visible.filter(k => (prev[k] || 0) === 0)
            if (zeros.length > 0) {
                const newShare = 100 / visible.length
                zeros.forEach(k => { next[k] = newShare })
                const reserved = newShare * zeros.length
                const remaining = 100 - reserved
                const nonZeros = visible.filter(k => !zeros.includes(k))
                const nzSum = nonZeros.reduce((s, k) => s + prev[k], 0)
                if (nzSum > 0) nonZeros.forEach(k => { next[k] = prev[k] * (remaining / nzSum) })
                else nonZeros.forEach(k => { next[k] = remaining / nonZeros.length })
                return next
            }
            const total = visible.reduce((s, k) => s + prev[k], 0)
            if (Math.abs(total - 100) > 0.5) {
                const factor = 100 / total
                visible.forEach(k => { next[k] = prev[k] * factor })
                return next
            }
            return prev
        })
    }, [openPanels, viewGroup])

    function togglePanel(name) {
        setInteracted(true)
        setOpenPanels(prev => {
            const next = { ...prev, [name]: !prev[name] }
            const stillVisible = GROUP_KEYS[viewGroup].some(k => next[k])
            if (!stillVisible) return prev
            return next
        })
    }

    function switchGroup(group) {
        setInteracted(true)
        setViewGroup(group)
    }

    function handleSplitDragStart(dividerIndex) {
        return (e) => {
            e.preventDefault()
            setInteracted(true)
            const visible = GROUP_KEYS[viewGroup].filter(k => openPanels[k])
            if (dividerIndex < 0 || dividerIndex >= visible.length - 1) return
            const leftKey = visible[dividerIndex]
            const rightKey = visible[dividerIndex + 1]
            setIsResizing(true)
            setActiveResize({
                leftKey,
                rightKey,
                startX: e.clientX,
                startLeft: panelWidths[leftKey],
                startRight: panelWidths[rightKey],
            })
        }
    }

    const showHint = inView && !interacted

    const PANE_RENDERERS = {
        team: <TeamMini />,
        models: <ModelsMini />,
        files: <FilesMini />,
        calendar: <CalendarMini />,
        daily: <DailyNoteMini />,
        agent: <AgentMini />,
    }
    const panes = GROUP_KEYS[viewGroup]
        .filter(k => openPanels[k])
        .map(k => ({ key: k, node: PANE_RENDERERS[k] }))

    return (
        <section ref={sectionRef} className="mt-24">
            <style>{`
@keyframes tryItPulse {
  0%, 100% { transform: translateX(0); opacity: 0.95 }
  50%      { transform: translateX(3px); opacity: 1 }
}
.try-it-pulse { animation: tryItPulse 1.4s ease-in-out infinite; }
@keyframes tryItRing {
  0%   { box-shadow: 0 0 0 0 rgba(16,185,129,0.55); }
  70%  { box-shadow: 0 0 0 10px rgba(16,185,129,0); }
  100% { box-shadow: 0 0 0 0 rgba(16,185,129,0); }
}
.try-it-ring { animation: tryItRing 1.8s ease-out infinite; }
            `}</style>

            <div className="text-center">
                <h2 className="font-[var(--font-display)] text-3xl font-semibold tracking-tight md:text-4xl">
                    Make it{' '}
                    <span className="bg-gradient-to-r from-emerald-300 via-violet-300 to-sky-300 bg-clip-text text-transparent">your own.</span>
                </h2>
                <p className="mx-auto mt-3 max-w-xl text-sm text-[var(--color-fg-muted)] md:text-base">
                    Switch between Chat and Planner. Toggle panels. Drag dividers.
                </p>
            </div>

            <div className="relative mt-10 md:mt-12">
                <div className="absolute -inset-x-8 -inset-y-4 -z-10 rounded-[32px] bg-gradient-to-br from-emerald-500/10 via-violet-500/10 to-sky-500/10 blur-2xl" />

                <div className="overflow-hidden rounded-2xl border border-[var(--color-line)] bg-[var(--color-surface-1)] shadow-2xl">
                    {/* Window chrome with toggles */}
                    <div className="flex items-center justify-between border-b border-[var(--color-line-soft)] bg-[var(--color-surface-2)] px-4 py-3">
                        <div className="flex items-center gap-1.5">
                            <span className="h-2.5 w-2.5 rounded-full bg-rose-400/70" />
                            <span className="h-2.5 w-2.5 rounded-full bg-amber-400/70" />
                            <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/70" />
                        </div>
                        <div className="hidden text-xs text-[var(--color-fg-subtle)] md:block">
                            <span className="font-medium text-[var(--color-fg-muted)]">{GROUP_TITLES[viewGroup]}</span>
                            <span className="ml-2 text-[var(--color-fg-subtle)]">· {viewGroup === 'chat' ? 'team chat' : 'planner'}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            {showHint && (
                                <span className="try-it-pulse hidden items-center gap-1 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-medium text-emerald-200 md:inline-flex">
                                    Try it
                                    <span className="text-base leading-none">→</span>
                                </span>
                            )}
                            <div className={`hidden items-center gap-0.5 rounded-lg border border-[var(--color-line)] p-0.5 md:flex ${showHint ? 'try-it-ring' : ''}`}>
                                <GroupBtn active={viewGroup === 'chat'} onClick={() => switchGroup('chat')} icon={<ChatBubbleIcon />}>Chat</GroupBtn>
                                <GroupBtn active={viewGroup === 'planner'} onClick={() => switchGroup('planner')} icon={<CalendarIcon />}>Planner</GroupBtn>
                            </div>
                            <div className="flex items-center gap-0.5 rounded-lg border border-[var(--color-line)] p-0.5">
                                {viewGroup === 'chat' ? (
                                    <>
                                        <ToggleBtn active={openPanels.team} onClick={() => togglePanel('team')} label="Team"><PeopleIcon /></ToggleBtn>
                                        <ToggleBtn active={openPanels.models} onClick={() => togglePanel('models')} label="Workspace"><BotIcon /></ToggleBtn>
                                        <ToggleBtn active={openPanels.files} onClick={() => togglePanel('files')} label="Files"><FileIcon /></ToggleBtn>
                                    </>
                                ) : (
                                    <>
                                        <ToggleBtn active={openPanels.calendar} onClick={() => togglePanel('calendar')} label="Calendar"><CalendarIcon /></ToggleBtn>
                                        <ToggleBtn active={openPanels.daily} onClick={() => togglePanel('daily')} label="Daily note"><NoteIcon /></ToggleBtn>
                                        <ToggleBtn active={openPanels.agent} onClick={() => togglePanel('agent')} label="Agent"><SparkIcon /></ToggleBtn>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Multi-pane layout */}
                    <div ref={splitRef} className="flex min-h-[460px]">
                        {panes.map((p, i) => (
                            <Fragment key={p.key}>
                                <div className="flex flex-col" style={{ width: `${panelWidths[p.key]}%` }}>
                                    {p.node}
                                </div>
                                {i < panes.length - 1 && (
                                    <div
                                        onMouseDown={handleSplitDragStart(i)}
                                        role="separator"
                                        aria-orientation="vertical"
                                        aria-label="Resize panes"
                                        className={`group relative w-1 shrink-0 cursor-col-resize transition-colors ${
                                            isResizing ? 'bg-[var(--color-fg-subtle)]' : 'bg-[var(--color-line-soft)] hover:bg-[var(--color-fg-subtle)]'
                                        }`}
                                    >
                                        {showHint && (
                                            <span className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-[10px] text-[var(--color-fg-subtle)]">
                                                ↔
                                            </span>
                                        )}
                                    </div>
                                )}
                            </Fragment>
                        ))}
                    </div>
                </div>
            </div>
        </section>
    )
}

/* ---------- Mini panel content ---------- */

function TeamMini() {
    return (
        <>
            <div className="border-b border-[var(--color-line-soft)] px-4 py-2 text-[10px] font-semibold uppercase tracking-widest text-[var(--color-fg-subtle)]">Team</div>
            <div className="flex-1 space-y-4 overflow-hidden p-4">
                <Bubble who="Marwan" me>
                    <span className="font-medium text-emerald-300">@Aria</span> design the launch hero — clean, dark, emerald accent.
                </Bubble>
                <Bubble who="Sara">+1 — let's keep it concise.</Bubble>
                <Bubble who="Jamie">
                    Speak to <span className="font-medium text-sky-300">@Atlas</span> for any tweaks.
                </Bubble>
            </div>
        </>
    )
}

function ModelsMini() {
    return (
        <>
            <div className="border-b border-[var(--color-line-soft)] px-4 py-2 text-[10px] font-semibold uppercase tracking-widest text-[var(--color-fg-subtle)]">Models</div>
            <div className="flex-1 space-y-2.5 overflow-hidden p-4">
                <ModelCard name="Aria" model="GPT-4o" tone="emerald">
                    Three lines, ready. Built for teams that ship.
                </ModelCard>
                <ModelCard name="Nova" model="Claude" tone="violet">
                    Pricing reads clean. Try "per teammate" instead of "per seat".
                </ModelCard>
                <ModelCard name="Atlas" model="Gemini" tone="sky">
                    Compiled launch-plan.pdf — find it in Files.
                </ModelCard>
            </div>
        </>
    )
}

function FilesMini() {
    return (
        <>
            <div className="border-b border-[var(--color-line-soft)] px-4 py-2 text-[10px] font-semibold uppercase tracking-widest text-[var(--color-fg-subtle)]">Files</div>
            <div className="flex-1 space-y-2 overflow-hidden p-4">
                <FileRow name="launch-plan.pdf" ext="pdf" />
                <FileRow name="hero-mock-v1.png" ext="png" />
                <FileRow name="pricing-tiers.csv" ext="csv" />
            </div>
        </>
    )
}

/* ---------- Planner mini panels ---------- */

const MAY_2026 = [
    [null, null, null, null, 1, 2, 3],
    [4, 5, 6, 7, 8, 9, 10],
    [11, 12, 13, 14, 15, 16, 17],
    [18, 19, 20, 21, 22, 23, 24],
    [25, 26, 27, 28, 29, 30, 31],
]

function CalendarMini() {
    const today = 5
    const wed = 7
    return (
        <>
            <div className="flex items-center justify-between border-b border-[var(--color-line-soft)] px-4 py-2">
                <span className="text-[10px] font-semibold uppercase tracking-widest text-[var(--color-fg-subtle)]">Calendar</span>
                <span className="text-[10px] text-[var(--color-fg-subtle)]">May 2026</span>
            </div>
            <div className="flex-1 overflow-hidden p-4">
                <div className="grid grid-cols-7 gap-1 text-center">
                    {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
                        <div key={i} className="text-[9px] font-medium uppercase tracking-wider text-[var(--color-fg-subtle)]">
                            {d}
                        </div>
                    ))}
                    {MAY_2026.flat().map((d, i) => {
                        if (d === null) return <div key={`e-${i}`} />
                        const isToday = d === today
                        const isWed = d === wed
                        const isSelected = isToday
                        const hasNote = isToday || isWed
                        return (
                            <div
                                key={`d-${d}`}
                                className={[
                                    "relative flex aspect-square items-center justify-center rounded-md text-[10px]",
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
                            </div>
                        )
                    })}
                </div>
                <div className="mt-4 space-y-1.5 text-[10px] text-[var(--color-fg-subtle)]">
                    <div className="flex items-center gap-1.5">
                        <span className="h-1 w-1 rounded-full bg-emerald-400" />
                        <span>day with note</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-sm border border-emerald-500/50" />
                        <span>today</span>
                    </div>
                </div>
            </div>
        </>
    )
}

function DailyNoteMini() {
    return (
        <>
            <div className="flex items-center justify-between border-b border-[var(--color-line-soft)] px-4 py-2">
                <div className="flex items-center gap-2">
                    <span className="text-[10px] font-semibold uppercase tracking-widest text-[var(--color-fg-subtle)]">
                        Daily note
                    </span>
                    <span className="text-[11px] text-[var(--color-fg-subtle)]">·</span>
                    <span className="text-[11px] text-[var(--color-fg-muted)]">Tue · May 5</span>
                </div>
                <span className="text-[10px] text-[var(--color-fg-subtle)]">3 tasks</span>
            </div>
            <div className="flex-1 space-y-3 overflow-hidden px-5 py-4 font-mono text-[12px] leading-relaxed">
                <div className="text-[var(--color-fg-subtle)]"># Today · May 5</div>
                <div className="text-[var(--color-fg-subtle)]">## Tasks</div>
                <ul className="space-y-1">
                    <NoteTaskLine text="Draft hero copy" />
                    <NoteTaskLine text="Pick color palette" />
                    <NoteTaskLine text="Sketch hero layout" />
                </ul>
                <div className="text-[var(--color-fg-subtle)]">## Note</div>
                <p className="text-[var(--color-fg)]">Focus: punchy hero, calm palette.</p>
            </div>
        </>
    )
}

function NoteTaskLine({ text }) {
    return (
        <li className="flex items-start gap-2">
            <span className="text-[var(--color-fg-subtle)]">- [ ]</span>
            <span className="text-[var(--color-fg)]">{text}</span>
        </li>
    )
}

const AGENT_MINI_PLAN = [
    { day: 'today', text: "Draft hero copy", status: "done" },
    { day: 'today', text: "Pick color palette", status: "done" },
    { day: 'wed', text: "Design hero mockup", status: "working", deps: ["Draft hero copy", "Pick color palette"] },
    { day: 'today', text: "Sketch hero layout", status: "queued" },
    { day: 'wed', text: "Write pricing outline", status: "queued" },
]

function AgentMini() {
    const doneCount = AGENT_MINI_PLAN.filter(p => p.status === "done").length
    return (
        <>
            <div className="flex items-center justify-between border-b border-[var(--color-line-soft)] px-4 py-2">
                <div className="flex items-center gap-2">
                    <span className="text-[10px] font-semibold uppercase tracking-widest text-[var(--color-fg-subtle)]">Agent</span>
                    <span className="text-[11px] text-[var(--color-fg-subtle)]">·</span>
                    <span className="text-[11px] text-[var(--color-fg-muted)]">Working — {doneCount}/{AGENT_MINI_PLAN.length}</span>
                </div>
                <span className="inline-flex items-center gap-1.5 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] text-emerald-300">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    running
                </span>
            </div>
            <div className="flex-1 overflow-hidden px-4 py-3.5">
                <div className="mb-2 rounded-md border border-[var(--color-line-soft)] bg-[var(--color-surface-2)] px-2.5 py-1.5 text-[10px] leading-relaxed text-[var(--color-fg-muted)]">
                    Picking ready tasks first — Today's #3 waits while Thu's mock starts early.
                </div>
                <ol className="space-y-1.5">
                    {AGENT_MINI_PLAN.map((entry, i) => (
                        <PlanItemMini key={i} index={i} entry={entry} />
                    ))}
                </ol>
            </div>
        </>
    )
}

function PlanItemMini({ index, entry }) {
    const isDone = entry.status === "done"
    const isWorking = entry.status === "working"
    return (
        <li
            className={[
                "rounded-md border px-2.5 py-1.5",
                isWorking
                    ? "border-emerald-500/40 bg-emerald-500/[0.07]"
                    : isDone
                        ? "border-[var(--color-line-soft)] bg-[var(--color-surface-2)]"
                        : "border-[var(--color-line-soft)] bg-[var(--color-surface-1)]",
            ].join(" ")}
        >
            <div className="flex items-start gap-2">
                <PlanStatusDot status={entry.status} index={index} />
                <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline gap-x-1.5">
                        <span className={`text-[12px] leading-snug ${isDone ? "line-through text-[var(--color-fg-muted)]" : "text-[var(--color-fg)]"}`}>
                            {entry.text}
                        </span>
                        <span className={`text-[9px] uppercase tracking-wider ${entry.day === "today" ? "text-emerald-300/80" : "text-violet-300/80"}`}>
                            {entry.day === "today" ? "Today" : "Thu"}
                        </span>
                    </div>
                    {entry.deps && !isDone && (
                        <div className="mt-0.5 text-[9px] text-[var(--color-fg-subtle)]">
                            needs: {entry.deps.join(", ")}
                        </div>
                    )}
                </div>
            </div>
        </li>
    )
}

function PlanStatusDot({ status, index }) {
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

/* ---------- Sub-components ---------- */

function Bubble({ who, children, me }) {
    return (
        <div className={`flex items-start gap-3 ${me ? 'flex-row-reverse' : ''}`}>
            <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold ${me ? 'bg-gradient-to-br from-emerald-400 to-sky-400 text-black' : 'bg-[var(--color-surface-3)] text-[var(--color-fg)]'}`}>
                {who[0]}
            </div>
            <div className={`max-w-[88%] space-y-1 ${me ? 'text-right' : ''}`}>
                <div className="text-[11px] text-[var(--color-fg-subtle)]">{who}</div>
                <div className={`inline-block rounded-2xl border px-3 py-1.5 text-left text-sm leading-relaxed text-[var(--color-fg)] ${me ? 'bg-[var(--color-surface-3)] border-white/[0.07]' : 'bg-[var(--color-surface-2)] border-[var(--color-line-soft)]'}`}>
                    {children}
                </div>
            </div>
        </div>
    )
}

function ModelCard({ name, model, tone, children }) {
    const colorMap = {
        emerald: { ring: 'ring-emerald-500/60', text: 'text-emerald-300', soft: 'bg-emerald-500/[0.07]', border: 'border-emerald-500/30' },
        violet: { ring: 'ring-violet-500/60', text: 'text-violet-300', soft: 'bg-violet-500/[0.07]', border: 'border-violet-500/30' },
        sky: { ring: 'ring-sky-500/60', text: 'text-sky-300', soft: 'bg-sky-500/[0.07]', border: 'border-sky-500/30' },
    }
    const c = colorMap[tone]
    return (
        <div className={`rounded-xl border ${c.border} ${c.soft} p-3`}>
            <div className="mb-1 flex items-center gap-2">
                <span className={`flex h-5 w-5 items-center justify-center rounded-full ring-2 ${c.ring} bg-[var(--color-surface-3)] text-[9px] font-semibold ${c.text}`}>
                    {name[0]}
                </span>
                <span className={`text-[11px] font-medium ${c.text}`}>{name}</span>
                <span className="text-[10px] text-[var(--color-fg-subtle)]">· {model}</span>
            </div>
            <div className="text-[12px] leading-relaxed text-[var(--color-fg)]">{children}</div>
        </div>
    )
}

function FileRow({ name, ext }) {
    return (
        <div className="flex items-center gap-3 rounded-lg border border-[var(--color-line-soft)] bg-[var(--color-surface-2)] p-2.5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-[var(--color-surface-3)] text-[9px] font-semibold uppercase text-[var(--color-fg-muted)]">
                {ext}
            </span>
            <div className="min-w-0 flex-1">
                <div className="truncate text-[13px] text-[var(--color-fg)]">{name}</div>
                <div className="text-[10px] text-[var(--color-fg-subtle)]">just now</div>
            </div>
            <span className="rounded-md border border-[var(--color-line)] px-2 py-0.5 text-[10px] text-[var(--color-fg-muted)]">↗</span>
        </div>
    )
}

function ToggleBtn({ active, onClick, label, children }) {
    return (
        <button
            onClick={onClick}
            title={`${active ? 'Hide' : 'Show'} ${label}`}
            aria-pressed={active}
            className={`flex h-7 w-7 items-center justify-center rounded-md transition-colors ${
                active
                    ? 'bg-[var(--color-surface-3)] text-[var(--color-fg)]'
                    : 'text-[var(--color-fg-subtle)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-fg-muted)]'
            }`}
        >
            {children}
        </button>
    )
}

function PeopleIcon() {
    return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
    )
}

function BotIcon() {
    return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="10" rx="2" />
            <circle cx="12" cy="5" r="2" />
            <path d="M12 7v4" />
            <line x1="8" y1="16" x2="8" y2="16" />
            <line x1="16" y1="16" x2="16" y2="16" />
        </svg>
    )
}

function FileIcon() {
    return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
        </svg>
    )
}

function GroupBtn({ children, icon, active, onClick }) {
    return (
        <button
            onClick={onClick}
            aria-pressed={active}
            className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors ${
                active
                    ? "bg-[var(--color-surface-3)] text-[var(--color-fg)]"
                    : "text-[var(--color-fg-subtle)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-fg-muted)]"
            }`}
        >
            {icon}
            {children}
        </button>
    )
}

function ChatBubbleIcon() {
    return (
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
    )
}

function CalendarIcon() {
    return (
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
    )
}

function NoteIcon() {
    return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
        </svg>
    )
}

function SparkIcon() {
    return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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

export default TryItDemo
