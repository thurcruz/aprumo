'use client'

import { useSyncExternalStore } from 'react'
import { isoDate } from './utils'

/**
 * A data de hoje (YYYY-MM-DD) lida como estado externo.
 *
 * Ler o relógio direto no corpo de um componente o torna impuro: o valor muda
 * sem que nada tenha mudado, e o React pode rerenderizar quando bem entender.
 * `useSyncExternalStore` resolve isso — e como o snapshot é uma string, comparar
 * por identidade já basta para o React saber que nada mudou.
 */
const subscribe = () => () => {}
const getSnapshot = () => isoDate(new Date())
/** No servidor não existe "hoje" do usuário; o cliente preenche na hidratação. */
const getServerSnapshot = () => ''

export function useToday(): string {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}
