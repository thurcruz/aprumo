'use client'

import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import { extensionIcons as icons } from '@/components/modules/extensionIcons'
import Card from '@/components/ui/Card'
import PageHeader from '@/components/ui/PageHeader'
import SectionHeader from '@/components/ui/SectionHeader'
import Switch from '@/components/ui/Switch'
import { EXTENSIONS, isExtensionActive, type Extension } from '@/lib/extensions'
import { useAprumoStore } from '@/lib/store'

export default function ExtensoesPage() {
  const { store, hydrated, setExtension } = useAprumoStore()
  const active = EXTENSIONS.filter(item => isExtensionActive(item.id, store.extensions, store))
  const available = EXTENSIONS.filter(item => !active.includes(item))

  const card = (item: Extension, on: boolean) => {
    const Icon = icons[item.id]
    return <Card key={item.id} className="flex flex-col gap-3">
      <div className="flex items-center gap-4">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-area-soft text-area-ink"><Icon size={20}/></span>
        <div className="min-w-0 flex-1"><p className="text-h3">{item.label}</p><p className="mt-0.5 text-body-s text-fg-2">{item.description}</p></div>
        <Switch checked={on} disabled={!hydrated} label={`${on ? 'Desativar' : 'Ativar'} ${item.label}`} onChange={value => setExtension(item.id, value)}/>
      </div>
      {on && <div className="flex flex-wrap gap-2 border-t border-line pt-3">
        {item.pages.map(page => <Link key={page.href} href={page.href} className="inline-flex items-center gap-1 text-body-s font-medium text-fg-1 no-underline hover:underline">Abrir {page.label}<ChevronRight size={15}/></Link>)}
      </div>}
    </Card>
  }

  return <div className="page-wrap">
    <PageHeader title="Áreas" description="Ligue só o que faz parte da sua vida agora. O que você ligar aparece no menu e no seu dia."/>
    {active.length > 0 && <section>
      <SectionHeader className="mb-3" as="h3" title="Ativas"/>
      <div className="grid gap-3 md:grid-cols-2">{active.map(item => card(item, true))}</div>
    </section>}
    {available.length > 0 && <section className={active.length > 0 ? 'mt-10' : ''}>
      <SectionHeader className="mb-3" as="h3" title="Disponíveis"/>
      <div className="grid gap-3 md:grid-cols-2">{available.map(item => card(item, false))}</div>
    </section>}
  </div>
}
