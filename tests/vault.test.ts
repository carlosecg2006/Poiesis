import { mkdtempSync, readdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { beforeEach, describe, expect, it } from 'vitest'
import { Vault } from '../src/main/vault/vault'

let vault: Vault

beforeEach(async () => {
  vault = new Vault(join(mkdtempSync(join(tmpdir(), 'poiesis-')), 'cofre'))
  await vault.init({ 'Início.md': '# Início\n\nVeja [[Ideia]].' })
})

describe('cofre', () => {
  it('cria as notas iniciais só na primeira vez', async () => {
    expect((await vault.list()).map((n) => n.path)).toEqual(['Início.md'])
    await vault.write('Início.md', 'mudei')
    await vault.init({ 'Início.md': 'semente' })
    expect((await vault.read('Início.md')).body).toBe('mudei')
  })

  it('cria notas com nome único e em pastas', async () => {
    const a = await vault.create('Ideia', 'Projetos/Música')
    const b = await vault.create('Ideia', 'Projetos/Música')
    expect(a.path).toBe('Projetos/Música/Ideia.md')
    expect(b.path).toBe('Projetos/Música/Ideia 2.md')
  })

  it('resolve links e encontra backlinks', async () => {
    await vault.create('ideia')
    const path = await vault.resolve('IDEIA')
    expect(path).toBe('ideia.md')
    expect(await vault.backlinks(path!)).toEqual([{ path: 'Início.md', title: 'Início' }])
  })

  it('reflete edições imediatamente', async () => {
    await vault.write('n.md', 'um #a')
    await vault.write('n.md', 'dois #b')
    const note = await vault.read('n.md')
    expect(note.body).toBe('dois #b')
    expect(note.tags).toEqual(['b'])
  })

  it('não deixa sair da pasta do cofre', async () => {
    await expect(vault.write('../fora.md', 'x')).rejects.toThrow(/fora do cofre/)
    expect(() => vault.abs('..\\..\\x.md')).toThrow()
  })

  it('remover move para a lixeira em vez de apagar', async () => {
    await vault.remove('Início.md')
    expect(await vault.list()).toEqual([])
    expect(readdirSync(join(vault.root, '.poiesis', 'lixeira'))).toHaveLength(1)
  })

  it('busca nas notas', async () => {
    expect((await vault.search('ideia'))[0].path).toBe('Início.md')
  })
})
