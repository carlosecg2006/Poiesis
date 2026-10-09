# Poiesis

> *Poiesis* (ποίησις): o ato de trazer algo à existência.

Seu **segundo cérebro**: um assistente pessoal com IA, memória e automações,
construído como um Linux: núcleo pequeno, módulos plugáveis, tudo em arquivos
abertos que você pode estudar, modificar e criar.

A visão completa e o plano por fases estão em [`docs/VISAO.md`](docs/VISAO.md).

## O que já funciona (Fase 0)

- **Central**: saudação, relógio, captura rápida ("escreva qualquer coisa") e itens recentes.
- **Notas**: cofre em Markdown (compatível com Obsidian), salvamento automático,
  `[[links]]` entre ideias, conexões de entrada (backlinks), `#tags`, lixeira segura.
- **Chat com IA**: Claude (nuvem) ou Ollama (local), com **escolha automática**.
  Conversas ficam salvas no cofre. Cite notas com `[[Título]]` e a IA responde com base nelas.
  A nota *Sobre mim* ensina à IA quem você é.
- **Conversas privadas 🔒**: só usam IA local; nada sai do computador.
- **Busca universal** nas notas (sem diferenciar acentos).
- **Linha de comando universal** (`Ctrl+K`) e atalho global `Ctrl+Shift+Espaço`.
- **Núcleo modular**: barramento de eventos, registro de módulos com capacidades declaradas.

## Rodar no Windows

1. Instale o [Node.js LTS](https://nodejs.org) (versão 22 ou mais nova) e o [Git](https://git-scm.com).
2. No terminal (PowerShell):
   ```powershell
   git clone https://github.com/carlosecg2006/Poiesis.git
   cd Poiesis
   npm install
   npm run dev
   ```
3. Em **Ajustes**, cole sua chave da API do Claude (crie em
   [console.anthropic.com](https://console.anthropic.com) → API Keys; é cobrada por uso,
   separada da assinatura do Claude). Ela fica guardada com a criptografia do Windows.
4. Opcional: instale o [Ollama](https://ollama.com) e rode `ollama pull llama3.2` para ter IA local.

Para gerar um instalador `.exe`: `npm run dist:win` (no Windows). O arquivo sai em `dist/`.

Suas notas ficam em `Documentos\Poiesis` (dá para trocar em Ajustes, inclusive
para um cofre do Obsidian que você já tenha).

## Para quem for mexer no código

```
src/
  main/            processo principal (Node): o "kernel"
    core/          barramento de eventos, módulos/capacidades, configuração
    vault/         cofre de notas, busca
    ai/            roteador de IA, provedores (Claude, Ollama), conversas
    index.ts       liga tudo e registra os módulos e comandos
  preload/         ponte segura entre núcleo e interface (window.poiesis)
  renderer/        interface em React (os "espaços")
  shared/          tipos e funções usados dos dois lados
tests/             testes automáticos (vitest)
docs/VISAO.md      visão, arquitetura e roteiro
```

Comandos: `npm run dev` (abre o app), `npm run check` (tipos + testes), `npm run build`.

Para criar um módulo novo, registre-o em `src/main/index.ts` com `modules.register({...})`,
declarando suas capacidades e comandos; os comandos aparecem sozinhos no `Ctrl+K`.
