// Funções puras para entender notas em Markdown: título, [[links]] e #tags.

const LINK_RE = /\[\[([^\]|#\n]+)(?:#[^\]|\n]*)?(?:\|[^\]\n]*)?\]\]/g
const TAG_RE = /(?:^|\s)#([\p{L}\p{N}_][\p{L}\p{N}_/-]*)/gu
const FENCE_RE = /```[\s\S]*?```|`[^`\n]*`/g

/** Remove blocos de código para não confundir links e tags dentro deles. */
function stripCode(body: string): string {
  return body.replace(FENCE_RE, ' ')
}

/** Títulos citados com [[Título]], [[Título|apelido]] ou [[Título#seção]]. */
export function parseLinks(body: string): string[] {
  const seen = new Map<string, string>()
  for (const match of stripCode(body).matchAll(LINK_RE)) {
    const title = match[1].trim()
    if (title && !seen.has(normalizeTitle(title))) seen.set(normalizeTitle(title), title)
  }
  return [...seen.values()]
}

export function parseTags(body: string): string[] {
  const tags = new Set<string>()
  for (const match of stripCode(body).matchAll(TAG_RE)) tags.add(match[1].toLowerCase())
  return [...tags]
}

/** Título de uma nota = nome do arquivo sem a extensão. */
export function titleFromPath(path: string): string {
  const name = path.split('/').pop() ?? path
  return name.replace(/\.md$/i, '')
}

/** Comparação de títulos sem diferenciar maiúsculas e acentos. */
export function normalizeTitle(title: string): string {
  return title
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .trim()
}

/** Nome de arquivo válido no Windows a partir de um título livre. */
export function safeFileName(title: string): string {
  const cleaned = title
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/[. ]+$/, '')
  const name = cleaned.slice(0, 120) || 'Sem título'
  return /^(con|prn|aux|nul|com\d|lpt\d)$/i.test(name) ? `${name}_` : name
}
