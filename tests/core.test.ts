import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { EventBus } from '../src/main/core/bus'
import { ConfigStore, defaultConfig } from '../src/main/core/config'
import { ModuleRegistry } from '../src/main/core/modules'

const fakeCipher = {
  available: () => true,
  encrypt: (s: string) => Buffer.from(s.split('').reverse().join('')),
  decrypt: (b: Buffer) => b.toString().split('').reverse().join('')
}

describe('núcleo', () => {
  it('barramento entrega eventos e permite cancelar', () => {
    const bus = new EventBus<{ ping: number }>()
    const got: number[] = []
    const off = bus.on('ping', (n) => got.push(n))
    bus.emit('ping', 1)
    off()
    bus.emit('ping', 2)
    expect(got).toEqual([1])
  })

  it('registro de módulos valida capacidades e roda comandos', async () => {
    const reg = new ModuleRegistry()
    reg.register({ id: 'm', name: 'M', description: '', capabilities: ['vault.read'], commands: [{ id: 'oi', title: 'Oi', run: (a) => `oi ${a}` }] })
    expect(await reg.run('oi', 'Carlos')).toBe('oi Carlos')
    reg.setEnabled('m', false)
    expect(reg.commands()).toEqual([])
    await expect(reg.run('oi')).rejects.toThrow(/desligado/)
    // @ts-expect-error capacidade inválida de propósito
    expect(() => reg.register({ id: 'x', name: 'X', description: '', capabilities: ['tudo'] })).toThrow()
  })

  it('configuração persiste e a chave fica cifrada', () => {
    const dir = mkdtempSync(join(tmpdir(), 'poiesis-cfg-'))
    const saved = process.env.ANTHROPIC_API_KEY
    delete process.env.ANTHROPIC_API_KEY
    try {
      const a = new ConfigStore(dir, defaultConfig('C:/Docs'), fakeCipher)
      a.update({ provider: 'ollama' })
      a.setClaudeKey('sk-ant-123')
      const b = new ConfigStore(dir, defaultConfig('C:/Docs'), fakeCipher)
      expect(b.get().provider).toBe('ollama')
      expect(b.getClaudeKey()).toBe('sk-ant-123')
      b.setClaudeKey(null)
      expect(b.getClaudeKey()).toBeNull()
    } finally {
      if (saved !== undefined) process.env.ANTHROPIC_API_KEY = saved
    }
  })
})
