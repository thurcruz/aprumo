import { cx } from '@/lib/cx'

/** Proporção do APRUMO_LOGOTIPO_BRANCO.png (691 × 187). */
const RATIO = 691 / 187

/**
 * O logotipo branco do Aprumo. Só aparece sobre as ilhas sempre escuras (menu,
 * topo do celular), então a versão branca serve nos dois temas.
 */
export default function Logo({ height = 20, className }: { height?: number; className?: string }) {
  // eslint-disable-next-line @next/next/no-img-element -- PNG pequeno e estático; o otimizador não ganha nada aqui.
  return <img src="/APRUMO_LOGOTIPO_BRANCO.png" alt="Aprumo" width={Math.round(height * RATIO)} height={height} className={cx('block shrink-0', className)}/>
}
