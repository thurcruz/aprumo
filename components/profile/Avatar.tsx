'use client'

import { initialsOf } from '@/lib/profile'

/**
 * Foto de perfil, ou as iniciais quando não há foto. É um fundo, não um
 * `<img>`: dispensa configurar o domínio do Storage no otimizador de imagens.
 */
export default function Avatar({ name, url, size = 36 }: { name: string; url: string | null; size?: number }) {
  if (url) {
    return <span role="img" aria-label={`Foto de ${name || 'perfil'}`} className="block shrink-0 rounded-full bg-cover bg-center"
      style={{ width: size, height: size, backgroundImage: `url(${JSON.stringify(url)})` }}/>
  }
  return <span className="grid shrink-0 place-items-center rounded-full bg-white/5 font-bold"
    style={{ width: size, height: size, fontSize: Math.round(size * 0.33) }}>{initialsOf(name)}</span>
}
