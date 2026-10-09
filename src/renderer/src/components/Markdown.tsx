// Renderizador de Markdown simples e seguro: monta elementos React em vez
// de injetar HTML, então nenhum texto de nota pode executar código.

import { Fragment, type ReactNode } from 'react'

interface Props {
  text: string
  onLink?: (title: string) => void
}

const INLINE_RE = /(\[\[[^\]\n]+\]\]|\*\*[^*\n]+\*\*|\*[^*\n]+\*|`[^`\n]+`|https?:\/\/[^\s)]+|(?:^|(?<=\s))#[\p{L}\p{N}_][\p{L}\p{N}_/-]*)/gu

function inline(text: string, onLink?: (title: string) => void): ReactNode[] {
  const out: ReactNode[] = []
  let last = 0
  let key = 0
  for (const m of text.matchAll(INLINE_RE)) {
    const token = m[0]
    const start = m.index ?? 0
    if (start > last) out.push(text.slice(last, start))
    if (token.startsWith('[[')) {
      const inner = token.slice(2, -2)
      const [target, alias] = inner.split('|')
      const title = target.split('#')[0].trim()
      out.push(
        <a key={key++} className="wikilink" onClick={() => onLink?.(title)}>
          {(alias ?? target).trim()}
        </a>
      )
    } else if (token.startsWith('**')) out.push(<strong key={key++}>{token.slice(2, -2)}</strong>)
    else if (token.startsWith('`')) out.push(<code key={key++}>{token.slice(1, -1)}</code>)
    else if (token.startsWith('*')) out.push(<em key={key++}>{token.slice(1, -1)}</em>)
    else if (token.startsWith('http')) {
      out.push(
        <a key={key++} href={token} target="_blank" rel="noreferrer">
          {token}
        </a>
      )
    } else out.push(<span key={key++} className="tag">{token}</span>)
    last = start + token.length
  }
  if (last < text.length) out.push(text.slice(last))
  return out
}

export function Markdown({ text, onLink }: Props): ReactNode {
  const lines = text.replace(/\r\n/g, '\n').split('\n')
  const blocks: ReactNode[] = []
  let i = 0
  let key = 0
  while (i < lines.length) {
    const line = lines[i]
    if (line.startsWith('```')) {
      const code: string[] = []
      i++
      while (i < lines.length && !lines[i].startsWith('```')) code.push(lines[i++])
      i++
      blocks.push(<pre key={key++}><code>{code.join('\n')}</code></pre>)
      continue
    }
    const heading = /^(#{1,6})\s+(.*)$/.exec(line)
    if (heading) {
      const level = Math.min(heading[1].length, 4)
      const Tag = `h${level}` as 'h1'
      blocks.push(<Tag key={key++}>{inline(heading[2], onLink)}</Tag>)
      i++
      continue
    }
    if (/^\s*([-*+]|\d+[.)])\s+/.test(line)) {
      const ordered = /^\s*\d/.test(line)
      const items: ReactNode[] = []
      while (i < lines.length && /^\s*([-*+]|\d+[.)])\s+/.test(lines[i])) {
        const raw = lines[i].replace(/^\s*([-*+]|\d+[.)])\s+/, '')
        const task = /^\[( |x)\]\s*/i.exec(raw)
        items.push(
          <li key={items.length} className={task ? 'task' : undefined}>
            {task && <input type="checkbox" checked={task[1] !== ' '} readOnly />}
            {inline(task ? raw.slice(task[0].length) : raw, onLink)}
          </li>
        )
        i++
      }
      blocks.push(ordered ? <ol key={key++}>{items}</ol> : <ul key={key++}>{items}</ul>)
      continue
    }
    if (line.startsWith('>')) {
      const quote: string[] = []
      while (i < lines.length && lines[i].startsWith('>')) quote.push(lines[i++].replace(/^>\s?/, ''))
      blocks.push(<blockquote key={key++}>{inline(quote.join(' '), onLink)}</blockquote>)
      continue
    }
    if (!line.trim()) {
      i++
      continue
    }
    const para: string[] = []
    while (i < lines.length && lines[i].trim() && !/^(#{1,6}\s|```|>|\s*([-*+]|\d+[.)])\s)/.test(lines[i])) {
      para.push(lines[i++])
    }
    blocks.push(
      <p key={key++}>
        {para.map((p, n) => (
          <Fragment key={n}>
            {n > 0 && <br />}
            {inline(p, onLink)}
          </Fragment>
        ))}
      </p>
    )
  }
  return <div className="markdown">{blocks}</div>
}
