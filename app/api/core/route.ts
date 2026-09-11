import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import type { Json } from '@/lib/database.types'
import type { DayBlock, Goal, GoalCategory, GoalStatus, Milestone, HabitFrequency, Task, TaskCategory, TaskEvent, TaskPriority, TaskSource, Weekday } from '@/lib/types'
import { nextDay } from '@/lib/utils'

const categoryToDb: Record<TaskCategory, 'fixed'|'today'|'carryover'> = { fixa:'fixed', hoje:'today', repasse:'carryover' }
const categoryFromDb: Record<string, TaskCategory> = { fixed:'fixa', today:'hoje', carryover:'repasse' }
// O banco guarda os blocos em inglês; a UI usa português.
const blockToDb: Record<DayBlock, string> = { manha:'morning', tarde:'afternoon', noite:'evening', livre:'anytime' }
const blockFromDb: Record<string, DayBlock> = { morning:'manha', afternoon:'tarde', evening:'noite', anytime:'livre' }
const allowedSources: TaskSource[] = ['manual','ai','whatsapp']

const isDay = (value: string | undefined): value is string => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)

/**
 * A coluna `frequency` é jsonb: registros antigos trazem o default do banco
 * (`{type:'once'}`) e os primeiros hábitos gravados usaram `{type:'weekly',days}`.
 * Ambos são lidos aqui; o que não bate com nada vale como "todo dia, sem prazo".
 */
function frequencyFromDb(value: unknown): HabitFrequency | undefined {
  if (!value || typeof value !== 'object') return undefined
  const raw = value as { days?: unknown; startsOn?: unknown; endsOn?: unknown }
  const days = Array.isArray(raw.days)
    ? [...new Set(raw.days.filter((day): day is Weekday => typeof day === 'number' && Number.isInteger(day) && day >= 0 && day <= 6))].sort()
    : []
  const startsOn = isDay(raw.startsOn as string | undefined) ? raw.startsOn as string : undefined
  const endsOn = isDay(raw.endsOn as string | undefined) ? raw.endsOn as string : undefined
  // Sete dias marcados é o mesmo que nenhum filtro: não vale guardar.
  const frequency: HabitFrequency = {
    ...(days.length > 0 && days.length < 7 ? { days } : {}),
    ...(startsOn ? { startsOn } : {}),
    ...(endsOn ? { endsOn } : {}),
  }
  return Object.keys(frequency).length > 0 ? frequency : undefined
}

const isUuid = (value: unknown): value is string =>
  typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)

/**
 * Além da recorrência, o jsonb guarda a ficha que um hábito de treino abre
 * (`workoutPlanId`). Não há coluna própria: mora aqui por ser configuração do
 * hábito e por dispensar migração.
 */
function frequencyToDb(frequency: HabitFrequency | undefined, workoutPlanId?: string): Json {
  const valid = frequencyFromDb(frequency)
  const row: { [key: string]: Json | undefined } = {}
  if (valid?.days) row.days = valid.days
  if (valid?.startsOn) row.startsOn = valid.startsOn
  if (valid?.endsOn) row.endsOn = valid.endsOn
  if (isUuid(workoutPlanId)) row.workoutPlanId = workoutPlanId
  return row as Json
}

function workoutPlanFromDb(value: unknown): string | undefined {
  const id = value && typeof value === 'object' ? (value as { workoutPlanId?: unknown }).workoutPlanId : undefined
  return isUuid(id) ? id : undefined
}

async function context() {
  const supabase = await createSupabaseServerClient(); const { data:{user}, error } = await supabase.auth.getUser()
  return error || !user ? null : { supabase, user }
}

export async function GET() {
  try {
    const ctx = await context(); if (!ctx) return NextResponse.json({error:'Não autenticado'},{status:401})
    const today = new Date().toISOString().slice(0,10)
    // As métricas falam dos últimos 30 dias, mas a agenda navega muito além disso:
    // os eventos vêm de uma janela larga para o calendário não mentir ao voltar meses.
    const periodStart = new Date(Date.now()-29*86400000).toISOString().slice(0,10)
    const eventsFrom = new Date(Date.now()-180*86400000).toISOString().slice(0,10)
    const eventsTo = new Date(Date.now()+60*86400000).toISOString().slice(0,10)
    const [goalsResult, milestonesResult, commitmentsResult, eventsResult, lifetimeResult] = await Promise.all([
      ctx.supabase.from('goals').select('id,title,description,category,deadline,progress,status,completed_at,created_at').eq('user_id',ctx.user.id).neq('status','archived').order('created_at'),
      ctx.supabase.from('goal_milestones').select('id,goal_id,title,completed,due_date,completed_at,position').eq('user_id',ctx.user.id).order('position').order('created_at'),
      ctx.supabase.from('commitments').select('id,goal_id,title,category,created_at,scheduled_date,start_time,duration_minutes,day_block,priority,source,frequency').eq('user_id',ctx.user.id).eq('active',true).order('created_at'),
      ctx.supabase.from('commitment_events').select('commitment_id,status,completed_at,scheduled_for').eq('user_id',ctx.user.id).gte('scheduled_for',eventsFrom).lte('scheduled_for',eventsTo),
      // Conclusões de todos os tempos: o XP não pode depender da janela de eventos carregada.
      ctx.supabase.from('commitment_events').select('commitment_id',{count:'exact',head:true}).eq('user_id',ctx.user.id).eq('status','completed'),
    ])
    const error = goalsResult.error ?? milestonesResult.error ?? commitmentsResult.error ?? eventsResult.error ?? lifetimeResult.error
    if (error) return NextResponse.json({error:error.message},{status:500})
    const goals: Goal[] = (goalsResult.data??[]).map(row=>({ id:row.id,title:row.title,description:row.description,category:row.category as GoalCategory,deadline:row.deadline??'',progress:row.progress,status:(row.status as GoalStatus)??'active',completedAt:row.completed_at??undefined,milestones:(milestonesResult.data??[]).filter(item=>item.goal_id===row.id).map(item=>({id:item.id,title:item.title,completed:item.completed,dueDate:item.due_date??undefined,completedAt:item.completed_at??undefined})),linkedTasks:(commitmentsResult.data??[]).filter(item=>item.goal_id===row.id).map(item=>item.id) }))
    const allEvents=eventsResult.data??[]
    // As métricas continuam olhando só a janela de 30 dias que elas anunciam.
    const periodEvents=allEvents.filter(event=>event.scheduled_for>=periodStart&&event.scheduled_for<=today)
    const eventMap = new Map(allEvents.filter(event=>event.scheduled_for===today).map(event=>[event.commitment_id,event]))
    const taskEvents: TaskEvent[] = allEvents.map(event=>({taskId:event.commitment_id,date:event.scheduled_for,status:(event.status as TaskEvent['status']),completedAt:event.completed_at??undefined}))
    const tasks: Task[] = (commitmentsResult.data??[]).map(row=>{const event=eventMap.get(row.id);return {id:row.id,title:row.title,category:categoryFromDb[row.category]??'hoje',completed:event?.status==='completed',completedAt:event?.completed_at??undefined,createdAt:row.created_at,goalId:row.goal_id??undefined,scheduledDate:row.scheduled_date??undefined,startTime:row.start_time?.slice(0,5)??undefined,durationMinutes:row.duration_minutes??undefined,dayBlock:blockFromDb[row.day_block]??'livre',priority:(row.priority as TaskPriority)??2,source:(allowedSources.includes(row.source as TaskSource)?row.source as TaskSource:'manual'),frequency:frequencyFromDb(row.frequency),workoutPlanId:workoutPlanFromDb(row.frequency)}})
    const completedDates=new Set(periodEvents.filter(event=>event.status==='completed').map(event=>event.scheduled_for));let streak=0;for(let offset=0;offset<30;offset++){const date=new Date(Date.now()-offset*86400000).toISOString().slice(0,10);if(completedDates.has(date))streak++;else if(offset>0)break}
    const metrics={streak,completedCommitments:periodEvents.filter(event=>event.status==='completed').length,totalCommitments:periodEvents.length,carriedCommitments:periodEvents.filter(event=>event.status==='carried').length,completedGoals:(goalsResult.data??[]).filter(goal=>goal.status==='completed'||goal.progress===100).length,periodDays:30,lifetimeCompleted:lifetimeResult.count??0}
    return NextResponse.json({goals,tasks,taskEvents,metrics})
  } catch (error) { return NextResponse.json({error:error instanceof Error?error.message:'Dados indisponíveis'},{status:503}) }
}

export async function POST(request:Request) {
  try {
    const ctx=await context(); if(!ctx)return NextResponse.json({error:'Não autenticado'},{status:401})
    const body=await request.json() as {action?:string;task?:Task;goal?:Goal;id?:string;eventDate?:string}
    if(body.action==='addTask'&&body.task){const task=body.task;if(!task.title.trim()||task.title.length>160)return NextResponse.json({error:'Tarefa inválida'},{status:400});const {error}=await ctx.supabase.from('commitments').insert({id:task.id,user_id:ctx.user.id,goal_id:task.goalId??null,title:task.title.trim(),kind:task.category==='fixa'?'habit':'task',category:categoryToDb[task.category],priority:task.priority??2,scheduled_date:task.scheduledDate??null,start_time:task.startTime??null,duration_minutes:task.durationMinutes??null,day_block:blockToDb[task.dayBlock??'livre'],source:allowedSources.includes(task.source as TaskSource)?task.source:'manual',frequency:frequencyToDb(task.frequency,task.workoutPlanId)});if(error)throw error}
    else if(body.action==='updateTask'&&body.task){const task=body.task;const {error}=await ctx.supabase.from('commitments').update({title:task.title.trim(),goal_id:task.goalId??null,category:categoryToDb[task.category],scheduled_date:task.scheduledDate??null,start_time:task.startTime??null,duration_minutes:task.durationMinutes??null,day_block:blockToDb[task.dayBlock??'livre'],priority:task.priority??2,kind:task.category==='fixa'?'habit':'task',frequency:frequencyToDb(task.frequency,task.workoutPlanId),updated_at:new Date().toISOString()}).eq('id',task.id).eq('user_id',ctx.user.id);if(error)throw error;const eventDate=body.eventDate??task.scheduledDate??new Date().toISOString().slice(0,10);const {error:eventError}=await ctx.supabase.from('commitment_events').upsert({user_id:ctx.user.id,commitment_id:task.id,scheduled_for:eventDate,status:task.completed?'completed':'pending',completed_at:task.completed?(task.completedAt??new Date().toISOString()):null,updated_at:new Date().toISOString()},{onConflict:'commitment_id,scheduled_for'});if(eventError)throw eventError}
    else if(body.action==='carryTask'&&body.task){
      // "Não consegui hoje": registra o evento como adiado (carried) em vez de
      // falha, incrementa o contador de repasses e reprograma o compromisso.
      const task=body.task
      const from=body.eventDate??new Date().toISOString().slice(0,10)
      const to=nextDay(from)
      const {data:existing}=await ctx.supabase.from('commitment_events').select('reschedule_count').eq('user_id',ctx.user.id).eq('commitment_id',task.id).eq('scheduled_for',from).maybeSingle()
      const {error:eventError}=await ctx.supabase.from('commitment_events').upsert({user_id:ctx.user.id,commitment_id:task.id,scheduled_for:from,status:'carried',carried_to:to,reschedule_count:(existing?.reschedule_count??0)+1,updated_at:new Date().toISOString()},{onConflict:'commitment_id,scheduled_for'})
      if(eventError)throw eventError
      const {error}=await ctx.supabase.from('commitments').update({category:'carryover',scheduled_date:to,updated_at:new Date().toISOString()}).eq('id',task.id).eq('user_id',ctx.user.id)
      if(error)throw error
    }
    else if(body.action==='deleteTask'&&body.id){const {error}=await ctx.supabase.from('commitments').delete().eq('id',body.id).eq('user_id',ctx.user.id);if(error)throw error}
    else if(body.action==='addGoal'&&body.goal){const goal=body.goal;if(!goal.title.trim()||goal.title.length>160)return NextResponse.json({error:'Meta inválida'},{status:400});const {error}=await ctx.supabase.from('goals').insert({id:goal.id,user_id:ctx.user.id,title:goal.title.trim(),description:goal.description,category:goal.category,deadline:goal.deadline||null,progress:goal.progress,status:goal.status??'active'});if(error)throw error}
    else if(body.action==='updateGoal'&&body.goal){
      const goal=body.goal
      if(!goal.title.trim()||goal.title.length>160)return NextResponse.json({error:'Meta inválida'},{status:400})
      const status:GoalStatus=goal.status??'active'
      // Concluir carimba a data uma vez; reabrir a limpa. Não se recalcula a cada save.
      const completedAt=status==='completed'?(goal.completedAt??new Date().toISOString()):null
      const {error}=await ctx.supabase.from('goals').update({title:goal.title.trim(),description:goal.description,category:goal.category,deadline:goal.deadline||null,progress:goal.progress,status,completed_at:completedAt,updated_at:new Date().toISOString()}).eq('id',goal.id).eq('user_id',ctx.user.id)
      if(error)throw error

      // A ordem do array é a ordem que o usuário vê: ela vira `position`.
      const milestones:Milestone[]=Array.isArray(goal.milestones)?goal.milestones:[]
      if(milestones.length>0){
        const {error:milestoneError}=await ctx.supabase.from('goal_milestones').upsert(
          milestones.map((milestone,position)=>({
            id:milestone.id,user_id:ctx.user.id,goal_id:goal.id,title:milestone.title,position,
            completed:milestone.completed,due_date:milestone.dueDate??null,
            // Preserva o instante original: só carimba quem acabou de ser concluído.
            completed_at:milestone.completed?(milestone.completedAt??new Date().toISOString()):null,
          })),{onConflict:'id'})
        if(milestoneError)throw milestoneError
      }
      // Sem isto, marco excluído na interface reaparecia no próximo carregamento:
      // o upsert acima só cuida do que continua existindo.
      const keep=milestones.map(milestone=>milestone.id)
      let removal=ctx.supabase.from('goal_milestones').delete().eq('user_id',ctx.user.id).eq('goal_id',goal.id)
      if(keep.length>0)removal=removal.not('id','in',`(${keep.join(',')})`)
      const {error:deleteError}=await removal
      if(deleteError)throw deleteError
    }
    else if(body.action==='deleteGoal'&&body.id){const {error}=await ctx.supabase.from('goals').delete().eq('id',body.id).eq('user_id',ctx.user.id);if(error)throw error}
    else return NextResponse.json({error:'Ação inválida'},{status:400})
    return NextResponse.json({ok:true})
  } catch(error){return NextResponse.json({error:error instanceof Error?error.message:'Não foi possível salvar'},{status:500})}
}
