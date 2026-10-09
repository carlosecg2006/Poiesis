# Poiesis — Visão e Arquitetura (rascunho v0.1)

> *Poiesis* (ποίησις): o ato de trazer algo à existência.
> Um "segundo cérebro" pessoal: extensão da memória, da criação e da ação do seu cérebro biológico.

Este documento é vivo. Ele organiza o rascunho original em uma arquitetura e um plano por fases.
Nada aqui é definitivo — as decisões marcadas com **[DECIDIR]** dependem de você.

---

## 1. Princípios

1. **Local-first.** Seus dados moram na sua máquina, em formatos abertos (Markdown, JSON, SQLite). A nuvem é espelho/sincronização, não dona dos dados.
2. **Tudo é um nó.** Assim como no Linux "tudo é arquivo", no Poiesis tudo — nota, arquivo, pessoa, música, evento, conversa, ideia, emoção — é um **nó** num grafo. Isso é o que permite a "teia" estilo Obsidian e todas as capacidades *multi-* e *inter-* do rascunho.
3. **Núcleo pequeno, módulos plugáveis.** Um kernel enxuto; todo o resto (integrações, agentes, espaços) são módulos que você pode estudar, modificar, criar, ligar e desligar.
4. **Você no controle.** Toda ação no computador ou em serviços externos passa por um sistema de permissões. Ações destrutivas ou que enviam algo em seu nome pedem confirmação.
5. **Não interferir no que já existe.** Arquivos importados do Windows são lidos/indexados (ou copiados), nunca movidos ou alterados sem você pedir.
6. **Privacidade por camadas.** Espaços sensíveis (emocional, contatos) ficam criptografados e, por padrão, só usam modelos de IA locais.

---

## 2. A analogia com o Linux

| Linux | Poiesis | O que faz |
|---|---|---|
| Kernel | **Núcleo** | Barramento de eventos, permissões, agendador, registro de módulos |
| Sistema de arquivos (VFS) | **Cofre + Grafo** | Cofre de arquivos Markdown + banco de nós/ligações + índice vetorial |
| Drivers / módulos do kernel | **Conectores** | Spotify, Gmail, GitHub, Calendário, Windows… (preferencialmente via protocolo MCP) |
| Shell (bash) | **Linha de comando universal** | Uma barra (Ctrl+Espaço) onde você fala/escreve qualquer coisa: buscar, criar, executar |
| Pipes (`a \| b`) | **Fluxos** | Encadear ações: "pega e-mails de hoje → resume → cria tarefas" |
| systemd / cron | **Rotinas** | Agenda diária, rotina manhã/noite, sincronizações recorrentes, lembretes |
| Usuários e permissões | **Capacidades** | Cada módulo declara o que pode fazer; você autoriza |
| Gerenciador de pacotes (apt) | **Loja de módulos** | Instalar/atualizar/criar módulos e agentes |
| Processos | **Agentes** | Pesquisador, Programador, Organizador… rodando tarefas em paralelo |
| Ambiente gráfico (desktop) | **Espaços** | Interfaces: Central, Grafo, Editor, Projetos, Estúdio, Biblioteca, Refúgio… |
| Código aberto | **Tudo inspecionável** | Configs em texto, módulos legíveis, você pode modificar qualquer coisa |

---

## 3. Arquitetura em camadas

```
┌──────────────────────────────────────────────────────────────────┐
│  ESPAÇOS (interface)                                              │
│  Central · Busca Universal · Grafo · Editor · Projetos · Agenda  │
│  Contatos · Estúdio Criativo · Biblioteca · Refúgio · Cartas     │
├──────────────────────────────────────────────────────────────────┤
│  LINHA DE COMANDO UNIVERSAL  (texto / voz / atalho global)        │
├──────────────────────────────────────────────────────────────────┤
│  AGENTES          Pesquisa · Programação · Organização · Curador │
│  ROTEADOR DE IA   escolhe modelo local ou nuvem conforme a tarefa│
├──────────────────────────────────────────────────────────────────┤
│  MEMÓRIA          Grafo de conhecimento · RAG · Preferências     │
│                   Histórico de decisões · Contexto entre sessões │
├──────────────────────────────────────────────────────────────────┤
│  NÚCLEO           Eventos · Permissões · Rotinas · Registro      │
├──────────────────────────────────────────────────────────────────┤
│  CONECTORES (MCP) Sistema (Windows) · Google · Música · Mensagens│
│                   Dev · Produtividade · Mídia · Web              │
├──────────────────────────────────────────────────────────────────┤
│  ARMAZENAMENTO    Cofre local (Markdown) + SQLite + vetores      │
│                   ⇄ Sincronização criptografada com a nuvem      │
└──────────────────────────────────────────────────────────────────┘
```

### 3.1 Memória (o coração do "segundo cérebro")
- **Nós**: nota, arquivo, pessoa, projeto, tarefa, evento, mídia, conversa, ideia, emoção, decisão.
- **Ligações**: explícitas (`[[link]]` como no Obsidian) e **sugeridas pela IA** (semelhança de sentido, mesma pessoa, mesmo projeto, mesma época).
- **RAG**: todo conteúdo é fatiado e vetorizado; respostas da IA citam de qual arquivo/nota veio a informação.
- **Memória de você**: preferências, projetos, tarefas, decisões e o porquê delas, consultáveis entre sessões.

### 3.2 Roteador de IA
- **Local** (ex.: Ollama/llama.cpp): tarefas privadas (Refúgio, contatos), tarefas rápidas, embeddings.
- **Nuvem** (Claude, etc.): raciocínio complexo, programação, pesquisa longa, visão/áudio.
- Regras simples no início (tipo de tarefa + nível de privacidade + custo), refinadas com o uso.

### 3.3 Agentes
Cada agente = instruções + ferramentas permitidas + memória própria.
- **Pesquisador** — web, notícias, documentos, relatórios.
- **Programador** — VS Code, GitHub, terminal, testes, detecção de erros.
- **Organizador** — downloads, arquivos, tarefas, agenda, lembretes, cobranças.
- **Curador** — mantém a teia: sugere ligações, resume, encontra duplicatas.
- **Operador** — controla o computador (programas, volume, brilho, mouse, teclado, janela ativa, captura de tela). Sempre com permissões.

---

## 4. Espaços (o que você vê)

| Espaço | Do rascunho |
|---|---|
| **Central** | central de acesso, agenda do dia, prazos, tempo, notícias, horário |
| **Busca Universal** | busca em tudo: arquivos, notas, e-mails, conversas, música, projetos |
| **Grafo** | teia de conexões inspirada no Obsidian |
| **Editor** | editor de ideias e documentos; "escrever qualquer coisa para qualquer função" (captura rápida que a IA classifica depois) |
| **Projetos** | central de projetos, metas, tarefas, planejamento de estudos/viagens |
| **Agenda** | calendário, eventos, rotina manhã/noite, lembretes |
| **Contatos** | unificador de contatos com "ficha" gerada por IA |
| **Estúdio** | processos criativos: audiovisual, música, escrita, literatura; referências (Pinterest, Canva) |
| **Biblioteca** | sua literatura pessoal: livros, textos, poemas, cartas |
| **Cartas** | integração com seu site de cartas |
| **Refúgio** | espaço emocional/terapêutico: diário, humor, reflexões (criptografado, IA local) |
| **Terminal** | comandos para o computador, scripts, automações |

---

## 5. Integrações — mapa de viabilidade

Classificação honesta, porque algumas plataformas não permitem acesso a contas pessoais:

| Situação | Integrações |
|---|---|
| 🟢 **API oficial, tranquilo** | Google (Gmail, Drive, Agenda, Maps), GitHub, Notion, Spotify, YouTube, Telegram, Discord (bot), SoundCloud (limitado), Microsoft (Teams, Excel via Graph), Canva (Connect API), Pinterest, notícias, tempo |
| 🟢 **Local, tranquilo** | Explorador de arquivos, VS Code, Excel local, terminal, controle do Windows (volume, brilho, janelas, mouse/teclado), capturas de tela |
| 🟡 **Via exportação de dados** | **WhatsApp** (exportar conversa → .txt/.zip), **Instagram** (download dos seus dados), histórico pessoal do Discord. Automatizar a conta pessoal desses apps viola os termos e pode **banir sua conta** — por isso a importação de exportações é o caminho seguro. |
| 🔴 **Não vou construir** | "Pobreflix"/sites piratas. Alternativa: busca de filmes com TMDB + **onde assistir legalmente** (JustWatch), e/ou um servidor de mídia próprio (Jellyfin/Plex) para seus arquivos. |

Unificador de contatos: as fichas são montadas a partir do que **você** importa; ficam locais e criptografadas. Bom lembrar que são dados de outras pessoas — tratar com cuidado.

---

## 6. Stack técnica proposta **[DECIDIR]**

- **App desktop:** Tauri (núcleo em Rust, leve) + interface web (React/TypeScript ou Svelte). Roda em Windows, macOS, Linux; base para mobile depois.
  - Alternativa mais simples para aprender: Electron + TypeScript (mais pesado, mais exemplos na internet).
- **Motor de IA/agentes:** Python ou TypeScript como serviço local ("sidecar").
- **Integrações:** **MCP (Model Context Protocol)** — já existem servidores prontos para GitHub, Notion, Google, Spotify, sistema de arquivos etc. Cada conector = um módulo MCP. Isso é exatamente o "modular como Linux".
- **Armazenamento:** cofre em Markdown (compatível com Obsidian) + SQLite + `sqlite-vec` para vetores.
- **IA local:** Ollama. **IA nuvem:** Claude API (e outras, via roteador).
- **Sync:** pasta criptografada em Google Drive/OneDrive no início; serviço próprio depois.

---

## 7. Roteiro por fases

Escopo total é enorme; construímos em camadas, cada fase já útil sozinha.

| Fase | Entrega | Resultado para você |
|---|---|---|
| **0 — Fundação** | Esqueleto do app, cofre, núcleo, linha de comando, chat com IA | Você abre o app e conversa com a IA dentro dele |
| **1 — Memória** | Editor + captura rápida, importação de pastas do Windows (sem alterar), busca universal, RAG, grafo | "O que eu escrevi sobre X?" com respostas citando seus arquivos |
| **2 — Seu dia** | Agenda, Gmail, tarefas, lembretes, tempo, notícias, agenda diária, rotinas manhã/noite | A Central vira seu painel diário |
| **3 — Agentes e controle** | Roteador de IA, agentes, controle do Windows, terminal, VS Code/GitHub | "Organiza meus downloads", "roda os testes do projeto" |
| **4 — Pessoas e criação** | Contatos unificados, Estúdio, Biblioteca, Cartas, Refúgio | O lado humano e criativo |
| **5 — Expansão** | Mais conectores, loja de módulos, sync, celular | Multiplataforma completo |

---

## 8. Perguntas em aberto
Veja a seção de conversa — respostas a serem registradas aqui.
