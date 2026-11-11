import { cx } from '@/lib/cx'

/** Lugar reservado enquanto o dado carrega — com o formato do que vai chegar, para nada pular. */
export default function Skeleton({ className }: { className?: string }) {
  return <span aria-hidden className={cx('ap-skeleton block rounded-control', className)}/>
}
