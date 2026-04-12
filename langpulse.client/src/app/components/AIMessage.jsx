import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism'
import { useState } from 'react'

function AIMessage({ text }) {
    const [copied, setCopied] = useState(null)

    function copyToClipboard(code, id) {
        navigator.clipboard.writeText(code)
        setCopied(id)
        setTimeout(() => setCopied(null), 2000)
    }

    if (!text) return null

    return (
        <div className="prose prose-invert max-w-none text-sm leading-relaxed">
            <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                    code({ inline, className, children, ...props }) {
                        const match = /language-(\w+)/.exec(className || '')
                        const codeString = String(children).replace(/\n$/, '')
                        const codeId = codeString.slice(0, 20)

                        if (!inline && match) {
                            return (
                                <div className="relative my-3 rounded-lg overflow-hidden">
                                    <div className="flex items-center justify-between bg-neutral-900 px-4 py-2 text-xs text-neutral-400">
                                        <span>{match[1]}</span>
                                        <button
                                            onClick={() => copyToClipboard(codeString, codeId)}
                                            className="hover:text-white transition-colors"
                                        >
                                            {copied === codeId ? 'Copied!' : 'Copy'}
                                        </button>
                                    </div>
                                    <SyntaxHighlighter
                                        style={oneDark}
                                        language={match[1]}
                                        PreTag="div"
                                        customStyle={{
                                            margin: 0,
                                            borderRadius: 0,
                                            fontSize: '13px',
                                        }}
                                        {...props}
                                    >
                                        {codeString}
                                    </SyntaxHighlighter>
                                </div>
                            )
                        }

                        if (!inline && !match) {
                            return (
                                <div className="relative my-3 rounded-lg overflow-hidden">
                                    <div className="flex items-center justify-end bg-neutral-900 px-4 py-2 text-xs text-neutral-400">
                                        <button
                                            onClick={() => copyToClipboard(codeString, codeId)}
                                            className="hover:text-white transition-colors"
                                        >
                                            {copied === codeId ? 'Copied!' : 'Copy'}
                                        </button>
                                    </div>
                                    <SyntaxHighlighter
                                        style={oneDark}
                                        language="text"
                                        PreTag="div"
                                        customStyle={{
                                            margin: 0,
                                            borderRadius: 0,
                                            fontSize: '13px',
                                        }}
                                        {...props}
                                    >
                                        {codeString}
                                    </SyntaxHighlighter>
                                </div>
                            )
                        }

                        return (
                            <code className="bg-neutral-700 text-yellow-300 px-1.5 py-0.5 rounded text-xs" {...props}>
                                {children}
                            </code>
                        )
                    },
                    p({ children }) {
                        return <p className="mb-3 last:mb-0 text-neutral-200">{children}</p>
                    },
                    ul({ children }) {
                        return <ul className="list-disc pl-5 mb-3 space-y-1 text-neutral-200">{children}</ul>
                    },
                    ol({ children }) {
                        return <ol className="list-decimal pl-5 mb-3 space-y-1 text-neutral-200">{children}</ol>
                    },
                    li({ children }) {
                        return <li className="text-neutral-200">{children}</li>
                    },
                    h1({ children }) {
                        return <h1 className="text-lg font-bold mb-2 text-white">{children}</h1>
                    },
                    h2({ children }) {
                        return <h2 className="text-base font-bold mb-2 text-white">{children}</h2>
                    },
                    h3({ children }) {
                        return <h3 className="text-sm font-bold mb-2 text-white">{children}</h3>
                    },
                    strong({ children }) {
                        return <strong className="font-semibold text-white">{children}</strong>
                    },
                    em({ children }) {
                        return <em className="italic text-neutral-300">{children}</em>
                    },
                    blockquote({ children }) {
                        return (
                            <blockquote className="border-l-2 border-yellow-400 pl-4 my-3 text-neutral-400 italic">
                                {children}
                            </blockquote>
                        )
                    },
                    table({ children }) {
                        return (
                            <div className="overflow-x-auto my-3">
                                <table className="min-w-full border border-neutral-700 text-sm">
                                    {children}
                                </table>
                            </div>
                        )
                    },
                    th({ children }) {
                        return <th className="border border-neutral-700 px-3 py-2 bg-neutral-900 text-left font-semibold">{children}</th>
                    },
                    td({ children }) {
                        return <td className="border border-neutral-700 px-3 py-2">{children}</td>
                    },
                    hr() {
                        return <hr className="border-neutral-700 my-4" />
                    },
                    a({ href, children }) {
                        return <a href={href} className="text-yellow-400 hover:underline" target="_blank" rel="noopener noreferrer">{children}</a>
                    },
                }}
            >
                {text}
            </ReactMarkdown>
        </div>
    )
}

export default AIMessage
