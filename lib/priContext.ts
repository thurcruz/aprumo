/**
 * A Pri muda de assunto conforme a tela: em Finanças ela já chega pronta para
 * falar de dinheiro. Este módulo é puro e compartilhado — o cliente usa o
 * rótulo e as sugestões; o servidor valida a tela e usa a dica no prompt.
 */

export const PRI_SCREENS = ['hoje', 'foco', 'saude', 'mente', 'financas', 'comunidade', 'planos', 'evolucao', 'geral'] as const
export type PriScreen = (typeof PRI_SCREENS)[number]

export interface PriContext {
  screen: PriScreen
  /** Assunto mostrado no topo da conversa: "Finanças". */
  label: string
  greeting: string
  placeholder: string
  /** Pedidos prontos, um toque para enviar. Todos cabem nas ferramentas que a Pri já tem. */
  suggestions: string[]
}

const contexts: Record<PriScreen, Omit<PriContext, 'screen'>> = {
  hoje: {
    label: 'Seu dia',
    greeting: 'O que precisa acontecer hoje?',
    placeholder: 'Ex.: agende uma reunião amanhã às 10h',
    suggestions: ['O que ainda falta hoje?', 'Crie uma tarefa para ligar para o banco amanhã', 'Agende 45 minutos de leitura hoje às 21h'],
  },
  foco: {
    label: 'Foco',
    greeting: 'No que você quer focar?',
    placeholder: 'Ex.: crie uma tarefa para revisar a proposta',
    suggestions: ['Qual é a tarefa mais importante de hoje?', 'Crie uma tarefa para revisar a proposta às 14h'],
  },
  saude: {
    label: 'Saúde',
    greeting: 'Vamos cuidar da base?',
    placeholder: 'Ex.: agende treino amanhã às 7h',
    suggestions: ['Agende treino amanhã às 7h por 45 minutos', 'Crie o hábito de dormir antes das 23h', 'Anote como me senti depois do treino'],
  },
  mente: {
    label: 'Mente',
    greeting: 'O que você aprendeu hoje?',
    placeholder: 'Ex.: estou na página 120 do meu livro',
    suggestions: ['O que estou lendo agora?', 'Atualize minha leitura para a página 120', 'Anote uma ideia que tive hoje'],
  },
  financas: {
    label: 'Finanças',
    greeting: 'Registrar ou entender seu dinheiro?',
    placeholder: 'Ex.: gastei R$ 45 no mercado',
    suggestions: ['Registre um gasto de R$ 45 no mercado', 'Registre uma entrada de R$ 2.000 de salário', 'Como posso gastar menos este mês?'],
  },
  comunidade: {
    label: 'Comunidade',
    greeting: 'Quer companhia na sua evolução?',
    placeholder: 'Ex.: como manter constância num desafio?',
    suggestions: ['Como manter constância num desafio?', 'Que círculo combina com minhas metas?'],
  },
  planos: {
    label: 'Planos',
    greeting: 'Qual caminho faz sentido agora?',
    placeholder: 'Ex.: que plano combina comigo?',
    suggestions: ['Que plano pronto combina com minhas metas?', 'Quanto tempo por semana eu tenho livre?'],
  },
  evolucao: {
    label: 'Sua evolução',
    greeting: 'Quer entender como você está indo?',
    placeholder: 'Ex.: como foi minha semana?',
    suggestions: ['Como estão minhas metas?', 'O que posso ajustar na minha rotina?'],
  },
  geral: {
    label: 'Aprumo',
    greeting: 'O que vamos organizar?',
    placeholder: 'Fale com a Pri…',
    suggestions: ['O que ainda falta hoje?', 'Crie uma tarefa para amanhã às 9h'],
  },
}

/** Qual assunto cada rota abre. A primeira regra que casar vence. */
const routes: [prefix: string, screen: PriScreen][] = [
  ['/foco', 'foco'],
  ['/hoje', 'hoje'], ['/agenda', 'hoje'], ['/tarefas', 'hoje'], ['/metas', 'hoje'], ['/emocional', 'hoje'],
  ['/saude', 'saude'], ['/treino', 'saude'], ['/antivicio', 'saude'],
  ['/mente', 'mente'],
  ['/financas', 'financas'],
  ['/comunidade', 'comunidade'],
  ['/planos', 'planos'],
  ['/perfil', 'evolucao'],
]

export function priContextFor(pathname: string): PriContext {
  const match = routes.find(([prefix]) => pathname === prefix || pathname.startsWith(`${prefix}/`))
  const screen = match?.[1] ?? 'geral'
  return { screen, ...contexts[screen] }
}

export function isPriScreen(value: unknown): value is PriScreen {
  return typeof value === 'string' && (PRI_SCREENS as readonly string[]).includes(value)
}

/** O que a Pri deve priorizar em cada tela — vai para as instruções do modelo. */
export const PRI_SCREEN_HINTS: Record<PriScreen, string> = {
  hoje: 'O usuário abriu a Pri na tela do dia (agenda, hábitos e metas): priorize o que falta hoje e registrar tarefas com create_task.',
  foco: 'O usuário abriu a Pri na tela de Foco: ajude a escolher a próxima tarefa e registre tarefas com create_task.',
  saude: 'O usuário abriu a Pri na área de Saúde (treino, sono, humor): priorize rotina de treino e descanso; agende sessões com create_task.',
  mente: 'O usuário abriu a Pri na área Mente (livros e repertório): priorize leitura (update_book_progress) e anotações (create_note).',
  financas: 'O usuário abriu a Pri na área de Finanças: priorize registrar entradas e gastos com create_transaction e perguntas sobre o dinheiro dele.',
  comunidade: 'O usuário abriu a Pri na Comunidade (mural, desafios, círculos): ajude a manter constância com outras pessoas.',
  planos: 'O usuário abriu a Pri em Planos (planos prontos de algumas semanas): ajude a escolher um plano que caiba na rotina e nas metas dele.',
  evolucao: 'O usuário abriu a Pri na página de evolução: priorize leituras sobre metas, constância e progresso.',
  geral: '',
}

/** Instrução extra quando a resposta vai ser falada em voz alta. */
export const PRI_VOICE_HINT = 'A resposta será lida em voz alta: responda em no máximo duas frases curtas, sem listas, markdown, emojis ou links.'
