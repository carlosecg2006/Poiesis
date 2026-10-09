import { useEffect, useState } from 'react'
import type { ModuleInfo, ProviderChoice, ProviderStatus, Settings } from '@shared/types'

export function Ajustes() {
  const [settings, setSettings] = useState<Settings | null>(null)
  const [status, setStatus] = useState<ProviderStatus | null>(null)
  const [modules, setModules] = useState<ModuleInfo[]>([])
  const [key, setKey] = useState('')
  const [message, setMessage] = useState('')

  const refresh = async (): Promise<void> => {
    setSettings(await window.poiesis.settings.get())
    setStatus(await window.poiesis.settings.providers())
  }

  useEffect(() => {
    void refresh()
    void window.poiesis.system.modules().then(setModules)
  }, [])

  const flash = (text: string): void => {
    setMessage(text)
    setTimeout(() => setMessage(''), 3000)
  }

  const saveKey = async (value: string | null): Promise<void> => {
    try {
      setSettings(await window.poiesis.settings.setClaudeKey(value))
      setKey('')
      setStatus(await window.poiesis.settings.providers())
      flash(value ? 'Chave guardada com criptografia do Windows.' : 'Chave removida.')
    } catch (err) {
      flash((err as Error).message)
    }
  }

  const update = async (patch: Partial<Settings>): Promise<void> => {
    setSettings(await window.poiesis.settings.update(patch))
    setStatus(await window.poiesis.settings.providers())
  }

  if (!settings) return <div className="page" />

  return (
    <div className="page settings-page">
      <h1>Ajustes</h1>
      {message && <div className="notice">{message}</div>}

      <section className="card">
        <h2>Inteligência artificial</h2>
        <div className="field">
          <label>Quem responde</label>
          <select value={settings.provider} onChange={(e) => void update({ provider: e.target.value as ProviderChoice })}>
            <option value="auto">Automático (recomendado)</option>
            <option value="claude">Sempre Claude (nuvem)</option>
            <option value="ollama">Sempre local (Ollama)</option>
          </select>
          <p className="muted small">No automático, o Poiesis usa o Claude quando há chave e a IA local quando não há. Conversas privadas 🔒 sempre usam só a IA local.</p>
        </div>

        <div className="field">
          <label>
            Chave da API do Claude <span className={`dot ${status?.claude ? 'ok' : ''}`} /> {settings.hasClaudeKey ? 'configurada' : 'não configurada'}
          </label>
          <div className="row gap">
            <input type="password" value={key} onChange={(e) => setKey(e.target.value)} placeholder="sk-ant-…" />
            <button disabled={!key.trim()} onClick={() => void saveKey(key)}>Guardar</button>
            {settings.hasClaudeKey && <button className="ghost danger" onClick={() => void saveKey(null)}>Remover</button>}
          </div>
          <p className="muted small">
            Crie em console.anthropic.com → API Keys. É cobrada por uso, separada da assinatura do Claude.
            {!settings.secureStorage && ' Atenção: este computador não oferece armazenamento seguro.'}
          </p>
        </div>

        <div className="field">
          <label>
            IA local (Ollama) <span className={`dot ${status?.ollama ? 'ok' : ''}`} /> {status?.ollama ? 'conectado' : 'não encontrado'}
          </label>
          <div className="row gap">
            <input defaultValue={settings.ollamaUrl} onBlur={(e) => void update({ ollamaUrl: e.target.value.trim() })} />
            <input defaultValue={settings.ollamaModel} onBlur={(e) => void update({ ollamaModel: e.target.value.trim() })} placeholder="modelo" />
          </div>
          <p className="muted small">Opcional. Instale em ollama.com e rode, por exemplo: <code>ollama pull llama3.2</code></p>
        </div>
      </section>

      <section className="card">
        <h2>Cofre</h2>
        <div className="field">
          <label>Pasta das suas notas</label>
          <div className="row gap">
            <input value={settings.vaultPath} readOnly />
            <button className="ghost" onClick={() => void window.poiesis.settings.chooseVault().then(setSettings)}>Trocar…</button>
            <button className="ghost" onClick={() => void window.poiesis.system.openVault()}>Abrir pasta</button>
          </div>
          <p className="muted small">Uma pasta comum com arquivos .md. Pode apontar para um cofre do Obsidian que você já tenha.</p>
        </div>
      </section>

      <section className="card">
        <h2>Módulos</h2>
        <p className="muted small">Como no Linux, cada parte do Poiesis é um módulo que declara o que pode fazer.</p>
        <ul className="modules">
          {modules.map((m) => (
            <li key={m.id}>
              <div>
                <strong>{m.name}</strong> <span className="muted small">({m.id})</span>
                <div className="muted small">{m.description}</div>
              </div>
              <div className="caps">
                {m.capabilities.map((c) => (
                  <span key={c} className="pill">{c}</span>
                ))}
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
