/**
 * Votação de features — o que é compartilhado entre a API e a interface.
 *
 * Fica fora de um arquivo `'use client'` de propósito: a rota do servidor
 * valida o voto contra esta lista, porque o banco só confere o tamanho do texto.
 * As opções são CONTEÚDO DE PRODUTO (o roadmap que a comunidade decide).
 */

/** Rodada atual. Trocar isto abre uma votação nova sem apagar a anterior. */
export const VOTE_SEASON = '2026-1'

export interface VoteFeature { id: string; emoji: string; title: string; desc: string }

export const voteFeatures: VoteFeature[] = [
  { id: 'space', emoji: '💻', title: 'Aprumo Space', desc: 'Workspace para trabalho e estudo: Kanban, projetos, tarefas e sessões de foco.' },
  { id: 'coworking', emoji: '🟢', title: 'Coworking', desc: 'Salas de foco ao vivo. Estude e trabalhe junto de outras pessoas.' },
  { id: 'nutricao', emoji: '🥗', title: 'Nutrição', desc: 'Expandir Saúde: alimentação, refeições, água e acompanhamento.' },
  { id: 'repertorio', emoji: '🧠', title: 'Repertório+', desc: 'Salvar artigos, vídeos, links e conteúdos externos.' },
  { id: 'circulos', emoji: '👥', title: 'Círculos+', desc: 'Desafios privados, metas coletivas, ranking e sessões de foco em grupo.' },
]

export function isVoteFeature(id: unknown): id is string {
  return typeof id === 'string' && voteFeatures.some(feature => feature.id === id)
}

/** Votos por feature, como a função `feature_vote_counts()` devolve. */
export type VoteCounts = Record<string, number>

export interface VoteRow { id: string; votes: number; percent: number }

/**
 * Transforma a contagem em linhas prontas para barras.
 *
 * Os percentuais somam exatamente 100 (método do maior resto): arredondar cada
 * um isoladamente daria 33 + 33 + 33 = 99 e a barra pareceria incompleta.
 * Votos em features que saíram da lista são ignorados. A ordem é a da lista,
 * não a do placar — reordenar a cada voto faria as opções pularem na tela.
 */
export function tally(counts: VoteCounts): { total: number; rows: VoteRow[] } {
  const votes = voteFeatures.map(feature => Math.max(0, Math.floor(counts[feature.id] ?? 0)))
  const total = votes.reduce((sum, value) => sum + value, 0)
  if (total === 0) return { total, rows: voteFeatures.map(feature => ({ id: feature.id, votes: 0, percent: 0 })) }

  const exact = votes.map(value => value / total * 100)
  const percent = exact.map(Math.floor)
  let left = 100 - percent.reduce((sum, value) => sum + value, 0)
  // Distribui o que sobrou para quem ficou com a maior fração; empate vai pela ordem da lista.
  const byRemainder = exact.map((value, index) => ({ index, rest: value - Math.floor(value) }))
    .sort((a, b) => b.rest - a.rest || a.index - b.index)
  for (const { index } of byRemainder) {
    if (left === 0) break
    percent[index]++
    left--
  }
  return { total, rows: voteFeatures.map((feature, index) => ({ id: feature.id, votes: votes[index], percent: percent[index] })) }
}
