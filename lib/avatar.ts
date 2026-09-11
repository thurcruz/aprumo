'use client'

import { createSupabaseBrowserClient } from './supabase/client'

/** Erro com mensagem pronta para mostrar à pessoa. */
export class AvatarError extends Error {}

const SIZE = 512
const BUCKET = 'avatars'
const NOT_READY = 'A foto ainda não pode ser salva: o armazenamento de imagens não foi ativado no servidor.'

/**
 * Recorta no centro, reduz para 512×512 e comprime. A foto da câmera tem
 * vários MB; o avatar sai com dezenas de KB e carrega rápido em qualquer lista.
 */
async function prepare(file: File): Promise<Blob> {
  if (!file.type.startsWith('image/')) throw new AvatarError('Escolha um arquivo de imagem.')
  let bitmap: ImageBitmap
  try {
    bitmap = await createImageBitmap(file)
  } catch {
    throw new AvatarError('Não foi possível ler esta imagem. Tente outra.')
  }
  const side = Math.min(bitmap.width, bitmap.height)
  const canvas = document.createElement('canvas')
  canvas.width = SIZE
  canvas.height = SIZE
  const context = canvas.getContext('2d')
  if (!context) throw new AvatarError('Não foi possível processar a imagem.')
  context.drawImage(bitmap, (bitmap.width - side) / 2, (bitmap.height - side) / 2, side, side, 0, 0, SIZE, SIZE)
  bitmap.close()
  const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.86))
  if (!blob) throw new AvatarError('Não foi possível processar a imagem.')
  return blob
}

async function saveUrl(url: string | null) {
  const response = await fetch('/api/profile', { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ avatarUrl: url }) })
  if (response.ok) return
  const data = await response.json().catch(() => null) as { error?: string } | null
  // Sem a migração, a coluna `avatar_url` não existe e o erro do banco cita o nome dela.
  throw new AvatarError(data?.error?.includes('avatar_url') ? NOT_READY : 'Não foi possível salvar a foto.')
}

function pathOf(url: string): string | null {
  const marker = `/object/public/${BUCKET}/`
  const index = url.indexOf(marker)
  return index < 0 ? null : url.slice(index + marker.length)
}

/** Apaga a foto antiga sem travar a troca: se falhar, sobra só um arquivo órfão. */
function discard(url: string | null) {
  const path = url ? pathOf(url) : null
  if (!path) return
  void createSupabaseBrowserClient().storage.from(BUCKET).remove([path]).then(() => undefined, () => undefined)
}

/**
 * Sobe a foto para a pasta do próprio usuário e grava a URL no perfil.
 * Um nome de arquivo novo a cada envio invalida o cache da CDN sem truque.
 */
export async function uploadAvatar(file: File, previousUrl: string | null): Promise<string> {
  const blob = await prepare(file)
  const supabase = createSupabaseBrowserClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new AvatarError('Sua sessão expirou. Entre de novo para trocar a foto.')
  const path = `${user.id}/${Date.now()}.jpg`
  const { error } = await supabase.storage.from(BUCKET).upload(path, blob, { contentType: 'image/jpeg', cacheControl: '31536000' })
  if (error) throw new AvatarError(/bucket/i.test(error.message) ? NOT_READY : 'Não foi possível enviar a foto. Tente de novo.')
  const url = supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl
  await saveUrl(url)
  discard(previousUrl)
  return url
}

export async function removeAvatar(previousUrl: string | null): Promise<void> {
  await saveUrl(null)
  discard(previousUrl)
}
