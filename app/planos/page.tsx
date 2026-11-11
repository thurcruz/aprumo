import RoutinePlans from '@/components/community/RoutinePlans'
import PageHeader from '@/components/ui/PageHeader'

export default function PlanosPage() {
  return <div className="page-wrap">
    <PageHeader title="Planos" description="Caminhos prontos de algumas semanas que viram hábitos na sua rotina."/>
    <RoutinePlans/>
  </div>
}
