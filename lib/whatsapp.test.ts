import { createHmac } from 'node:crypto'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { generateLinkCode, toE164, verifyWebhookSignature } from './whatsapp'

describe('normalização de número', () => {
  it('acrescenta o "+" que a Meta não manda', () => {
    expect(toE164('5511999998888')).toBe('+5511999998888')
  })
  it('remove qualquer coisa que não seja dígito', () => {
    expect(toE164('+55 (11) 99999-8888')).toBe('+5511999998888')
  })
})

describe('código de vínculo', () => {
  it('sempre 6 dígitos', () => {
    for (let i = 0; i < 50; i++) expect(generateLinkCode()).toMatch(/^\d{6}$/)
  })
})

describe('assinatura do webhook', () => {
  const secret = 'segredo-de-teste'
  beforeEach(() => { process.env.WHATSAPP_APP_SECRET = secret })
  afterEach(() => { delete process.env.WHATSAPP_APP_SECRET })

  function sign(body: string) {
    return `sha256=${createHmac('sha256', secret).update(body, 'utf8').digest('hex')}`
  }

  it('aceita uma assinatura válida', () => {
    const body = '{"entry":[]}'
    expect(verifyWebhookSignature(body, sign(body))).toBe(true)
  })
  it('recusa corpo alterado depois de assinado', () => {
    const body = '{"entry":[]}'
    const signature = sign(body)
    expect(verifyWebhookSignature(body + ' ', signature)).toBe(false)
  })
  it('recusa assinatura de outro segredo', () => {
    const body = '{"entry":[]}'
    const forged = `sha256=${createHmac('sha256', 'segredo-errado').update(body, 'utf8').digest('hex')}`
    expect(verifyWebhookSignature(body, forged)).toBe(false)
  })
  it('recusa cabeçalho ausente ou em formato errado', () => {
    const body = '{"entry":[]}'
    expect(verifyWebhookSignature(body, null)).toBe(false)
    expect(verifyWebhookSignature(body, 'sha1=algo')).toBe(false)
    expect(verifyWebhookSignature(body, '')).toBe(false)
  })
  it('sem WHATSAPP_APP_SECRET configurado, recusa tudo', () => {
    delete process.env.WHATSAPP_APP_SECRET
    const body = '{"entry":[]}'
    expect(verifyWebhookSignature(body, sign(body))).toBe(false)
  })
})
