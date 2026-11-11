import { describe, expect, it } from 'vitest'
import { creditsForPrice, parsePriceCredits, resolvePlan, subscriptionOfInvoice } from './billing'

describe('assinatura de uma fatura', () => {
  it('lê o formato atual da API (invoice.parent)', () => {
    expect(subscriptionOfInvoice({ parent: { subscription_details: { subscription: 'sub_1' } }, lines: { data: [{}] } })).toBe('sub_1')
  })
  it('cai para o parent da linha quando a fatura não traz', () => {
    expect(subscriptionOfInvoice({ lines: { data: [{ parent: { subscription_item_details: { subscription: 'sub_2' } } }] } })).toBe('sub_2')
  })
  it('ainda entende eventos de versões antigas', () => {
    expect(subscriptionOfInvoice({ lines: { data: [{ subscription: { id: 'sub_3' } }] } })).toBe('sub_3')
  })
  it('fatura avulsa não tem assinatura', () => {
    expect(subscriptionOfInvoice({ parent: null, lines: { data: [{ parent: null }] } })).toBeNull()
    expect(subscriptionOfInvoice({})).toBeNull()
  })
})

describe('plano a partir do status da assinatura', () => {
  it('ativa, em teste ou em cobrança em atraso contam como Plus', () => {
    expect(resolvePlan('active')).toBe('plus')
    expect(resolvePlan('trialing')).toBe('plus')
    expect(resolvePlan('past_due')).toBe('plus')
  })
  it('cancelada, sem pagar ou incompleta contam como Free', () => {
    expect(resolvePlan('canceled')).toBe('free')
    expect(resolvePlan('unpaid')).toBe('free')
    expect(resolvePlan('incomplete')).toBe('free')
    expect(resolvePlan('incomplete_expired')).toBe('free')
    expect(resolvePlan('paused')).toBe('free')
  })
  it('sem assinatura nenhuma é Free', () => {
    expect(resolvePlan(null)).toBe('free')
    expect(resolvePlan(undefined)).toBe('free')
  })
})

describe('mapa de créditos por preço', () => {
  it('lê pares id:créditos separados por vírgula', () => {
    const map = parsePriceCredits('price_mensal:300,price_anual:3600,price_pacote:100')
    expect(creditsForPrice(map, 'price_mensal')).toBe(300)
    expect(creditsForPrice(map, 'price_anual')).toBe(3600)
    expect(creditsForPrice(map, 'price_pacote')).toBe(100)
  })
  it('preço fora do mapa devolve null, não zero — zero pareceria "sem crédito nenhum" em vez de "não configurado"', () => {
    const map = parsePriceCredits('price_mensal:300')
    expect(creditsForPrice(map, 'price_desconhecido')).toBeNull()
    expect(creditsForPrice(map, null)).toBeNull()
  })
  it('entradas malformadas são ignoradas sem quebrar as outras', () => {
    const map = parsePriceCredits('price_ok:300, ,price_sem_numero:abc,:500,price_negativo:-10,price_outro:50')
    expect(map).toEqual(new Map([['price_ok', 300], ['price_outro', 50]]))
  })
  it('vazio ou indefinido devolve mapa vazio', () => {
    expect(parsePriceCredits(undefined).size).toBe(0)
    expect(parsePriceCredits('').size).toBe(0)
  })
})
