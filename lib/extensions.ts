import type { AprumoStore } from './types'

/**
 * Extensões: módulos opcionais que ficam fora do caminho principal (diagnóstico
 * → plano → execução). Não são Aprumo+ — só não aparecem até a pessoa querer.
 *
 * A escolha mora no perfil (`profiles.extensions`). Sem escolha explícita, uma
 * extensão conta como ativa se já tem registros: quem já usava não perde nada.
 */

export const EXTENSION_IDS = ['financas', 'treino', 'repertorio', 'antivicio'] as const
export type ExtensionId = (typeof EXTENSION_IDS)[number]
export type ExtensionChoices = Partial<Record<ExtensionId, boolean>>

export interface Extension {
  id: ExtensionId
  label: string
  description: string
  pages: { href: string; label: string }[]
}

export const EXTENSIONS: Extension[] = [
  { id: 'financas', label: 'Finanças', description: 'Entradas, saídas e metas de dinheiro do mês.', pages: [{ href: '/financas', label: 'Finanças' }] },
  { id: 'treino', label: 'Treino e sono', description: 'Fichas de treino com execução guiada e registro de sono.', pages: [{ href: '/treino', label: 'Treino' }, { href: '/saude/sono', label: 'Sono' }] },
  { id: 'repertorio', label: 'Repertório', description: 'Livros, ideias, citações e a Dose do dia.', pages: [{ href: '/mente', label: 'Repertório' }] },
  { id: 'antivicio', label: 'Antivício', description: 'Contador, gatilhos e plano de contingência.', pages: [{ href: '/antivicio', label: 'Antivício' }] },
]

type UsageStore = Pick<AprumoStore, 'transactions' | 'financialGoals' | 'workouts' | 'workoutLogs' | 'sleep' | 'books' | 'repertoire' | 'notes' | 'addictions'>

function hasUsage(id: ExtensionId, store: UsageStore): boolean {
  switch (id) {
    case 'financas': return store.transactions.length + (store.financialGoals ?? []).length > 0
    case 'treino': return store.workouts.length + (store.workoutLogs ?? []).length + (store.sleep ?? []).length > 0
    case 'repertorio': return store.books.length + (store.repertoire ?? []).length + store.notes.length > 0
    case 'antivicio': return store.addictions.length > 0
  }
}

export function isExtensionActive(id: ExtensionId, choices: ExtensionChoices, store: UsageStore): boolean {
  return choices[id] ?? hasUsage(id, store)
}

/** Só chaves conhecidas com valor booleano — o resto é descartado, não derruba o conjunto. */
export function parseExtensionChoices(value: unknown): ExtensionChoices {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  const source = value as Record<string, unknown>
  return Object.fromEntries(EXTENSION_IDS.filter(id => typeof source[id] === 'boolean').map(id => [id, source[id]])) as ExtensionChoices
}
