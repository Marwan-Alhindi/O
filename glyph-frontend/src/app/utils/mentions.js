// Find @mentions in text by greedy-matching against known LLM display names.
// Handles names with spaces (e.g., "Time Manager") and is case-insensitive.
// Returns [{ llm, start, end, raw }] in order of appearance, where raw is
// the literal text that matched (including the leading '@').
export function findMentions(text, llms) {
    if (!text || !llms?.length) return []
    const sorted = [...llms].sort((a, b) => b.display_name.length - a.display_name.length)
    const out = []
    let i = 0
    while (i < text.length) {
        const at = text.indexOf('@', i)
        if (at === -1) break
        const tail = text.slice(at + 1)
        let hit = null
        for (const llm of sorted) {
            const name = llm.display_name
            if (tail.length < name.length) continue
            if (tail.slice(0, name.length).toLowerCase() !== name.toLowerCase()) continue
            const next = tail[name.length] ?? ''
            // Reject if the char after the matched name continues a word — avoids
            // "@Tim" matching the name "Tim" inside "@Timber".
            if (next && /[A-Za-z0-9_]/.test(next)) continue
            hit = llm
            break
        }
        if (hit) {
            const end = at + 1 + hit.display_name.length
            out.push({ llm: hit, start: at, end, raw: text.slice(at, end) })
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
export function isMentionPrefix(partial, llms) {
    if (!llms?.length) return false
    const p = partial.toLowerCase()
    return llms.some(llm => llm.display_name.toLowerCase().startsWith(p))
}
