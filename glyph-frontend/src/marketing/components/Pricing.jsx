import { useNavigate } from "react-router-dom"

const PLANS = [
    {
        name: "Free",
        price: "$0",
        period: "/forever",
        pitch: "For solo work and trying Glyph out.",
        features: [
            "1 workspace",
            "Up to 3 teammates",
            "2 models per chat",
            "100 model messages / month",
            "Glyph (auto) managed model",
            "Community support",
        ],
        cta: { label: "Start free", action: "signup" },
        featured: false,
    },
    {
        name: "Team",
        price: "$12",
        period: "/user/month",
        pitch: "For small teams shipping together.",
        features: [
            "Everything in Free, plus:",
            "Unlimited workspaces & chats",
            "Unlimited teammates per chat",
            "All models — GPT-4o, Claude, Gemini",
            "5,000 model messages / user / month",
            "Email invitations & per-member permissions",
            "Priority support",
        ],
        cta: { label: "Start 14-day trial", action: "signup" },
        featured: true,
        badge: "Most popular",
    },
    {
        name: "Enterprise",
        price: "Custom",
        period: "",
        pitch: "For organizations with security and scale needs.",
        features: [
            "Everything in Team, plus:",
            "SSO / SAML",
            "SCIM user provisioning",
            "Audit logs",
            "Custom data residency",
            "Dedicated success manager",
            "99.9% uptime SLA",
        ],
        cta: { label: "Contact sales", action: "sales" },
        featured: false,
    },
]

function Pricing() {
    const navigate = useNavigate()

    function handleCta(action) {
        if (action === "signup") navigate("/getstarted")
        if (action === "sales") window.location.href = "mailto:hello@glypho.live?subject=Glyph Enterprise"
    }

    return (
        <section id="pricing" className="mt-28">
            <div className="text-center">
                <h2 className="font-[var(--font-display)] text-3xl font-semibold tracking-tight md:text-4xl">
                    Simple pricing.{' '}
                    <span className="bg-gradient-to-r from-emerald-300 via-violet-300 to-sky-300 bg-clip-text text-transparent">
                        Real value.
                    </span>
                </h2>
                <p className="mx-auto mt-3 max-w-xl text-sm text-[var(--color-fg-muted)] md:text-base">
                    Start free. Upgrade when your team is shipping together.
                </p>
            </div>

            <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-3">
                {PLANS.map(plan => (
                    <PricingCard key={plan.name} plan={plan} onCta={() => handleCta(plan.cta.action)} />
                ))}
            </div>

            <p className="mx-auto mt-8 max-w-xl text-center text-xs text-[var(--color-fg-subtle)]">
                Prices in USD. All plans include real-time chat, multi-LLM threads, and shared context across humans and models.
            </p>
        </section>
    )
}

function PricingCard({ plan, onCta }) {
    const cardClasses = "flex h-full flex-col rounded-[15px] bg-[var(--color-surface-1)] p-7"

    if (plan.featured) {
        return (
            <div className="relative rounded-2xl bg-gradient-to-br from-emerald-400/60 via-violet-400/60 to-sky-400/60 p-px shadow-2xl shadow-violet-500/10">
                {plan.badge && (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full border border-[var(--color-line)] bg-[var(--color-surface-1)] px-3 py-0.5 text-[10px] font-medium uppercase tracking-widest text-[var(--color-fg)]">
                        {plan.badge}
                    </span>
                )}
                <div className={cardClasses}>
                    <CardBody plan={plan} onCta={onCta} />
                </div>
            </div>
        )
    }
    return (
        <div className="rounded-2xl border border-[var(--color-line)] bg-[var(--color-surface-1)]/70 p-px transition-colors hover:border-[var(--color-fg-subtle)]">
            <div className={cardClasses}>
                <CardBody plan={plan} onCta={onCta} />
            </div>
        </div>
    )
}

function CardBody({ plan, onCta }) {
    return (
        <>
            <h3 className="text-lg font-semibold tracking-tight text-[var(--color-fg)]">{plan.name}</h3>
            <p className="mt-1 text-xs text-[var(--color-fg-muted)]">{plan.pitch}</p>

            <div className="mt-5 flex items-baseline gap-1">
                <span className="font-[var(--font-display)] text-4xl font-semibold tracking-tight text-[var(--color-fg)]">
                    {plan.price}
                </span>
                {plan.period && (
                    <span className="text-xs text-[var(--color-fg-subtle)]">{plan.period}</span>
                )}
            </div>

            <ul className="mt-6 flex-1 space-y-2.5">
                {plan.features.map((f, i) => (
                    <li key={i} className="flex items-start gap-2.5 text-sm text-[var(--color-fg-muted)]">
                        <CheckIcon />
                        <span>{f}</span>
                    </li>
                ))}
            </ul>

            <button
                onClick={onCta}
                className={`mt-7 inline-flex w-full items-center justify-center gap-2 rounded-full px-4 py-2.5 text-sm font-medium transition-all ${
                    plan.featured
                        ? "bg-white text-black hover:bg-[var(--color-brand)]"
                        : "border border-[var(--color-line)] bg-transparent text-[var(--color-fg)] hover:border-[var(--color-fg-subtle)] hover:bg-[var(--color-surface-2)]"
                }`}
            >
                {plan.cta.label}
                <span>→</span>
            </button>
        </>
    )
}

function CheckIcon() {
    return (
        <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="mt-0.5 shrink-0 text-emerald-300"
        >
            <polyline points="20 6 9 17 4 12" />
        </svg>
    )
}

export default Pricing
