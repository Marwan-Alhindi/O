// Find @mentions in text by greedy-matching against a list of "mentionables".
// A mentionable is `{ id, display_name, kind: 'llm' | 'person', ...meta }` —
// callers pass any combination so people and LLMs can be mentioned together.
//
// Two prefix forms:
//   `@Name`  → active mention. For LLMs, this is the form that triggers a reply.
//   `@@Name` → passive mention. Highlighted in the message body (so the
//              reader sees who's referenced) but the LLM is NOT triggered.
//              Use when you're talking *about* an LLM, not *to* it.
//
// Handles names with spaces (e.g., "Time Manager") and is case-insensitive.
// Returns `[{ target, kind, active, start, end, raw }]` in order of appearance,
// where `raw` is the literal matched substring (including the leading '@' or '@@').
export function findMentions(text, mentionables) {
    if (!text || !mentionables?.length) return []
    const sorted = [...mentionables].sort((a, b) => (b.display_name || "").length - (a.display_name || "").length)
    const out = []
    let i = 0
    while (i < text.length) {
        const at = text.indexOf('@', i)
        if (at === -1) break
        // `@@Name` is a passive (non-triggering) mention — name starts after the second @.
        const isDoubleAt = text[at + 1] === '@'
        const nameStart = isDoubleAt ? at + 2 : at + 1
        const tail = text.slice(nameStart)
        let hit = null
        for (const m of sorted) {
            const name = m.display_name
            if (!name || tail.length < name.length) continue
            if (tail.slice(0, name.length).toLowerCase() !== name.toLowerCase()) continue
            const next = tail[name.length] ?? ''
            // Reject if the char after the matched name continues a word — avoids
            // "@Tim" matching the name "Tim" inside "@Timber".
            if (next && /[A-Za-z0-9_]/.test(next)) continue
            hit = m
            break
        }
        if (hit) {
            const end = nameStart + hit.display_name.length
            const kind = hit.kind || 'llm'
            out.push({
                target: hit,
                kind,
                active: !isDoubleAt,
                llm: kind === 'llm' ? (hit.llm || hit) : null,
                profile: kind === 'person' ? (hit.profile || hit) : null,
                start: at,
                end,
                raw: text.slice(at, end),
            })
            i = end
        } else {
            // Skip past this @ (or @@) so we don't loop forever on it.
            i = isDoubleAt ? at + 2 : at + 1
        }
    }
    return out
}

// True if `partial` (text typed after the most recent '@') could still grow
// into a known display name. Used to keep the autocomplete dropdown open
// while the user is mid-typing a multi-word name.
export function isMentionPrefix(partial, mentionables) {
    if (!mentionables?.length) return false
    const p = partial.toLowerCase()
    return mentionables.some(m => (m.display_name || "").toLowerCase().startsWith(p))
}
