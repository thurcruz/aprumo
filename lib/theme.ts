/**
 * Tema da interface. A preferência (escuro, claro ou automático) fica no
 * localStorage; o tema de fato aplicado vai em <html data-theme>, que é o que o CSS lê.
 */
export type ThemePreference = 'dark' | 'light' | 'system'
export type Theme = 'dark' | 'light'

const KEY = 'aprumo-theme'
const EVENT = 'aprumo-theme-change'
const LIGHT_QUERY = '(prefers-color-scheme: light)'

export function readPreference(): ThemePreference {
  try {
    const value = localStorage.getItem(KEY)
    return value === 'light' || value === 'system' ? value : 'dark'
  } catch {
    return 'dark'
  }
}

/** O automático segue o sistema. Sem preferência salva vale o escuro, o visual de origem da marca. */
export function resolveTheme(preference: ThemePreference, systemPrefersLight: boolean): Theme {
  if (preference === 'system') return systemPrefersLight ? 'light' : 'dark'
  return preference
}

export function applyTheme(): void {
  document.documentElement.dataset.theme = resolveTheme(readPreference(), matchMedia(LIGHT_QUERY).matches)
}

export function setPreference(preference: ThemePreference): void {
  try { localStorage.setItem(KEY, preference) } catch { /* sem armazenamento: não há o que lembrar */ }
  window.dispatchEvent(new Event(EVENT))
}

/** Avisa quando a preferência muda — nesta aba ou em outra. */
export function subscribePreference(onChange: () => void): () => void {
  const onStorage = (event: StorageEvent) => { if (event.key === KEY) onChange() }
  window.addEventListener(EVENT, onChange)
  window.addEventListener('storage', onStorage)
  return () => {
    window.removeEventListener(EVENT, onChange)
    window.removeEventListener('storage', onStorage)
  }
}

/** Mantém <html data-theme> em dia: quando a preferência muda e, no automático, quando o sistema troca de tema. */
export function watchTheme(): () => void {
  const media = matchMedia(LIGHT_QUERY)
  applyTheme()
  const stop = subscribePreference(applyTheme)
  media.addEventListener('change', applyTheme)
  return () => {
    stop()
    media.removeEventListener('change', applyTheme)
  }
}

/**
 * Roda no <head>, antes da primeira pintura — sem ele a página nasce escura e
 * pisca ao virar clara. É o resolveTheme reescrito em JS puro; o teste garante
 * que os dois concordam.
 */
export const THEME_SCRIPT = `try{var p=localStorage.getItem('${KEY}'),l=matchMedia('${LIGHT_QUERY}').matches;document.documentElement.dataset.theme=p==='light'||(p==='system'&&l)?'light':'dark'}catch(e){}`
