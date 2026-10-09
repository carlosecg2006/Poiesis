// O Cofre: uma pasta comum com notas em Markdown, legível por qualquer
// editor (inclusive o Obsidian). "Tudo é um nó": cada arquivo é um ponto da
// teia, e os [[links]] entre eles são as conexões.

import { existsSync } from 'node:fs'
import { mkdir, readdir, readFile, rename, stat, writeFile } from 'node:fs/promises'
import { dirname, join, relative, resolve, sep } from 'node:path'
import type { Backlink, Note, NoteMeta, SearchHit } from '@shared/types'
import { normalizeTitle, parseLinks, parseTags, safeFileName, titleFromPath } from '@shared/markdown'
import { search } from './search'

/** Pasta interna do Poiesis dentro do cofre (conversas, lixeira, índices). */
export const SYSTEM_DIR = '.poiesis'

interface Cached extends Note {
  mtimeMs: number
}

export class Vault {
  private cache = new Map<string, Cached>()

  constructor(public readonly root: string) {}

  /** Garante que o cofre existe; na primeira vez cria notas de boas-vindas. */
  async init(seed: Record<string, string> = {}): Promise<void> {
    const fresh = !existsSync(this.root)
    await mkdir(join(this.root, SYSTEM_DIR), { recursive: true })
    if (fresh) {
      for (const [path, body] of Object.entries(seed)) await this.write(path, body)
    }
  }

  /** Converte um caminho relativo em absoluto, impedindo sair do cofre. */
  abs(path: string): string {
    const full = resolve(this.root, path.replace(/\\/g, '/'))
    const rootWithSep = resolve(this.root) + sep
    if (!full.startsWith(rootWithSep)) throw new Error(`Caminho fora do cofre: ${path}`)
    return full
  }

  async list(): Promise<NoteMeta[]> {
    const notes = await this.scan()
    return notes
      .map(({ path, title, updatedAt, tags }) => ({ path, title, updatedAt, tags }))
      .sort((a, b) => b.updatedAt - a.updatedAt)
  }

  async read(path: string): Promise<Note> {
    const full = this.abs(path)
    const info = await stat(full)
    const cached = this.cache.get(path)
    if (cached && cached.mtimeMs === info.mtimeMs) return stripCache(cached)
    const body = await readFile(full, 'utf8')
    const note: Cached = {
      path,
      title: titleFromPath(path),
      body,
      links: parseLinks(body),
      tags: parseTags(body),
      updatedAt: info.mtimeMs,
      mtimeMs: info.mtimeMs
    }
    this.cache.set(path, note)
    return stripCache(note)
  }

  async write(path: string, body: string): Promise<NoteMeta> {
    if (!/\.md$/i.test(path)) throw new Error('Notas precisam terminar em .md')
    const full = this.abs(path)
    await mkdir(dirname(full), { recursive: true })
    // Grava num arquivo temporário e renomeia: se o PC desligar no meio,
    // a nota anterior continua inteira.
    const tmp = `${full}.tmp`
    await writeFile(tmp, body, 'utf8')
    await rename(tmp, full)
    this.cache.delete(path)
    const note = await this.read(path)
    return { path: note.path, title: note.title, updatedAt: note.updatedAt, tags: note.tags }
  }

  /** Cria uma nota nova com nome único a partir do título. */
  async create(title: string, folder = ''): Promise<NoteMeta> {
    const base = safeFileName(title)
    const dir = folder.replace(/\\/g, '/').replace(/^\/+|\/+$/g, '')
    let path = dir ? `${dir}/${base}.md` : `${base}.md`
    for (let n = 2; existsSync(this.abs(path)); n++) {
      path = dir ? `${dir}/${base} ${n}.md` : `${base} ${n}.md`
    }
    return this.write(path, `# ${title.trim() || base}\n\n`)
  }

  /** Nunca apaga de verdade: move para a lixeira interna do cofre. */
  async remove(path: string): Promise<void> {
    const full = this.abs(path)
    const stamp = new Date().toISOString().replace(/[:.]/g, '-')
    const target = join(this.root, SYSTEM_DIR, 'lixeira', `${stamp}__${path.replace(/[\\/]/g, '__')}`)
    await mkdir(dirname(target), { recursive: true })
    await rename(full, target)
    this.cache.delete(path)
  }

  /** Encontra a nota cujo título corresponde a um [[link]]. */
  async resolve(title: string): Promise<string | null> {
    const wanted = normalizeTitle(title)
    const notes = await this.scan()
    return notes.find((n) => normalizeTitle(n.title) === wanted)?.path ?? null
  }

  /** Notas que apontam para esta (as conexões de entrada da teia). */
  async backlinks(path: string): Promise<Backlink[]> {
    const target = normalizeTitle(titleFromPath(path))
    const notes = await this.scan()
    return notes
      .filter((n) => n.path !== path && n.links.some((l) => normalizeTitle(l) === target))
      .map((n) => ({ path: n.path, title: n.title }))
  }

  async search(query: string): Promise<SearchHit[]> {
    return search(await this.scan(), query)
  }

  /** Percorre o cofre e atualiza o cache só dos arquivos que mudaram. */
  private async scan(): Promise<Cached[]> {
    const paths = await this.walk(this.root)
    const alive = new Set(paths)
    for (const key of this.cache.keys()) if (!alive.has(key)) this.cache.delete(key)
    const out: Cached[] = []
    for (const path of paths) {
      try {
        await this.read(path)
        out.push(this.cache.get(path)!)
      } catch {
        // arquivo sumiu ou está bloqueado no meio da leitura; ignora
      }
    }
    return out
  }

  private async walk(dir: string): Promise<string[]> {
    let entries
    try {
      entries = await readdir(dir, { withFileTypes: true })
    } catch {
      return []
    }
    const out: string[] = []
    for (const entry of entries) {
      if (entry.name.startsWith('.') || entry.name === 'node_modules') continue
      const full = join(dir, entry.name)
      if (entry.isDirectory()) out.push(...(await this.walk(full)))
      else if (entry.isFile() && /\.md$/i.test(entry.name)) {
        out.push(relative(this.root, full).split(sep).join('/'))
      }
    }
    return out
  }
}

function stripCache({ mtimeMs: _m, ...note }: Cached): Note {
  return note
}
