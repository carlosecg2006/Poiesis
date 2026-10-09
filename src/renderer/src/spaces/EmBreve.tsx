const DESCRIPTIONS: Record<string, string> = {
  Teia: 'A visualização da teia de conexões entre todas as suas notas, pessoas, projetos e ideias, inspirada no Obsidian.',
  Agenda: 'Calendário, compromissos, agenda diária, rotina de manhã e de noite, lembretes e prazos.',
  Projetos: 'Central de projetos, metas e tarefas, com planejamento de estudos, viagens e criações.',
  Agentes: 'Agentes especializados (pesquisa, programação, organização) e controle do computador.',
  Contatos: 'Fichas de pessoas unindo conversas importadas do WhatsApp, Telegram, Discord e mais.',
  Estúdio: 'Seu espaço de criação: audiovisual, música, escrita e literatura, com referências.',
  Biblioteca: 'Sua biblioteca pessoal de literatura: livros, textos, poemas e coleções.',
  Cartas: 'Integração com o seu site de cartas.',
  Refúgio: 'Espaço emocional e terapêutico: diário, humor e reflexões. Criptografado e só com IA local.'
}

export function EmBreve({ title, phase }: { title: string; phase: number }) {
  return (
    <div className="page empty-state">
      <div className="soon-badge">Fase {phase}</div>
      <h1>{title}</h1>
      <p className="muted">{DESCRIPTIONS[title]}</p>
      <p className="muted small">Este espaço está no plano (docs/VISAO.md) e chega na Fase {phase}.</p>
    </div>
  )
}
