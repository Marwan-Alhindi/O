// Find @mentions in text by greedy-matching against a list of "mentionables".
// A mentionable is `{ id, display_name, kind: 'llm' | 'person', ...meta }` —
// callers pass any combination so people and LLMs can be mentioned together.
//
// Handles names with spaces (e.g., "Time Manager") and is case-insensitive.
// Returns `[{ target, kind, start, end, raw }]` in order of appearance, where
// `raw` is the literal matched substring (including the leading '@').
export function findMentions(text, mentionables) {
    if (!text || !mentionables?.length) return []
    const sorted = [...mentionables].sort((a, b) => (b.display_name || "").length - (a.display_name || "").length)
    const out = []
    let i = 0
    while (i < text.length) {
        const at = text.indexOf('@', i)
        if (at === -1) break
        const tail = text.slice(at + 1)
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
            const end = at + 1 + hit.display_name.length
            const kind = hit.kind || 'llm'
            out.push({
                target: hit,
                kind,
                llm: kind === 'llm' ? (hit.llm || hit) : null,
                profile: kind === 'person' ? (hit.profile || hit) : null,
                start: at,
                end,
                raw: text.slice(at, end),
            })
            i = end
        } else {
            i = at + 1
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
